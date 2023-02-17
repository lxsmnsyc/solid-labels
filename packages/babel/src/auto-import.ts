import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import { State } from './types';
import getHookIdentifier from './get-hook-identifier';

type AutoImportExpression = (state: State, path: NodePath<t.Expression>) => t.Identifier;

function createAutoImport(target: string, source?: string) {
  return (
    state: State,
    path: NodePath<t.Expression>,
  ) => getHookIdentifier(state.hooks, path, target, source);
}

const AUTO_IMPORT_EXPR: Record<string, AutoImportExpression> = {
  $for: createAutoImport('For'),
  $show: createAutoImport('Show'),
  $switch: createAutoImport('Switch'),
  $match: createAutoImport('Match'),
  $index: createAutoImport('Index'),
  $errorBoundary: createAutoImport('ErrorBoundary'),
  $suspense: createAutoImport('Suspense'),
  $suspenseList: createAutoImport('SuspenseList'),
  $dynamic: createAutoImport('Dynamic', 'solid-js/web'),
  $portal: createAutoImport('Portal', 'solid-js/web'),
  $assets: createAutoImport('Assets', 'solid-js/web'),
  $hydrationScript: createAutoImport('HydrationScript', 'solid-js/web'),
  $noHydration: createAutoImport('NoHydration', 'solid-js/web'),
};


const NAMESPACE = 'solid';

const REPLACEMENTS: Record<string, AutoImportExpression> = {
  for: createAutoImport('For'),
  switch: createAutoImport('Switch'),
  match: createAutoImport('Match'),
  show: createAutoImport('Show'),
  index: createAutoImport('Index'),
  'error-boundary': createAutoImport('ErrorBoundary'),
  suspense: createAutoImport('Suspense'),
  'suspense-list': createAutoImport('SuspenseList'),
  dynamic: createAutoImport('Dynamic', 'solid-js/web'),
  portal: createAutoImport('Portal', 'solid-js/web'),
  assets: createAutoImport('Assets', 'solid-js/web'),
  'hydration-script': createAutoImport('HydrationScript', 'solid-js/web'),
  'no-hydration': createAutoImport('NoHydration', 'solid-js/web'),
};

const AUTO_IMPORT: Visitor<State> = {
  Expression(p, state) {
    if (
      t.isIdentifier(p.node)
      && !p.scope.hasBinding(p.node.name)
      && p.node.name in AUTO_IMPORT_EXPR
    ) {
      p.replaceWith(AUTO_IMPORT_EXPR[p.node.name](state, p));
    }
  },
  JSXElement(p, state) {
    const { openingElement, closingElement } = p.node;
    const id = openingElement.name;
    let replacement: t.JSXIdentifier | undefined;
    if (t.isJSXNamespacedName(id) && id.namespace.name === NAMESPACE && id.name.name in REPLACEMENTS) {
      replacement = t.jsxIdentifier(REPLACEMENTS[id.name.name](state, p).name);
    }
    if (t.isJSXIdentifier(id) && !p.scope.hasBinding(id.name) && id.name in AUTO_IMPORT_EXPR) {
      replacement = t.jsxIdentifier(AUTO_IMPORT_EXPR[id.name](state, p).name);
    }

    if (replacement) {
      openingElement.name = replacement;
      if (closingElement) {
        closingElement.name = replacement;
      }
    }
  },
};

export default AUTO_IMPORT;
