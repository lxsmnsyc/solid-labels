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
      if (!trueCallee || !CALL_CTF.has(trueCallee.name)) {
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
      const currentValue = p.node.value;
      const currentKey = p.node.key;
      if (p.node.shorthand && !p.node.computed) {
        if (
          t.isIdentifier(currentKey)
          && t.isIdentifier(currentValue)
          && currentKey.name === memoIdentifier.name
          && currentValue.name === memoIdentifier.name
        ) {
          p.replaceWith(
            t.objectProperty(
              currentKey,
              t.callExpression(readIdentifier, []),
            ),
          );
        }
        return;
      }
      const trueCallExpr = unwrapNode(currentValue, t.isCallExpression);
      if (trueCallExpr) {
        const trueCallee = unwrapNode(trueCallExpr.callee, t.isIdentifier);
        if (
          !trueCallee
          || p.scope.hasBinding(trueCallee.name)
          || !OBJECT_PROPERTY_CTF.has(trueCallee.name)
        ) {
          return;
        }
        assert(!t.isPrivateName(currentKey), unexpectedType(p, 'PrivateName', 'Expression'));
        const arg = trueCallExpr.arguments[0];
        assert(t.isIdentifier(arg), unexpectedType(p, arg.type, 'Identifier'));
        if (arg.name !== memoIdentifier.name) {
          return;
        }
        if (this.current) {
          switch (trueCallee.name) {
            case GETTER_CTF:
            case PROPERTY_CTF:
              addProtoGetter(this.current, p, currentKey, readIdentifier);
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
