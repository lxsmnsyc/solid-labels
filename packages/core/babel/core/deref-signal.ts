import type * as babel from '@babel/core';
import * as t from '@babel/types';
import { assert } from './assert';
import { unexpectedType } from './errors';
import { generateUniqueName } from './generate-unique-name';
import { isAwaited } from './is-awaited';
import { isYielded } from './is-yielded';
import { addProtoGetter, addProtoProperty, addProtoSetter } from './proto';
import { getProperParentPath, isPathValid, unwrapNode } from './unwrap-node';

const REF_SIGNAL_CTF = '$refSignal';
const GET_CTF = '$get';
const SET_CTF = '$set';

const GETTER_CTF = '$getter';
const SETTER_CTF = '$setter';
const PROPERTY_CTF = '$property';

const CALL_CTF = new Set([
  REF_SIGNAL_CTF,
  GET_CTF,
  SET_CTF,
  GETTER_CTF,
  SETTER_CTF,
  PROPERTY_CTF,
]);

function transformProperty(
  parent: babel.NodePath<t.CallExpression>,
  ctf: string,
  readIdentifier: t.Identifier,
  writeIdentifier: t.Identifier,
): boolean {
  const propertyParent = getProperParentPath(parent, t.isObjectProperty);
  if (!propertyParent) {
    return true;
  }
  const key = propertyParent.node.key;
  assert(
    t.isExpression(key),
    unexpectedType(propertyParent.get('key'), key.type, 'Identifier'),
  );
  const objectParent = getProperParentPath(
    propertyParent,
    t.isObjectExpression,
  );
  if (!objectParent) {
    return true;
  }
  switch (ctf) {
    case SETTER_CTF:
      addProtoSetter(objectParent, propertyParent, key, writeIdentifier);
      break;
    case GETTER_CTF:
      addProtoGetter(objectParent, propertyParent, key, writeIdentifier);
      break;
    case PROPERTY_CTF:
      addProtoProperty(
        objectParent,
        propertyParent,
        key,
        readIdentifier,
        writeIdentifier,
      );
      break;
  }
  return false;
}

function transformSignalRead(
  ref: babel.NodePath,
  readIdentifier: t.Identifier,
  writeIdentifier: t.Identifier,
): boolean {
  const parent = getProperParentPath(ref, t.isCallExpression);
  if (parent) {
    const trueCallee = unwrapNode(parent.node.callee, t.isIdentifier);
    if (!(trueCallee && CALL_CTF.has(trueCallee.name))) {
      return true;
    }
    const rawArgs = parent.get('arguments')[0];
    const arg = unwrapNode(rawArgs.node, t.isIdentifier);
    assert(arg, unexpectedType(rawArgs, rawArgs.type, 'Identifier'));
    if (arg !== ref.node) {
      return true;
    }
    switch (trueCallee.name) {
      case REF_SIGNAL_CTF:
        parent.replaceWith(
          t.arrayExpression([readIdentifier, writeIdentifier]),
        );
        break;
      case SET_CTF:
        parent.replaceWith(writeIdentifier);
        break;
      case GET_CTF:
        parent.replaceWith(readIdentifier);
        break;
      case PROPERTY_CTF:
      case SETTER_CTF:
      case GETTER_CTF:
        return transformProperty(
          parent,
          trueCallee.name,
          readIdentifier,
          writeIdentifier,
        );
    }
    return false;
  }
  return true;
}

function transformUpdateExpression(
  ref: babel.NodePath<t.UpdateExpression>,
  writeIdentifier: t.Identifier,
): void {
  const param = generateUniqueName(ref, 'current');
  if (ref.node.prefix) {
    const tmp = generateUniqueName(ref, 'tmp');
    ref.replaceWith(
      t.callExpression(
        t.arrowFunctionExpression(
          [],
          t.blockStatement([
            t.variableDeclaration('let', [t.variableDeclarator(tmp)]),
            t.expressionStatement(
              t.callExpression(writeIdentifier, [
                t.arrowFunctionExpression(
                  [param],
                  t.binaryExpression(
                    ref.node.operator === '++' ? '+' : '-',
                    t.assignmentExpression('=', tmp, param),
                    t.numericLiteral(1),
                  ),
                ),
              ]),
            ),
            t.returnStatement(tmp),
          ]),
        ),
        [],
      ),
    );
  } else {
    ref.replaceWith(
      t.callExpression(writeIdentifier, [
        t.arrowFunctionExpression(
          [param],
          t.binaryExpression(
            ref.node.operator === '++' ? '+' : '-',
            param,
            t.numericLiteral(1),
          ),
        ),
      ]),
    );
  }
}

function transformAssignmentExpression(
  ref: babel.NodePath<t.AssignmentExpression>,
  writeIdentifier: t.Identifier,
): void {
  assert(
    t.isIdentifier(ref.node.left),
    unexpectedType(ref.get('left'), ref.node.left.type, 'Identifier'),
  );
  let expression = ref.node.right;
  if (isAwaited(expression) || isYielded(expression)) {
    const statement = ref.getStatementParent();
    const functionParent = ref.getFunctionParent();
    if (statement) {
      const awaitedID = generateUniqueName(statement, 'tmp');
      const declaration = t.variableDeclaration('const', [
        t.variableDeclarator(awaitedID, expression),
      ]);

      if (functionParent) {
        if (functionParent.isAncestor(statement)) {
          statement.insertBefore(declaration);
        } else {
          functionParent.scope.push({
            id: awaitedID,
            init: expression,
            kind: 'const',
          });
        }
      } else {
        statement.insertBefore(declaration);
      }
      expression = awaitedID;
    }
  }
  let arg: t.Expression;
  if (ref.node.operator === '=') {
    arg = t.arrowFunctionExpression([], expression);
  } else {
    const param = generateUniqueName(ref, 'current');
    arg = t.arrowFunctionExpression(
      [param],
      t.assignmentExpression(ref.node.operator, param, expression),
    );
  }
  ref.replaceWith(t.callExpression(writeIdentifier, [arg]));
}

function transformSignalWrite(
  ref: babel.NodePath,
  writeIdentifier: t.Identifier,
): void {
  if (isPathValid(ref, t.isUpdateExpression)) {
    transformUpdateExpression(ref, writeIdentifier);
    return;
  }
  if (isPathValid(ref, t.isAssignmentExpression)) {
    transformAssignmentExpression(ref, writeIdentifier);
    return;
  }
}

export function derefSignal(
  path: babel.NodePath,
  signalIdentifier: t.Identifier,
  readIdentifier: t.Identifier,
  writeIdentifier: t.Identifier,
): void {
  const binding = path.scope.getBinding(signalIdentifier.name);
  if (!binding) {
    return;
  }
  // Transform all writes
  for (const ref of binding.constantViolations) {
    transformSignalWrite(ref, writeIdentifier);
  }
  // Transform all reads
  for (const ref of binding.referencePaths) {
    if (transformSignalRead(ref, readIdentifier, writeIdentifier)) {
      assert(
        t.isIdentifier(ref.node),
        unexpectedType(ref, ref.node.type, 'Identifier'),
      );
      ref.replaceWith(t.callExpression(readIdentifier, []));
    }
  }
}
