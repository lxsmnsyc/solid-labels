import * as t from '@babel/types';
import type * as babel from '@babel/core';

export default function isInTypeScript(path: babel.NodePath): boolean {
  let parent = path.parentPath;
  while (parent) {
    if (t.isTypeScript(parent.node)) {
      return true;
    }
    parent = parent.parentPath;
  }
  return false;
}
