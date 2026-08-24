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
  Repeat: ['Repeat', 'solid-js'],
  Errored: ['Errored', 'solid-js'],
  Loading: ['Loading', 'solid-js'],
  Reveal: ['Reveal', 'solid-js'],
  Dynamic: ['Dynamic', '@solidjs/web'],
  Portal: ['Portal', '@solidjs/web'],
  HydrationScript: ['HydrationScript', '@solidjs/web'],
  Hydration: ['Hydration', '@solidjs/web'],
  NoHydration: ['NoHydration', '@solidjs/web'],
};

const NAMESPACE = 'solid';

const NAMESPACE_COMPONENTS: Record<string, ComponentImport> = {
  // Components
  for: ['For', 'solid-js'],
  show: ['Show', 'solid-js'],
  switch: ['Switch', 'solid-js'],
  match: ['Match', 'solid-js'],
  repeat: ['Repeat', 'solid-js'],
  errored: ['Errored', 'solid-js'],
  loading: ['Loading', 'solid-js'],
  reveal: ['Reveal', 'solid-js'],
  dynamic: ['Dynamic', '@solidjs/web'],
  portal: ['Portal', '@solidjs/web'],
  'hydration-script': ['HydrationScript', '@solidjs/web'],
  hydration: ['Hydration', '@solidjs/web'],
  'no-hydration': ['NoHydration', '@solidjs/web'],
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

export function transformComponents(state: State, path: NodePath): void {
  path.traverse(COMPONENT_TRAVERSE, state);
}
