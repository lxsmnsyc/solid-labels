import { PluginObj } from '@babel/core';
import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

function signalExpression(
  path: NodePath<t.LabeledStatement>,
  body: t.Statement,
): void {
  if (!t.isExpressionStatement(body)) {
    throw new Error('Expected expression statement');
  }
  if (!t.isAssignmentExpression(body.expression)) {
    throw new Error('Expected assignment expression');
  }
  if (body.expression.operator !== '=') {
    throw new Error('Invalid assignment expression operator');
  }
  const signalIdentifier = body.expression.left;
  const stateIdentifier = body.expression.right;
  if (!t.isIdentifier(signalIdentifier)) {
    throw new Error('Expected identifier');
  }
  const readIdentifier = path.scope.generateUidIdentifier(signalIdentifier.name);
  const writeIdentifier = path.scope.generateUidIdentifier(`set${signalIdentifier.name}`);
  const expr = t.variableDeclaration(
    'const',
    [t.variableDeclarator(
      t.arrayPattern([
        readIdentifier,
        writeIdentifier,
      ]),
      t.callExpression(
        t.identifier('createSignal'),
        [stateIdentifier],
      ),
    )],
  );

  path.replaceWith(expr);

  const parent = path.getFunctionParent();
  if (parent) {
    parent.traverse({
      Identifier(p) {
        if (
          p.node.name === signalIdentifier.name
        ) {
          p.replaceWith(
            t.callExpression(
              readIdentifier,
              [],
            ),
          );
        }
      },
      AssignmentExpression(p) {
        const identifier = p.node.left;
        const expression = p.node.right;
        if (
          t.isIdentifier(identifier)
          // && p.scope.hasBinding(signalIdentifier.name)
          && identifier.name === signalIdentifier.name
        ) {
          const param = p.scope.generateUidIdentifier('current');
          p.replaceWith(
            t.callExpression(
              writeIdentifier,
              [
                t.arrowFunctionExpression(
                  [param],
                  t.assignmentExpression(
                    p.node.operator,
                    param,
                    expression,
                  ),
                ),
              ],
            ),
          );
        }
      },
    });
  }
}

function memoExpression(
  path: NodePath<t.LabeledStatement>,
  body: t.Statement,
): void {
  if (!t.isExpressionStatement(body)) {
    throw new Error('Expected expression statement');
  }
  if (!t.isAssignmentExpression(body.expression)) {
    throw new Error('Expected assignment expression');
  }
  if (body.expression.operator !== '=') {
    throw new Error('Invalid assignment expression operator');
  }
  const memoIdentifier = body.expression.left;
  const stateIdentifier = body.expression.right;
  if (!t.isIdentifier(memoIdentifier)) {
    throw new Error('Expected identifier');
  }
  const readIdentifier = path.scope.generateUidIdentifier(memoIdentifier.name);
  const expr = t.variableDeclaration(
    'const',
    [t.variableDeclarator(
      readIdentifier,
      t.callExpression(
        t.identifier('createMemo'),
        [
          t.arrowFunctionExpression(
            [],
            stateIdentifier,
          ),
        ],
      ),
    )],
  );

  path.replaceWith(expr);

  const parent = path.getFunctionParent();
  if (parent) {
    parent.traverse({
      Identifier(p) {
        if (p.node.name === memoIdentifier.name) {
          p.replaceWith(
            t.callExpression(
              readIdentifier,
              [],
            ),
          );
        }
      },
    });
  }
}

function effectExpression(
  path: NodePath<t.LabeledStatement>,
  body: t.Statement,
): void {
  let callback: t.ArrowFunctionExpression;
  if (t.isBlockStatement(body)) {
    callback = t.arrowFunctionExpression(
      [],
      body,
    );
  } else if (t.isExpressionStatement(body) && t.isArrowFunctionExpression(body.expression)) {
    callback = body.expression;
  } else {
    throw new Error('Expected arrow function or block expression');
  }
  path.replaceWith(
    t.callExpression(
      t.identifier('createEffect'),
      [
        callback,
      ],
    ),
  );
}

function computedExpression(
  path: NodePath<t.LabeledStatement>,
  body: t.Statement,
): void {
  let callback: t.ArrowFunctionExpression;
  if (t.isBlockStatement(body)) {
    callback = t.arrowFunctionExpression(
      [],
      body,
    );
  } else if (t.isExpressionStatement(body) && t.isArrowFunctionExpression(body.expression)) {
    callback = body.expression;
  } else {
    throw new Error('Expected arrow function or block expression');
  }
  path.replaceWith(
    t.callExpression(
      t.identifier('createComputed'),
      [
        callback,
      ],
    ),
  );
}

