import type * as solid from 'solid-js';
import type * as solidWeb from '@solidjs/web';

declare global {
  type Accessor<T> = solid.Accessor<T>;
  type Setter<T> = solid.Setter<T>;
  type Context<T> = solid.Context<T>;
  type Component<T extends Record<string, any> = {}> = solid.Component<T>;

  // Reactive variables

  function $signal<T>(): T | undefined;
  function $signal<T>(
    value: T,
    options?: {
      equals?: false | ((prev: T, next: T) => boolean);
      name?: string;
      ownedWrite?: boolean;
      unobserved?: () => void;
    },
  ): T;

  function $memo<T>(
    value: T,
    options?: {
      equals?: false | ((prev: T, next: T) => boolean);
      name?: string;
      lazy?: boolean;
      unobserved?: () => void;
    },
  ): T;

  function $<T>(value: T): T;

  // Refs and derefs

  function $derefSignal<T>(value: [Accessor<T>, Setter<T>]): T;
  function $refSignal<T>(value: T): [Accessor<T>, Setter<T>];
  function $derefMemo<T>(value: Accessor<T>): T;
  function $refMemo<T>(value: T): Accessor<T>;

  function $get<T>(value: T): Accessor<T>;
  function $set<T>(value: T): Setter<T>;

  // Object property transforms

  function $getter<T>(value: T): T;
  function $setter<T>(value: T): T;
  function $property<T>(value: T): T;

  // Effects — the callback reads captured plain values; the compiler
  // generates the tracked compute phase from the identifiers it captures.

  function $effect(
    callback: () => void,
    options?: { defer?: boolean; name?: string },
  ): void;
  function $renderEffect(
    callback: () => void,
    options?: { defer?: boolean; name?: string },
  ): void;

  function $untrack<T>(value: T): T;
  function $resolve<T>(value: T): Promise<Awaited<T>>;

  function $lazy<T extends Component<any>>(
    fn: Promise<{ default: T }>,
  ): T & {
    preload: () => void;
  };

  function $children(value: solid.Element): solid.Element;

  function $mapArray<T, U>(
    arr: readonly T[] | undefined | null | false,
    mapFn: (v: T, i: Accessor<number>) => U,
    options?: {
      keyed?: true;
      fallback?: Accessor<any>;
      name?: string;
    },
  ): U[];
  function $mapArray<T, U>(
    arr: readonly T[] | undefined | null | false,
    mapFn: (v: Accessor<T>, i: number) => U,
    options: {
      keyed: false;
      fallback?: Accessor<any>;
      name?: string;
    },
  ): U[];
  function $repeat<U>(
    count: number,
    mapFn: (i: number) => U,
    options?: {
      from?: number;
      fallback?: Accessor<any>;
      name?: string;
    },
  ): U[];

  function $destructure<T>(value: T): T;

  function $component<P>(
    Comp: (props: P) => solid.Element,
  ): (props: P) => solid.Element;

  // Auto-import aliases

  const $trackedEffect: typeof solid.createTrackedEffect;
  const $reaction: typeof solid.createReaction;
  const $root: typeof solid.createRoot;
  const $flush: typeof solid.flush;

  const $settled: typeof solid.onSettled;
  const $cleanup: typeof solid.onCleanup;

  const $action: typeof solid.action;
  const $isPending: typeof solid.isPending;
  const $latest: typeof solid.latest;
  const $refresh: typeof solid.refresh;
  const $affects: typeof solid.affects;

  const $uid: typeof solid.createUniqueId;
  const $merge: typeof solid.merge;
  const $omit: typeof solid.omit;
  const $useContext: typeof solid.useContext;
  const $createContext: typeof solid.createContext;
  const $owner: typeof solid.getOwner;
  const $runWithOwner: typeof solid.runWithOwner;

  const $store: typeof solid.createStore;
  const $projection: typeof solid.createProjection;
  const $optimistic: typeof solid.createOptimistic;
  const $optimisticStore: typeof solid.createOptimisticStore;
  const $reconcile: typeof solid.reconcile;
  const $snapshot: typeof solid.snapshot;
  const $deep: typeof solid.deep;

  // Components

  const For: typeof solid.For;
  const Show: typeof solid.Show;
  const Switch: typeof solid.Switch;
  const Match: typeof solid.Match;
  const Repeat: typeof solid.Repeat;
  const Errored: typeof solid.Errored;
  const Loading: typeof solid.Loading;
  const Reveal: typeof solid.Reveal;
  const Dynamic: typeof solidWeb.Dynamic;
  const Portal: typeof solidWeb.Portal;
  const HydrationScript: typeof solidWeb.HydrationScript;
  const Hydration: typeof solidWeb.Hydration;
  const NoHydration: typeof solidWeb.NoHydration;
}

type Props<T> = T extends (props: infer P) => any ? P : never;

declare module '@solidjs/web' {
  // biome-ignore lint/style/noNamespace: JSX namespace augmentation
  namespace JSX {
    interface IntrinsicElements {
      'solid:for': Props<typeof For>;
      'solid:show': Props<typeof Show>;
      'solid:switch': Props<typeof Switch>;
      'solid:match': Props<typeof Match>;
      'solid:repeat': Props<typeof Repeat>;
      'solid:errored': Props<typeof Errored>;
      'solid:loading': Props<typeof Loading>;
      'solid:reveal': Props<typeof Reveal>;
      // `Props<typeof Dynamic>` would be circular through IntrinsicElements.
      'solid:dynamic': Record<string, unknown>;
      'solid:portal': Props<typeof solidWeb.Portal>;
      'solid:hydration-script': Props<typeof solidWeb.HydrationScript>;
      'solid:hydration': Props<typeof solidWeb.Hydration>;
      'solid:no-hydration': Props<typeof solidWeb.NoHydration>;
    }
  }
}
