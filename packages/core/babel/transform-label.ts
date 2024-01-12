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

const SPECIAL_LABELS = new Set([REACTIVE_LABEL]);

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

function transformReactiveLabel(
  state: State,
  p: babel.NodePath,
  body: t.Statement,
): void {
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
      [t.arrowFunctionExpression([], target)],
    ),
  );
}

function transformDeclaratorFromVariableLabel(
  state: State,
  p: babel.NodePath,
  labelName: keyof typeof VARIABLE_LABEL,
  declarator: t.VariableDeclarator,
): t.VariableDeclarator[] {
  if (labelName === 'signal' && t.isIdentifier(declarator.id)) {
    return [
      signalVariable(
        state,
        p,
        declarator.id,
        declarator.init ?? t.identifier('undefined'),
      ),
    ];
  }
  if (labelName === 'memo' && t.isIdentifier(declarator.id)) {
    return [
      memoVariable(
        state,
        p,
        declarator.id,
        declarator.init ?? t.identifier('undefined'),
      ),
    ];
  }
  if (labelName === 'deferred' && t.isIdentifier(declarator.id)) {
    return [
      deferredVariable(
        state,
        p,
        declarator.id,
        declarator.init ?? t.identifier('undefined'),
      ),
    ];
  }
  if (
    labelName === 'destructure' &&
    (t.isObjectPattern(declarator.id) || t.isArrayPattern(declarator.id)) &&
    declarator.init
  ) {
    return destructureVariable(state, p, declarator.init, declarator.id);
  }
  if (labelName === 'children' && t.isIdentifier(declarator.id)) {
    return [
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
    ];
  }
  return [];
}

function transformVariableLabel(
  state: State,
  p: babel.NodePath,
  labelName: keyof typeof VARIABLE_LABEL,
  body: t.Statement,
): void {
  assert(
    t.isVariableDeclaration(body),
    unexpectedType(p, p.node.type, 'VariableDeclaration'),
  );

  const declarators: t.VariableDeclarator[] = [];

  for (let i = 0, len = body.declarations.length; i < len; i++) {
    declarators.push.apply(
      declarators,
      transformDeclaratorFromVariableLabel(
        state,
        p,
        labelName,
        body.declarations[i],
      ),
    );
  }

  p.replaceWith(t.variableDeclaration('const', declarators));
}

function transformCallbackLabel(
  state: State,
  p: babel.NodePath,
  labelName: string,
  body: t.Statement,
): void {
  const [name, source, named] = CALLBACK_LABEL[labelName];
  let nameOption: string | undefined;
  let callback: t.Expression;
  if (named && t.isLabeledStatement(body)) {
    nameOption = body.label.name;
    body = body.body;
  }
  if (t.isBlockStatement(body)) {
    callback = t.arrowFunctionExpression([], body);
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
        t.objectProperty(t.identifier('name'), t.stringLiteral(nameOption)),
      ]),
    );
  }
  p.replaceWith(
    t.callExpression(getImportIdentifier(state, p, name, source), args),
  );
}

export default function transformLabels(
  state: State,
  path: babel.NodePath,
): void {
  path.traverse({
    LabeledStatement(p) {
      const labelName = p.node.label.name;
      const { body } = p.node;
      if (
        (SPECIAL_LABELS.has(labelName) ||
          labelName in VARIABLE_LABEL ||
          labelName in CALLBACK_LABEL) &&
        !state.opts.disabled?.label?.[labelName]
      ) {
        if (labelName === REACTIVE_LABEL) {
          transformReactiveLabel(state, p, body);
        } else if (labelName in VARIABLE_LABEL) {
          transformVariableLabel(
            state,
            p,
            labelName as keyof typeof VARIABLE_LABEL,
            body,
          );
        } else if (labelName in CALLBACK_LABEL) {
          transformCallbackLabel(state, p, labelName, body);
        }
      }
    },
  });
}
