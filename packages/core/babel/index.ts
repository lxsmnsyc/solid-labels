import type * as babel from '@babel/core';
import { transformComponents } from './components';
import type { Options, State } from './core/types';
import { transformComments } from './transform-comment';
import { transformCTF } from './transform-ctf';
import { transformLabels } from './transform-label';

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
