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
    t.objectMethod('get', identifier, [], t.blockStatement([
      t.returnStatement(
        t.callExpression(targetProperty, []),
      ),
    ])),
  );
}

function addUnoptimizedGetter(
  property: babel.NodePath<t.ObjectProperty>,
  source: t.Identifier,
): void {
  if (!t.isPrivateName(property.node.key)) {
    property.replaceWith(
      t.objectMethod(
        'get',
        property.node.key,
        [],
        t.blockStatement([
          t.returnStatement(
            t.callExpression(
              source,
              [],
            ),
          ),
        ]),
        property.node.computed,
      ),
    );
  }
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
  } else {
    addUnoptimizedGetter(property, source);
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
  const param = path.scope.generateUidIdentifier('param');
  current.proto.properties.push(
    t.objectMethod('set', identifier, [param], t.blockStatement([
      t.expressionStatement(
        t.callExpression(targetProperty, [
          t.arrowFunctionExpression([], param),
        ]),
      ),
    ])),
  );
}

function addUnoptimizedSetter(
  property: babel.NodePath<t.ObjectProperty>,
  source: t.Identifier,
): void {
  if (!t.isPrivateName(property.node.key)) {
    const param = property.scope.generateUidIdentifier('param');
    property.replaceWith(
      t.objectMethod(
        'set',
        property.node.key,
        [param],
        t.blockStatement([
          t.expressionStatement(
            t.callExpression(
              source,
              [t.arrowFunctionExpression([], param)],
            ),
          ),
        ]),
        property.node.computed,
      ),
    );
  }
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
  } else {
    addUnoptimizedSetter(property, source);
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
  } else {
    addUnoptimizedGetter(property, readSource);
    addUnoptimizedSetter(property, writeSource);
  }
}
