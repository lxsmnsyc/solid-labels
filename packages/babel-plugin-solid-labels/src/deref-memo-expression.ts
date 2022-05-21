import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { unexpectedMissingParent, unexpectedType } from './errors';
import normalizeBindings from './normalize-bindings';
import { State } from './types';

export default function derefMemoExpression(
  state: State,
  path: NodePath,
  memoIdentifier: t.Identifier,
  readIdentifier: t.Identifier,
): void {
  const parent = path.scope.path;
  if (parent) {
    parent.traverse({
      CallExpression(p) {
        if (
          (p.scope !== path.scope && p.scope.hasOwnBinding(memoIdentifier.name))
          || !t.isIdentifier(p.node.callee)
          || state.opts.disabled?.ctf?.[p.node.callee.name]
        ) {
          return;
        }
        switch (p.node.callee.name) {
          case '$refMemo':
            if (!t.isIdentifier(p.node.arguments[0])) {
              throw unexpectedType(p, p.node.arguments[0].type, 'Identifier');
            }
            if (p.node.arguments[0].name === memoIdentifier.name) {
              p.replaceWith(
                readIdentifier,
              );
            }
            break;
          case '$get':
            if (!t.isIdentifier(p.node.arguments[0])) {
              throw unexpectedType(p, p.node.arguments[0].type, 'Identifier');
            }
            if (p.node.arguments[0].name === memoIdentifier.name) {
              p.replaceWith(
                readIdentifier,
              );
            }
            break;
          case '$getter':
          case '$property':
            if (!p.parentPath) {
              throw unexpectedMissingParent(p);
            }
            if (!t.isObjectProperty(p.parent)) {
              throw unexpectedType(p, p.parent.type, 'ObjectProperty');
            }
            if (!t.isIdentifier(p.node.arguments[0])) {
              throw unexpectedType(p, p.node.arguments[0].type, 'Identifier');
            }
            if (t.isPrivateName(p.parent.key)) {
              throw unexpectedType(p, 'PrivateName', 'Expression');
            }
            if (p.node.arguments[0].name === memoIdentifier.name) {
              p.parentPath.replaceWith(
                t.objectMethod(
                  'get',
                  p.parent.key,
                  [],
                  t.blockStatement([
                    t.returnStatement(
                      t.callExpression(
                        readIdentifier,
                        [],
                      ),
                    ),
                  ]),
                ),
              );
            }
            break;
          default:
            break;
        }
      },
      ...normalizeBindings(
        path,
        t.callExpression(
          readIdentifier,
          [],
        ),
        memoIdentifier,
      ),
    });
  }
}
