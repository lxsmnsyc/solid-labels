import * as t from '@babel/types';

export type ImportHook = Map<string, t.Identifier>

export interface State {
  hooks: ImportHook;
}
