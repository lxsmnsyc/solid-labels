import * as t from '@babel/types';
import * as babel from '@babel/core';

export interface Options {
  dev?: boolean;
  disabled?: {
    ctf?: Record<string, boolean>;
    pragma?: Record<string, boolean>;
    label?: Record<string, boolean>;
  };
}

type ImportHook = Map<string, t.Identifier>;

export interface State extends babel.PluginPass {
  hooks: ImportHook;
  opts: Options;
}
