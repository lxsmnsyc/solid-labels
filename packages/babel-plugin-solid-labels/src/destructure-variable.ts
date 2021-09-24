import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { unexpectedType } from './errors';
import getHookIdentifier from './get-hook-identifier';
import normalizeBindings from './normalize-bindings';
import { State } from './types';

export default function destructureVariableExpression(
  state: State,
  path: NodePath<t.VariableDeclarator>,
  target: t.Expression,
  pattern: t.ObjectPattern | t.ArrayPattern,
  replace = true,
): void {
  const otherIdentifier = path.scope.generateUidIdentifier('other');

  const properties: t.Expression[] = [];
  let restIdentifier: t.Identifier | undefined;

  if (t.isObjectPattern(pattern)) {
    for (let i = 0, len = pattern.properties.length; i < len; i += 1) {
      const property = pattern.properties[i];
      if (t.isObjectProperty(property)) {
        const { value, key } = property;

        if (!property.computed) {
          if (t.isIdentifier(key)) {
            properties.push(t.stringLiteral(key.name));
          }
        } else {
          properties.push(key);
        }

        const newIdentifier = path.scope.generateUidIdentifier('prop');
        path.insertBefore(
          t.variableDeclarator(
            newIdentifier,
            t.arrowFunctionExpression(
              [],
              t.memberExpression(
                target,
                key,
                property.computed,
              ),
            ),
          ),
        );

        if (t.isObjectPattern(value) || t.isArrayPattern(value)) {
          destructureVariableExpression(
            state,
            path,
            t.callExpression(newIdentifier, []),
            value,
            false,
          );
        } else if (t.isIdentifier(value)) {
          path.scope.path.traverse(normalizeBindings(
            path.scope.path,
            t.callExpression(newIdentifier, []),
            value,
          ));
        } else if (t.isAssignmentPattern(value)) {
          // TODO
        } else {
          throw unexpectedType(path, value.type, 'Identifier | ObjectPattern | ArrayPattern');
        }
      } else if (t.isIdentifier(property.argument)) {
        restIdentifier = property.argument;
      }
    }
  } else {
    for (let i = 0, len = pattern.elements.length; i < len; i += 1) {
      const property = pattern.elements[i];
      if (property) {
        const keyExpr = t.numericLiteral(i);

        const newIdentifier = path.scope.generateUidIdentifier('prop');
        path.insertBefore(
          t.variableDeclarator(
            newIdentifier,
            t.arrowFunctionExpression(
              [],
              t.memberExpression(
                target,
                keyExpr,
                true,
              ),
            ),
          ),
        );
        if (t.isIdentifier(property)) {
          path.scope.path.traverse(normalizeBindings(
            path.scope.path,
            t.callExpression(newIdentifier, []),
            property,
          ));
        } else if (t.isArrayPattern(property) || t.isObjectPattern(property)) {
          destructureVariableExpression(
            state,
            path,
            t.callExpression(newIdentifier, []),
            property,
            false,
          );
        } else if (t.isRestElement(property)) {
          if (t.isIdentifier(property.argument)) {
            restIdentifier = property.argument;
          }
        } else {
          // TODO AssignmentExpresison
        }
      }
    }
  }

  const expr = t.variableDeclarator(
    otherIdentifier,
    (
      properties.length
        ? (
          t.memberExpression(
            t.callExpression(
              getHookIdentifier(state.hooks, path, 'splitProps'),
              [target, t.arrayExpression(properties)],
            ),
            t.numericLiteral(1),
            true,
          )
        )
        : target
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
