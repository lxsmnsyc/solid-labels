import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import getHookIdentifier from './get-hook-identifier';
import memoVariableExpression from './memo-variable';
import signalVariableExpression from './signal-variable';
import accessorVariableExpression from './accessor-variable';
import { ImportHook, State } from './types';
import deferredVariableExpression from './deferred-variable';
import destructureVariableExpression from './destructure-variable';

type VariableLabelExpression = (
  hooks: ImportHook,
  path: NodePath<t.VariableDeclarator>,
  leftExpr: t.LVal,
  rightExpr: t.Expression | null | undefined,
) => void;

function createVariableLabel(variableExpression: VariableLabelExpression) {
  return (
    hooks: ImportHook,
    path: NodePath<t.LabeledStatement>,
  ) => {
    const { body } = path.node;
    if (t.isExpressionStatement(body)) {
      if (t.isAssignmentExpression(body.expression)) {
        if (body.expression.operator !== '=') {
          throw new Error('Invalid assignment expression operator');
        }
        const leftExpr = body.expression.left;
        const rightExpr = body.expression.right;
        if (!t.isIdentifier(leftExpr)) {
          throw new Error('Expected identifier');
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
              throw new Error('Expected identifier');
            }
            path.replaceWith(
              t.variableDeclarator(
                leftExpr,
                rightExpr,
              ),
            );
          } else {
            throw new Error('Expected identifier or assignment expression');
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
          variableExpression(hooks, p, leftExpr, rightExpr);
        },
      });
    } else {
      throw new Error('Expected assignment expression or variable declaration');
    }
  };
}

function reactiveExpression(
  hooks: ImportHook,
  path: NodePath<t.LabeledStatement>,
): void {
  const { body } = path.node;
  if (t.isExpressionStatement(body)) {
    path.replaceWith(
      t.callExpression(
        getHookIdentifier(hooks, path, 'createEffect'),
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
        getHookIdentifier(hooks, path, 'createEffect'),
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
          memoVariableExpression(hooks, p, leftExpr, rightExpr ?? t.identifier('undefined'));
        }
      },
    });
  }
}

function createCallbackLabel(label: string) {
  return function expr(
    hooks: ImportHook,
    path: NodePath<t.LabeledStatement>,
  ): void {
    const { body } = path.node;
    let callback: t.Expression;
    if (t.isBlockStatement(body)) {
      callback = t.arrowFunctionExpression(
        [],
        body,
      );
    } else if (t.isExpressionStatement(body)) {
      callback = body.expression;
    } else {
      throw new Error('Expected arrow function or block expression');
    }
    path.replaceWith(
      t.callExpression(
        getHookIdentifier(hooks, path, label),
        [
          callback,
        ],
      ),
    );
  };
}

type LabelExpression = (
  hooks: ImportHook,
  path: NodePath<t.LabeledStatement>,
) => void;

const EXPRESSIONS: Record<string, LabelExpression> = {
  $: reactiveExpression,
  signal: createVariableLabel((hooks, path, leftExpr, rightExpr) => {
    if (t.isIdentifier(leftExpr)) {
      signalVariableExpression(hooks, path, leftExpr, rightExpr ?? t.identifier('undefined'));
    }
  }),
  memo: createVariableLabel((hooks, path, leftExpr, rightExpr) => {
    if (t.isIdentifier(leftExpr)) {
      memoVariableExpression(hooks, path, leftExpr, rightExpr ?? t.identifier('undefined'));
    }
  }),
  deferred: createVariableLabel((hooks, path, leftExpr, rightExpr) => {
    if (t.isIdentifier(leftExpr)) {
      deferredVariableExpression(hooks, path, leftExpr, rightExpr ?? t.identifier('undefined'));
    }
  }),
  destructure: createVariableLabel((hooks, path, leftExpr, rightExpr) => {
    if (t.isObjectPattern(leftExpr) && rightExpr) {
      destructureVariableExpression(
        hooks,
        path,
        rightExpr,
        leftExpr,
      );
    }
  }),
  children: createVariableLabel((hooks, path, leftExpr, rightExpr) => {
    if (t.isIdentifier(leftExpr)) {
      accessorVariableExpression(
        hooks,
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
  effect: createCallbackLabel('createEffect'),
  computed: createCallbackLabel('createComputed'),
  renderEffect: createCallbackLabel('createRenderEffect'),
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
      EXPRESSIONS[path.node.label.name](state.hooks, path);
    }
  },
};

export default LABEL_PARSER;
