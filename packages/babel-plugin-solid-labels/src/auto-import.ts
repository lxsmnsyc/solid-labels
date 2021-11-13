import { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import { State } from './types';
import getHookIdentifier from './get-hook-identifier';

type AutoImportExpression = (state: State, path: NodePath<t.Identifier>) => void;

function createAutoImport(target: string, source?: string) {
  return (
    state: State,
    path: NodePath<t.Identifier>,
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
  Identifier(p, state) {
    // { x }
    if (t.isObjectMethod(p.parent) && p.parent.key === p.node) {
      return;
    }
    if (t.isObjectProperty(p.parent) && p.parent.key === p.node) {
      return;
    }
    // const x
    if (t.isVariableDeclarator(p.parent)) {
      if (p.parent.id === p.node) {
        return;
      }
    }
    // const [x]
    if (t.isArrayPattern(p.parent) && p.parent.elements.includes(p.node)) {
      return;
    }
    // (x) => {}
    if (t.isArrowFunctionExpression(p.parent) && p.parent.params.includes(p.node)) {
      return;
    }
    // function (x)
    if (t.isFunctionExpression(p.parent) && p.parent.params.includes(p.node)) {
      return;
    }
    if (t.isFunctionDeclaration(p.parent) && p.parent.params.includes(p.node)) {
      return;
    }
    // x:
    if (t.isLabeledStatement(p.parent) && p.parent.label === p.node) {
      return;
    }
    // obj.x
    if (t.isMemberExpression(p.parent) && p.parent.property === p.node) {
      return;
    }
    // function x() {}
    if (t.isFunctionDeclaration(p.parent) && p.parent.id === p.node) {
      return;
    }
    // (y = x) => {}
    // function z(y = x) {}
    if (
      t.isAssignmentPattern(p.parent)
      && p.parent.left === p.node
      && (
        (
          t.isArrowFunctionExpression(p.parentPath.parent)
          && p.parentPath.parent.params.includes(p.parent)
        )
        || (
          t.isFunctionDeclaration(p.parentPath.parent)
          && p.parentPath.parent.params.includes(p.parent)
        )
        || (
          t.isFunctionExpression(p.parentPath.parent)
          && p.parentPath.parent.params.includes(p.parent)
        )
      )
    ) {
      return;
    }
    if (p.node.name in AUTO_IMPORT_EXPR) {
      AUTO_IMPORT_EXPR[p.node.name](state, p);
    }
  },
};

export default AUTO_IMPORT;
