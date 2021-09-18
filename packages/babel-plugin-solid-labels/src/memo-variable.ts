import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import derefMemoExpression from './deref-memo-expression';
import getHookIdentifier from './get-hook-identifier';
import { ImportHook } from './types';

export default function memoVariableExpression(
  hooks: ImportHook,
  path: NodePath<t.VariableDeclarator>,
  memoIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
): void {
  const readIdentifier = path.scope.generateUidIdentifier(memoIdentifier.name);

  path.node.id = readIdentifier;
  path.node.init = t.callExpression(
    getHookIdentifier(hooks, path, 'createMemo'),
    [
      t.arrowFunctionExpression(
        [],
        stateIdentifier,
      ),
      t.objectExpression([
        t.objectProperty(
          t.identifier('name'),
          t.stringLiteral(memoIdentifier.name),
        ),
      ]),
    ],
  );

  derefMemoExpression(
    path,
    memoIdentifier,
    readIdentifier,
  );
}
