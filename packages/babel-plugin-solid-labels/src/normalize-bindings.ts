import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';

export default function normalizeBindings(
  path: NodePath,
  replacement: t.Expression,
  targetIdentifier: t.Identifier,
): Visitor {
  return {
    ObjectProperty(p) {
      if (p.scope !== path.scope && p.scope.hasOwnBinding(targetIdentifier.name)) {
        return;
      }
      if (
        p.node.shorthand
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
    Identifier(p) {
      if (p.node.name !== targetIdentifier.name) {
        return;
      }
      if (p.scope !== path.scope && p.scope.hasOwnBinding(targetIdentifier.name)) {
        return;
      }
      // { x }
      if (t.isObjectMethod(p.parent) && p.parent.key === p.node) {
        return;
      }
      if (t.isObjectProperty(p.parent) && p.parent.key === p.node) {
        return;
      }
      // const x
      if (t.isVariableDeclarator(p.parent)) {
        if (p.parent.id === p.node) {
          return;
        }
      }
      // const [x]
      if (t.isArrayPattern(p.parent) && p.parent.elements.includes(p.node)) {
        return;
      }
      // (x) => {}
      if (t.isArrowFunctionExpression(p.parent) && p.parent.params.includes(p.node)) {
        return;
      }
      // function (x)
      if (t.isFunctionExpression(p.parent) && p.parent.params.includes(p.node)) {
        return;
      }
      if (t.isFunctionDeclaration(p.parent) && p.parent.params.includes(p.node)) {
        return;
      }
      // x:
      if (t.isLabeledStatement(p.parent) && p.parent.label === p.node) {
        return;
      }
      // obj.x
      if (t.isMemberExpression(p.parent) && !p.parent.computed && p.parent.property === p.node) {
        return;
      }
      // function x() {}
      if (t.isFunctionDeclaration(p.parent) && p.parent.id === p.node) {
        return;
      }
      // (y = x) => {}
      // function z(y = x) {}
      if (
        t.isAssignmentPattern(p.parent)
        && p.parent.left === p.node
        && (
          (
            t.isArrowFunctionExpression(p.parentPath.parent)
            && p.parentPath.parent.params.includes(p.parent)
          )
          || (
            t.isFunctionDeclaration(p.parentPath.parent)
            && p.parentPath.parent.params.includes(p.parent)
          )
          || (
            t.isFunctionExpression(p.parentPath.parent)
            && p.parentPath.parent.params.includes(p.parent)
          )
        )
      ) {
        return;
      }
      p.replaceWith(
        replacement,
      );
    },
  };
}
