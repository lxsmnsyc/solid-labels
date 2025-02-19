import type * as babel from '@babel/core';
import * as t from '@babel/types';
import { accessorVariable } from './core/accessor-variable';
import { assert } from './core/assert';
import { deferredVariable } from './core/deferred-variable';
import { derefMemoVariable } from './core/deref-memo-variable';
import { derefSignalVariable } from './core/deref-signal-variable';
import { destructureVariable } from './core/destructure-variable';
import { unexpectedArgumentLength, unexpectedType } from './core/errors';
import { generateUniqueName } from './core/generate-unique-name';
import { getImportIdentifier } from './core/get-import-identifier';
import { memoVariable } from './core/memo-variable';
import { signalVariable } from './core/signal-variable';
import type { State } from './core/types';
import { unwrapNode } from './core/unwrap-node';

type AutoArrowCTF = [name: string, source: string, arguments: number];

const AUTO_ARROW_CTF: Record<string, AutoArrowCTF> = {
  $lazy: ['lazy', 'solid-js', 1],
  $untrack: ['untrack', 'solid-js', 1],
  $batch: ['batch', 'solid-js', 1],
  $observable: ['observable', 'solid-js', 1],
  $selector: ['createSelector', 'solid-js', 1],
  $on: ['on', 'solid-js', 3],
};

type AutoImportAliasCTF = [name: string, source: string];

const AUTO_IMPORT_ALIAS_CTF: Record<string, AutoImportAliasCTF> = {
  $root: ['createRoot', 'solid-js'],
  $useContext: ['useContext', 'solid-js'],
  $createContext: ['createContext', 'solid-js'],
  $uid: ['createUniqueId', 'solid-js'],
  $effect: ['createEffect', 'solid-js'],
  $computed: ['createComputed', 'solid-js'],
  $renderEffect: ['createRenderEffect', 'solid-js'],
  $merge: ['mergeProps', 'solid-js'],
  $resource: ['createResource', 'solid-js'],
  $cleanup: ['onCleanup', 'solid-js'],
  $mount: ['onMount', 'solid-js'],
  $error: ['onError', 'solid-js'],
  $reaction: ['createReaction', 'solid-js'],
  $startTransition: ['startTransition', 'solid-js'],
  $useTransition: ['useTransition', 'solid-js'],
  $owner: ['getOwner', 'solid-js'],
  $runWithOwner: ['runWithOwner', 'solid-js'],
  $catchError: ['catchError', 'solid-js'],

  // Store API
  $store: ['createStore', 'solid-js/store'],
  $mutable: ['createMutable', 'solid-js/store'],
  $produce: ['produce', 'solid-js/store'],
  $reconcile: ['reconcile', 'solid-js/store'],
  $unwrap: ['unwrap', 'solid-js/store'],
};

type AutoAccessorCTF = [
  name: string,
  source: string,
  args: number,
  arrow: boolean,
];

const AUTO_ACCESSOR_CTF: Record<string, AutoAccessorCTF> = {
  $from: ['from', 'solid-js', 1, true],
  $children: ['children', 'solid-js', 1, false],
  $mapArray: ['mapArray', 'solid-js', 3, false],
  $indexArray: ['indexArray', 'solid-js', 3, false],
};

const SIGNAL_CTF = '$signal';
const MEMO_CTF = '$memo';
const DEREF_SIGNAL_CTF = '$derefSignal';
const DEREF_MEMO_CTF = '$derefMemo';
const REACTIVE_CTF = '$';
const DEFERRED_CTF = '$deferred';
const DESTRUCTURE_CTF = '$destructure';
const COMPONENT_CTF = '$component';

const SPECIAL_CTF = new Set([
  SIGNAL_CTF,
  MEMO_CTF,
  DEREF_SIGNAL_CTF,
  DEREF_MEMO_CTF,
  REACTIVE_CTF,
  DEFERRED_CTF,
  DESTRUCTURE_CTF,
  COMPONENT_CTF,
]);

