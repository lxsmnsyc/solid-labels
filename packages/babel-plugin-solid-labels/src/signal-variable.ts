import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import derefSignalExpression from './deref-signal-expression';
import getHookIdentifier from './get-hook-identifier';
import { State } from './types';

export default function signalVariableExpression(
  state: State,
  path: NodePath<t.VariableDeclarator>,
  signalIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
  optionsIdentifier?: t.Expression,
): void {
  const readIdentifier = path.scope.generateUidIdentifier(signalIdentifier.name);
  const writeIdentifier = path.scope.generateUidIdentifier(`set${signalIdentifier.name}`);

  const id: t.ArrayPattern = t.arrayPattern([
    readIdentifier,
    writeIdentifier,
  ]);
  let init: t.CallExpression;
  if (state.opts.dev) {
    if (optionsIdentifier) {
      init = t.callExpression(
        getHookIdentifier(state.hooks, path, 'createSignal'),
        [
          stateIdentifier,
          t.callExpression(
            t.memberExpression(
              t.identifier('Object'),
              t.identifier('assign'),
            ),
            [
              t.objectExpression([
                t.objectProperty(
                  t.identifier('name'),
                  t.stringLiteral(signalIdentifier.name),
                ),
              ]),
              optionsIdentifier,
            ],
          ),
        ],
      );
    } else {
      init = t.callExpression(
        getHookIdentifier(state.hooks, path, 'createSignal'),
        [
          stateIdentifier,
          t.objectExpression([
            t.objectProperty(
              t.identifier('name'),
              t.stringLiteral(signalIdentifier.name),
            ),
          ]),
        ],
      );
    }
  } else if (optionsIdentifier) {
    init = t.callExpression(
      getHookIdentifier(state.hooks, path, 'createSignal'),
      [
        stateIdentifier,
        optionsIdentifier,
      ],
    );
  } else {
    init = t.callExpression(
      getHookIdentifier(state.hooks, path, 'createSignal'),
      [
        stateIdentifier,
      ],
    );
  }

  path.replaceWith(t.variableDeclarator(
    id,
    init,
  ));

  derefSignalExpression(
    state,
    path,
    signalIdentifier,
    readIdentifier,
    writeIdentifier,
  );
}
