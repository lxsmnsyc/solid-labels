import { PluginObj } from '@babel/core';
import { State } from './types';
import LABEL_PARSER from './label-parser';
import COMMENT_PARSER from './comment-parser';
import CTF_PARSER from './ctf-parser';

declare global {

  type Getter<T> = () => T;
  interface Setter<T> {
    (value: T): T;
    (action: (prev: T) => T): T;
  }

  function $signal<T>(value: T): T;
  function $memo<T>(value: T): T;
  function $untrack<T>(value: T): T;
  function $batch<T>(value: T): T;
  function $derefSignal<T>(value: [Getter<T>, Setter<T>]): T;
  function $refSignal<T>(value: T): [Getter<T>, Setter<T>];
  function $derefMemo<T>(value: Getter<T>): T;
  function $refMemo<T>(value: T): Getter<T>;

  function $get<T>(value: T): Getter<T>;
  function $set<T>(value: T): Setter<T>;
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
