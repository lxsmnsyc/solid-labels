import * as t from '@babel/types';

export function isAwaited(node: t.Expression | t.SpreadElement): boolean {
  // Default
  if (t.isAwaitExpression(node)) {
    return true;
  }
  if (t.isTemplateLiteral(node)) {
    return node.expressions.some(
      expr => t.isExpression(expr) && isAwaited(expr),
    );
  }
  if (
    t.isLiteral(node) ||
    t.isIdentifier(node) ||
    t.isArrowFunctionExpression(node) ||
    t.isFunctionExpression(node) ||
    t.isClassExpression(node) ||
    t.isYieldExpression(node) ||
    t.isJSX(node) ||
    t.isMetaProperty(node) ||
    t.isSuper(node) ||
    t.isThisExpression(node) ||
    t.isImport(node) ||
    t.isDoExpression(node)
  ) {
    return false;
  }
  if (t.isTaggedTemplateExpression(node)) {
    return isAwaited(node.tag) || isAwaited(node.quasi);
  }
  if (
    t.isUnaryExpression(node) ||
    t.isUpdateExpression(node) ||
    t.isSpreadElement(node)
  ) {
    return isAwaited(node.argument);
  }
  if (
    t.isParenthesizedExpression(node) ||
    t.isTypeCastExpression(node) ||
    t.isTSAsExpression(node) ||
    t.isTSSatisfiesExpression(node) ||
    t.isTSNonNullExpression(node) ||
    t.isTSTypeAssertion(node) ||
    t.isTSInstantiationExpression(node)
  ) {
    return isAwaited(node.expression);
  }
  // Check for elements
  if (t.isArrayExpression(node) || t.isTupleExpression(node)) {
    return node.elements.some(el => el != null && isAwaited(el));
  }
  // Skip arrow function
  if (t.isAssignmentExpression(node)) {
    if (isAwaited(node.right)) {
      return true;
    }
    if (t.isExpression(node.left)) {
      return isAwaited(node.left);
    }
    return false;
  }
  if (t.isBinaryExpression(node)) {
    if (t.isExpression(node.left) && isAwaited(node.left)) {
      return true;
    }
    return isAwaited(node.right);
  }
  if (
    t.isCallExpression(node) ||
    t.isOptionalCallExpression(node) ||
    t.isNewExpression(node)
  ) {
    if (t.isExpression(node.callee) && isAwaited(node.callee)) {
      return true;
    }
    return node.arguments.some(
      arg =>
        arg &&
        (t.isSpreadElement(arg) || t.isExpression(arg)) &&
        isAwaited(arg),
    );
  }
  if (t.isConditionalExpression(node)) {
    return (
      isAwaited(node.test) ||
      isAwaited(node.consequent) ||
      isAwaited(node.alternate)
    );
  }
  if (t.isLogicalExpression(node)) {
    return isAwaited(node.left) || isAwaited(node.right);
  }
  if (t.isMemberExpression(node) || t.isOptionalMemberExpression(node)) {
    return (
      isAwaited(node.object) ||
      (node.computed &&
        t.isExpression(node.property) &&
        isAwaited(node.property))
    );
  }
  if (t.isSequenceExpression(node)) {
    return node.expressions.some(isAwaited);
  }
  if (t.isObjectExpression(node) || t.isRecordExpression(node)) {
    return node.properties.some(prop => {
      if (t.isObjectProperty(prop)) {
        if (t.isExpression(prop.value) && isAwaited(prop.value)) {
          return true;
        }
        if (prop.computed && t.isExpression(prop.key) && isAwaited(prop.key)) {
          return true;
        }
        return false;
      }
      if (t.isSpreadElement(prop)) {
        return isAwaited(prop);
      }
      return false;
    });
  }
  if (t.isBindExpression(node)) {
    return isAwaited(node.object) || isAwaited(node.callee);
  }
  return false;
}
