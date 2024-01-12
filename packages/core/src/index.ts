import type * as solid from 'solid-js';
import type * as solidWeb from 'solid-js/web';
import type * as solidStore from 'solid-js/store';

declare global {
  type Accessor<T> = solid.Accessor<T>;
  type Setter<T> = solid.Setter<T>;
  type Context<T> = solid.Context<T>;
  type ObservableObserver<T> = solid.ObservableObserver<T>;
  type Component<T> = solid.Component<T>;

  function $signal<T>(): T | undefined;
  function $signal<T>(
    value: T,
    options?: {
      equals?: false | ((prev: T, next: T) => boolean);
      name?: string;
      internal?: boolean;
    },
  ): T;

  function $memo<T>(
    value: T,
    options?: {
      equals?: false | ((prev: T, next: T) => boolean);
      name?: string;
    },
  ): T;
  function $memo<T>(
    value: T,
    options?: {
      equals?: false | ((prev: T, next: T) => boolean);
      name?: string;
    },
  ): T;

  function $untrack<T>(value: T): T;
  function $batch<T>(value: T): T;

  function $<T>(value: T): T;

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

  function $selector<T, U>(
    source: T,
    fn?: (a: U, b: T) => boolean,
    options?: { name?: string },
  ): (key: U) => boolean;

  function $on<T, U>(
    deps: T,
    fn: (input: T, prevInput: T, prevValue?: U) => U,
    options?: { defer?: boolean },
  ): (prevValue?: U) => U;

  function $deferred<T>(
    source: T,
    options?: {
      equals?: false | ((prev: T, next: T) => boolean);
      name?: string;
      timeoutMs?: number;
    },
  ): T;

  function $lazy<T extends Component<any>>(
    fn: Promise<{ default: T }>,
  ): T & {
    preload: () => void;
  };

  function $children(value: solid.JSX.Element): solid.JSX.Element;

  interface Observable<T> {
    subscribe(
      observer: ObservableObserver<T>,
    ): { unsubscribe(): void } | (() => void);
  }

  function $observable<T>(value: T): Observable<T>;
  function $from<T>(observable: Observable<T>): T;
  function $from<T>(produce: (setter: Setter<T>) => () => void): T;

  function $mapArray<T, U>(
    arr: readonly T[] | undefined | null | false,
    mapFn: (v: T, i: Accessor<number>) => U,
    options?: {
      fallback?: Accessor<any>;
    },
  ): U[];
  function $indexArray<T, U>(
    arr: readonly T[] | undefined | null | false,
    mapFn: (v: Accessor<T>, i: number) => U,
    options?: {
      fallback?: Accessor<any>;
    },
  ): U[];

  function $destructure<T>(value: T): T;

  // Auto imports

  const $effect: typeof solid.createEffect;
  const $computed: typeof solid.createComputed;
  const $renderEffect: typeof solid.createRenderEffect;

  const $useContext: typeof solid.useContext;
  const $createContext: typeof solid.createContext;

  const $uid: typeof solid.createUniqueId;
  const $root: typeof solid.createRoot;
  const $resource: typeof solid.createResource;
  const $merge: typeof solid.mergeProps;

  const $reaction: typeof solid.createReaction;
  const $mount: typeof solid.onMount;
  // @deprecated
  const $error: typeof solid.onError;
  const $cleanup: typeof solid.onCleanup;
  const $catchError: typeof solid.catchError;

  const $startTransition: typeof solid.startTransition;
  const $useTransition: typeof solid.useTransition;

  const $owner: typeof solid.getOwner;
  const $runWithOwner: typeof solid.runWithOwner;

  // store
  const $store: typeof solidStore.createStore;
  const $mutable: typeof solidStore.createMutable;
  const $produce: typeof solidStore.produce;
  const $reconcile: typeof solidStore.reconcile;
  const $unwrap: typeof solidStore.unwrap;

  // components
  const For: typeof solid.For;
  const Show: typeof solid.Show;
  const Switch: typeof solid.Switch;
  const Match: typeof solid.Match;
  const Index: typeof solid.Index;
  const ErrorBoundary: typeof solid.ErrorBoundary;
  const Suspense: typeof solid.Suspense;
  const SuspenseList: typeof solid.SuspenseList;
  const Dynamic: typeof solidWeb.Dynamic;
  const Portal: typeof solidWeb.Portal;
  const Assets: typeof solidWeb.Assets;
  const HydrationScript: typeof solidWeb.HydrationScript;
  const NoHydration: typeof solidWeb.NoHydration;

  function $component<P>(
    Comp: (props: P) => solid.JSX.Element,
  ): (props: P) => solid.JSX.Element;
}

type Props<T> = T extends (props: infer P) => solid.JSX.Element ? P : never;

declare module 'solid-js' {
  // biome-ignore lint/style/noNamespace: <explanation>
  namespace JSX {
    interface IntrinsicElements {
      'solid:error-boundary': Props<typeof ErrorBoundary>;
      'solid:suspense': Props<typeof Suspense>;
      'solid:suspense-list': Props<typeof SuspenseList>;
      'solid:portal': Props<typeof solidWeb.Portal>;
      'solid:assets': Props<typeof solidWeb.Assets>;
      'solid:hydration-script': Props<typeof solidWeb.HydrationScript>;
      'solid:no-hydration': Props<typeof solidWeb.NoHydration>;
    }
  }
}
