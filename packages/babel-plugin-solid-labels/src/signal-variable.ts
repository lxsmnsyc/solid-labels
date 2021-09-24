import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import derefSignalExpression from './deref-signal-expression';
import getHookIdentifier from './get-hook-identifier';
import { State } from './types';

export default function signalVariableExpression(
  state: State,
  path: NodePath<t.VariableDeclarator>,
  signalIdentifier: t.Identifier,
  stateIdentifier: t.Expression = t.identifier('undefined'),
  optionsIdentifier?: t.Expression,
): void {
  const readIdentifier = path.scope.generateUidIdentifier(signalIdentifier.name);
  const writeIdentifier = path.scope.generateUidIdentifier(`set${signalIdentifier.name}`);

  path.node.id = t.arrayPattern([
    readIdentifier,
    writeIdentifier,
  ]);
  if (state.opts.dev) {
    if (optionsIdentifier) {
      path.node.init = t.callExpression(
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
      path.node.init = t.callExpression(
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
    path.node.init = t.callExpression(
      getHookIdentifier(state.hooks, path, 'createSignal'),
      [
        stateIdentifier,
        optionsIdentifier,
      ],
    );
  } else {
    path.node.init = t.callExpression(
      getHookIdentifier(state.hooks, path, 'createSignal'),
      [
        stateIdentifier,
      ],
    );
  }

  derefSignalExpression(
    path,
    signalIdentifier,
    readIdentifier,
    writeIdentifier,
  );
}
