import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import getHookIdentifier from './get-hook-identifier';
import normalizeBindings from './normalize-bindings';
import { ImportHook } from './types';

export default function destructureVariableExpression(
  hook: ImportHook,
  path: NodePath<t.VariableDeclarator>,
  target: t.Expression,
  pattern: t.ObjectPattern,
  replace = true,
): void {
  const localIdentifier = path.scope.generateUidIdentifier('local');
  const otherIdentifier = path.scope.generateUidIdentifier('other');

  const properties: t.Expression[] = [];
  let restIdentifier: t.Identifier | undefined;
  for (let i = 0, len = pattern.properties.length; i < len; i += 1) {
    const property = pattern.properties[i];
    if (t.isObjectProperty(property)) {
      const { key, value } = property;

      if (t.isIdentifier(key)) {
        properties.push(t.stringLiteral(key.name));
      } else {
        properties.push(key);
      }

      const newIdentifier = t.memberExpression(
        localIdentifier,
        key,
      );

      if (t.isObjectPattern(value)) {
        destructureVariableExpression(hook, path, newIdentifier, value, false);
      } else if (t.isIdentifier(value)) {
        path.scope.path.traverse(normalizeBindings(
          path.scope.path,
          newIdentifier,
          value,
        ));
      } else {
        throw new Error('Expected object pattern or identifier');
      }
    } else if (t.isIdentifier(property.argument)) {
      restIdentifier = property.argument;
    }
  }

  const expr = t.variableDeclarator(
    t.arrayPattern([localIdentifier, otherIdentifier]),
    t.callExpression(
      getHookIdentifier(hook, path, 'splitProps'),
      [target, t.arrayExpression(properties)],
    ),
  );

  if (replace) {
    path.replaceWith(expr);
  } else {
    path.insertAfter(expr);
  }

  if (restIdentifier) {
    path.scope.path.traverse(normalizeBindings(
      path.scope.path,
      otherIdentifier,
      restIdentifier,
    ));
  }
}
