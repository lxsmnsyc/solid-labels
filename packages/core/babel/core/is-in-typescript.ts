import * as t from '@babel/types';

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
