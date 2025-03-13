import * as t from '@babel/types';

export function isStatic(
  node:
    | t.Expression
    | t.SpreadElement
    | t.AssignmentPattern
    | t.ArrayPattern
    | t.ObjectPattern
    | t.RestElement,
): boolean {
  // The following types are singular nested expressions
  if (
    t.isParenthesizedExpression(node) ||
    t.isTypeCastExpression(node) ||
    t.isTSAsExpression(node) ||
    t.isTSSatisfiesExpression(node) ||
    t.isTSNonNullExpression(node) ||
    t.isTSTypeAssertion(node) ||
    t.isTSInstantiationExpression(node)
  ) {
    return isStatic(node.expression);
  }
  // Same as above
  if (
    t.isUnaryExpression(node) ||
    t.isUpdateExpression(node) ||
    t.isSpreadElement(node)
  ) {
    return isStatic(node.argument);
  }
  if (t.isRestElement(node)) {
    if (t.isTSParameterProperty(node.argument)) {
      return false;
    }
    return isStatic(node.argument);
  }
  if (t.isLiteral(node)) {
    if (t.isTemplateLiteral(node)) {
      return node.expressions.every(expr => {
        if (t.isExpression(expr)) {
          return isStatic(expr);
        }
        return false;
      });
    }
    return true;
  }
  // The following types are always static
  if (
    t.isIdentifier(node) ||
    t.isArrowFunctionExpression(node) ||
    t.isFunctionExpression(node)
    // ||
    // t.isJSXElement(node) ||
    // t.isJSXFragment(node)
  ) {
    return true;
  }
  // Arrays and tuples might have static values
  if (t.isArrayExpression(node) || t.isTupleExpression(node)) {
    return node.elements.every(el => {
      if (el) {
        return isStatic(el);
      }
      return true;
    });
  }
  if (t.isArrayPattern(node)) {
    return node.elements.every(el => {
      if (t.isTSParameterProperty(el)) {
        return false;
      }
      if (el) {
        return isStatic(el);
      }
      return true;
    });
  }
  if (t.isObjectExpression(node) || t.isRecordExpression(node)) {
    return node.properties.every(prop => {
      if (t.isObjectProperty(prop)) {
        if (t.isExpression(prop.value) && isStatic(prop.value)) {
          return true;
        }
        if (prop.computed && t.isExpression(prop.key) && isStatic(prop.key)) {
          return true;
        }
        return false;
      }
      if (t.isSpreadElement(prop)) {
        return isStatic(prop);
      }
      // Ignore
      return true;
    });
  }
  if (t.isObjectPattern(node)) {
    return node.properties.every(prop => {
      if (t.isObjectProperty(prop)) {
        if (!t.isTSTypeParameter(prop.value) && isStatic(prop.value)) {
          return true;
        }
        if (prop.computed && t.isExpression(prop.key) && isStatic(prop.key)) {
          return true;
        }
        return false;
      }
      if (t.isSpreadElement(prop)) {
        return isStatic(prop);
      }
      // Ignore
      return true;
    });
  }
  if (t.isAssignmentExpression(node) || t.isAssignmentPattern(node)) {
    if (isStatic(node.right)) {
      return true;
    }
    if (!t.isTSParameterProperty(node.left)) {
      return false;
    }
    return isStatic(node);
  }
  if (t.isSequenceExpression(node)) {
    return node.expressions.every(isStatic);
  }
  if (t.isConditionalExpression(node)) {
    return (
      isStatic(node.test) ||
      isStatic(node.consequent) ||
      isStatic(node.alternate)
    );
  }
  if (t.isBinaryExpression(node)) {
    if (t.isExpression(node.left)) {
      return isStatic(node.left);
    }
    if (t.isExpression(node.right)) {
      return isStatic(node.right);
    }
    return false;
  }
  if (t.isLogicalExpression(node)) {
    return isStatic(node.left) || isStatic(node.right);
  }
  return false;
}
