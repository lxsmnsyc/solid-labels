import type * as t from '@babel/types';
import type * as babel from '@babel/core';
import { addNamed } from '@babel/helper-module-imports';
import type { State } from './types';

export default function getImportIdentifier(
  state: State,
  path: babel.NodePath,
  name: string,
  source: string,
): t.Identifier {
  const id = `${source}[${name}]`;
  const current = state.hooks.get(id);
  if (current) {
    return current;
  }
  const newID = addNamed(path, name, source);
  state.hooks.set(id, newID);
  return newID;
}
