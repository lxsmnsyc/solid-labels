import * as t from '@babel/types';

export function isYielded(node: t.Expression | t.SpreadElement): boolean {
  // Default
  if (t.isYieldExpression(node)) {
    return true;
  }
  if (t.isTemplateLiteral(node)) {
    return node.expressions.some(
      expr => t.isExpression(expr) && isYielded(expr),
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
    return isYielded(node.tag) || isYielded(node.quasi);
  }
  if (
    t.isUnaryExpression(node) ||
    t.isUpdateExpression(node) ||
    t.isSpreadElement(node)
  ) {
    return isYielded(node.argument);
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
    return isYielded(node.expression);
  }
  // Check for elements
  if (t.isArrayExpression(node) || t.isTupleExpression(node)) {
    return node.elements.some(el => el != null && isYielded(el));
  }
  // Skip arrow function
  if (t.isAssignmentExpression(node)) {
    if (isYielded(node.right)) {
      return true;
    }
    if (t.isExpression(node.left)) {
      return isYielded(node.left);
    }
    return false;
  }
  if (t.isBinaryExpression(node)) {
    if (t.isExpression(node.left) && isYielded(node.left)) {
      return true;
    }
    return isYielded(node.right);
  }
  if (
    t.isCallExpression(node) ||
    t.isOptionalCallExpression(node) ||
    t.isNewExpression(node)
  ) {
    if (t.isExpression(node.callee) && isYielded(node.callee)) {
      return true;
    }
    return node.arguments.some(
      arg =>
        arg &&
        (t.isSpreadElement(arg) || t.isExpression(arg)) &&
        isYielded(arg),
    );
  }
  if (t.isConditionalExpression(node)) {
    return (
      isYielded(node.test) ||
      isYielded(node.consequent) ||
      isYielded(node.alternate)
    );
  }
  if (t.isLogicalExpression(node)) {
    return isYielded(node.left) || isYielded(node.right);
  }
  if (t.isMemberExpression(node) || t.isOptionalMemberExpression(node)) {
    return (
      isYielded(node.object) ||
      (node.computed &&
        t.isExpression(node.property) &&
        isYielded(node.property))
    );
  }
  if (t.isSequenceExpression(node)) {
    return node.expressions.some(isYielded);
  }
  if (t.isObjectExpression(node) || t.isRecordExpression(node)) {
    return node.properties.some(prop => {
      if (t.isObjectProperty(prop)) {
        if (t.isExpression(prop.value) && isYielded(prop.value)) {
          return true;
        }
        if (prop.computed && t.isExpression(prop.key) && isYielded(prop.key)) {
          return true;
        }
        return false;
      }
      if (t.isSpreadElement(prop)) {
        return isYielded(prop);
      }
      return false;
    });
  }
  if (t.isBindExpression(node)) {
    return isYielded(node.object) || isYielded(node.callee);
  }
  return false;
}
