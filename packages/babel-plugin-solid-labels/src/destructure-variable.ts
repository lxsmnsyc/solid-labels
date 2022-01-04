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
  defaultValue?: t.Expression,
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
        let access: t.Expression | t.BlockStatement = (
          t.memberExpression(
            target,
            key,
            property.computed,
          )
        );
        let defaultIdentifier: t.Identifier | undefined;
        if (t.isAssignmentPattern(value)) {
          defaultIdentifier = path.scope.generateUidIdentifier('def');
          path.insertBefore(
            t.variableDeclarator(
              defaultIdentifier,
              t.arrowFunctionExpression([], value.right),
            ),
          );
          const valueIdentifier = path.scope.generateUidIdentifier('value');
          access = (
            t.blockStatement([
              t.variableDeclaration(
                'const',
                [
                  t.variableDeclarator(
                    valueIdentifier,
                    access,
                  ),
                ],
              ),
              t.returnStatement(
                t.conditionalExpression(
                  t.binaryExpression(
                    '==',
                    valueIdentifier,
                    t.nullLiteral(),
                  ),
                  t.callExpression(defaultIdentifier, []),
                  valueIdentifier,
                ),
              ),
            ])
          );
        }
        path.insertBefore(
          t.variableDeclarator(
            newIdentifier,
            t.arrowFunctionExpression(
              [],
              access,
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
          if (t.isIdentifier(value.left)) {
            path.scope.path.traverse(normalizeBindings(
              path.scope.path,
              t.callExpression(newIdentifier, []),
              value.left,
            ));
          } else if (t.isArrayPattern(value.left) || t.isObjectPattern(value.left)) {
            destructureVariableExpression(
              state,
              path,
              t.callExpression(newIdentifier, []),
              value.left,
              false,
              defaultIdentifier,
            );
          } else {
            // TODO Member Expression
          }
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
        let access: t.Expression | t.BlockStatement = (
          t.memberExpression(
            target,
            keyExpr,
            true,
          )
        );
        let defaultIdentifier: t.Identifier | undefined;
        if (t.isAssignmentPattern(property)) {
          defaultIdentifier = path.scope.generateUidIdentifier('def');
          path.insertBefore(
            t.variableDeclarator(
              defaultIdentifier,
              t.arrowFunctionExpression([], property.right),
            ),
          );
          const valueIdentifier = path.scope.generateUidIdentifier('value');
          access = (
            t.blockStatement([
              t.variableDeclaration(
                'const',
                [
                  t.variableDeclarator(
                    valueIdentifier,
                    access,
                  ),
                ],
              ),
              t.returnStatement(
                t.conditionalExpression(
                  t.binaryExpression(
                    '==',
                    valueIdentifier,
                    t.nullLiteral(),
                  ),
                  t.callExpression(defaultIdentifier, []),
                  valueIdentifier,
                ),
              ),
            ])
          );
        }
        path.insertBefore(
          t.variableDeclarator(
            newIdentifier,
            t.arrowFunctionExpression(
              [],
              access,
            ),
          ),
        );

        properties.push(keyExpr);

        if (t.isIdentifier(property)) {
          path.scope.path.traverse(normalizeBindings(
            path.scope.path,
            t.callExpression(newIdentifier, []),
            property,
          ));
        } else if (t.isAssignmentPattern(property)) {
          if (t.isIdentifier(property.left)) {
            path.scope.path.traverse(normalizeBindings(
              path.scope.path,
              t.callExpression(newIdentifier, []),
              property.left,
            ));
          } else if (t.isArrayPattern(property.left) || t.isObjectPattern(property.left)) {
            destructureVariableExpression(
              state,
              path,
              t.callExpression(newIdentifier, []),
              property.left,
              false,
              defaultIdentifier,
            );
          } else {
            // TODO Member Expression
          }
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
              [
                defaultValue != null
                  ? t.callExpression(
                    getHookIdentifier(state.hooks, path, 'mergeProps'),
                    [target, defaultValue],
                  )
                  : target,
                t.arrayExpression(properties),
              ],
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
