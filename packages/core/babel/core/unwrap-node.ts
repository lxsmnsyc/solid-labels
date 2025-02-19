import type { NodePath } from '@babel/traverse';
import type * as t from '@babel/types';

type TypeFilter<K extends t.Node> = (node: t.Node) => node is K;

type TypeCheck<K> = K extends TypeFilter<infer U> ? U : never;

type NestedExpression =
  | t.ParenthesizedExpression
  | t.TypeCastExpression
  | t.TSAsExpression
  | t.TSSatisfiesExpression
  | t.TSNonNullExpression
  | t.TSInstantiationExpression
  | t.TSTypeAssertion;

function isNestedExpression(node: t.Node): node is NestedExpression {
  switch (node.type) {
    case 'ParenthesizedExpression':
    case 'TypeCastExpression':
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
    case 'TSTypeAssertion':
    case 'TSInstantiationExpression':
      return true;
    default:
      return false;
  }
}

export function isPathValid<V extends t.Node>(
  path: unknown,
  key: TypeFilter<V>,
): path is NodePath<V> {
  return key((path as NodePath).node);
}

export function unwrapNode<K extends (node: t.Node) => boolean>(
  node: t.Node,
  key: K,
): TypeCheck<K> | undefined {
  if (key(node)) {
    return node as TypeCheck<K>;
  }
  if (isNestedExpression(node)) {
    return unwrapNode(node.expression, key);
  }
  return undefined;
}

export function getProperParentPath<K extends (node: t.Node) => boolean>(
  path: NodePath,
  key: K,
): NodePath<TypeCheck<K>> | undefined {
  let parent = path.parentPath;

  while (parent) {
    if (isNestedExpression(parent.node)) {
      parent = parent.parentPath;
    } else if (key(parent.node)) {
      return parent as NodePath<TypeCheck<K>>;
    } else {
      return undefined;
    }
  }

  return undefined;
}
