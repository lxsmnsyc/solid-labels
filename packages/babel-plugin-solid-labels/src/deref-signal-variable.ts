import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import derefSignalExpression from './deref-signal-expression';

export default function derefSignalVariableExpression(
  path: NodePath<t.VariableDeclarator>,
  signalIdentifier: t.Identifier,
  stateIdentifier: t.Expression,
): void {
  const readIdentifier = path.scope.generateUidIdentifier(signalIdentifier.name);
  const writeIdentifier = path.scope.generateUidIdentifier(`set${signalIdentifier.name}`);

  path.node.id = t.arrayPattern([
    readIdentifier,
    writeIdentifier,
  ]);
  path.node.init = stateIdentifier;

  derefSignalExpression(
    path,
    signalIdentifier,
    readIdentifier,
    writeIdentifier,
  );
}
