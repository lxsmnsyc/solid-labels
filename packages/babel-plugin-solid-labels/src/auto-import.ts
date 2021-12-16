import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import { State } from './types';
import getHookIdentifier from './get-hook-identifier';

type AutoImportExpression = (state: State, path: NodePath<t.Expression>) => void;

function createAutoImport(target: string, source?: string) {
  return (
    state: State,
    path: NodePath<t.Expression>,
  ) => {
    path.replaceWith(getHookIdentifier(state.hooks, path, target, source));
  };
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
      AUTO_IMPORT_EXPR[p.node.name](state, p);
    }
  },
};

export default AUTO_IMPORT;
