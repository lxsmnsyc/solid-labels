import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import accessorVariableExpression from './accessor-variable';
import { ImportHook } from './types';

export default function deferredVariableExpression(
  hooks: ImportHook,
  path: NodePath<t.VariableDeclarator>,
  deferredIdentifier: t.Identifier,
  stateIdentifier: t.Expression = t.identifier('undefined'),
  optionsIdentifier?: t.Expression,
): void {
  accessorVariableExpression(
    hooks,
    path,
    deferredIdentifier,
    'createDeferred',
    [
      t.arrowFunctionExpression(
        [],
        stateIdentifier,
      ),
      t.objectExpression([
        t.objectProperty(
          t.identifier('name'),
          t.stringLiteral(deferredIdentifier.name),
        ),
        ...(optionsIdentifier ? [t.spreadElement(optionsIdentifier)] : <t.SpreadElement[]>[]),
      ]),
    ],
  );
}
