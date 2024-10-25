import type * as babel from '@babel/core';
import * as t from '@babel/types';
import { generateUniqueName } from './generate-unique-name';

interface ProtoObjectState {
  root: t.ObjectExpression;
  proto: t.ObjectExpression;
}

const ROOT_GET = 'get';
const ROOT_SET = 'set';
const ROOT_SYMBOL = '__$';

const PROTO_STATES = new WeakMap<t.Node, ProtoObjectState>();

function getProtoState(
  path: babel.NodePath<t.ObjectExpression>,
): ProtoObjectState {
  const current = PROTO_STATES.get(path.node);
  if (current) {
    return current;
  }
  const protoID = generateUniqueName(path, 'proto');
  const proto = t.objectExpression([]);
  path.scope.getProgramParent().push({
    id: protoID,
    init: proto,
    kind: 'const',
  });
  path.node.properties.push(
    t.objectProperty(t.identifier('__proto__'), protoID),
  );
  const state: ProtoObjectState = {
    proto,
    root: path.node,
  };
  PROTO_STATES.set(path.node, state);
  return state;
}

function getGetterReplacement(
  key: t.Expression,
  source: t.Expression,
  computed: boolean,
): t.ObjectMethod {
  return t.objectMethod(
    'get',
    key,
    [],
    t.blockStatement([t.returnStatement(t.callExpression(source, []))]),
    computed,
  );
}

function getSetterReplacement(
  path: babel.NodePath,
  key: t.Expression,
  source: t.Expression,
  computed: boolean,
): t.ObjectMethod {
  const param = generateUniqueName(path, 'param');
  return t.objectMethod(
    'set',
    key,
    [param],
    t.blockStatement([
      t.expressionStatement(
        t.callExpression(source, [t.arrowFunctionExpression([], param)]),
      ),
    ]),
    computed,
  );
}

function getNamespacedKey(
  name: string,
  identifier: t.Expression,
): t.Expression | undefined {
  switch (identifier.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
      return t.stringLiteral(`${ROOT_SYMBOL}${name}__${identifier.value}`);
    case 'Identifier':
      return t.identifier(`${ROOT_SYMBOL}${name}__${identifier.name}`);
    case 'NullLiteral':
      return t.identifier(`${ROOT_SYMBOL}${name}__null`);
    default:
      return undefined;
  }
}

function initProtoGetters(
  path: babel.NodePath<t.ObjectExpression>,
  identifier: t.Expression,
  source: t.Identifier,
): void {
  const current = getProtoState(path);
  const key = getNamespacedKey(ROOT_GET, identifier);
  if (key) {
    current.root.properties.push(t.objectProperty(key, source));
  }
}

function registerProtoGetter(
  path: babel.NodePath<t.ObjectExpression>,
  identifier: t.Expression,
): void {
  const current = getProtoState(path);
  const key = getNamespacedKey(ROOT_GET, identifier);
  if (key) {
    const targetProperty = t.memberExpression(
      t.identifier('this'),
      key,
      !t.isIdentifier(key),
    );
    current.proto.properties.push(
      getGetterReplacement(identifier, targetProperty, false),
    );
  }
}

function addUnoptimizedGetter(
  property: babel.NodePath<t.ObjectProperty>,
  key: t.Expression,
  source: t.Identifier,
): void {
  property.replaceWith(
    getGetterReplacement(key, source, property.node.computed),
  );
}

export function addProtoGetter(
  path: babel.NodePath<t.ObjectExpression>,
  property: babel.NodePath<t.ObjectProperty>,
  identifier: t.Expression,
  source: t.Identifier,
): void {
  if (property.node.computed) {
    addUnoptimizedGetter(property, identifier, source);
  } else {
    initProtoGetters(path, identifier, source);
    registerProtoGetter(path, identifier);
    property.remove();
  }
}

function initProtoSetters(
  path: babel.NodePath<t.ObjectExpression>,
  identifier: t.Expression,
  source: t.Identifier,
): void {
  const current = getProtoState(path);
  const key = getNamespacedKey(ROOT_SET, identifier);
  if (key) {
    current.root.properties.push(t.objectProperty(key, source));
  }
}

function registerProtoSetter(
  path: babel.NodePath<t.ObjectExpression>,
  identifier: t.Expression,
): void {
  const current = getProtoState(path);
  const key = getNamespacedKey(ROOT_SET, identifier);
  if (key) {
    const targetProperty = t.memberExpression(
      t.identifier('this'),
      key,
      !t.isIdentifier(key),
    );
    current.proto.properties.push(
      getSetterReplacement(path, identifier, targetProperty, false),
    );
  }
}

function addUnoptimizedSetter(
  property: babel.NodePath<t.ObjectProperty>,
  key: t.Expression,
  source: t.Identifier,
): void {
  property.replaceWith(
    getSetterReplacement(property, key, source, property.node.computed),
  );
}

export function addProtoSetter(
  path: babel.NodePath<t.ObjectExpression>,
  property: babel.NodePath<t.ObjectProperty>,
  identifier: t.Expression,
  source: t.Identifier,
): void {
  if (property.node.computed) {
    addUnoptimizedSetter(property, identifier, source);
  } else {
    initProtoSetters(path, identifier, source);
    registerProtoSetter(path, identifier);
    property.remove();
  }
}

function addUnoptimizedProperty(
  property: babel.NodePath<t.ObjectProperty>,
  key: t.PrivateName | t.Expression,
  readSource: t.Identifier,
  writeSource: t.Identifier,
): void {
  if (!t.isPrivateName(key)) {
    const tmp = generateUniqueName(property, 'tmp');
    property.scope.push({ id: tmp, kind: 'let' });
    const isComputed = property.node.computed;
    property.replaceWithMultiple([
      getGetterReplacement(
        isComputed ? t.assignmentExpression('=', tmp, key) : key,
        readSource,
        isComputed,
      ),
      getSetterReplacement(property, tmp, writeSource, isComputed),
    ]);
  }
}

export function addProtoProperty(
  path: babel.NodePath<t.ObjectExpression>,
  property: babel.NodePath<t.ObjectProperty>,
  identifier: t.Expression,
  readSource: t.Identifier,
  writeSource: t.Identifier,
): void {
  if (property.node.computed) {
    addUnoptimizedProperty(property, identifier, readSource, writeSource);
  } else {
    initProtoGetters(path, identifier, readSource);
    initProtoSetters(path, identifier, writeSource);
    registerProtoGetter(path, identifier);
    registerProtoSetter(path, identifier);
    property.remove();
  }
}
