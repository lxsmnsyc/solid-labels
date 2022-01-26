import { PluginObj } from '@babel/core';
import * as solid from 'solid-js';
import * as solidWeb from 'solid-js/web';
import * as solidStore from 'solid-js/store';
import { State } from './types';
import LABEL_PARSER from './label-parser';
import COMMENT_PARSER from './comment-parser';
import CTF_PARSER from './ctf-parser';
import AUTO_IMPORT_EXPR from './auto-import';

type UnboxLazy<T> = T extends () => infer U ? U : T;
type BoxedTupleTypes<T extends any[]> = {
  [P in keyof T]: [UnboxLazy<T[P]>];
}[Exclude<keyof T, keyof any[]>];
type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type UnboxIntersection<T> = T extends { 0: infer U } ? U : never;
type MergeProps<T extends any[]> = UnboxIntersection<UnionToIntersection<BoxedTupleTypes<T>>>;

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
      internal?: boolean,
    }
  ): T;

  function $memo<T>(
    value: T,
    options?: { equals?: false | ((prev: T, next: T) => boolean); name?: string }
  ): T;
  function $memo<T>(
    value: T,
    options?: { equals?: false | ((prev: T, next: T) => boolean); name?: string }
  ): T;

  function $untrack<T>(value: T): T;
  function $batch<T>(value: T): T;

  function $derefSignal<T>(value: [Accessor<T>, Setter<T>]): T;
  function $refSignal<T>(value: T): [Accessor<T>, Setter<T>];
  function $derefMemo<T>(value: Accessor<T>): T;
  function $refMemo<T>(value: T): Accessor<T>;

  function $<T>(value: T): T;

  function $get<T>(value: T): Accessor<T>;
  function $set<T>(value: T): Setter<T>;

  function $effect<T>(fn: (v?: T) => T | undefined): void;
  function $effect<T>(fn: (v: T) => T, value: T, options?: { name?: string }): void;

  function $computed<T>(fn: (v?: T) => T | undefined): void;
  function $computed<T>(fn: (v: T) => T, value: T, options?: { name?: string }): void;

  function $renderEffect<T>(fn: (v?: T) => T | undefined): void;
  function $renderEffect<T>(fn: (v: T) => T, value: T, options?: { name?: string }): void;

  function $root<T>(value: T): T;
  function $root<T>(cb: (dispose: () => void) => T): T;

  function $selector<T, U>(
    source: T,
    fn?: (a: U, b: T) => boolean,
    options?: { name?: string }
  ): (key: U) => boolean;

  function $on<T, U>(
    deps: T,
    fn: (input: T, prevInput: T, prevValue?: U) => U,
    options?: { defer?: boolean }
  ): (prevValue?: U) => U;

  function $deferred<T>(
    source: T,
    options?: {
      equals?: false | ((prev: T, next: T) => boolean);
      name?: string;
      timeoutMs?: number;
    },
  ): T;

  function $uid(): string;

  function $createContext<T>(): Context<T | undefined>;
  function $createContext<T>(defaultValue: T): Context<T>;
  function $useContext<T>(context: Context<T>): T;

  function $lazy<T extends Component<any>>(fn: Promise<{ default: T }>): T & {
    preload: () => void;
  };

  function $children(value: solid.JSX.Element): solid.JSX.Element;

  interface Observable<T> {
    subscribe(observer: ObservableObserver<T>): { unsubscribe(): void } | (() => void);
  }

  function $observable<T>(value: T): Observable<T>;

  function $from<T>(observable: Observable<T>): T;
  function $from<T>(produce: ((setter: Setter<T>) => () => void)): T;

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

  function $merge<T extends any[]>(...args: T): MergeProps<T>;
  function $destructure<T>(value: T): T;

  function $getter<T>(value: T): T;
  function $setter<T>(value: T): T;
  function $property<T>(value: T): T;

  const $resource: typeof solid.createResource;

  // store
  const $store: typeof solidStore.createStore;
  const $mutable: typeof solidStore.createMutable;
  const $produce: typeof solidStore.produce;
  const $reconcile: typeof solidStore.reconcile;
  const $unwrap: typeof solidStore.unwrap;

  // components
  const $for: typeof solid.For;
  const $show: typeof solid.Show;
  const $switch: typeof solid.Switch;
  const $match: typeof solid.Match;
  const $index: typeof solid.Index;
  const $errorBoundary: typeof solid.ErrorBoundary;
  const $suspense: typeof solid.Suspense;
  const $suspenseList: typeof solid.SuspenseList;
  const $dynamic: typeof solidWeb.Dynamic;
  const $portal: typeof solidWeb.Portal;
  const $assets: typeof solidWeb.Assets;
  const $hydrationScript: typeof solidWeb.HydrationScript;
  const $noHydration: typeof solidWeb.NoHydration;

  const $reaction: typeof solid.createReaction;
  const $mount: typeof solid.onMount;
  const $error: typeof solid.onError;
  const $cleanup: typeof solid.onCleanup;

  function $component<P>(Comp: (props: P) => solid.JSX.Element): (props: P) => solid.JSX.Element;
}

const VISITOR = {
  ...LABEL_PARSER,
  ...COMMENT_PARSER,
  ...CTF_PARSER,
  ...AUTO_IMPORT_EXPR,
};

export default function solidReactivityPlugin(): PluginObj<State> {
  return {
    pre() {
      this.hooks = new Map();
    },
    visitor: {
      Program(path, state) {
        // We do this so that we can be ahead of solid-refresh
        // and possibly, Solid, but who knows.
        path.traverse(VISITOR, state);
        path.scope.crawl();
      },
    },
  };
}
