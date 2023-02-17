import { PluginPass } from '@babel/core';
import * as t from '@babel/types';

export type ImportHook = Map<string, t.Identifier>

export interface Options {
  dev?: boolean;
  disabled?: {
    labels?: Record<string, boolean>;
    pragma?: Record<string, boolean>;
    ctf?: Record<string, boolean>;
  };
}

export interface State extends PluginPass {
  hooks: ImportHook;
  opts: Options;
}
