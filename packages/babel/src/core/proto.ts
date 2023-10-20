import type * as babel from '@babel/core';
import * as t from '@babel/types';

interface ProtoObjectState {
  hasProto: boolean;
  root: t.ObjectExpression;
  proto: t.ObjectExpression;
  getters?: t.ObjectExpression;
  setters?: t.ObjectExpression;
}

const ROOT_GET = 'get';
const ROOT_SET = 'set';
const ROOT_SYMBOL = '___'; // TODO

function generateProto(
  path: babel.NodePath<t.ObjectExpression>,
): void {
  const current = (path.state || {}) as ProtoObjectState;
  if (!current.hasProto) {
    const protoID = path.scope.generateUidIdentifier('proto');
    const proto = t.objectExpression([]);
    path.scope.push({
      id: protoID,
      init: proto,
      kind: 'const',
    });
    current.proto = proto;

    const root = t.objectExpression([]);
    path.node.properties.push(
      t.objectProperty(t.identifier(ROOT_SYMBOL), root),
      t.objectProperty(t.identifier('__proto__'), protoID),
    );
    current.root = root;
    current.hasProto = true;
  }
  path.state = current;
}

function initProtoGetters(
  path: babel.NodePath<t.ObjectExpression>,
  property: t.ObjectProperty,
): void {
  generateProto(path);
  const current = path.state as ProtoObjectState;
  if (current.getters) {
    current.getters.properties.push(property);
  } else {
    const rootGet = t.objectExpression([property]);
    current.root.properties.push(
      t.objectProperty(t.identifier(ROOT_GET), rootGet),
    );
    current.getters = rootGet;
  }
}

function registerProtoGetter(
  path: babel.NodePath<t.ObjectExpression>,
  identifier: t.Identifier,
): void {
  const targetProperty = t.memberExpression(
    t.memberExpression(
      t.memberExpression(t.identifier('this'), t.identifier(ROOT_SYMBOL)),
      t.identifier(ROOT_GET),
    ),
    identifier,
  );
  const current = path.state as ProtoObjectState;
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
    initProtoGetters(path, t.objectProperty(identifier, source));
    registerProtoGetter(path, identifier);
    property.remove();
  } else {
    addUnoptimizedGetter(property, source);
  }
}

function initProtoSetters(
  path: babel.NodePath<t.ObjectExpression>,
  property: t.ObjectProperty,
): void {
  generateProto(path);
  const current = path.state as ProtoObjectState;
  if (current.setters) {
    current.setters.properties.push(property);
  } else {
    const rootSet = t.objectExpression([property]);
    current.root.properties.push(
      t.objectProperty(t.identifier(ROOT_SET), rootSet),
    );
    current.setters = rootSet;
  }
}

function registerProtoSetter(
  path: babel.NodePath<t.ObjectExpression>,
  identifier: t.Identifier,
): void {
  const targetProperty = t.memberExpression(
    t.memberExpression(
      t.memberExpression(t.identifier('this'), t.identifier(ROOT_SYMBOL)),
      t.identifier(ROOT_SET),
    ),
    identifier,
  );
  const current = path.state as ProtoObjectState;
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
    initProtoSetters(path, t.objectProperty(identifier, source));
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
    initProtoGetters(path, t.objectProperty(identifier, readSource));
    initProtoSetters(path, t.objectProperty(identifier, writeSource));
    registerProtoGetter(path, identifier);
    registerProtoSetter(path, identifier);
    property.remove();
  } else {
    addUnoptimizedGetter(property, readSource);
    addUnoptimizedSetter(property, writeSource);
  }
}
