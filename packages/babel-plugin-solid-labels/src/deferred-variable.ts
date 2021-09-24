import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import accessorVariableExpression from './accessor-variable';
import { State } from './types';

export default function deferredVariableExpression(
  state: State,
  path: NodePath<t.VariableDeclarator>,
  deferredIdentifier: t.Identifier,
  stateIdentifier: t.Expression = t.identifier('undefined'),
  optionsIdentifier?: t.Expression,
): void {
  if (state.opts.dev) {
    if (optionsIdentifier) {
      accessorVariableExpression(
        state,
        path,
        deferredIdentifier,
        'createDeferred',
        [
          t.arrowFunctionExpression(
            [],
            stateIdentifier,
          ),
          t.callExpression(
            t.memberExpression(
              t.identifier('Object'),
              t.identifier('assign'),
            ),
            [
              t.objectExpression([
                t.objectProperty(
                  t.identifier('name'),
                  t.stringLiteral(deferredIdentifier.name),
                ),
              ]),
              optionsIdentifier,
            ],
          ),
        ],
      );
    } else {
      accessorVariableExpression(
        state,
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
          ]),
        ],
      );
    }
  } else if (optionsIdentifier) {
    accessorVariableExpression(
      state,
      path,
      deferredIdentifier,
      'createDeferred',
      [
        t.arrowFunctionExpression(
          [],
          stateIdentifier,
        ),
        optionsIdentifier,
      ],
    );
  } else {
    accessorVariableExpression(
      state,
      path,
      deferredIdentifier,
      'createDeferred',
      [
        t.arrowFunctionExpression(
          [],
          stateIdentifier,
        ),
      ],
    );
  }
}
