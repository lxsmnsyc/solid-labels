import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import accessorVariableExpression from './accessor-variable';
import { ImportHook } from './types';

export default function memoVariableExpression(
  hooks: ImportHook,
  path: NodePath<t.VariableDeclarator>,
  memoIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
  optionsIdentifier?: t.Expression,
): void {
  accessorVariableExpression(
    hooks,
    path,
    memoIdentifier,
    'createMemo',
    [
      t.arrowFunctionExpression(
        [],
        stateIdentifier,
      ),
      t.identifier('undefined'),
      t.objectExpression([
        t.objectProperty(
          t.identifier('name'),
          t.stringLiteral(memoIdentifier.name),
        ),
        ...(optionsIdentifier ? [t.spreadElement(optionsIdentifier)] : <t.SpreadElement[]>[]),
      ]),
    ],
  );
}
