import type * as babel from '@babel/core';
import * as t from '@babel/types';
import { assert } from './assert';
import { unexpectedType } from './errors';
import { addProtoGetter } from './proto';
import { getProperParentPath, unwrapNode } from './unwrap-node';

const REF_MEMO_CTF = '$refMemo';
const GET_CTF = '$get';

const GETTER_CTF = '$getter';
const PROPERTY_CTF = '$property';

const CALL_CTF = new Set([REF_MEMO_CTF, GET_CTF, GETTER_CTF, PROPERTY_CTF]);

function transformGetter(
  parent: babel.NodePath<t.CallExpression>,
  readIdentifier: t.Identifier,
): boolean {
  const propertyParent = getProperParentPath(parent, t.isObjectProperty);
  if (!propertyParent) {
    return true;
  }
  const key = propertyParent.node.key;
  assert(
    t.isExpression(key),
    unexpectedType(propertyParent.get('key'), key.type, 'Identifier'),
  );
  const objectParent = getProperParentPath(
    propertyParent,
    t.isObjectExpression,
  );
  if (!objectParent) {
    return true;
  }
  addProtoGetter(objectParent, propertyParent, key, readIdentifier);
  return false;
}

function transformReferencePath(
  ref: babel.NodePath,
  readIdentifier: t.Identifier,
): boolean {
  const parent = getProperParentPath(ref, t.isCallExpression);
  if (parent) {
    const trueCallee = unwrapNode(parent.node.callee, t.isIdentifier);
    if (!(trueCallee && CALL_CTF.has(trueCallee.name))) {
      return true;
    }
    const rawArgs = parent.get('arguments')[0];
    const arg = unwrapNode(rawArgs.node, t.isIdentifier);
    assert(arg, unexpectedType(rawArgs, rawArgs.type, 'Identifier'));
    if (arg !== ref.node) {
      return true;
    }
    switch (trueCallee.name) {
      case REF_MEMO_CTF:
      case GET_CTF:
        parent.replaceWith(readIdentifier);
        break;
      case PROPERTY_CTF:
      case GETTER_CTF:
        return transformGetter(parent, readIdentifier);
    }
    return false;
  }
  return true;
}

export function derefMemo(
  path: babel.NodePath,
  memoIdentifier: t.Identifier,
  readIdentifier: t.Identifier,
): void {
  const binding = path.scope.getBinding(memoIdentifier.name);
  if (!binding) {
    return;
  }
  for (const ref of binding.referencePaths) {
    if (transformReferencePath(ref, readIdentifier)) {
      assert(
        t.isIdentifier(ref.node),
        unexpectedType(ref, ref.node.type, 'Identifier'),
      );
      ref.replaceWith(t.callExpression(readIdentifier, []));
    }
  }
}
