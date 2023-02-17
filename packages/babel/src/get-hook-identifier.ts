import { addNamed } from '@babel/helper-module-imports';
import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { ImportHook } from './types';

export default function getHookIdentifier(
  hooks: ImportHook,
  path: NodePath,
  name: string,
  source = 'solid-js',
): t.Identifier {
  const id = `${source}[${name}]`;
  const current = hooks.get(id);
  if (current) {
    return current;
  }
  const newID = addNamed(path, name, source);
  hooks.set(id, newID);
  return newID;
}
