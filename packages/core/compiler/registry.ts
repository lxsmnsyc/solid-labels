export type ImportDef = [name: string, source: string];

/** Bare identifier aliases: `$flush` compiles to an auto-imported `flush`. */
export const AUTO_ALIAS: Record<string, ImportDef> = {
  // Reactivity
  $trackedEffect: ['createTrackedEffect', 'solid-js'],
  $renderEffect: ['createRenderEffect', 'solid-js'],
  $reaction: ['createReaction', 'solid-js'],
  $root: ['createRoot', 'solid-js'],
  $flush: ['flush', 'solid-js'],

  // Lifecycles
  $settled: ['onSettled', 'solid-js'],
  $cleanup: ['onCleanup', 'solid-js'],

  // Async
  $action: ['action', 'solid-js'],
  $isPending: ['isPending', 'solid-js'],
  $latest: ['latest', 'solid-js'],
  $refresh: ['refresh', 'solid-js'],
  $affects: ['affects', 'solid-js'],

  // Component APIs
  $uid: ['createUniqueId', 'solid-js'],
  $merge: ['merge', 'solid-js'],
  $omit: ['omit', 'solid-js'],
  $useContext: ['useContext', 'solid-js'],
  $createContext: ['createContext', 'solid-js'],
  $owner: ['getOwner', 'solid-js'],
  $runWithOwner: ['runWithOwner', 'solid-js'],

  // Stores
  $store: ['createStore', 'solid-js'],
  $projection: ['createProjection', 'solid-js'],
  $optimistic: ['createOptimistic', 'solid-js'],
  $optimisticStore: ['createOptimisticStore', 'solid-js'],
  $reconcile: ['reconcile', 'solid-js'],
  $snapshot: ['snapshot', 'solid-js'],
  $deep: ['deep', 'solid-js'],
};

/** Call CTFs whose first argument is wrapped in an arrow function. */
export const ARROW_CTF: Record<string, [name: string, source: string, args: number]> = {
  $lazy: ['lazy', 'solid-js', 2],
  $untrack: ['untrack', 'solid-js', 1],
  $resolve: ['resolve', 'solid-js', 1],
};

/**
 * Declaration CTFs that produce an accessor variable:
 * `const nodes = $children(props.children)` reads as `nodes` afterwards.
 */
export const ACCESSOR_CTF: Record<string, [name: string, source: string, args: number]> = {
  $children: ['children', 'solid-js', 1],
  $mapArray: ['mapArray', 'solid-js', 3],
  $repeat: ['repeat', 'solid-js', 3],
};

/** Auto-imported components, usable bare when not shadowed. */
export const COMPONENTS: Record<string, ImportDef> = {
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

/** `<solid:loading>`-style namespaced JSX components. */
export const NAMESPACE_COMPONENTS: Record<string, ImportDef> = {
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
