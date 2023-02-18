import * as babel from '@babel/core';
import * as t from '@babel/types';
import derefMemo from './deref-memo';

export default function derefMemoVariable(
  path: babel.NodePath,
  memoIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
) {
  const readIdentifier = path.scope.generateUidIdentifier(memoIdentifier.name);

  derefMemo(
    path,
    memoIdentifier,
    readIdentifier,
  );

  return t.variableDeclarator(readIdentifier, stateIdentifier);
}
