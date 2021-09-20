import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import getHookIdentifier from './get-hook-identifier';
import derefSignalVariableExpression from './deref-signal-variable';
import derefMemoVariableExpression from './deref-memo-variable';
import memoVariableExpression from './memo-variable';
import signalVariableExpression from './signal-variable';
import accessorVariableExpression from './accessor-variable';
import { ImportHook, State } from './types';

function derefSignalExpression(
  _: ImportHook,
  path: NodePath<t.CallExpression>,
): void {
  if (path.node.arguments.length > 1) {
    throw new Error('Expected argument length');
  }
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
  if (path.node.arguments.length > 2) {
    throw new Error('Expected argument length');
  }
  let argument: t.Expression | undefined;
  let options: t.Expression | undefined;
  if (path.node.arguments.length > 0) {
    const state = path.node.arguments[0];
    if (!t.isExpression(state)) {
      throw new Error('Expected expression');
    }
    argument = state;
    if (path.node.arguments.length > 1) {
      const optionsValue = path.node.arguments[1];
      if (!t.isExpression(optionsValue)) {
        throw new Error('Expected expression');
      }
      options = optionsValue;
    }
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
    options,
  );
}

function derefMemoExpression(
  _: ImportHook,
  path: NodePath<t.CallExpression>,
): void {
  if (path.node.arguments.length > 1) {
    throw new Error('Expected argument length');
  }
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
  if (path.node.arguments.length > 2) {
    throw new Error('Expected argument length');
  }
  const argument = path.node.arguments[0];
  if (!t.isExpression(argument)) {
    throw new Error('Expected expression');
  }
  let options: t.Expression | undefined;
  if (path.node.arguments.length > 1) {
    const optionsValue = path.node.arguments[1];
    if (!t.isExpression(optionsValue)) {
      throw new Error('Expected expression');
    }
    options = optionsValue;
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
    options,
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

function effectExpression(
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
  const arrow = (
    (t.isArrowFunctionExpression(argument) || t.isFunctionExpression(argument))
      ? argument
      : (
        t.arrowFunctionExpression(
          [],
          argument,
        )
      )
  );
  path.replaceWith(
    t.callExpression(
      getHookIdentifier(hooks, path, 'createEffect'),
      [
        arrow,
      ],
    ),
  );
}

function rootExpression(
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
  const arrow = (
    (t.isArrowFunctionExpression(argument) || t.isFunctionExpression(argument))
      ? argument
      : (
        t.arrowFunctionExpression(
          [],
          argument,
        )
      )
  );
  path.replaceWith(
    t.callExpression(
      getHookIdentifier(hooks, path, 'createRoot'),
      [
        arrow,
      ],
    ),
  );
}

function fromExpression(
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
  accessorVariableExpression(
    hooks,
    path.parentPath as NodePath<t.VariableDeclarator>,
    leftExpr,
    'from',
    [
      argument,
    ],
  );
}

function createCompileTimeAutoAccessor(target: string, limit: number) {
  return (
    hooks: ImportHook,
    path: NodePath<t.CallExpression>,
  ) => {
    if (path.node.arguments.length > limit) {
      throw new Error('Expected argument length');
    }
    const [argument, ...rest] = path.node.arguments;
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
    accessorVariableExpression(
      hooks,
      path.parentPath as NodePath<t.VariableDeclarator>,
      leftExpr,
      target,
      [
        t.arrowFunctionExpression(
          [],
          argument,
        ),
        ...rest,
      ],
    );
  };
}

type CompileTimeFunctionExpression = (
  hooks: ImportHook,
  path: NodePath<t.CallExpression>,
) => void;

function createCompileTimeAlias(target: string) {
  return (
    hooks: ImportHook,
    path: NodePath<t.CallExpression>,
  ) => {
    path.node.callee = getHookIdentifier(hooks, path, target);
  };
}

function createCompileTimeAutoArrow(target: string, limit: number) {
  return (
    hooks: ImportHook,
    path: NodePath<t.CallExpression>,
  ) => {
    if (path.node.arguments.length > limit) {
      throw new Error('Expected argument length');
    }
    const [argument, ...rest] = path.node.arguments;
    if (!t.isExpression(argument)) {
      throw new Error('Expected expression');
    }
    path.replaceWith(
      t.callExpression(
        getHookIdentifier(hooks, path, target),
        [
          t.arrowFunctionExpression(
            [],
            argument,
          ),
          ...rest,
        ],
      ),
    );
  };
}

const CTF_EXPRESSIONS: Record<string, CompileTimeFunctionExpression> = {
  $: reactiveExpression,
  $derefSignal: derefSignalExpression,
  $derefMemo: derefMemoExpression,
  $signal: signalExpression,
  $memo: memoExpression,
  $effect: effectExpression,
  $root: rootExpression,
  $from: fromExpression,
  $children: createCompileTimeAutoAccessor('children', 1),
  $mapArray: createCompileTimeAutoAccessor('mapArray', 3),
  $indexArray: createCompileTimeAutoAccessor('indexArray', 3),
  $lazy: createCompileTimeAutoArrow('lazy', 1),
  $untrack: createCompileTimeAutoArrow('untrack', 1),
  $batch: createCompileTimeAutoArrow('batch', 1),
  $observable: createCompileTimeAutoArrow('observable', 1),
  $selector: createCompileTimeAutoArrow('createSelector', 1),
  $useContext: createCompileTimeAlias('useContext'),
  $createContext: createCompileTimeAlias('createContext'),
  $uid: createCompileTimeAlias('createUniqueId'),
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
