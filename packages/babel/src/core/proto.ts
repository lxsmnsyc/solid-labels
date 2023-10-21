import type * as babel from '@babel/core';
import * as t from '@babel/types';

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
  const protoID = path.scope.generateUidIdentifier('proto');
  const proto = t.objectExpression([]);
  path.scope.push({
    id: protoID,
    init: proto,
    kind: 'const',
  });
  const root = t.objectExpression([]);
  path.node.properties.push(
    t.objectProperty(t.identifier(ROOT_SYMBOL), root),
    t.objectProperty(t.identifier('__proto__'), protoID),
  );
  const state: ProtoObjectState = {
    proto,
    root,
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
    t.blockStatement([
      t.returnStatement(
        t.callExpression(source, []),
      ),
    ]),
    computed,
  );
}

function getSetterReplacement(
  path: babel.NodePath,
  key: t.Expression,
  source: t.Expression,
  computed: boolean,
): t.ObjectMethod {
  const param = path.scope.generateUidIdentifier('param');
  return t.objectMethod(
    'set',
    key,
    [param],
    t.blockStatement([
      t.expressionStatement(
        t.callExpression(
          source,
          [t.arrowFunctionExpression([], param)],
        ),
      ),
    ]),
    computed,
  );
}

function initProtoGetters(
  path: babel.NodePath<t.ObjectExpression>,
  identifier: t.Identifier,
  source: t.Identifier,
): void {
  const current = getProtoState(path);
  current.root.properties.push(
    t.objectProperty(t.identifier(`${ROOT_GET}$${identifier.name}`), source),
  );
}

function registerProtoGetter(
  path: babel.NodePath<t.ObjectExpression>,
  identifier: t.Identifier,
): void {
  const current = getProtoState(path);
  const targetProperty = t.memberExpression(
    t.memberExpression(t.identifier('this'), t.identifier(ROOT_SYMBOL)),
    t.identifier(`${ROOT_GET}$${identifier.name}`),
  );
  current.proto.properties.push(
    getGetterReplacement(identifier, targetProperty, false),
  );
}

function addUnoptimizedGetter(
  property: babel.NodePath<t.ObjectProperty>,
  key: t.PrivateName | t.Expression,
  source: t.Identifier,
): void {
  if (!t.isPrivateName(key)) {
    property.replaceWith(
      getGetterReplacement(key, source, property.node.computed),
    );
  }
}

export function addProtoGetter(
  path: babel.NodePath<t.ObjectExpression>,
  property: babel.NodePath<t.ObjectProperty>,
  source: t.Identifier,
): void {
  const identifier = property.node.key;
  if (t.isIdentifier(identifier)) {
    initProtoGetters(path, identifier, source);
    registerProtoGetter(path, identifier);
    property.remove();
  } else {
    addUnoptimizedGetter(property, identifier, source);
  }
}

function initProtoSetters(
  path: babel.NodePath<t.ObjectExpression>,
  identifier: t.Identifier,
  source: t.Identifier,
): void {
  const current = getProtoState(path);
  current.root.properties.push(
    t.objectProperty(t.identifier(`${ROOT_SET}$${identifier.name}`), source),
  );
}

function registerProtoSetter(
  path: babel.NodePath<t.ObjectExpression>,
  identifier: t.Identifier,
): void {
  const current = getProtoState(path);
  const targetProperty = t.memberExpression(
    t.memberExpression(t.identifier('this'), t.identifier(ROOT_SYMBOL)),
    t.identifier(`${ROOT_SET}$${identifier.name}`),
  );
  current.proto.properties.push(
    getSetterReplacement(path, identifier, targetProperty, false),
  );
}

function addUnoptimizedSetter(
  property: babel.NodePath<t.ObjectProperty>,
  key: t.PrivateName | t.Expression,
  source: t.Identifier,
): void {
  if (!t.isPrivateName(key)) {
    property.replaceWith(
      getSetterReplacement(property, key, source, property.node.computed),
    );
  }
}

export function addProtoSetter(
  path: babel.NodePath<t.ObjectExpression>,
  property: babel.NodePath<t.ObjectProperty>,
  source: t.Identifier,
): void {
  const identifier = property.node.key;
  if (t.isIdentifier(identifier)) {
    initProtoSetters(path, identifier, source);
    registerProtoSetter(path, identifier);
    property.remove();
  } else {
    addUnoptimizedSetter(property, identifier, source);
  }
}

function addUnoptimizedProperty(
  property: babel.NodePath<t.ObjectProperty>,
  key: t.PrivateName | t.Expression,
  readSource: t.Identifier,
  writeSource: t.Identifier,
): void {
  if (!t.isPrivateName(key)) {
    const tmp = property.scope.generateUidIdentifier('tmp');
    property.scope.push({ id: tmp, kind: 'let' });
    const isComputed = property.node.computed;
    property.replaceWithMultiple([
      getGetterReplacement(
        isComputed ? t.assignmentExpression('=', tmp, key) : key,
        readSource,
        isComputed,
      ),
      getSetterReplacement(
        property,
        tmp,
        writeSource,
        isComputed,
      ),
    ]);
  }
}

export function addProtoProperty(
  path: babel.NodePath<t.ObjectExpression>,
  property: babel.NodePath<t.ObjectProperty>,
  readSource: t.Identifier,
  writeSource: t.Identifier,
): void {
  const identifier = property.node.key;
  if (t.isIdentifier(identifier)) {
    initProtoGetters(path, identifier, readSource);
    initProtoSetters(path, identifier, writeSource);
    registerProtoGetter(path, identifier);
    registerProtoSetter(path, identifier);
    property.remove();
  } else {
    addUnoptimizedProperty(property, identifier, readSource, writeSource);
  }
}