function renderEffectExpression(
  path: NodePath<t.LabeledStatement>,
  body: t.Statement,
): void {
  let callback: t.ArrowFunctionExpression;
  if (t.isBlockStatement(body)) {
    callback = t.arrowFunctionExpression(
      [],
      body,
    );
  } else if (t.isExpressionStatement(body) && t.isArrowFunctionExpression(body.expression)) {
    callback = body.expression;
  } else {
    throw new Error('Expected arrow function or block expression');
  }
  path.replaceWith(
    t.callExpression(
      t.identifier('createRenderEffect'),
      [
        callback,
      ],
    ),
  );
}

function mountExpression(
  path: NodePath<t.LabeledStatement>,
  body: t.Statement,
): void {
  if (!t.isBlockStatement(body)) {
    throw new Error('Expected expression statement');
  }
  path.replaceWith(
    t.callExpression(
      t.identifier('onMount'),
      [
        t.arrowFunctionExpression(
          [],
          body,
        ),
      ],
    ),
  );
}

function cleanupExpression(
  path: NodePath<t.LabeledStatement>,
  body: t.Statement,
): void {
  if (!t.isBlockStatement(body)) {
    throw new Error('Expected expression statement');
  }
  path.replaceWith(
    t.callExpression(
      t.identifier('onCleanup'),
      [
        t.arrowFunctionExpression(
          [],
          body,
        ),
      ],
    ),
  );
}

function errorExpression(
  path: NodePath<t.LabeledStatement>,
  body: t.Statement,
): void {
  let callback: t.ArrowFunctionExpression;
  if (t.isBlockStatement(body)) {
    callback = t.arrowFunctionExpression(
      [],
      body,
    );
  } else if (t.isExpressionStatement(body) && t.isArrowFunctionExpression(body.expression)) {
    callback = body.expression;
  } else {
    throw new Error('Expected arrow function or block expression');
  }
  path.replaceWith(
    t.callExpression(
      t.identifier('onError'),
      [
        callback,
      ],
    ),
  );
}

function rootExpression(
  path: NodePath<t.LabeledStatement>,
  body: t.Statement,
): void {
  let callback: t.ArrowFunctionExpression;
  if (t.isBlockStatement(body)) {
    callback = t.arrowFunctionExpression(
      [],
      body,
    );
  } else if (t.isExpressionStatement(body) && t.isArrowFunctionExpression(body.expression)) {
    callback = body.expression;
  } else {
    throw new Error('Expected arrow function or block expression');
  }
  path.replaceWith(
    t.callExpression(
      t.identifier('createRoot'),
      [
        callback,
      ],
    ),
  );
}

function untrackExpression(
  path: NodePath<t.LabeledStatement>,
  body: t.Statement,
): void {
  if (!t.isBlockStatement(body)) {
    throw new Error('Expected expression statement');
  }
  path.replaceWith(
    t.callExpression(
      t.identifier('untrack'),
      [
        t.arrowFunctionExpression(
          [],
          body,
        ),
      ],
    ),
  );
}

function batchExpression(
  path: NodePath<t.LabeledStatement>,
  body: t.Statement,
): void {
  if (!t.isBlockStatement(body)) {
    throw new Error('Expected expression statement');
  }
  path.replaceWith(
    t.callExpression(
      t.identifier('batch'),
      [
        t.arrowFunctionExpression(
          [],
          body,
        ),
      ],
    ),
  );
}

export default function solidReactivityPlugin(): PluginObj {
  return {
    visitor: {
      LabeledStatement(path) {
        const { label, body } = path.node;

        switch (label.name) {
          case 'signal':
            signalExpression(path, body);
            break;
          case 'effect':
            effectExpression(path, body);
            break;
          case 'computed':
            computedExpression(path, body);
            break;
          case 'renderEffect':
            renderEffectExpression(path, body);
            break;
          case 'memo':
            memoExpression(path, body);
            break;
          case 'mount':
            mountExpression(path, body);
            break;
          case 'cleanup':
            cleanupExpression(path, body);
            break;
          case 'error':
            errorExpression(path, body);
            break;
          case 'untrack':
            untrackExpression(path, body);
            break;
          case 'batch':
            batchExpression(path, body);
            break;
          case 'root':
            rootExpression(path, body);
            break;
          default:
            break;
        }
      },
    },
  };
}
