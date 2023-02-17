import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';

export default function normalizeBindings(
  path: NodePath,
  replacement: t.Expression,
  targetIdentifier: t.Identifier,
): Visitor {
  return {
    ObjectProperty(p) {
      if (
        !(p.scope !== path.scope && p.scope.hasOwnBinding(targetIdentifier.name))
        && p.node.shorthand
        && t.isIdentifier(p.node.key)
        && p.node.key.name === targetIdentifier.name
        && t.isIdentifier(p.node.value)
        && p.node.value.name === targetIdentifier.name
      ) {
        p.replaceWith(
          t.objectProperty(
            targetIdentifier,
            replacement,
          ),
        );
      }
    },
    Expression(p) {
      if (
        t.isIdentifier(p.node)
        && p.node.name === targetIdentifier.name
        && !(p.scope !== path.scope && p.scope.hasOwnBinding(targetIdentifier.name))
      ) {
        p.replaceWith(
          replacement,
        );
      }
    },
  };
}
