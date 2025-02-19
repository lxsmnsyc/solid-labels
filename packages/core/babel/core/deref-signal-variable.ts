import type * as babel from '@babel/core';
import * as t from '@babel/types';
import { derefSignal } from './deref-signal';
import { generateUniqueName } from './generate-unique-name';

export function derefSignalVariable(
  path: babel.NodePath,
  signalIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
): t.VariableDeclarator {
  const readIdentifier = generateUniqueName(path, signalIdentifier.name);
  const writeIdentifier = generateUniqueName(
    path,
    `set${signalIdentifier.name}`,
  );
  derefSignal(path, signalIdentifier, readIdentifier, writeIdentifier);

  return t.variableDeclarator(
    t.arrayPattern([readIdentifier, writeIdentifier]),
    stateIdentifier,
  );
}
