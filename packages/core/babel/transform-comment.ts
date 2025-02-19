import type * as babel from '@babel/core';
import * as t from '@babel/types';
import { accessorVariable } from './core/accessor-variable';
import { deferredVariable } from './core/deferred-variable';
import { destructureVariable } from './core/destructure-variable';
import { getImportIdentifier } from './core/get-import-identifier';
import { memoVariable } from './core/memo-variable';
import { signalVariable } from './core/signal-variable';
import type { State } from './core/types';

const VARIABLE_LABEL = {
  '@signal': true,
  '@memo': true,
  '@deferred': true,
  '@destructure': true,
  '@children': true,
};

type CallbackLabel = [name: string, source: string, named: boolean];

const CALLBACK_LABEL: Record<string, CallbackLabel> = {
  '@effect': ['createEffect', 'solid-js', true],
  '@computed': ['createComputed', 'solid-js', true],
  '@renderEffect': ['createRenderEffect', 'solid-js', true],
  '@mount': ['onMount', 'solid-js', false],
  '@cleanup': ['onCleanup', 'solid-js', false],
  '@error': ['onError', 'solid-js', false],
  '@root': ['createRoot', 'solid-js', false],
  '@untrack': ['untrack', 'solid-js', false],
  '@batch': ['untrack', 'solid-js', false],
  '@transition': ['startTransition', 'solid-js', false],
};

function getVariableLabelPreference(
  state: State,
  comments: t.Comment[],
): string | undefined {
  let preference: string | undefined;
  for (let i = 0, len = comments.length; i < len; i++) {
    const comment = comments[i];
    const value: string = comment.value.trim();
    if (value in VARIABLE_LABEL && !state.opts.disabled?.pragma?.[value]) {
      preference = value;
      comment.value = '';
    }
  }
  return preference;
}

function getCallbackLabelPreference(state: State, comments: t.Comment[]) {
  let preference: string | undefined;
  let nameOption: string | undefined;
  for (let i = 0, len = comments.length; i < len; i++) {
    const comment = comments[i];
    const value: string = comment.value.trim();
    if (/^@\w+( .*)?$/.test(value)) {
      const [tag, ...debugName] = value.split(' ');
      if (tag in CALLBACK_LABEL && !state.opts.disabled?.pragma?.[value]) {
        preference = tag;
        nameOption = debugName.join(' ');
        comment.value = '';
      }
    }
  }
  return [preference, nameOption];
}

const COMMENT_TRAVERSE: babel.Visitor<State> = {
  VariableDeclaration(path, state) {
    const comments = path.node.leadingComments;
    if (comments) {
      const preference = getVariableLabelPreference(state, comments);
      if (preference) {
        const { declarations } = path.node;
        let declarators: t.VariableDeclarator[] = [];
        for (let i = 0, len = declarations.length; i < len; i++) {
          const declarator = declarations[i];
          switch (preference as keyof typeof VARIABLE_LABEL) {
            case '@signal':
              if (t.isIdentifier(declarator.id)) {
                declarators.push(
                  signalVariable(
                    state,
                    path,
                    declarator.id,
                    declarator.init ?? t.identifier('undefined'),
                  ),
                );
              }
              break;
            case '@memo':
              if (t.isIdentifier(declarator.id)) {
                declarators.push(
                  memoVariable(
                    state,
                    path,
                    declarator.id,
                    declarator.init ?? t.identifier('undefined'),
                  ),
                );
              }
              break;
            case '@deferred':
              if (t.isIdentifier(declarator.id)) {
                declarators.push(
                  deferredVariable(
                    state,
                    path,
                    declarator.id,
                    declarator.init ?? t.identifier('undefined'),
                  ),
                );
              }
              break;
            case '@destructure':
              if (
                (t.isObjectPattern(declarator.id) ||
                  t.isArrayPattern(declarator.id)) &&
                declarator.init
              ) {
                declarators = [
                  ...declarators,
                  ...destructureVariable(
                    state,
                    path,
                    declarator.init,
                    declarator.id,
                  ),
                ];
              }
              break;
            case '@children':
              if (t.isIdentifier(declarator.id)) {
                declarators.push(
                  accessorVariable(
                    path,
                    declarator.id,
                    getImportIdentifier(state, path, 'children', 'solid-js'),
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

        path.replaceWith(t.variableDeclaration('const', declarators));
      }
    }
  },
  BlockStatement(path, state) {
    if (!t.isBlockStatement(path.parent)) {
      return;
    }
    const comments = path.node.leadingComments;
    if (comments) {
      const [preference, nameOption] = getCallbackLabelPreference(
        state,
        comments,
      );
      if (preference) {
        const [name, source, named] = CALLBACK_LABEL[preference];
        const callback = t.arrowFunctionExpression([], path.node);
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
        path.replaceWith(
          t.callExpression(
            getImportIdentifier(state, path, name, source),
            args,
          ),
        );
      }
    }
  },
  ExpressionStatement(path, state) {
    const comments = path.node.leadingComments;
    if (comments) {
      const [preference, nameOption] = getCallbackLabelPreference(
        state,
        comments,
      );
      if (preference) {
        const [name, source, named] = CALLBACK_LABEL[preference];
        const callback = t.arrowFunctionExpression([], path.node.expression);
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
        path.replaceWith(
          t.callExpression(
            getImportIdentifier(state, path, name, source),
            args,
          ),
        );
      }
    }
  },
};

export function transformComments(state: State, path: babel.NodePath): void {
  path.traverse(COMMENT_TRAVERSE, state);
}
