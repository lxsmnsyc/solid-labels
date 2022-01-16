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
    const opening = p.node.openingElement;
    const closing = p.node.closingElement;

    if (
      t.isJSXIdentifier(opening.name)
      && !p.scope.hasBinding(opening.name.name)
      && opening.name.name in AUTO_IMPORT_EXPR
    ) {
      opening.name = t.jsxIdentifier(AUTO_IMPORT_EXPR[opening.name.name](state, p).name);
    }
    if (
      closing
      && t.isJSXIdentifier(closing.name)
      && !p.scope.hasBinding(closing.name.name)
      && closing.name.name in AUTO_IMPORT_EXPR
    ) {
      closing.name = t.jsxIdentifier(AUTO_IMPORT_EXPR[closing.name.name](state, p).name);
    }
  },
};

export default AUTO_IMPORT;
