import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import getHookIdentifier from './get-hook-identifier';
import memoVariableExpression from './memo-variable';
import signalVariableExpression from './signal-variable';
import accessorVariableExpression from './accessor-variable';
import { State } from './types';
import deferredVariableExpression from './deferred-variable';
import destructureVariableExpression from './destructure-variable';
import { unexpectedAssignmentOperator, unexpectedType } from './errors';

type VariableLabelExpression = (
  state: State,
  path: NodePath<t.VariableDeclarator>,
  leftExpr: t.LVal,
  rightExpr: t.Expression | null | undefined,
) => void;

function createVariableLabel(variableExpression: VariableLabelExpression) {
  return (
    state: State,
    path: NodePath<t.LabeledStatement>,
  ) => {
    const { body } = path.node;
    if (t.isExpressionStatement(body)) {
      if (t.isAssignmentExpression(body.expression)) {
        if (body.expression.operator !== '=') {
          throw unexpectedAssignmentOperator(path, body.expression.operator, '=');
        }
        const leftExpr = body.expression.left;
        const rightExpr = body.expression.right;
        if (!t.isIdentifier(leftExpr)) {
          throw unexpectedType(path, leftExpr.type, 'Identifier');
        }
        path.replaceWith(
          t.variableDeclaration(
            'const',
            [
              t.variableDeclarator(
                leftExpr,
                rightExpr,
              ),
            ],
          ),
        );
      } else if (t.isIdentifier(body.expression)) {
        path.replaceWith(
          t.variableDeclaration(
            'const',
            [
              t.variableDeclarator(
                body.expression,
              ),
            ],
          ),
        );
      } else if (t.isSequenceExpression(body.expression)) {
        const exprs: t.VariableDeclarator[] = [];
        for (let i = 0, len = body.expression.expressions.length; i < len; i += 1) {
          const expr = body.expression.expressions[i];

          if (t.isIdentifier(expr)) {
            exprs.push(
              t.variableDeclarator(
                expr,
              ),
            );
          } else if (t.isAssignmentExpression(expr)) {
            if (expr.operator !== '=') {
              throw new Error('Invalid assignment expression operator');
            }
            const leftExpr = expr.left;
            const rightExpr = expr.right;
            if (!t.isIdentifier(leftExpr)) {
              throw unexpectedType(path, leftExpr.type, 'Identifier');
            }
            path.replaceWith(
              t.variableDeclarator(
                leftExpr,
                rightExpr,
              ),
            );
          } else {
            throw unexpectedType(path, expr.type, 'Identifier | AssignmentExpression');
          }
        }

        path.replaceWith(
          t.variableDeclaration(
            'const',
            exprs,
          ),
        );
      }
    }
    if (t.isVariableDeclaration(body)) {
      body.kind = 'const';
      path.replaceWith(
        body,
      );
    }
    if (t.isVariableDeclaration(path.node)) {
      path.traverse({
        VariableDeclarator(p) {
          const leftExpr = p.node.id;
          const rightExpr = p.node.init;
          variableExpression(state, p, leftExpr, rightExpr);
        },
      });
    } else {
      throw unexpectedType(path, path.node.type, 'VariableDeclaration');
    }
  };
}

function reactiveExpression(
  state: State,
  path: NodePath<t.LabeledStatement>,
): void {
  const { body } = path.node;
  if (t.isExpressionStatement(body)) {
    path.replaceWith(
      t.callExpression(
        getHookIdentifier(state.hooks, path, 'createEffect'),
        [
          t.arrowFunctionExpression(
            [],
            body.expression,
          ),
        ],
      ),
    );
  } else if (t.isBlockStatement(body)) {
    path.replaceWith(
      t.callExpression(
        getHookIdentifier(state.hooks, path, 'createEffect'),
        [
          t.arrowFunctionExpression(
            [],
            body,
          ),
        ],
      ),
    );
  } else if (t.isVariableDeclaration(body)) {
    body.kind = 'const';
    path.replaceWith(body);
    path.traverse({
      VariableDeclarator(p) {
        const leftExpr = p.node.id;
        const rightExpr = p.node.init;
        if (t.isIdentifier(leftExpr)) {
          memoVariableExpression(state, p, leftExpr, rightExpr ?? t.identifier('undefined'));
        }
      },
    });
  }
}

