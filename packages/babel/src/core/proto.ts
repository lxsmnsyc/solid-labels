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
  source: t.Identifier,
): boolean {
  if (!t.isPrivateName(property.node.key)) {
    property.insertBefore(
      getGetterReplacement(property.node.key, source, property.node.computed),
    );
    return true;
  }
  return false;
}

export function addProtoGetter(
  path: babel.NodePath<t.ObjectExpression>,
  property: babel.NodePath<t.ObjectProperty>,
  source: t.Identifier,
): void {
  if (t.isIdentifier(property.node.key)) {
    const identifier = property.node.key;
    initProtoGetters(path, identifier, source);
    registerProtoGetter(path, identifier);
    property.remove();
  } else if (addUnoptimizedGetter(property, source)) {
    property.remove();
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
  source: t.Identifier,
): boolean {
  if (!t.isPrivateName(property.node.key)) {
    property.insertBefore(
      getSetterReplacement(property, property.node.key, source, property.node.computed),
    );
    return true;
  }
  return false;
}

export function addProtoSetter(
  path: babel.NodePath<t.ObjectExpression>,
  property: babel.NodePath<t.ObjectProperty>,
  source: t.Identifier,
): void {
  if (t.isIdentifier(property.node.key)) {
    const identifier = property.node.key;
    initProtoSetters(path, identifier, source);
    registerProtoSetter(path, identifier);
    property.remove();
  } else if (addUnoptimizedSetter(property, source)) {
    property.remove();
  }
}

export function addProtoProperty(
  path: babel.NodePath<t.ObjectExpression>,
  property: babel.NodePath<t.ObjectProperty>,
  readSource: t.Identifier,
  writeSource: t.Identifier,
): void {
  if (t.isIdentifier(property.node.key)) {
    const identifier = property.node.key;
    initProtoGetters(path, identifier, readSource);
    initProtoSetters(path, identifier, writeSource);
    registerProtoGetter(path, identifier);
    registerProtoSetter(path, identifier);
    property.remove();
  } else if (
    addUnoptimizedGetter(property, readSource)
    && addUnoptimizedSetter(property, writeSource)
  ) {
    property.remove();
  }
}
