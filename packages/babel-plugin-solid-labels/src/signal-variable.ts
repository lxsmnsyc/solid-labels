import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import derefSignalExpression from './deref-signal-expression';
import getHookIdentifier from './get-hook-identifier';
import { ImportHook } from './types';

export default function signalVariableExpression(
  hooks: ImportHook,
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
  path.node.init = t.callExpression(
    getHookIdentifier(hooks, path, 'createSignal'),
    [
      stateIdentifier,
      t.objectExpression([
        t.objectProperty(
          t.identifier('name'),
          t.stringLiteral(signalIdentifier.name),
        ),
        ...(optionsIdentifier ? [t.spreadElement(optionsIdentifier)] : <t.SpreadElement[]>[]),
      ]),
    ],
  );

  derefSignalExpression(
    path,
    signalIdentifier,
    readIdentifier,
    writeIdentifier,
  );
}