function createCallbackLabel(label: string, named = false) {
  return function expr(
    state: State,
    path: NodePath<t.LabeledStatement>,
  ): void {
    let { body } = path.node;
    let name: string | undefined;
    let callback: t.Expression;
    if (named && t.isLabeledStatement(body)) {
      name = body.label.name;
      body = body.body;
    }
    if (t.isBlockStatement(body)) {
      callback = t.arrowFunctionExpression(
        [],
        body,
      );
    } else if (t.isExpressionStatement(body)) {
      callback = body.expression;
    } else {
      throw unexpectedType(path, body.type, 'BlockStatement | ExpressionStatement');
    }
    if (name) {
      path.replaceWith(
        t.callExpression(
          getHookIdentifier(state.hooks, path, label),
          [
            callback,
            t.identifier('undefined'),
            t.objectExpression([
              t.objectProperty(
                t.identifier('name'),
                t.stringLiteral(name),
              ),
            ]),
          ],
        ),
      );
    } else {
      path.replaceWith(
        t.callExpression(
          getHookIdentifier(state.hooks, path, label),
          [
            callback,
          ],
        ),
      );
    }
  };
}

type LabelExpression = (
  state: State,
  path: NodePath<t.LabeledStatement>,
) => void;

const EXPRESSIONS: Record<string, LabelExpression> = {
  $: reactiveExpression,
  signal: createVariableLabel((state, path, leftExpr, rightExpr) => {
    if (t.isIdentifier(leftExpr)) {
      signalVariableExpression(state, path, leftExpr, rightExpr ?? t.identifier('undefined'));
    }
  }),
  memo: createVariableLabel((state, path, leftExpr, rightExpr) => {
    if (t.isIdentifier(leftExpr)) {
      memoVariableExpression(state, path, leftExpr, rightExpr ?? t.identifier('undefined'));
    }
  }),
  deferred: createVariableLabel((state, path, leftExpr, rightExpr) => {
    if (t.isIdentifier(leftExpr)) {
      deferredVariableExpression(state, path, leftExpr, rightExpr ?? t.identifier('undefined'));
    }
  }),
  destructure: createVariableLabel((state, path, leftExpr, rightExpr) => {
    if ((t.isObjectPattern(leftExpr) || t.isArrayPattern(leftExpr)) && rightExpr) {
      destructureVariableExpression(
        state,
        path,
        rightExpr,
        leftExpr,
      );
    }
  }),
  children: createVariableLabel((state, path, leftExpr, rightExpr) => {
    if (t.isIdentifier(leftExpr)) {
      accessorVariableExpression(
        state,
        path,
        leftExpr,
        'children',
        [
          t.arrowFunctionExpression(
            [],
            rightExpr ?? t.identifier('undefined'),
          ),
        ],
      );
    }
  }),
  effect: createCallbackLabel('createEffect', true),
  computed: createCallbackLabel('createComputed', true),
  renderEffect: createCallbackLabel('createRenderEffect', true),
  mount: createCallbackLabel('onMount'),
  cleanup: createCallbackLabel('onCleanup'),
  error: createCallbackLabel('onError'),
  root: createCallbackLabel('createRoot'),
  untrack: createCallbackLabel('untrack'),
  batch: createCallbackLabel('batch'),
  transition: createCallbackLabel('startTransition'),
};

const LABEL_PARSER: Visitor<State> = {
  LabeledStatement(path, state) {
    if (path.node.label.name in EXPRESSIONS) {
      EXPRESSIONS[path.node.label.name](state, path);
    }
  },
};

export default LABEL_PARSER;
