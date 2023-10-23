import type * as babel from '@babel/core';
import * as t from '@babel/types';
import accessorVariable from './core/accessor-variable';
import assert from './core/assert';
import deferredVariable from './core/deferred-variable';
import destructureVariable from './core/destructure-variable';
import { unexpectedType } from './core/errors';
import getImportIdentifier from './core/get-import-identifier';
import memoVariable from './core/memo-variable';
import signalVariable from './core/signal-variable';
import type { State } from './core/types';

const REACTIVE_LABEL = '$';

const SPECIAL_LABELS = new Set([
  REACTIVE_LABEL,
]);

const VARIABLE_LABEL = {
  signal: true,
  memo: true,
  deferred: true,
  destructure: true,
  children: true,
};

type CallbackLabel = [name: string, source: string, named: boolean];

const CALLBACK_LABEL: Record<string, CallbackLabel> = {
  effect: ['createEffect', 'solid-js', true],
  computed: ['createComputed', 'solid-js', true],
  renderEffect: ['createRenderEffect', 'solid-js', true],
  mount: ['onMount', 'solid-js', false],
  cleanup: ['onCleanup', 'solid-js', false],
  error: ['onError', 'solid-js', false],
  root: ['createRoot', 'solid-js', false],
  untrack: ['untrack', 'solid-js', false],
  batch: ['untrack', 'solid-js', false],
  transition: ['startTransition', 'solid-js', false],
};

export default function transformLabels(state: State, path: babel.NodePath): void {
  path.traverse({
    LabeledStatement(p) {
      const labelName = p.node.label.name;
      let { body } = p.node;
      if (
        (
          SPECIAL_LABELS.has(labelName)
          || labelName in VARIABLE_LABEL
          || labelName in CALLBACK_LABEL
        )
        && !state.opts.disabled?.label?.[labelName]
      ) {
        if (labelName === REACTIVE_LABEL) {
          let target: t.Expression | t.BlockStatement;
          if (t.isExpressionStatement(body)) {
            target = body.expression;
          } else if (t.isBlockStatement(body)) {
            target = body;
          } else {
            throw unexpectedType(p, body.type, 'ExpressionStatement | BlockStatement');
          }
          p.replaceWith(
            t.callExpression(
              getImportIdentifier(state, p, 'createEffect', 'solid-js'),
              [
                t.arrowFunctionExpression(
                  [],
                  target,
                ),
              ],
            ),
          );
        }
        if (labelName in VARIABLE_LABEL) {
          assert(t.isVariableDeclaration(body), unexpectedType(p, p.node.type, 'VariableDeclaration'));
          let declarators: t.VariableDeclarator[] = [];

          for (let i = 0, len = body.declarations.length; i < len; i++) {
            const declarator = body.declarations[i];
            switch (labelName as keyof typeof VARIABLE_LABEL) {
              case 'signal':
                if (t.isIdentifier(declarator.id)) {
                  declarators.push(
                    signalVariable(
                      state,
                      p,
                      declarator.id,
                      declarator.init ?? t.identifier('undefined'),
                    ),
                  );
                }
                break;
              case 'memo':
                if (t.isIdentifier(declarator.id)) {
                  declarators.push(
                    memoVariable(
                      state,
                      p,
                      declarator.id,
                      declarator.init ?? t.identifier('undefined'),
                    ),
                  );
                }
                break;
              case 'deferred':
                if (t.isIdentifier(declarator.id)) {
                  declarators.push(
                    deferredVariable(
                      state,
                      p,
                      declarator.id,
                      declarator.init ?? t.identifier('undefined'),
                    ),
                  );
                }
                break;
              case 'destructure':
                if (
                  (t.isObjectPattern(declarator.id) || t.isArrayPattern(declarator.id))
                  && declarator.init
                ) {
                  declarators = [...declarators, ...destructureVariable(
                    state,
                    p,
                    declarator.init,
                    declarator.id,
                  )];
                }
                break;
              case 'children':
                if (t.isIdentifier(declarator.id)) {
                  declarators.push(
                    accessorVariable(
                      p,
                      declarator.id,
                      getImportIdentifier(state, p, 'children', 'solid-js'),
                      [
                        t.arrowFunctionExpression(
                          [],
                          declarator.init ?? t.identifier('undefined'),
                        ),
                      ],
                    ),
                  );
                }
                break;
              default:
                break;
            }
          }

          p.replaceWith(
            t.variableDeclaration(
              'const',
              declarators,
            ),
          );
        }
        if (labelName in CALLBACK_LABEL) {
          const [name, source, named] = CALLBACK_LABEL[labelName];
          let nameOption: string | undefined;
          let callback: t.Expression;
          if (named && t.isLabeledStatement(body)) {
            nameOption = body.label.name;
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
            throw unexpectedType(p, body.type, 'BlockStatement | ExpressionStatement');
          }
          const args: t.Expression[] = [callback];
          if (named && nameOption) {
            args.push(
              t.identifier('undefined'),
              t.objectExpression([
                t.objectProperty(
                  t.identifier('name'),
                  t.stringLiteral(nameOption),
                ),
              ]),
            );
          }
          p.replaceWith(
            t.callExpression(
              getImportIdentifier(state, p, name, source),
              args,
            ),
          );
        }
      }
    },
  });
}
