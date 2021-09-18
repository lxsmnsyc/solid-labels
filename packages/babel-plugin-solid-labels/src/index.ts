import { PluginObj } from '@babel/core';
import { State } from './types';
import LABEL_PARSER from './label-parser';

export default function solidReactivityPlugin(): PluginObj<State> {
  return {
    pre() {
      this.hooks = new Map();
    },
    visitor: {
      ...LABEL_PARSER,
    },
  };
}
