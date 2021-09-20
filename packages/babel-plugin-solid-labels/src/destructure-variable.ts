import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import normalizeBindings from './normalize-bindings';

function destructureNormalize(
  path: NodePath,
  baseExpr: t.Expression,
  pattern: t.ObjectPattern,
): void {
  for (let i = 0, len = pattern.properties.length; i < len; i += 1) {
    const property = pattern.properties[i];
    if (t.isObjectProperty(property)) {
      const { key, value } = property;

      const newIdentifier = t.memberExpression(
        baseExpr,
        key,
      );

      if (t.isObjectPattern(value)) {
        destructureNormalize(path, newIdentifier, value);
      } else if (t.isIdentifier(value)) {
        path.traverse(normalizeBindings(
          path,
          newIdentifier,
          value,
        ));
      } else {
        throw new Error('Expected object pattern or identifier');
      }
    } else {
      throw new Error('Expected object property');
    }
  }
}

export default function destructureVariableExpression(
  path: NodePath<t.VariableDeclarator>,
  target: t.Expression,
  pattern: t.ObjectPattern,
): void {
  if (t.isIdentifier(target)) {
    destructureNormalize(path.scope.path, target, pattern);
    path.remove();
  } else {
    const targetIdentifier = path.scope.generateUidIdentifier();

    // Create replacement
    path.node.id = targetIdentifier;
    path.node.init = target;

    destructureNormalize(path.scope.path, targetIdentifier, pattern);
  }
}
