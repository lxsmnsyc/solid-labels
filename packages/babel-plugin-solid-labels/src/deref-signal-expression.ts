import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import normalizeBindings from './normalize-bindings';

export default function derefSignalExpression(
  path: NodePath,
  signalIdentifier: t.Identifier,
  readIdentifier: t.Identifier,
  writeIdentifier: t.Identifier,
): void {
  const parent = path.scope.path;
  if (parent) {
    parent.traverse({
      CallExpression(p) {
        if (p.scope !== path.scope && p.scope.hasOwnBinding(signalIdentifier.name)) {
          return;
        }
        if (!t.isIdentifier(p.node.callee)) {
          return;
        }
        switch (p.node.callee.name) {
          case '$refSignal':
            if (!t.isIdentifier(p.node.arguments[0])) {
              throw new Error('Expected identifier');
            }
            if (p.node.arguments[0].name === signalIdentifier.name) {
              p.replaceWith(
                t.arrayExpression([
                  readIdentifier,
                  writeIdentifier,
                ]),
              );
            }
            break;
          case '$get':
            if (!t.isIdentifier(p.node.arguments[0])) {
              throw new Error('Expected identifier');
            }
            if (p.node.arguments[0].name === signalIdentifier.name) {
              p.replaceWith(
                readIdentifier,
              );
            }
            break;
          case '$set':
            if (!t.isIdentifier(p.node.arguments[0])) {
              throw new Error('Expected identifier');
            }
            if (p.node.arguments[0].name === signalIdentifier.name) {
              p.replaceWith(
                writeIdentifier,
              );
            }
            break;
          default:
            break;
        }
      },
      ...normalizeBindings(
        path,
        t.callExpression(
          readIdentifier,
          [],
        ),
        signalIdentifier,
      ),
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
        const expression = p.node.right;
        if (
          t.isIdentifier(identifier)
          && identifier.name === signalIdentifier.name
        ) {
          if (p.node.operator === '=') {
            p.replaceWith(
              t.callExpression(
                writeIdentifier,
                [
                  t.arrowFunctionExpression(
                    [],
                    expression,
                  ),
                ],
              ),
            );
          } else {
            const param = p.scope.generateUidIdentifier('current');
            p.replaceWith(
              t.callExpression(
                writeIdentifier,
                [
                  t.arrowFunctionExpression(
                    [param],
                    t.assignmentExpression(
                      p.node.operator,
                      param,
                      expression,
                    ),
                  ),
                ],
              ),
            );
          }
        }
      },
    });
  }
}
