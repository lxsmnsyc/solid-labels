import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import derefMemoExpression from './deref-memo-expression';
import getHookIdentifier from './get-hook-identifier';
import { ImportHook } from './types';

export default function accessorVariableExpression(
  hooks: ImportHook,
  path: NodePath<t.VariableDeclarator>,
  accessorIdentifier: t.Identifier,
  mod: string,
  replacement: Array<t.Expression | t.SpreadElement | t.JSXNamespacedName | t.ArgumentPlaceholder>,
): void {
  const readIdentifier = path.scope.generateUidIdentifier(accessorIdentifier.name);

  path.node.id = readIdentifier;
  path.node.init = t.callExpression(
    getHookIdentifier(hooks, path, mod),
    replacement,
  );

  derefMemoExpression(
    path,
    accessorIdentifier,
    readIdentifier,
  );
}