const CTF_TRAVERSE: babel.Visitor<State> = {
  CallExpression(path, state) {
    const trueIdentifier = unwrapNode(path.node.callee, t.isIdentifier);
    if (
      trueIdentifier &&
      !path.scope.hasBinding(trueIdentifier.name) &&
      !state.opts.disabled?.ctf?.[trueIdentifier.name]
    ) {
      // Transform Auto Arrow CTFs
      if (trueIdentifier.name in AUTO_ARROW_CTF) {
        const [name, source, limit] = AUTO_ARROW_CTF[trueIdentifier.name];
        const args = path.node.arguments;
        assert(
          args.length <= limit,
          unexpectedArgumentLength(path, args.length, limit),
        );
        const [argument, ...rest] = args;
        assert(
          t.isExpression(argument),
          unexpectedType(path, argument.type, 'Expression'),
        );
        path.replaceWith(
          t.callExpression(getImportIdentifier(state, path, name, source), [
            t.isArrowFunctionExpression(argument) ||
            t.isFunctionExpression(argument)
              ? argument
              : t.arrowFunctionExpression([], argument),
            ...rest,
          ]),
        );
      }
      if (trueIdentifier.name === COMPONENT_CTF) {
        const args = path.node.arguments;
        assert(
          args.length === 1,
          unexpectedArgumentLength(path, args.length, 1),
        );
        const argument = args[0];
        assert(
          t.isFunctionExpression(argument) ||
            t.isArrowFunctionExpression(argument),
          unexpectedType(
            path,
            argument.type,
            'FunctionExpression | ArrowFunctionExpression',
          ),
        );
        if (argument.params.length > 0) {
          const params = argument.params[0];
          if (t.isObjectPattern(params)) {
            // Generate uid for props
            const props = generateUniqueName(path, 'props');
            // Replace params with props
            argument.params[0] = props;
            const declaration = t.variableDeclaration('const', [
              t.variableDeclarator(
                params,
                t.callExpression(t.identifier('$destructure'), [props]),
              ),
            ]);
            if (t.isExpression(argument.body)) {
              argument.body = t.blockStatement([
                declaration,
                t.returnStatement(argument.body),
              ]);
            } else {
              argument.body.body.unshift(declaration);
            }
          }
        }
        path.replaceWith(argument);
      }
    }
  },
  Expression(path, state) {
    if (t.isIdentifier(path.node) && !path.scope.hasBinding(path.node.name)) {
      if (
        path.node.name in AUTO_IMPORT_ALIAS_CTF &&
        !state.opts.disabled?.ctf?.[path.node.name]
      ) {
        const [name, source] = AUTO_IMPORT_ALIAS_CTF[path.node.name];
        path.replaceWith(getImportIdentifier(state, path, name, source));
      }
    }
  },
  VariableDeclarator(path, state) {
    const { id, init } = path.node;
    if (init) {
      const trueCallExpr = unwrapNode(init, t.isCallExpression);
      if (trueCallExpr) {
        const trueCallee = unwrapNode(trueCallExpr.callee, t.isIdentifier);
        if (
          trueCallee &&
          !path.scope.hasBinding(trueCallee.name) &&
          (SPECIAL_CTF.has(trueCallee.name) ||
            trueCallee.name in AUTO_ACCESSOR_CTF) &&
          !state.opts.disabled?.ctf?.[trueCallee.name]
        ) {
          if (t.isIdentifier(id)) {
            // Transform CTFs with auto-accessor
            if (trueCallee.name in AUTO_ACCESSOR_CTF) {
              const [name, source, limit, arrow] =
                AUTO_ACCESSOR_CTF[trueCallee.name];
              const args = trueCallExpr.arguments;
              assert(
                args.length <= limit,
                unexpectedArgumentLength(path, args.length, limit),
              );
              const [argument, ...rest] = args;
              assert(
                t.isExpression(argument),
                unexpectedType(path, argument.type, 'Expression'),
              );
              path.replaceWith(
                accessorVariable(
                  path,
                  id,
                  getImportIdentifier(state, path, name, source),
                  [
                    arrow ? t.arrowFunctionExpression([], argument) : argument,
                    ...rest,
                  ],
                ),
              );
            } else if (trueCallee.name === SIGNAL_CTF) {
              // Transform $signal
              const args = trueCallExpr.arguments;
              assert(
                args.length <= 2,
                unexpectedArgumentLength(path, args.length, 2),
              );
              let argument: t.Expression | undefined;
              let options: t.Expression | undefined;
              if (trueCallExpr.arguments.length > 0) {
                const initialState = trueCallExpr.arguments[0];
                assert(
                  t.isExpression(initialState),
                  unexpectedType(path, initialState.type, 'Expression'),
                );
                argument = initialState;
                if (trueCallExpr.arguments.length > 1) {
                  const optionsValue = trueCallExpr.arguments[1];
                  assert(
                    t.isExpression(optionsValue),
                    unexpectedType(path, optionsValue.type, 'Expression'),
                  );
                  options = optionsValue;
                }
              }
              path.replaceWith(
                signalVariable(
                  state,
                  path,
                  id,
                  argument || t.identifier('undefined'),
                  options,
                ),
              );
            } else if (
              trueCallee.name === MEMO_CTF ||
              trueCallee.name === REACTIVE_CTF
            ) {
              // Transform $memo
              const args = trueCallExpr.arguments;
              assert(
                args.length <= 2,
                unexpectedArgumentLength(path, args.length, 2),
              );
              const argument = args[0];
              assert(
                t.isExpression(argument),
                unexpectedType(path, argument.type, 'Expression'),
              );
              let options: t.Expression | undefined;
              if (args.length > 1) {
                const optionsValue = args[1];
                assert(
                  t.isExpression(optionsValue),
                  unexpectedType(path, optionsValue.type, 'Expression'),
                );
                options = optionsValue;
              }
              path.replaceWith(
                memoVariable(state, path, id, argument, options),
              );
            } else if (trueCallee.name === DEREF_SIGNAL_CTF) {
              // Transform $derefSignal
              const args = trueCallExpr.arguments;
              assert(
                args.length === 1,
                unexpectedArgumentLength(path, args.length, 1),
              );
              const argument = args[0];
              assert(
                t.isExpression(argument),
                unexpectedType(path, argument.type, 'Expression'),
              );
              path.replaceWith(derefSignalVariable(path, id, argument));
            } else if (trueCallee.name === DEREF_MEMO_CTF) {
              // Transform $derefMemo
              const args = trueCallExpr.arguments;
              assert(
                args.length === 1,
                unexpectedArgumentLength(path, args.length, 1),
              );
              const argument = args[0];
              assert(
                t.isExpression(argument),
                unexpectedType(path, argument.type, 'Expression'),
              );
              path.replaceWith(derefMemoVariable(path, id, argument));
            } else if (trueCallee.name === DEFERRED_CTF) {
              // Transform $deferred
              const args = trueCallExpr.arguments;
              assert(
                args.length <= 2,
                unexpectedArgumentLength(path, args.length, 2),
              );
              let argument: t.Expression | undefined;
              let options: t.Expression | undefined;
              if (args.length > 0) {
                const initialState = args[0];
                assert(
                  t.isExpression(initialState),
                  unexpectedType(path, initialState.type, 'Expression'),
                );
                argument = initialState;
                if (args.length > 1) {
                  const optionsValue = args[1];
                  assert(
                    t.isExpression(optionsValue),
                    unexpectedType(path, optionsValue.type, 'Expression'),
                  );
                  options = optionsValue;
                }
              }
              path.replaceWith(
                deferredVariable(state, path, id, argument, options),
              );
            }
          } else if (trueCallee.name === DESTRUCTURE_CTF) {
            const args = trueCallExpr.arguments;
            assert(
              args.length === 1,
              unexpectedArgumentLength(path, args.length, 1),
            );
            const argument = args[0];
            assert(
              t.isExpression(argument),
              unexpectedType(path, argument.type, 'Expression'),
            );
            assert(
              t.isObjectPattern(id) || t.isArrayPattern(id),
              unexpectedType(path, id.type, 'ArrayPattern | ObjectPattern'),
            );
            path.replaceWithMultiple(
              destructureVariable(state, path, argument, id),
            );
          }
          path.scope.crawl();
        }
      }
    }
  },
  ExpressionStatement(path, state) {
    const trueCallExpr = unwrapNode(path.node.expression, t.isCallExpression);
    if (trueCallExpr) {
      const trueCallee = unwrapNode(trueCallExpr.callee, t.isIdentifier);
      if (
        trueCallee &&
        !path.scope.hasBinding(trueCallee.name) &&
        !state.opts.disabled?.ctf?.[trueCallee.name]
      ) {
        // Transform $
        if (trueCallee.name === REACTIVE_CTF) {
          const args = trueCallExpr.arguments;
          assert(
            args.length === 1,
            unexpectedArgumentLength(path, args.length, 1),
          );
          const argument = args[0];
          assert(
            t.isExpression(argument),
            unexpectedType(path, argument.type, 'Expression'),
          );
          path.replaceWith(
            t.expressionStatement(
              t.callExpression(
                getImportIdentifier(state, path, 'createEffect', 'solid-js'),
                [t.arrowFunctionExpression([], argument)],
              ),
            ),
          );
        }
      }
    }
  },
};

export function transformCTF(state: State, path: babel.NodePath): void {
  path.traverse(CTF_TRAVERSE, state);
}
