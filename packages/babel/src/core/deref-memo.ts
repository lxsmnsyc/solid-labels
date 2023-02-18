import * as babel from '@babel/core';
import * as t from '@babel/types';
import { unexpectedType } from './errors';
import isInTypeScript from './is-in-typescript';
import unwrapNode from './unwrap-node';

const REF_MEMO_CTF = '$refMemo';
const GET_CTF = '$get';

const CALL_CTF = new Set([REF_MEMO_CTF, GET_CTF]);

const GETTER_CTF = '$getter';
const PROPERTY_CTF = '$property';

const OBJECT_PROPERTY_CTF = new Set([GETTER_CTF, PROPERTY_CTF]);

export default function derefMemo(
  path: babel.NodePath,
  memoIdentifier: t.Identifier,
  readIdentifier: t.Identifier,
): void {
  path.scope.path.traverse({
    CallExpression(p) {
      if (p.scope !== path.scope && p.scope.hasOwnBinding(memoIdentifier.name)) {
        return;
      }
      const trueCallee = unwrapNode(p.node.callee, t.isIdentifier);
      if (!trueCallee || p.scope.hasBinding(trueCallee.name) || !CALL_CTF.has(trueCallee.name)) {
        return;
      }
      const arg = unwrapNode(p.node.arguments[0], t.isIdentifier);
      if (!arg) {
        throw unexpectedType(p, p.node.arguments[0].type, 'Identifier');
      }
      if (arg.name !== memoIdentifier.name) {
        return;
      }
      if (trueCallee.name === REF_MEMO_CTF) {
        p.replaceWith(readIdentifier);
      }
      if (trueCallee.name === GET_CTF) {
        p.replaceWith(readIdentifier);
      }
    },
    ObjectProperty(p) {
      if (p.scope !== path.scope && p.scope.hasOwnBinding(memoIdentifier.name)) {
        return;
      }
      if (p.node.shorthand && !p.node.computed) {
        if (
          t.isIdentifier(p.node.key)
          && t.isIdentifier(p.node.value)
          && p.node.key.name === memoIdentifier.name
          && p.node.value.name === memoIdentifier.name
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
        if (t.isPrivateName(p.node.key)) {
          throw unexpectedType(p, 'PrivateName', 'Expression');
        }
        const arg = trueCallExpr.arguments[0];
        if (!t.isIdentifier(arg)) {
          throw unexpectedType(p, arg.type, 'Identifier');
        }
        if (arg.name !== memoIdentifier.name) {
          return;
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
      }
    },
    Expression(p) {
      if (p.scope !== path.scope && p.scope.hasOwnBinding(memoIdentifier.name)) {
        return;
      }
      if (
        t.isIdentifier(p.node)
        && !isInTypeScript(p)
        && p.node.name === memoIdentifier.name
      ) {
        p.replaceWith(t.callExpression(readIdentifier, []));
      }
    },
  });
}
