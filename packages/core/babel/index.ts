import type * as babel from '@babel/core';
import type { State, Options } from './core/types';
import transformComponents from './components';
import transformCTF from './transform-ctf';
import transformLabels from './transform-label';
import transformComments from './transform-comment';

export type { Options };

export default function solidLabelsPlugin(): babel.PluginObj<State> {
  return {
    name: 'solid-labels',
    pre(): void {
      this.hooks = new Map();
    },
    visitor: {
      Program(path, state): void {
        transformComments(state, path);
        transformLabels(state, path);
        transformCTF(state, path);
        transformComponents(state, path);
      },
    },
  };
}
