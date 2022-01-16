import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import derefSignalExpression from './deref-signal-expression';
import { State } from './types';

export default function derefSignalVariableExpression(
  state: State,
  path: NodePath<t.VariableDeclarator>,
  signalIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
): void {
  const readIdentifier = path.scope.generateUidIdentifier(signalIdentifier.name);
  const writeIdentifier = path.scope.generateUidIdentifier(`set${signalIdentifier.name}`);

  path.replaceWith(t.variableDeclarator(
    t.arrayPattern([
      readIdentifier,
      writeIdentifier,
    ]),
    stateIdentifier,
  ));

  derefSignalExpression(
    state,
    path,
    signalIdentifier,
    readIdentifier,
    writeIdentifier,
  );

  path.scope.crawl();
}
