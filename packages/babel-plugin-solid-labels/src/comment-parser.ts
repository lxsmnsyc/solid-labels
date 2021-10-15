import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import accessorVariableExpression from './accessor-variable';
import deferredVariableExpression from './deferred-variable';
import getHookIdentifier from './get-hook-identifier';
import memoVariableExpression from './memo-variable';
import signalVariableExpression from './signal-variable';
import destructureVariableExpression from './destructure-variable';
import { State } from './types';

function signalExpression(
  state: State,
  path: NodePath<t.VariableDeclaration>,
): void {
  path.traverse({
    VariableDeclarator(p) {
      const leftExpr = p.node.id;
      const rightExpr = p.node.init;
      if (t.isIdentifier(leftExpr)) {
        signalVariableExpression(state, p, leftExpr, rightExpr ?? undefined);
      }
    },
  });
}

function memoExpression(
  state: State,
  path: NodePath<t.VariableDeclaration>,
): void {
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

function destructureExpression(
  state: State,
  path: NodePath<t.VariableDeclaration>,
): void {
  path.traverse({
    VariableDeclarator(p) {
      const leftExpr = p.node.id;
      const rightExpr = p.node.init;
      if ((t.isObjectPattern(leftExpr) || t.isArrayPattern(leftExpr)) && rightExpr) {
        destructureVariableExpression(
          state,
          p,
          rightExpr,
          leftExpr,
        );
      }
    },
  });
}

function deferredExpression(
  state: State,
  path: NodePath<t.VariableDeclaration>,
): void {
  path.traverse({
    VariableDeclarator(p) {
      const leftExpr = p.node.id;
      const rightExpr = p.node.init;
      if (t.isIdentifier(leftExpr)) {
        deferredVariableExpression(state, p, leftExpr, rightExpr ?? t.identifier('undefined'));
      }
    },
  });
}

function childrenExpression(
  state: State,
  path: NodePath<t.VariableDeclaration>,
): void {
  path.traverse({
    VariableDeclarator(p) {
      const leftExpr = p.node.id;
      const rightExpr = p.node.init;
      if (t.isIdentifier(leftExpr)) {
        accessorVariableExpression(
          state,
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

function createCallbackLabel(label: string, named = false) {
  return function expr(
    state: State,
    path: NodePath<t.BlockStatement | t.ExpressionStatement>,
    name?: string,
  ): void {
    const body = path.node;
    let callback: t.Expression;
    if (t.isBlockStatement(body)) {
      callback = t.arrowFunctionExpression(
        [],
        body,
      );
    } else {
      callback = body.expression;
    }
    if (named && name) {
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

type CallbackLabelExpresion = (
  state: State,
  path: NodePath<t.BlockStatement | t.ExpressionStatement>,
  name: string | undefined,
) => void;

type StateExpression = (
  state: State,
  path: NodePath<t.VariableDeclaration>,
) => void;

const STATE_EXPRESSIONS: Record<string, StateExpression> = {
  '@signal': signalExpression,
  '@memo': memoExpression,
  '@children': childrenExpression,
  '@deferred': deferredExpression,
  '@destructure': destructureExpression,
};

const CALLBACK_EXPRESSIONS: Record<string, CallbackLabelExpresion> = {
  '@effect': createCallbackLabel('createEffect', true),
  '@computed': createCallbackLabel('createComputed', true),
  '@renderEffect': createCallbackLabel('createRenderEffect', true),
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
        const value: string = comment.value.trim();
        if (value in STATE_EXPRESSIONS) {
          preference = value;
          comment.value = '';
        }
      }
      if (preference) {
        STATE_EXPRESSIONS[preference](state, path);
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
      let preference: string | undefined;
      let name: string | undefined;
      for (let i = 0, len = comments.length; i < len; i += 1) {
        const comment: t.Comment = comments[i];
        const value: string = comment.value.trim();
        if (/^@\w+( .*)?$/.test(value)) {
          const [tag, ...debugName] = value.split(' ');
          if (tag in CALLBACK_EXPRESSIONS) {
            preference = tag;
            name = debugName.join(' ');
            comment.value = '';
          }
        }
      }
      if (preference) {
        CALLBACK_EXPRESSIONS[preference](state, path, name);
      }
    }
  },
  ExpressionStatement(path, state) {
    const comments = path.node.leadingComments;
    if (comments) {
      let preference: string | undefined;
      let name: string | undefined;
      for (let i = 0, len = comments.length; i < len; i += 1) {
        const comment: t.Comment = comments[i];
        const value: string = comment.value.trim();
        if (/^@\w+( .*)?$/.test(value)) {
          const [tag, ...debugName] = value.split(' ');
          if (tag in CALLBACK_EXPRESSIONS) {
            preference = tag;
            name = debugName.join(' ');
            comment.value = '';
          }
        }
      }
      if (preference) {
        CALLBACK_EXPRESSIONS[preference](state, path, name);
      }
    }
  },
};

export default COMMENT_PARSER;
