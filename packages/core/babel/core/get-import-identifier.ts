import type * as babel from '@babel/core';
import * as t from '@babel/types';
import type { State } from './types';

export function getImportIdentifier(
  state: State,
  path: babel.NodePath,
  name: string,
  source: string,
): t.Identifier {
  const target = `${source}[${name}]`;
  const current = state.hooks.get(target);
  if (current) {
    return current;
  }
  const programParent = path.scope.getProgramParent();
  const uid = programParent.generateUidIdentifier(name);
  const newPath = (
    programParent.path as babel.NodePath<t.Program>
  ).unshiftContainer(
    'body',
    t.importDeclaration(
      [t.importSpecifier(uid, t.identifier(name))
      ],
      t.stringLiteral(source),
    ),
  )[0];
  programParent.registerDeclaration(newPath);
  state.hooks.set(target, uid);
  return uid;
}
