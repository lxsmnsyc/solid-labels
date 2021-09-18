import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import derefSignalVariableExpression from './deref-signal-variable';
import derefMemoVariableExpression from './deref-memo-variable';
import getHookIdentifier from './get-hook-identifier';
import memoVariableExpression from './memo-variable';
import signalVariableExpression from './signal-variable';
import { ImportHook, State } from './types';

function derefSignalExpression(
  _: ImportHook,
  path: NodePath<t.LabeledStatement>,
): void {
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
    path.replaceWith(
      body,
    );
  }
  if (t.isVariableDeclaration(path.node)) {
    path.traverse({
      VariableDeclarator(p) {
        const leftExpr = p.node.id;
        const rightExpr = p.node.init;
        if (t.isIdentifier(leftExpr) && rightExpr) {
          derefSignalVariableExpression(p, leftExpr, rightExpr);
        }
      },
    });
  } else {
    throw new Error('Expected assignment expression or variable declaration');
  }
}

function signalExpression(
  hooks: ImportHook,
  path: NodePath<t.LabeledStatement>,
): void {
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
    path.replaceWith(
      body,
    );
  }
  if (t.isVariableDeclaration(path.node)) {
    path.traverse({
      VariableDeclarator(p) {
        const leftExpr = p.node.id;
        const rightExpr = p.node.init;
        if (t.isIdentifier(leftExpr)) {
          signalVariableExpression(hooks, p, leftExpr, rightExpr ?? t.identifier('undefined'));
        }
      },
    });
  } else {
    throw new Error('Expected assignment expression or variable declaration');
  }
}

function derefMemoExpression(
  _: ImportHook,
  path: NodePath<t.LabeledStatement>,
): void {
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
    path.replaceWith(
      body,
    );
  }
  if (t.isVariableDeclaration(path.node)) {
    path.traverse({
      VariableDeclarator(p) {
        const leftExpr = p.node.id;
        const rightExpr = p.node.init;
        if (t.isIdentifier(leftExpr) && rightExpr) {
          derefMemoVariableExpression(p, leftExpr, rightExpr);
        }
      },
    });
  } else {
    throw new Error('Expected assignment expression or variable declaration');
  }
}

function memoExpression(
  hooks: ImportHook,
  path: NodePath<t.LabeledStatement>,
): void {
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
    path.replaceWith(
      body,
    );
  }
  if (t.isVariableDeclaration(path.node)) {
    path.traverse({
      VariableDeclarator(p) {
        const leftExpr = p.node.id;
        const rightExpr = p.node.init;
        if (t.isIdentifier(leftExpr)) {
          memoVariableExpression(hooks, p, leftExpr, rightExpr ?? t.identifier('undefined'));
        }
      },
    });
  } else {
    throw new Error('Expected assignment expression or variable declaration');
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
  derefSignal: derefSignalExpression,
  derefMemo: derefMemoExpression,
  signal: signalExpression,
  memo: memoExpression,
  effect: createCallbackLabel('createEffect'),
  computed: createCallbackLabel('createComputed'),
  renderEffect: createCallbackLabel('createRenderEffect'),
  mount: createCallbackLabel('onMount'),
  cleanup: createCallbackLabel('onCleanup'),
  error: createCallbackLabel('onError'),
  root: createCallbackLabel('createRoot'),
  untrack: createCallbackLabel('untrack'),
  batch: createCallbackLabel('batch'),
};

const LABEL_PARSER: Visitor<State> = {
  LabeledStatement(path, state) {
    if (path.node.label.name in EXPRESSIONS) {
      EXPRESSIONS[path.node.label.name](state.hooks, path);
    }
  },
};

export default LABEL_PARSER;
