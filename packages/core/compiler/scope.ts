import { type Node, eachChild } from './ast';

export type RefMode = 'read' | 'write' | 'readwrite';

export interface Ref {
  node: Node;
  mode: RefMode;
  /** Ancestor chain, outermost first, excluding the identifier itself. */
  parents: Node[];
  binding: Binding | null;
  /** Set when the identifier is the value of a shorthand object property. */
  shorthand?: Node;
  /** Set when the identifier is a local name in an export specifier. */
  exported?: boolean;
}

export interface Binding {
  name: string;
  kind: string;
  node: Node;
  scope: Scope;
  refs: Ref[];
}

export type ScopeKind = 'module' | 'function' | 'block';

export interface Scope {
  kind: ScopeKind;
  node: Node;
  parent: Scope | null;
  bindings: Map<string, Binding>;
}

export interface JSXName {
  element: Node;
  opening: Node;
  closing: Node | null;
  /** Root identifier of the element name. */
  root: Node;
  resolved: boolean;
}

export interface Analysis {
  module: Scope;
  bindings: Binding[];
  unresolved: Ref[];
  names: Set<string>;
  jsxNames: JSXName[];
  /** Spans of `this` / `super` / meta-property usages (blocks effect hoisting). */
  thisSpans: [number, number][];
  bindingByNode: Map<Node, Binding>;
}

const SCOPE_NODES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'BlockStatement',
  'StaticBlock',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'CatchClause',
  'SwitchStatement',
]);

const FUNCTION_SCOPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'StaticBlock',
]);

const SKIP_TS_STATEMENTS = new Set([
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
  'TSModuleDeclaration',
  'TSDeclareFunction',
  'TSImportEqualsDeclaration',
]);

