import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import getHookIdentifier from './get-hook-identifier';
import { ImportHook, State } from './types';
import {
  unexpectedArgumentLength,
  unexpectedMissingParent,
  unexpectedType,
} from './errors';
import derefSignalVariableExpression from './deref-signal-variable';
import derefMemoVariableExpression from './deref-memo-variable';
import memoVariableExpression from './memo-variable';
import signalVariableExpression from './signal-variable';
import accessorVariableExpression from './accessor-variable';
import deferredVariableExpression from './deferred-variable';
import destructureVariableExpression from './destructure-variable';

function derefSignalExpression(
  _: ImportHook,
  path: NodePath<t.CallExpression>,
): void {
  if (path.node.arguments.length > 1) {
    throw unexpectedArgumentLength(path, path.node.arguments.length, 1);
  }
  const argument = path.node.arguments[0];
  if (!t.isExpression(argument)) {
    throw unexpectedType(path, argument.type, 'Expression');
  }
  if (!path.parentPath) {
    throw unexpectedMissingParent(path);
  }
  if (!t.isVariableDeclarator(path.parent)) {
    throw unexpectedType(path.parentPath, path.parent.type, 'VariableDeclarator');
  }
  const leftExpr = path.parent.id;
  if (!t.isIdentifier(leftExpr)) {
    throw unexpectedType(path.parentPath, leftExpr.type, 'Identifier');
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
    throw unexpectedArgumentLength(path, path.node.arguments.length, 2);
  }
  let argument: t.Expression | undefined;
  let options: t.Expression | undefined;
  if (path.node.arguments.length > 0) {
    const state = path.node.arguments[0];
    if (!t.isExpression(state)) {
      throw unexpectedType(path, state.type, 'Expression');
    }
    argument = state;
    if (path.node.arguments.length > 1) {
      const optionsValue = path.node.arguments[1];
      if (!t.isExpression(optionsValue)) {
        throw unexpectedType(path, optionsValue.type, 'Expression');
      }
      options = optionsValue;
    }
  }
  if (!path.parentPath) {
    throw unexpectedMissingParent(path);
  }
  if (!t.isVariableDeclarator(path.parent)) {
    throw unexpectedType(path.parentPath, path.parent.type, 'VariableDeclarator');
  }
  const leftExpr = path.parent.id;
  if (!t.isIdentifier(leftExpr)) {
    throw unexpectedType(path.parentPath, leftExpr.type, 'Identifier');
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
    throw unexpectedArgumentLength(path, path.node.arguments.length, 1);
  }
  const argument = path.node.arguments[0];
  if (!t.isExpression(argument)) {
    throw unexpectedType(path, argument.type, 'Expression');
  }
  if (!path.parentPath) {
    throw unexpectedMissingParent(path);
  }
  if (!t.isVariableDeclarator(path.parent)) {
    throw unexpectedType(path.parentPath, path.parent.type, 'VariableDeclarator');
  }
  const leftExpr = path.parent.id;
  if (!t.isIdentifier(leftExpr)) {
    throw unexpectedType(path.parentPath, leftExpr.type, 'Expression');
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
    throw unexpectedArgumentLength(path, path.node.arguments.length, 2);
  }
  const argument = path.node.arguments[0];
  if (!t.isExpression(argument)) {
    throw unexpectedType(path, argument.type, 'Expression');
  }
  let options: t.Expression | undefined;
  if (path.node.arguments.length > 1) {
    const optionsValue = path.node.arguments[1];
    if (!t.isExpression(optionsValue)) {
      throw unexpectedType(path, optionsValue.type, 'Expression');
    }
    options = optionsValue;
  }
  if (!path.parentPath) {
    throw unexpectedMissingParent(path);
  }
  if (!t.isVariableDeclarator(path.parent)) {
    throw unexpectedType(path.parentPath, path.parent.type, 'VariableDeclarator');
  }
  const leftExpr = path.parent.id;
  if (!t.isIdentifier(leftExpr)) {
    throw unexpectedType(path.parentPath, leftExpr.type, 'Expression');
  }
  memoVariableExpression(
    hooks,
    path.parentPath as NodePath<t.VariableDeclarator>,
    leftExpr,
    argument,
    options,
  );
}

