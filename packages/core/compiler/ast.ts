export interface Node {
  type: string;
  start: number;
  end: number;
  // Structural AST typing.
  [key: string]: any;
}

/** Keys that hold TypeScript type-space nodes; never traversed. */
const TYPE_KEYS = new Set([
  'typeAnnotation',
  'typeArguments',
  'typeParameters',
  'returnType',
  'superTypeArguments',
  'implements',
]);

function isNode(value: unknown): value is Node {
  return value != null && typeof value === 'object' && typeof (value as Node).type === 'string';
}

/** Invokes `cb` for every direct child node, skipping TypeScript type-space keys. */
export function eachChild(node: Node, cb: (child: Node) => void): void {
  for (const key of Object.keys(node)) {
    if (TYPE_KEYS.has(key)) {
      continue;
    }
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) {
          cb(item);
        }
      }
    } else if (isNode(value)) {
      cb(value);
    }
  }
}

const EXPRESSION_WRAPPERS = new Set([
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSTypeAssertion',
  'TSInstantiationExpression',
]);

/** Peels parentheses and TypeScript expression wrappers. */
export function unwrap(node: Node | null | undefined): Node | null {
  let current = node ?? null;
  while (current && EXPRESSION_WRAPPERS.has(current.type)) {
    current = current.expression;
  }
  return current;
}

/** True for the wrappers peeled by `unwrap` (kept as-is in the output). */
export function isWrapper(node: Node): boolean {
  return EXPRESSION_WRAPPERS.has(node.type);
}

/** True for any function-like node (arrow, function expression, or declaration). */
export function isFunctionNode(node: Node | null): boolean {
  return (
    node != null &&
    (node.type === 'ArrowFunctionExpression' ||
      node.type === 'FunctionExpression' ||
      node.type === 'FunctionDeclaration')
  );
}

/** True if the node contains a top-level await/yield (does not enter nested functions). */
export function containsAwaitOrYield(node: Node): boolean {
  let found = false;
  const visit = (current: Node): void => {
    if (found) {
      return;
    }
    if (current.type === 'AwaitExpression' || current.type === 'YieldExpression') {
      found = true;
      return;
    }
    if (isFunctionNode(current)) {
      return;
    }
    eachChild(current, visit);
  };
  visit(node);
  return found;
}

/** True when evaluating the expression is cheap and side-effect free. */
export function isStaticExpression(node: Node | null): boolean {
  const current = unwrap(node);
  if (!current) {
    return false;
  }
  switch (current.type) {
    case 'Literal':
    case 'Identifier':
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return true;
    case 'TemplateLiteral':
      return current.expressions.length === 0;
    case 'UnaryExpression':
      return isStaticExpression(current.argument);
    case 'BinaryExpression':
    case 'LogicalExpression':
      return isStaticExpression(current.left) && isStaticExpression(current.right);
    case 'ConditionalExpression':
      return (
        isStaticExpression(current.test) &&
        isStaticExpression(current.consequent) &&
        isStaticExpression(current.alternate)
      );
    case 'ArrayExpression':
      return current.elements.every((el: Node | null) => el == null || isStaticExpression(el));
    case 'ObjectExpression':
      return current.properties.every((prop: Node) => {
        if (prop.type === 'Property') {
          return (!prop.computed || isStaticExpression(prop.key)) && isStaticExpression(prop.value);
        }
        return false;
      });
    default:
      return false;
  }
}

/**
 * Expands a span outwards over wrapping parentheses.
 * oxc strips ParenthesizedExpression nodes when `preserveParens` is off,
 * but the characters remain in the source.
 */
const WHITESPACE = /\s/;

export function expandParens(
  code: string,
  start: number,
  end: number,
  lowerBound: number,
  upperBound: number = code.length,
): [number, number] {
  let currentStart = start;
  let currentEnd = end;
  for (;;) {
    let before = currentStart - 1;
    while (before >= lowerBound && WHITESPACE.test(code[before])) {
      before--;
    }
    let after = currentEnd;
    while (after < code.length && WHITESPACE.test(code[after])) {
      after++;
    }
    if (before >= lowerBound && after < upperBound && code[before] === '(' && code[after] === ')') {
      currentStart = before;
      currentEnd = after + 1;
    } else {
      return [currentStart, currentEnd];
    }
  }
}
