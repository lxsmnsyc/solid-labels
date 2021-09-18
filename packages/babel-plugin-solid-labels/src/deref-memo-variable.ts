import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import derefMemoExpression from './deref-memo-expression';

export default function derefMemoVariableExpression(
  path: NodePath<t.VariableDeclarator>,
  memoIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
): void {
  const readIdentifier = path.scope.generateUidIdentifier(memoIdentifier.name);

  path.node.id = readIdentifier;
  path.node.init = stateIdentifier;

  derefMemoExpression(
    path,
    memoIdentifier,
    readIdentifier,
  );
}
