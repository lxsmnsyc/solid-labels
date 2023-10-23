import type * as babel from '@babel/core';
import * as t from '@babel/types';
import derefSignal from './deref-signal';

export default function derefSignalVariable(
  path: babel.NodePath,
  signalIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
): t.VariableDeclarator {
  const readIdentifier = path.scope.generateUidIdentifier(signalIdentifier.name);
  const writeIdentifier = path.scope.generateUidIdentifier(`set${signalIdentifier.name}`);
  derefSignal(
    path,
    signalIdentifier,
    readIdentifier,
    writeIdentifier,
  );

  return t.variableDeclarator(
    t.arrayPattern([
      readIdentifier,
      writeIdentifier,
    ]),
    stateIdentifier,
  );
}
