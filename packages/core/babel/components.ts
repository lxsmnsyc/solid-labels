import type { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import { getImportIdentifier } from './core/get-import-identifier';
import type { State } from './core/types';

type ComponentImport = [name: string, source: string];

const COMPONENTS: Record<string, ComponentImport> = {
  // Components
  For: ['For', 'solid-js'],
  Show: ['Show', 'solid-js'],
  Switch: ['Switch', 'solid-js'],
  Match: ['Match', 'solid-js'],
  Index: ['Index', 'solid-js'],
  ErrorBoundary: ['ErrorBoundary', 'solid-js'],
  Suspense: ['Suspense', 'solid-js'],
  SuspenseList: ['SuspenseList', 'solid-js'],
  Dynamic: ['Dynamic', 'solid-js/web'],
  Portal: ['Portal', 'solid-js/web'],
  Assets: ['Assets', 'solid-js/web'],
  HydrationScript: ['HydrationScript', 'solid-js/web'],
  NoHydration: ['NoHydration', 'solid-js/web'],
};

const NAMESPACE = 'solid';

const NAMESPACE_COMPONENTS: Record<string, ComponentImport> = {
  // Components
  for: ['For', 'solid-js'],
  show: ['Show', 'solid-js'],
  switch: ['Switch', 'solid-js'],
  match: ['Match', 'solid-js'],
  index: ['Index', 'solid-js'],
  'error-boundary': ['ErrorBoundary', 'solid-js'],
  suspense: ['Suspense', 'solid-js'],
  'suspense-list': ['SuspenseList', 'solid-js'],
  dynamic: ['Dynamic', 'solid-js/web'],
  portal: ['Portal', 'solid-js/web'],
  assets: ['Assets', 'solid-js/web'],
  'hydration-script': ['HydrationScript', 'solid-js/web'],
  'no-hydration': ['NoHydration', 'solid-js/web'],
};

const COMPONENT_TRAVERSE: Visitor<State> = {
  Expression(p, state) {
    if (
      t.isIdentifier(p.node) &&
      !p.scope.hasBinding(p.node.name) &&
      p.node.name in COMPONENTS
    ) {
      const [name, source] = COMPONENTS[p.node.name];
      p.replaceWith(getImportIdentifier(state, p, name, source));
    }
  },
  JSXElement(p, state) {
    const { openingElement, closingElement } = p.node;
    const id = openingElement.name;
    let replacement: t.JSXIdentifier | undefined;
    if (
      t.isJSXNamespacedName(id) &&
      id.namespace.name === NAMESPACE &&
      id.name.name in NAMESPACE_COMPONENTS
    ) {
      const [name, source] = NAMESPACE_COMPONENTS[id.name.name];
      const identifier = getImportIdentifier(state, p, name, source);
      replacement = t.jsxIdentifier(identifier.name);
    }
    if (
      t.isJSXIdentifier(id) &&
      !p.scope.hasBinding(id.name) &&
      id.name in COMPONENTS
    ) {
      const [name, source] = COMPONENTS[id.name];
      const identifier = getImportIdentifier(state, p, name, source);
      replacement = t.jsxIdentifier(identifier.name);
    }

    if (replacement) {
      openingElement.name = replacement;
      if (closingElement) {
        closingElement.name = replacement;
      }
    }
  },
};

export function transformComponents(
  state: State,
  path: NodePath,
): void {
  path.traverse(COMPONENT_TRAVERSE, state);
}
