import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import accessorVariableExpression from './accessor-variable';
import normalizeAccessor from './normalize-accessor';
import { State } from './types';

export default function memoVariableExpression(
  state: State,
  path: NodePath<t.VariableDeclarator>,
  memoIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
  optionsIdentifier?: t.Expression,
): void {
  const normalIdentifier = normalizeAccessor(stateIdentifier);

  if (state.opts.dev) {
    if (optionsIdentifier) {
      accessorVariableExpression(
        state,
        path,
        memoIdentifier,
        'createMemo',
        [
          normalIdentifier,
          t.identifier('undefined'),
          t.callExpression(
            t.memberExpression(
              t.identifier('Object'),
              t.identifier('assign'),
            ),
            [
              t.objectExpression([
                t.objectProperty(
                  t.identifier('name'),
                  t.stringLiteral(memoIdentifier.name),
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
        memoIdentifier,
        'createMemo',
        [
          normalIdentifier,
          t.identifier('undefined'),
          t.objectExpression([
            t.objectProperty(
              t.identifier('name'),
              t.stringLiteral(memoIdentifier.name),
            ),
          ]),
        ],
      );
    }
  } else if (optionsIdentifier) {
    accessorVariableExpression(
      state,
      path,
      memoIdentifier,
      'createMemo',
      [
        normalIdentifier,
        t.identifier('undefined'),
        optionsIdentifier,
      ],
    );
  } else {
    accessorVariableExpression(
      state,
      path,
      memoIdentifier,
      'createMemo',
      [
        normalIdentifier,
      ],
    );
  }
}
