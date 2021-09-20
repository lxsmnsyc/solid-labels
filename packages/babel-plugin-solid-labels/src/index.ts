import { PluginObj } from '@babel/core';
import * as solid from 'solid-js';
import { State } from './types';
import LABEL_PARSER from './label-parser';
import COMMENT_PARSER from './comment-parser';
import CTF_PARSER from './ctf-parser';

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
}

export default function solidReactivityPlugin(): PluginObj<State> {
  return {
    pre() {
      this.hooks = new Map();
    },
    visitor: {
      ...LABEL_PARSER,
      ...COMMENT_PARSER,
      ...CTF_PARSER,
    },
  };
}
