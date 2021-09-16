import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';
import { createMacro } from 'babel-plugin-macros';
import signalMacro from './signal';

function reactive({ references }: { references: { [name: string]: NodePath[] } }) {
  const stateUpdaters: Map<string, t.Identifier> = new Map();
  if (references.state) {
    references.state.forEach(path => signalMacro(stateUpdaters, path));
  }
}

export declare function signal<T>(initialState: T): T;

export default createMacro(reactive);