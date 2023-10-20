import type * as babel from '@babel/core';
import * as t from '@babel/types';
import assert from './assert';
import { unexpectedType } from './errors';
import unwrapNode from './unwrap-node';
import { addProtoGetter } from './proto';

const REF_MEMO_CTF = '$refMemo';
const GET_CTF = '$get';

const CALL_CTF = new Set([REF_MEMO_CTF, GET_CTF]);

const GETTER_CTF = '$getter';
const PROPERTY_CTF = '$property';

const OBJECT_PROPERTY_CTF = new Set([GETTER_CTF, PROPERTY_CTF]);

interface DerefMemoState {
  current?: babel.NodePath<t.ObjectExpression>;
  prev?: babel.NodePath<t.ObjectExpression>;
}

export default function derefMemo(
  path: babel.NodePath,
  memoIdentifier: t.Identifier,
  readIdentifier: t.Identifier,
): void {
  path.scope.path.traverse<DerefMemoState>({
    CallExpression(p) {
      if (p.scope !== path.scope && p.scope.hasOwnBinding(memoIdentifier.name)) {
        return;
      }
      const trueCallee = unwrapNode(p.node.callee, t.isIdentifier);
      if (!trueCallee || p.scope.hasBinding(trueCallee.name) || !CALL_CTF.has(trueCallee.name)) {
        return;
      }
      const rawArgs = p.node.arguments[0];
      const arg = unwrapNode(rawArgs, t.isIdentifier);
      assert(arg, unexpectedType(p, rawArgs.type, 'Identifier'));
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
    ObjectExpression: {
      enter(p) {
        this.prev = this.current;
        this.current = p;
      },
      exit() {
        this.current = this.prev;
      },
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
        assert(!t.isPrivateName(p.node.key), unexpectedType(p, 'PrivateName', 'Expression'));
        const arg = trueCallExpr.arguments[0];
        assert(t.isIdentifier(arg), unexpectedType(p, arg.type, 'Identifier'));
        if (arg.name !== memoIdentifier.name) {
          return;
        }
        if (this.current) {
          switch (trueCallee.name) {
            case GETTER_CTF:
            case PROPERTY_CTF:
              addProtoGetter(this.current, p, readIdentifier);
              break;
            default:
              break;
          }
        }
      }
    },
    Expression(p) {
      if (p.scope !== path.scope && p.scope.hasOwnBinding(memoIdentifier.name)) {
        return;
      }
      if (
        t.isIdentifier(p.node)
        // && !isInTypeScript(p)
        && p.node.name === memoIdentifier.name
      ) {
        p.replaceWith(t.callExpression(readIdentifier, []));
      }
    },
  }, {
    current: undefined,
    prev: undefined,
  });
}
