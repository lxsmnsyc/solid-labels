import type * as babel from '@babel/core';
import * as t from '@babel/types';
import { derefMemo } from './deref-memo';
import { generateUniqueName } from './generate-unique-name';

export function derefMemoVariable(
  path: babel.NodePath,
  memoIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
): t.VariableDeclarator {
  const readIdentifier = generateUniqueName(path, memoIdentifier.name);

  derefMemo(path, memoIdentifier, readIdentifier);

  return t.variableDeclarator(readIdentifier, stateIdentifier);
}
