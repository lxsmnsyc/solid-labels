import * as babel from '@babel/core';
import * as t from '@babel/types';
import assert from './assert';
import { unexpectedType } from './errors';
import isAwaited from './is-awaited';
import isYielded from './is-yielded';
// import isInTypeScript from './is-in-typescript';
import unwrapNode from './unwrap-node';

const REF_SIGNAL_CTF = '$refSignal';
const GET_CTF = '$get';
const SET_CTF = '$set';

const CALL_CTF = new Set([REF_SIGNAL_CTF, GET_CTF, SET_CTF]);

const GETTER_CTF = '$getter';
const SETTER_CTF = '$setter';
const PROPERTY_CTF = '$property';

const OBJECT_PROPERTY_CTF = new Set([GETTER_CTF, SETTER_CTF, PROPERTY_CTF]);

export default function derefSignal(
  path: babel.NodePath,
  signalIdentifier: t.Identifier,
  readIdentifier: t.Identifier,
  writeIdentifier: t.Identifier,
): void {
  path.scope.path.traverse({
    CallExpression(p) {
      if (p.scope !== path.scope && p.scope.hasOwnBinding(signalIdentifier.name)) {
        return;
      }
      const trueCallee = unwrapNode(p.node.callee, t.isIdentifier);
      if (!trueCallee || p.scope.hasBinding(trueCallee.name) || !CALL_CTF.has(trueCallee.name)) {
        return;
      }
      const rawArgs = p.node.arguments[0];
      const arg = unwrapNode(rawArgs, t.isIdentifier);
      assert(arg, unexpectedType(p, rawArgs.type, 'Identifier'));
      if (arg.name !== signalIdentifier.name) {
        return;
      }
      if (trueCallee.name === REF_SIGNAL_CTF) {
        p.replaceWith(
          t.arrayExpression([
            readIdentifier,
            writeIdentifier,
          ]),
        );
      }
      if (trueCallee.name === GET_CTF) {
        p.replaceWith(readIdentifier);
      }
      if (trueCallee.name === SET_CTF) {
        p.replaceWith(writeIdentifier);
      }
    },
    ObjectProperty(p) {
      if (p.scope !== path.scope && p.scope.hasOwnBinding(signalIdentifier.name)) {
        return;
      }
      if (p.node.shorthand && !p.node.computed) {
        if (
          t.isIdentifier(p.node.key)
          && t.isIdentifier(p.node.value)
          && p.node.key.name === signalIdentifier.name
          && p.node.value.name === signalIdentifier.name
        ) {
          p.replaceWith(
            t.objectProperty(
              p.node.key,
              t.callExpression(readIdentifier, []),
            ),
          );
        }
        return;
      }
      const trueCallExpr = unwrapNode(p.node.value, t.isCallExpression);
      if (trueCallExpr) {
        const trueCallee = unwrapNode(trueCallExpr.callee, t.isIdentifier);
        if (
          !trueCallee
          || p.scope.hasBinding(trueCallee.name)
          || !OBJECT_PROPERTY_CTF.has(trueCallee.name)
        ) {
          return;
        }
        assert(!t.isPrivateName(p.node.key), unexpectedType(p, 'PrivateName', 'Expression'));
        const arg = trueCallExpr.arguments[0];
        assert(t.isIdentifier(arg), unexpectedType(p, arg.type, 'Identifier'));
        if (arg.name !== signalIdentifier.name) {
          return;
        }
        if (trueCallee.name === SETTER_CTF) {
          const param = p.scope.generateUidIdentifier('value');
          p.replaceWith(
            t.objectMethod(
              'set',
              p.node.key,
              [param],
              t.blockStatement([
                t.returnStatement(
                  t.callExpression(
                    writeIdentifier,
                    [
                      t.arrowFunctionExpression(
                        [],
                        param,
                      ),
                    ],
                  ),
                ),
              ]),
            ),
          );
        }
        if (trueCallee.name === GETTER_CTF) {
          p.replaceWith(
            t.objectMethod(
              'get',
              p.node.key,
              [],
              t.blockStatement([
                t.returnStatement(
                  t.callExpression(
                    readIdentifier,
                    [],
                  ),
                ),
              ]),
            ),
          );
        }
        if (trueCallee.name === PROPERTY_CTF) {
          const param = p.scope.generateUidIdentifier('value');
          p.replaceWithMultiple([
            t.objectMethod(
              'get',
              p.node.key,
              [],
              t.blockStatement([
                t.returnStatement(
                  t.callExpression(
                    readIdentifier,
                    [],
                  ),
                ),
              ]),
            ),
            t.objectMethod(
              'set',
              p.node.key,
              [param],
              t.blockStatement([
                t.returnStatement(
                  t.callExpression(
                    writeIdentifier,
                    [
                      t.arrowFunctionExpression(
                        [],
                        param,
                      ),
                    ],
                  ),
                ),
              ]),
            ),
          ]);
        }
      }
    },
    Expression(p) {
      if (p.scope !== path.scope && p.scope.hasOwnBinding(signalIdentifier.name)) {
        return;
      }
      if (
        t.isIdentifier(p.node)
        // && !isInTypeScript(p)
        && p.node.name === signalIdentifier.name
      ) {
        p.replaceWith(t.callExpression(readIdentifier, []));
      }
    },
    UpdateExpression(p) {
      if (p.scope !== path.scope && p.scope.hasOwnBinding(signalIdentifier.name)) {
        return;
      }
      if (t.isIdentifier(p.node.argument) && p.node.argument.name === signalIdentifier.name) {
        const param = p.scope.generateUidIdentifier('current');
        if (p.node.prefix) {
          p.replaceWith(
            t.callExpression(
              writeIdentifier,
              [
                t.arrowFunctionExpression(
                  [param],
                  t.binaryExpression(
                    p.node.operator === '++' ? '+' : '-',
                    param,
                    t.numericLiteral(1),
                  ),
                ),
              ],
            ),
          );
        } else {
          p.replaceWith(
            t.callExpression(
              t.arrowFunctionExpression(
                [],
                t.blockStatement([
                  t.variableDeclaration(
                    'const',
                    [
                      t.variableDeclarator(
                        param,
                        t.callExpression(
                          readIdentifier,
                          [],
                        ),
                      ),
                    ],
                  ),
                  t.expressionStatement(
                    t.callExpression(
                      writeIdentifier,
                      [
                        t.arrowFunctionExpression(
                          [],
                          t.binaryExpression(
                            p.node.operator === '++' ? '+' : '-',
                            param,
                            t.numericLiteral(1),
                          ),
                        ),
                      ],
                    ),
                  ),
                  t.returnStatement(
                    param,
                  ),
                ]),
              ),
              [],
            ),
          );
        }
      }
    },
    AssignmentExpression(p) {
      if (p.scope !== path.scope && p.scope.hasOwnBinding(signalIdentifier.name)) {
        return;
      }
      const identifier = p.node.left;
      let expression = p.node.right;
      if (isAwaited(expression) || isYielded(expression)) {
        const statement = p.getStatementParent();
        const functionParent = p.getFunctionParent();
        if (statement) {
          const awaitedID = statement.scope.generateUidIdentifier('tmp');
          const declaration = t.variableDeclaration(
            'const',
            [t.variableDeclarator(
              awaitedID,
              expression,
            )],
          );

          if (functionParent) {
            if (functionParent.isAncestor(statement)) {
              statement.insertBefore(declaration);
            } else {
              functionParent.scope.push({
                id: awaitedID,
                init: expression,
                kind: 'const',
              });
            }
          } else {
            statement.insertBefore(declaration);
          }
          expression = awaitedID;
        }
      }
      if (t.isIdentifier(identifier) && identifier.name === signalIdentifier.name) {
        let arg: t.Expression;
        if (p.node.operator === '=') {
          arg = t.arrowFunctionExpression([], expression);
        } else {
          const param = p.scope.generateUidIdentifier('current');
          arg = t.arrowFunctionExpression(
            [param],
            t.assignmentExpression(
              p.node.operator,
              param,
              expression,
            ),
          );
        }
        p.replaceWith(t.callExpression(writeIdentifier, [arg]));
      }
    },
  });
}
