import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import accessorVariableExpression from './accessor-variable';
import deferredVariableExpression from './deferred-variable';
import getHookIdentifier from './get-hook-identifier';
import memoVariableExpression from './memo-variable';
import signalVariableExpression from './signal-variable';
import { ImportHook, State } from './types';

function signalExpression(
  hooks: ImportHook,
  path: NodePath<t.VariableDeclaration>,
): void {
  path.traverse({
    VariableDeclarator(p) {
      const leftExpr = p.node.id;
      const rightExpr = p.node.init;
      if (t.isIdentifier(leftExpr)) {
        signalVariableExpression(hooks, p, leftExpr, rightExpr ?? undefined);
      }
    },
  });
}

function memoExpression(
  hooks: ImportHook,
  path: NodePath<t.VariableDeclaration>,
): void {
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

function deferredExpression(
  hooks: ImportHook,
  path: NodePath<t.VariableDeclaration>,
): void {
  path.traverse({
    VariableDeclarator(p) {
      const leftExpr = p.node.id;
      const rightExpr = p.node.init;
      if (t.isIdentifier(leftExpr)) {
        deferredVariableExpression(hooks, p, leftExpr, rightExpr ?? t.identifier('undefined'));
      }
    },
  });
}

function childrenExpression(
  hooks: ImportHook,
  path: NodePath<t.VariableDeclaration>,
): void {
  path.traverse({
    VariableDeclarator(p) {
      const leftExpr = p.node.id;
      const rightExpr = p.node.init;
      if (t.isIdentifier(leftExpr)) {
        accessorVariableExpression(
          hooks,
          p,
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
    },
  });
}

function createCallbackLabel(label: string) {
  return function expr(
    hooks: ImportHook,
    path: NodePath<t.BlockStatement | t.ExpressionStatement>,
  ): void {
    const body = path.node;
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

type CallbackLabelExpresion = (
  hooks: ImportHook,
  path: NodePath<t.BlockStatement | t.ExpressionStatement>,
) => void;

type StateExpression = (
  hooks: ImportHook,
  path: NodePath<t.VariableDeclaration>,
) => void;

const STATE_EXPRESSIONS: Record<string, StateExpression> = {
  '@signal': signalExpression,
  '@memo': memoExpression,
  '@children': childrenExpression,
  '@deferred': deferredExpression,
};

const CALLBACK_EXPRESSIONS: Record<string, CallbackLabelExpresion> = {
  '@effect': createCallbackLabel('createEffect'),
  '@computed': createCallbackLabel('createComputed'),
  '@renderEffect': createCallbackLabel('createRenderEffect'),
  '@mount': createCallbackLabel('onMount'),
  '@cleanup': createCallbackLabel('onCleanup'),
  '@error': createCallbackLabel('onError'),
  '@root': createCallbackLabel('createRoot'),
  '@untrack': createCallbackLabel('untrack'),
  '@batch': createCallbackLabel('batch'),
  '@transition': createCallbackLabel('startTransition'),
};

const COMMENT_PARSER: Visitor<State> = {
  VariableDeclaration(path, state) {
    const comments = path.node.leadingComments;
    if (comments) {
      let preference: string | undefined;
      for (let i = 0, len = comments.length; i < len; i += 1) {
        const comment: t.Comment = comments[i];
        const value = comment.value.trim();
        if (value in STATE_EXPRESSIONS) {
          preference = value;
        }
      }
      if (preference) {
        STATE_EXPRESSIONS[preference](state.hooks, path);
      }
    }
  },
  BlockStatement(path, state) {
    if (
      t.isFunctionDeclaration(path.parent)
    ) {
      return;
    }
    const comments = path.node.leadingComments;
    if (comments) {
      const leading = [];
      let preference: string | undefined;
      for (let i = 0, len = comments.length; i < len; i += 1) {
        const comment = comments[i];
        const value = comment.value.trim();
        if (value in CALLBACK_EXPRESSIONS) {
          preference = value;
        } else {
          leading.push(comment);
        }
      }
      const trailing = [...(path.node.trailingComments ?? [])];
      const inner = [...(path.node.innerComments ?? [])];
      t.removeComments(path.node);
      t.addComments(path.node, 'leading', leading);
      t.addComments(path.node, 'inner', inner);
      t.addComments(path.node, 'trailing', trailing);
      if (preference) {
        CALLBACK_EXPRESSIONS[preference](state.hooks, path);
      }
    }
  },
  ExpressionStatement(path, state) {
    const comments = path.node.leadingComments;
    if (comments) {
      const leading = [];
      let preference: string | undefined;
      for (let i = 0, len = comments.length; i < len; i += 1) {
        const comment = comments[i];
        const value = comment.value.trim();
        if (value in CALLBACK_EXPRESSIONS) {
          preference = value;
        } else {
          leading.push(comment);
        }
      }
      const trailing = [...(path.node.trailingComments ?? [])];
      const inner = [...(path.node.innerComments ?? [])];
      t.removeComments(path.node);
      t.addComments(path.node, 'leading', leading);
      t.addComments(path.node, 'inner', inner);
      t.addComments(path.node, 'trailing', trailing);
      if (preference) {
        CALLBACK_EXPRESSIONS[preference](state.hooks, path);
      }
    }
  },
};

export default COMMENT_PARSER;
