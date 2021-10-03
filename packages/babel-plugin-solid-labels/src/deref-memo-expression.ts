import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { unexpectedMissingParent, unexpectedType } from './errors';
import normalizeBindings from './normalize-bindings';

export default function derefMemoExpression(
  path: NodePath,
  memoIdentifier: t.Identifier,
  readIdentifier: t.Identifier,
): void {
  const parent = path.scope.path;
  if (parent) {
    parent.traverse({
      CallExpression(p) {
        if (p.scope !== path.scope && p.scope.hasOwnBinding(memoIdentifier.name)) {
          return;
        }
        if (!t.isIdentifier(p.node.callee)) {
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
