import type * as babel from '@babel/core';
import * as t from '@babel/types';
import { accessorVariable } from './accessor-variable';
import { getImportIdentifier } from './get-import-identifier';
import type { State } from './types';
import { UNDEFINED } from '../constants';

export function memoVariable(
  state: State,
  path: babel.NodePath,
  memoIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
  optionsIdentifier?: t.Expression,
): t.VariableDeclarator {
  const normalIdentifier =
    t.isArrowFunctionExpression(stateIdentifier) ||
    t.isFunctionExpression(stateIdentifier)
      ? stateIdentifier
      : t.arrowFunctionExpression([], stateIdentifier);

  const exprs: t.Expression[] = [normalIdentifier];

  if (state.opts.dev) {
    exprs.push(UNDEFINED);
    if (optionsIdentifier) {
      exprs.push(
        t.callExpression(
          t.memberExpression(t.identifier('Object'), t.identifier('assign')),
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
      );
    } else {
      exprs.push(
        t.objectExpression([
          t.objectProperty(
            t.identifier('name'),
            t.stringLiteral(memoIdentifier.name),
          ),
        ]),
      );
    }
  } else if (optionsIdentifier) {
    exprs.push(UNDEFINED);
    exprs.push(optionsIdentifier);
  }

  return accessorVariable(
    path,
    memoIdentifier,
    getImportIdentifier(state, path, 'createMemo', 'solid-js'),
    exprs,
  );
}
