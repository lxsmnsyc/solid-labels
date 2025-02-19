import type * as babel from '@babel/core';
import * as t from '@babel/types';
import { derefMemo } from './deref-memo';
import { unexpectedType } from './errors';
import { generateUniqueName } from './generate-unique-name';
import { getImportIdentifier } from './get-import-identifier';
import { isStatic } from './is-static';
import type { State } from './types';
import { unwrapNode } from './unwrap-node';

export function destructureVariable(
  state: State,
  path: babel.NodePath,
  target: t.Expression,
  pattern: t.ObjectPattern | t.ArrayPattern,
  defaultValue?: t.Expression,
): t.VariableDeclarator[] {
  const otherIdentifier = generateUniqueName(path, 'other');
  let declarators: t.VariableDeclarator[] = [];
  const properties: t.Expression[] = [];
  let restIdentifier: t.Identifier | undefined;

  // Destructuring for object patterns
  if (t.isObjectPattern(pattern)) {
    for (let i = 0, len = pattern.properties.length; i < len; i++) {
      const property = pattern.properties[i];
      // Check if this is an object property
      if (t.isObjectProperty(property)) {
        const { value, key } = property;

        if (!property.computed) {
          if (t.isIdentifier(key)) {
            properties.push(t.stringLiteral(key.name));
          }
        } else if (t.isPrivateName(key)) {
          throw unexpectedType(path, 'PrivateName', 'Expression');
        } else {
          properties.push(key);
        }

        // Create a new identifier for the destructure variable
        const newIdentifier = generateUniqueName(path, 'prop');
        let access: t.Expression | t.BlockStatement = t.memberExpression(
          target,
          key,
          property.computed,
        );
        let defaultIdentifier: t.Identifier | undefined;
        if (t.isAssignmentPattern(value)) {
          defaultIdentifier = generateUniqueName(path, 'def');
          const isStaticValue = isStatic(value.right);
          const defValue = isStaticValue
            ? value.right
            : t.callExpression(
                getImportIdentifier(state, path, 'createMemo', 'solid-js'),
                [t.arrowFunctionExpression([], value.right)],
              );
          declarators.push(t.variableDeclarator(defaultIdentifier, defValue));
          const valueIdentifier = generateUniqueName(path, 'value');
          access = t.blockStatement([
            t.variableDeclaration('const', [
              t.variableDeclarator(valueIdentifier, access),
            ]),
            t.returnStatement(
              t.conditionalExpression(
                t.binaryExpression(
                  '===',
                  valueIdentifier,
                  t.identifier('undefined'),
                ),
                isStaticValue
                  ? defaultIdentifier
                  : t.callExpression(defaultIdentifier, []),
                valueIdentifier,
              ),
            ),
          ]);
        }
        declarators.push(
          t.variableDeclarator(
            newIdentifier,
            t.arrowFunctionExpression([], access),
          ),
        );

        // If the value is an object or array pattern
        // destructure that value again
        // e.g. { x: { y, z }} = w;
        if (t.isObjectPattern(value) || t.isArrayPattern(value)) {
          declarators = [
            ...declarators,
            ...destructureVariable(
              state,
              path,
              t.callExpression(newIdentifier, []),
              value,
            ),
          ];
        } else if (t.isIdentifier(value)) {
          // If the value is just a normal identifier
          // e.g. { x: y } = w;
          // normalize bindings
          derefMemo(path, value, newIdentifier);
        } else if (t.isAssignmentPattern(value)) {
          if (t.isIdentifier(value.left)) {
            // If the value has a default value
            derefMemo(path, value.left, newIdentifier);
          } else if (
            t.isArrayPattern(value.left) ||
            t.isObjectPattern(value.left)
          ) {
            // Otherwise it's just another array/object
            declarators = [
              ...declarators,
              ...destructureVariable(
                state,
                path,
                t.callExpression(newIdentifier, []),
                value.left,
                defaultIdentifier,
              ),
            ];
          }
        } else {
          throw unexpectedType(
            path,
            value.type,
            'Identifier | ObjectPattern | ArrayPattern',
          );
        }
      } else {
        // or it's a rest element
        // make sure that it is an identifier though
        const trueIdentifier = unwrapNode(property.argument, t.isIdentifier);
        if (trueIdentifier) {
          restIdentifier = trueIdentifier;
        }
      }
    }
  } else {
    // Destructure for arrays
    for (let i = 0, len = pattern.elements.length; i < len; i++) {
      const property = pattern.elements[i];
      if (property) {
        const keyExpr = t.numericLiteral(i);

        const newIdentifier = generateUniqueName(path, 'prop');
        let access: t.Expression | t.BlockStatement = t.memberExpression(
          target,
          keyExpr,
          true,
        );
        let defaultIdentifier: t.Identifier | undefined;
        if (t.isAssignmentPattern(property)) {
          defaultIdentifier = generateUniqueName(path, 'def');
          const isStaticValue = isStatic(property.right);
          const defValue = isStaticValue
            ? property.right
            : t.callExpression(
                getImportIdentifier(state, path, 'createMemo', 'solid-js'),
                [t.arrowFunctionExpression([], property.right)],
              );
          declarators.push(t.variableDeclarator(defaultIdentifier, defValue));
          const valueIdentifier = generateUniqueName(path, 'value');
          access = t.blockStatement([
            t.variableDeclaration('const', [
              t.variableDeclarator(valueIdentifier, access),
            ]),
            t.returnStatement(
              t.conditionalExpression(
                t.binaryExpression(
                  '===',
                  valueIdentifier,
                  t.identifier('undefined'),
                ),
                isStaticValue
                  ? defaultIdentifier
                  : t.callExpression(defaultIdentifier, []),
                valueIdentifier,
              ),
            ),
          ]);
        }
        declarators.push(
          t.variableDeclarator(
            newIdentifier,
            t.arrowFunctionExpression([], access),
          ),
        );

        properties.push(keyExpr);

        if (t.isIdentifier(property)) {
          derefMemo(path, property, newIdentifier);
        } else if (t.isAssignmentPattern(property)) {
          if (t.isIdentifier(property.left)) {
            derefMemo(path, property.left, newIdentifier);
          } else if (
            t.isArrayPattern(property.left) ||
            t.isObjectPattern(property.left)
          ) {
            // Otherwise it's just another array/object
            declarators = [
              ...declarators,
              ...destructureVariable(
                state,
                path,
                t.callExpression(newIdentifier, []),
                property.left,
                defaultIdentifier,
              ),
            ];
          }
        } else if (t.isArrayPattern(property) || t.isObjectPattern(property)) {
          // Otherwise it's just another array/object
          declarators = [
            ...declarators,
            ...destructureVariable(
              state,
              path,
              t.callExpression(newIdentifier, []),
              property,
            ),
          ];
        } else if (t.isRestElement(property)) {
          const trueIdentifier = unwrapNode(property.argument, t.isIdentifier);
          if (trueIdentifier) {
            restIdentifier = trueIdentifier;
          }
        }
      }
    }
  }

  const expr = t.variableDeclarator(
    otherIdentifier,
    properties.length
      ? t.memberExpression(
          t.callExpression(
            getImportIdentifier(state, path, 'splitProps', 'solid-js'),
            [
              defaultValue != null
                ? t.callExpression(
                    getImportIdentifier(state, path, 'mergeProps', 'solid-js'),
                    [target, defaultValue],
                  )
                : target,
              t.arrayExpression(properties),
            ],
          ),
          t.numericLiteral(1),
          true,
        )
      : target,
  );

  declarators.push(expr);

  if (restIdentifier) {
    const binding = path.scope.getBinding(restIdentifier.name);
    if (binding) {
      for (const ref of binding.referencePaths) {
        ref.replaceWith(otherIdentifier);
      }
    }
  }

  return declarators;
}
