import type * as babel from '@babel/core';
import * as t from '@babel/types';
import { derefSignal } from './deref-signal';
import { generateUniqueName } from './generate-unique-name';
import { getImportIdentifier } from './get-import-identifier';
import type { State } from './types';

export function signalVariable(
  state: State,
  path: babel.NodePath,
  signalIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
  optionsIdentifier?: t.Expression,
): t.VariableDeclarator {
  const readIdentifier = generateUniqueName(path, signalIdentifier.name);
  const writeIdentifier = generateUniqueName(
    path,
    `set${signalIdentifier.name}`,
  );

  const callee = getImportIdentifier(state, path, 'createSignal', 'solid-js');
  const args: t.Expression[] = [stateIdentifier];

  if (state.opts.dev) {
    const nameOption = t.objectExpression([
      t.objectProperty(
        t.identifier('name'),
        t.stringLiteral(signalIdentifier.name),
      ),
    ]);
    if (optionsIdentifier) {
      args.push(
        t.callExpression(
          t.memberExpression(t.identifier('Object'), t.identifier('assign')),
          [nameOption, optionsIdentifier],
        ),
      );
    } else {
      args.push(nameOption);
    }
  } else if (optionsIdentifier) {
    args.push(optionsIdentifier);
  }

  derefSignal(path, signalIdentifier, readIdentifier, writeIdentifier);

  return t.variableDeclarator(
    t.arrayPattern([readIdentifier, writeIdentifier]),
    t.callExpression(callee, args),
  );
}
