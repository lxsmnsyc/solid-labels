import type * as babel from '@babel/core';
import * as t from '@babel/types';
import { accessorVariable } from './accessor-variable';
import { getImportIdentifier } from './get-import-identifier';
import type { State } from './types';

export function deferredVariable(
  state: State,
  path: babel.NodePath,
  deferredIdentifier: t.Identifier,
  stateIdentifier: t.Expression = t.identifier('undefined'),
  optionsIdentifier: t.Expression | undefined = undefined,
): t.VariableDeclarator {
  const normalIdentifier = t.arrowFunctionExpression([], stateIdentifier);
  const args: t.Expression[] = [normalIdentifier];
  if (state.opts.dev) {
    if (optionsIdentifier) {
      args.push(
        t.callExpression(
          t.memberExpression(t.identifier('Object'), t.identifier('assign')),
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
      );
    } else {
      args.push(
        t.objectExpression([
          t.objectProperty(
            t.identifier('name'),
            t.stringLiteral(deferredIdentifier.name),
          ),
        ]),
      );
    }
  } else if (optionsIdentifier) {
    args.push(optionsIdentifier);
  }
  return accessorVariable(
    path,
    deferredIdentifier,
    getImportIdentifier(state, path, 'createDeferred', 'solid-js'),
    args,
  );
}
