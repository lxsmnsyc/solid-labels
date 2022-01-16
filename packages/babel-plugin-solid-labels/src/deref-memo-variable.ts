import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import derefMemoExpression from './deref-memo-expression';
import { State } from './types';

export default function derefMemoVariableExpression(
  state: State,
  path: NodePath<t.VariableDeclarator>,
  memoIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
): void {
  const readIdentifier = path.scope.generateUidIdentifier(memoIdentifier.name);

  path.replaceWith(t.variableDeclarator(
    readIdentifier,
    stateIdentifier,
  ));

  derefMemoExpression(
    state,
    path,
    memoIdentifier,
    readIdentifier,
  );
}
