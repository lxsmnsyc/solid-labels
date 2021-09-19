import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import getHookIdentifier from './get-hook-identifier';
import derefSignalVariableExpression from './deref-signal-variable';
import derefMemoVariableExpression from './deref-memo-variable';
import memoVariableExpression from './memo-variable';
import signalVariableExpression from './signal-variable';
import { ImportHook, State } from './types';

function derefSignalExpression(
  _: ImportHook,
  path: NodePath<t.CallExpression>,
): void {
  const argument = path.node.arguments[0];
  if (!t.isExpression(argument)) {
    throw new Error('Expected expression');
  }
  if (!t.isVariableDeclarator(path.parent) || !path.parentPath) {
    throw new Error('Expected variable declarator');
  }
  const leftExpr = path.parent.id;
  if (!t.isIdentifier(leftExpr)) {
    throw new Error('Expected identifier');
  }
  derefSignalVariableExpression(
    path.parentPath as NodePath<t.VariableDeclarator>,
    leftExpr,
    argument,
  );
}

function signalExpression(
  hooks: ImportHook,
  path: NodePath<t.CallExpression>,
): void {
  const argument = path.node.arguments[0];
  if (!t.isExpression(argument)) {
    throw new Error('Expected expression');
  }
  if (!t.isVariableDeclarator(path.parent) || !path.parentPath) {
    throw new Error('Expected variable declarator');
  }
  const leftExpr = path.parent.id;
  if (!t.isIdentifier(leftExpr)) {
    throw new Error('Expected identifier');
  }
  signalVariableExpression(
    hooks,
    path.parentPath as NodePath<t.VariableDeclarator>,
    leftExpr,
    argument,
  );
}

function derefMemoExpression(
  _: ImportHook,
  path: NodePath<t.CallExpression>,
): void {
  const argument = path.node.arguments[0];
  if (!t.isExpression(argument)) {
    throw new Error('Expected expression');
  }
  if (!t.isVariableDeclarator(path.parent) || !path.parentPath) {
    throw new Error('Expected variable declarator');
  }
  const leftExpr = path.parent.id;
  if (!t.isIdentifier(leftExpr)) {
    throw new Error('Expected identifier');
  }
  derefMemoVariableExpression(
    path.parentPath as NodePath<t.VariableDeclarator>,
    leftExpr,
    argument,
  );
}

function memoExpression(
  hooks: ImportHook,
  path: NodePath<t.CallExpression>,
): void {
  const argument = path.node.arguments[0];
  if (!t.isExpression(argument)) {
    throw new Error('Expected expression');
  }
  if (!t.isVariableDeclarator(path.parent) || !path.parentPath) {
    throw new Error('Expected variable declarator');
  }
  const leftExpr = path.parent.id;
  if (!t.isIdentifier(leftExpr)) {
    throw new Error('Expected identifier');
  }
  memoVariableExpression(
    hooks,
    path.parentPath as NodePath<t.VariableDeclarator>,
    leftExpr,
    argument,
  );
}

function reactiveExpression(
  hooks: ImportHook,
  path: NodePath<t.CallExpression>,
): void {
  if (!path.parentPath) {
    throw new Error('Expected parent path');
  }
  const argument = path.node.arguments[0];
  if (!t.isExpression(argument)) {
    throw new Error('Expected expression');
  }
  if (t.isVariableDeclarator(path.parent)) {
    const leftExpr = path.parent.id;
    if (!t.isIdentifier(leftExpr)) {
      throw new Error('Expected identifier');
    }
    memoVariableExpression(
      hooks,
      path.parentPath as NodePath<t.VariableDeclarator>,
      leftExpr,
      argument,
    );
  } else if (t.isExpressionStatement(path.parent)) {
    path.replaceWith(
      t.callExpression(
        getHookIdentifier(hooks, path, 'createEffect'),
        [
          t.arrowFunctionExpression(
            [],
            argument,
          ),
        ],
      ),
    );
  } else {
    throw new Error('Expected expression statement or variable declarator.');
  }
}

type CompileTimeFunctionExpression = (
  hooks: ImportHook,
  path: NodePath<t.CallExpression>,
) => void;

function createCompileTimeFunction(target: string) {
  return (
    hooks: ImportHook,
    path: NodePath<t.CallExpression>,
  ) => {
    const argument = path.node.arguments[0];
    if (t.isExpression(argument)) {
      path.replaceWith(
        t.callExpression(
          getHookIdentifier(hooks, path, target),
          [
            t.arrowFunctionExpression(
              [],
              argument,
            ),
          ],
        ),
      );
    } else {
      throw new Error('Expected expression');
    }
  };
}

const CTF_EXPRESSIONS: Record<string, CompileTimeFunctionExpression> = {
  $: reactiveExpression,
  $derefSignal: derefSignalExpression,
  $derefMemo: derefMemoExpression,
  $signal: signalExpression,
  $memo: memoExpression,
  $untrack: createCompileTimeFunction('untrack'),
  $batch: createCompileTimeFunction('batch'),
};

const CTF_PARSER: Visitor<State> = {
  CallExpression(path, state) {
    if (
      t.isIdentifier(path.node.callee)
      && path.node.callee.name in CTF_EXPRESSIONS
    ) {
      CTF_EXPRESSIONS[path.node.callee.name](state.hooks, path);
    }
  },
};

export default CTF_PARSER;