export function analyze(program: Node): Analysis {
  const scopeMap = new Map<Node, Scope>();
  const moduleScope: Scope = {
    kind: 'module',
    node: program,
    parent: null,
    bindings: new Map(),
  };
  scopeMap.set(program, moduleScope);

  const analysis: Analysis = {
    module: moduleScope,
    bindings: [],
    unresolved: [],
    names: new Set(),
    jsxNames: [],
    thisSpans: [],
    bindingByNode: new Map(),
  };

  function declare(id: Node, kind: string, scope: Scope): void {
    analysis.names.add(id.name);
    if (scope.bindings.has(id.name)) {
      return;
    }
    const binding: Binding = { name: id.name, kind, node: id, scope, refs: [] };
    scope.bindings.set(id.name, binding);
    analysis.bindings.push(binding);
    analysis.bindingByNode.set(id, binding);
  }

  function varScope(scope: Scope): Scope {
    let current = scope;
    while (current.kind === 'block' && current.parent) {
      current = current.parent;
    }
    return current;
  }

  // ---------------------------------------------------------------------------
  // Pass A: build scopes and declare bindings.
  // ---------------------------------------------------------------------------

  function declarePattern(
    pattern: Node,
    kind: string,
    scope: Scope,
    walkScope: Scope,
  ): void {
    switch (pattern.type) {
      case 'Identifier':
        declare(pattern, kind, scope);
        break;
      case 'ObjectPattern':
        for (const prop of pattern.properties) {
          if (prop.type === 'Property') {
            if (prop.computed) {
              declareWalk(prop.key, walkScope);
            }
            declarePattern(prop.value, kind, scope, walkScope);
          } else if (prop.type === 'RestElement') {
            declarePattern(prop.argument, kind, scope, walkScope);
          }
        }
        break;
      case 'ArrayPattern':
        for (const el of pattern.elements) {
          if (el) {
            declarePattern(el, kind, scope, walkScope);
          }
        }
        break;
      case 'AssignmentPattern': {
        declarePattern(pattern.left, kind, scope, walkScope);
        declareWalk(pattern.right, walkScope);
        break;
      }
      case 'RestElement':
        declarePattern(pattern.argument, kind, scope, walkScope);
        break;
      default:
        break;
    }
  }

  function declareWalk(node: Node, scope: Scope): void {
    if (SKIP_TS_STATEMENTS.has(node.type)) {
      return;
    }
    let currentScope = scope;
    if (node !== program && SCOPE_NODES.has(node.type)) {
      currentScope = {
        kind: FUNCTION_SCOPES.has(node.type) ? 'function' : 'block',
        node,
        parent: scope,
        bindings: new Map(),
      };
      scopeMap.set(node, currentScope);
    }
    switch (node.type) {
      case 'VariableDeclaration': {
        const target =
          node.kind === 'var' ? varScope(currentScope) : currentScope;
        for (const decl of node.declarations) {
          declarePattern(decl.id, node.kind, target, currentScope);
          if (decl.init) {
            declareWalk(decl.init, currentScope);
          }
        }
        break;
      }
      case 'FunctionDeclaration': {
        if (node.id) {
          declare(node.id, 'function', scope);
        }
        for (const param of node.params) {
          declarePattern(param, 'param', currentScope, currentScope);
        }
        if (node.body) {
          declareWalk(node.body, currentScope);
        }
        break;
      }
      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        if (node.id) {
          declare(node.id, 'function', currentScope);
        }
        for (const param of node.params) {
          declarePattern(param, 'param', currentScope, currentScope);
        }
        if (node.body) {
          declareWalk(node.body, currentScope);
        }
        break;
      }
      case 'CatchClause': {
        if (node.param) {
          declarePattern(node.param, 'catch', currentScope, currentScope);
        }
        declareWalk(node.body, currentScope);
        break;
      }
      case 'ImportDeclaration': {
        for (const spec of node.specifiers) {
          declare(spec.local, 'import', moduleScope);
        }
        break;
      }
      case 'ClassDeclaration': {
        if (node.id) {
          declare(node.id, 'class', currentScope);
        }
        eachChild(node, child => {
          if (child !== node.id) {
            declareWalk(child, currentScope);
          }
        });
        break;
      }
      case 'TSEnumDeclaration': {
        if (node.id) {
          declare(node.id, 'enum', currentScope);
        }
        break;
      }
      default:
        eachChild(node, child => declareWalk(child, currentScope));
        break;
    }
  }

  declareWalk(program, moduleScope);

  // ---------------------------------------------------------------------------
  // Pass B: resolve references.
  // ---------------------------------------------------------------------------

  const scopeStack: Scope[] = [moduleScope];
  const parentStack: Node[] = [];

  function lookup(name: string): Binding | null {
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      const binding = scopeStack[i].bindings.get(name);
      if (binding) {
        return binding;
      }
    }
    return null;
  }

  function reference(
    node: Node,
    mode: RefMode,
    extra?: { shorthand?: Node; exported?: boolean },
  ): void {
    analysis.names.add(node.name);
    const binding = lookup(node.name);
    const parents =
      parentStack[parentStack.length - 1] === node
        ? parentStack.slice(0, -1)
        : parentStack.slice();
    const ref: Ref = {
      node,
      mode,
      parents,
      binding,
      shorthand: extra?.shorthand,
      exported: extra?.exported,
    };
    if (binding) {
      binding.refs.push(ref);
    } else {
      analysis.unresolved.push(ref);
    }
  }

  function visitPatternDecl(pattern: Node): void {
    switch (pattern.type) {
      case 'Identifier':
        break;
      case 'ObjectPattern':
        for (const prop of pattern.properties) {
          if (prop.type === 'Property') {
            if (prop.computed) {
              resolve(prop.key);
            }
            visitPatternDecl(prop.value);
          } else if (prop.type === 'RestElement') {
            visitPatternDecl(prop.argument);
          }
        }
        break;
      case 'ArrayPattern':
        for (const el of pattern.elements) {
          if (el) {
            visitPatternDecl(el);
          }
        }
        break;
      case 'AssignmentPattern': {
        visitPatternDecl(pattern.left);
        resolve(pattern.right);
        break;
      }
      case 'RestElement':
        visitPatternDecl(pattern.argument);
        break;
      default:
        break;
    }
  }

  function visitAssignTarget(target: Node, mode: RefMode): void {
    switch (target.type) {
      case 'Identifier':
        reference(target, mode);
        break;
      case 'MemberExpression':
        resolve(target);
        break;
      case 'ObjectPattern':
        for (const prop of target.properties) {
          if (prop.type === 'Property') {
            if (prop.computed) {
              resolve(prop.key);
            }
            visitAssignTarget(prop.value, 'write');
          } else if (prop.type === 'RestElement') {
            visitAssignTarget(prop.argument, 'write');
          }
        }
        break;
      case 'ArrayPattern':
        for (const el of target.elements) {
          if (el) {
            visitAssignTarget(el, 'write');
          }
        }
        break;
      case 'AssignmentPattern': {
        visitAssignTarget(target.left, 'write');
        resolve(target.right);
        break;
      }
      case 'RestElement':
        visitAssignTarget(target.argument, 'write');
        break;
      case 'TSAsExpression':
      case 'TSSatisfiesExpression':
      case 'TSNonNullExpression':
      case 'TSTypeAssertion':
        visitAssignTarget(target.expression, mode);
        break;
      default:
        resolve(target);
        break;
    }
  }

  function visitJSXChildren(children: Node[]): void {
    for (const child of children) {
      if (child.type === 'JSXExpressionContainer') {
        if (child.expression.type !== 'JSXEmptyExpression') {
          resolve(child.expression);
        }
      } else if (
        child.type === 'JSXElement' ||
        child.type === 'JSXFragment' ||
        child.type === 'JSXSpreadChild'
      ) {
        resolve(child);
      }
    }
  }

  function jsxRoot(name: Node): Node {
    let current = name;
    while (current.type === 'JSXMemberExpression') {
      current = current.object;
    }
    if (current.type === 'JSXNamespacedName') {
      return current.namespace;
    }
    return current;
  }

  function resolve(node: Node): void {
    if (
      SKIP_TS_STATEMENTS.has(node.type) ||
      node.type === 'TSEnumDeclaration'
    ) {
      return;
    }
    const mapped = scopeMap.get(node);
    if (mapped) {
      scopeStack.push(mapped);
    }
    parentStack.push(node);
    switch (node.type) {
      case 'Identifier':
        reference(node, 'read');
        break;
      case 'MemberExpression': {
        resolve(node.object);
        if (node.computed) {
          resolve(node.property);
        }
        break;
      }
      case 'Property': {
        if (node.computed) {
          resolve(node.key);
        }
        if (node.shorthand && node.value.type === 'Identifier') {
          reference(node.value, 'read', { shorthand: node });
        } else {
          resolve(node.value);
        }
        break;
      }
      case 'VariableDeclarator': {
        visitPatternDecl(node.id);
        if (node.init) {
          resolve(node.init);
        }
        break;
      }
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        for (const param of node.params) {
          visitPatternDecl(param);
        }
        if (node.body) {
          resolve(node.body);
        }
        break;
      }
      case 'AssignmentExpression': {
        visitAssignTarget(
          node.left,
          node.operator === '=' ? 'write' : 'readwrite',
        );
        resolve(node.right);
        break;
      }
      case 'UpdateExpression': {
        if (node.argument.type === 'Identifier') {
          reference(node.argument, 'readwrite');
        } else {
          resolve(node.argument);
        }
        break;
      }
      case 'CatchClause': {
        if (node.param) {
          visitPatternDecl(node.param);
        }
        resolve(node.body);
        break;
      }
      case 'ImportDeclaration':
      case 'ExportAllDeclaration':
      case 'BreakStatement':
      case 'ContinueStatement':
        break;
      case 'ExportNamedDeclaration': {
        if (node.declaration) {
          resolve(node.declaration);
        } else if (!node.source) {
          for (const spec of node.specifiers) {
            reference(spec.local, 'read', { exported: true });
          }
        }
        break;
      }
      case 'ExportDefaultDeclaration': {
        resolve(node.declaration);
        break;
      }
      case 'LabeledStatement': {
        resolve(node.body);
        break;
      }
      case 'ThisExpression':
      case 'Super':
      case 'MetaProperty': {
        analysis.thisSpans.push([node.start, node.end]);
        break;
      }
      case 'ClassDeclaration':
      case 'ClassExpression': {
        if (node.superClass) {
          resolve(node.superClass);
        }
        resolve(node.body);
        break;
      }
      case 'PropertyDefinition':
      case 'MethodDefinition':
      case 'AccessorProperty': {
        if (node.computed) {
          resolve(node.key);
        }
        if (node.value) {
          resolve(node.value);
        }
        break;
      }
      case 'JSXElement': {
        const opening = node.openingElement;
        const closing = node.closingElement;
        const root = jsxRoot(opening.name);
        const binding =
          root.type === 'JSXIdentifier' ? lookup(root.name) : null;
        analysis.names.add(root.name);
        analysis.jsxNames.push({
          element: node,
          opening: opening.name,
          closing: closing ? closing.name : null,
          root,
          resolved: binding != null,
        });
        for (const attr of opening.attributes) {
          if (attr.type === 'JSXAttribute') {
            if (attr.value && attr.value.type === 'JSXExpressionContainer') {
              if (attr.value.expression.type !== 'JSXEmptyExpression') {
                resolve(attr.value.expression);
              }
            } else if (attr.value && attr.value.type === 'JSXElement') {
              resolve(attr.value);
            }
          } else if (attr.type === 'JSXSpreadAttribute') {
            resolve(attr.argument);
          }
        }
        visitJSXChildren(node.children);
        break;
      }
      case 'JSXFragment': {
        visitJSXChildren(node.children);
        break;
      }
      case 'JSXExpressionContainer': {
        if (node.expression.type !== 'JSXEmptyExpression') {
          resolve(node.expression);
        }
        break;
      }
      default:
        eachChild(node, resolve);
        break;
    }
    parentStack.pop();
    if (mapped) {
      scopeStack.pop();
    }
  }

  parentStack.push(program);
  for (const stmt of program.body) {
    resolve(stmt);
  }
  parentStack.pop();

  return analysis;
}
