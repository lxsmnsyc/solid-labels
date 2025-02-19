import type * as babel from '@babel/core';
import * as t from '@babel/types';
import { derefMemo } from './deref-memo';
import { generateUniqueName } from './generate-unique-name';

export function accessorVariable(
  path: babel.NodePath,
  accessorIdentifier: t.Identifier,
  callee: t.Identifier,
  replacement: Array<t.Expression | t.SpreadElement | t.ArgumentPlaceholder>,
): t.VariableDeclarator {
  const readIdentifier = generateUniqueName(path, accessorIdentifier.name);

  derefMemo(path, accessorIdentifier, readIdentifier);

  return t.variableDeclarator(
    readIdentifier,
    t.callExpression(callee, replacement),
  );
}