function deferredExpression(
  hooks: ImportHook,
  path: NodePath<t.CallExpression>,
): void {
  if (path.node.arguments.length > 2) {
    throw unexpectedArgumentLength(path, path.node.arguments.length, 2);
  }
  let argument: t.Expression | undefined;
  let options: t.Expression | undefined;
  if (path.node.arguments.length > 0) {
    const state = path.node.arguments[0];
    if (!t.isExpression(state)) {
      throw unexpectedType(path, state.type, 'Expression');
    }
    argument = state;
    if (path.node.arguments.length > 1) {
      const optionsValue = path.node.arguments[1];
      if (!t.isExpression(optionsValue)) {
        throw unexpectedType(path, optionsValue.type, 'Expression');
      }
      options = optionsValue;
    }
  }
  if (!path.parentPath) {
    throw unexpectedMissingParent(path);
  }
  if (!t.isVariableDeclarator(path.parent)) {
    throw unexpectedType(path.parentPath, path.parent.type, 'VariableDeclarator');
  }
  const leftExpr = path.parent.id;
  if (!t.isIdentifier(leftExpr)) {
    throw unexpectedType(path, leftExpr.type, 'Identifier');
  }
  deferredVariableExpression(
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
  if (path.node.arguments.length > 1) {
    throw unexpectedArgumentLength(path, path.node.arguments.length, 1);
  }
  const argument = path.node.arguments[0];
  if (!t.isExpression(argument)) {
    throw unexpectedType(path, argument.type, 'Expression');
  }
  if (!path.parentPath) {
    throw unexpectedMissingParent(path);
  }
  if (t.isVariableDeclarator(path.parent)) {
    const leftExpr = path.parent.id;
    if (!t.isIdentifier(leftExpr)) {
      throw unexpectedType(path, leftExpr.type, 'Identifier');
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
    throw unexpectedType(path.parentPath, path.parent.type, 'VariableDeclarator | ExpressionStatement');
  }
}

function rootExpression(
  hooks: ImportHook,
  path: NodePath<t.CallExpression>,
): void {
  if (path.node.arguments.length > 1) {
    throw unexpectedArgumentLength(path, path.node.arguments.length, 1);
  }
  const argument = path.node.arguments[0];
  if (!t.isExpression(argument)) {
    throw unexpectedType(path, argument.type, 'Expression');
  }
  if (!path.parentPath) {
    throw unexpectedMissingParent(path);
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
  if (path.node.arguments.length > 1) {
    throw unexpectedArgumentLength(path, path.node.arguments.length, 1);
  }
  const argument = path.node.arguments[0];
  if (!t.isExpression(argument)) {
    throw unexpectedType(path, argument.type, 'Expression');
  }
  if (!path.parentPath) {
    throw unexpectedMissingParent(path);
  }
  if (!t.isVariableDeclarator(path.parent)) {
    throw unexpectedType(path.parentPath, path.parent.type, 'VariableDeclarator');
  }
  const leftExpr = path.parent.id;
  if (!t.isIdentifier(leftExpr)) {
    throw unexpectedType(path, leftExpr.type, 'Identifier');
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
      throw unexpectedArgumentLength(path, path.node.arguments.length, limit);
    }
    const [argument, ...rest] = path.node.arguments;
    if (!t.isExpression(argument)) {
      throw unexpectedType(path, argument.type, 'Expression');
    }
    if (!path.parentPath) {
      throw unexpectedMissingParent(path);
    }
    if (!t.isVariableDeclarator(path.parent)) {
      throw unexpectedType(path.parentPath, path.parent.type, 'VariableDeclarator');
    }
    const leftExpr = path.parent.id;
    if (!t.isIdentifier(leftExpr)) {
      throw unexpectedType(path, leftExpr.type, 'Identifier');
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
      throw unexpectedArgumentLength(path, path.node.arguments.length, limit);
    }
    const [argument, ...rest] = path.node.arguments;
    if (!t.isExpression(argument)) {
      throw unexpectedType(path, argument.type, 'Expression');
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

function destructureExpression(
  hooks: ImportHook,
  path: NodePath<t.CallExpression>,
): void {
  if (path.node.arguments.length > 1) {
    throw unexpectedArgumentLength(path, path.node.arguments.length, 1);
  }
  const argument = path.node.arguments[0];
  if (!t.isExpression(argument)) {
    throw unexpectedType(path, argument.type, 'Expression');
  }
  if (!path.parentPath) {
    throw unexpectedMissingParent(path);
  }
  if (!t.isVariableDeclarator(path.parent)) {
    throw unexpectedType(path.parentPath, path.parent.type, 'VariableDeclarator');
  }
  const leftExpr = path.parent.id;
  if (!(t.isObjectPattern(leftExpr) || t.isArrayPattern(leftExpr))) {
    throw unexpectedType(path, leftExpr.type, 'ArrayPattern | ObjectPattern');
  }
  destructureVariableExpression(
    hooks,
    path.parentPath as NodePath<t.VariableDeclarator>,
    argument,
    leftExpr,
  );
}

const CTF_EXPRESSIONS: Record<string, CompileTimeFunctionExpression> = {
  $: reactiveExpression,
  $derefSignal: derefSignalExpression,
  $derefMemo: derefMemoExpression,
  $signal: signalExpression,
  $memo: memoExpression,
  $root: rootExpression,
  $from: fromExpression,
  $deferred: deferredExpression,

  // auto accessors + auto arrow
  $children: createCompileTimeAutoAccessor('children', 1),
  $mapArray: createCompileTimeAutoAccessor('mapArray', 3),
  $indexArray: createCompileTimeAutoAccessor('indexArray', 3),

  // auto arrows
  $lazy: createCompileTimeAutoArrow('lazy', 1),
  $untrack: createCompileTimeAutoArrow('untrack', 1),
  $batch: createCompileTimeAutoArrow('batch', 1),
  $observable: createCompileTimeAutoArrow('observable', 1),
  $selector: createCompileTimeAutoArrow('createSelector', 1),
  $on: createCompileTimeAutoArrow('on', 3),

  // aliases
  $useContext: createCompileTimeAlias('useContext'),
  $createContext: createCompileTimeAlias('createContext'),
  $uid: createCompileTimeAlias('createUniqueId'),
  $effect: createCompileTimeAlias('createEffect'),
  $computed: createCompileTimeAlias('createComputed'),
  $renderEffect: createCompileTimeAlias('createRenderEffect'),
  $merge: createCompileTimeAlias('mergeProps'),

  $destructure: destructureExpression,
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
