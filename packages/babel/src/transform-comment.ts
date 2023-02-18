import * as babel from '@babel/core';
import * as t from '@babel/types';
import accessorVariable from './core/accessor-variable';
import deferredVariable from './core/deferred-variable';
import destructureVariable from './core/destructure-variable';
import getImportIdentifier from './core/get-import-identifier';
import memoVariable from './core/memo-variable';
import signalVariable from './core/signal-variable';
import { State } from './core/types';

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

export default function transformComments(state: State, path: babel.NodePath) {
  path.traverse({
    VariableDeclaration(p) {
      const comments = p.node.leadingComments;
      if (comments) {
        let preference: string | undefined;
        for (let i = 0, len = comments.length; i < len; i += 1) {
          const comment: t.Comment = comments[i];
          const value: string = comment.value.trim();
          if (value in VARIABLE_LABEL && !state.opts.disabled?.pragma?.[value]) {
            preference = value;
            comment.value = '';
          }
        }
        if (preference) {
          const { declarations } = p.node;
          let declarators: t.VariableDeclarator[] = [];
          for (let i = 0, len = declarations.length; i < len; i += 1) {
            const declarator = declarations[i];
            switch (preference as keyof typeof VARIABLE_LABEL) {
              case '@signal':
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
              case '@memo':
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
              case '@deferred':
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
              case '@destructure':
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
              case '@children':
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
      }
    },
    BlockStatement(p) {
      if (
        !(
          t.isBlockStatement(p.parent)
        )
      ) {
        return;
      }
      const comments = p.node.leadingComments;
      if (comments) {
        let preference: string | undefined;
        let nameOption: string | undefined;
        for (let i = 0, len = comments.length; i < len; i += 1) {
          const comment: t.Comment = comments[i];
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
        if (preference) {
          const [name, source, named] = CALLBACK_LABEL[preference];
          const callback = t.arrowFunctionExpression(
            [],
            p.node,
          );
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
    ExpressionStatement(p) {
      const comments = p.node.leadingComments;
      if (comments) {
        let preference: string | undefined;
        let nameOption: string | undefined;
        for (let i = 0, len = comments.length; i < len; i += 1) {
          const comment: t.Comment = comments[i];
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
        if (preference) {
          const [name, source, named] = CALLBACK_LABEL[preference];
          const callback = t.arrowFunctionExpression(
            [],
            p.node.expression,
          );
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
