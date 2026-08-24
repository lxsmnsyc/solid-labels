import { type Node, isStaticExpression, unwrap } from './ast';
import type { Ctx } from './context';
import renderSlice from './render';
import type { Ref } from './scope';
import { type DeclSite, callArgs } from './variables';

/**
 * Generates accessor declarators for a destructuring pattern over a reactive
 * source. Leaf names keep their original identifiers and are registered as
 * accessor bindings; rest elements become `omit(...)` proxies.
 */
export function destructurePattern(ctx: Ctx, pattern: Node, target: string, decls: string[]): void {
  if (pattern.type === 'ObjectPattern') {
    const omitArgs: string[] = [];
    let rest: Node | null = null;
    for (const prop of pattern.properties) {
      if (prop.type === 'RestElement') {
        rest = prop;
        continue;
      }
      const key = prop.key;
      let access: string;
      let omitArg: string;
      if (!prop.computed && key.type === 'Identifier') {
        access = `${target}.${key.name}`;
        omitArg = JSON.stringify(key.name);
      } else if (!prop.computed && key.type === 'Literal') {
        access = `${target}[${key.raw}]`;
        omitArg = key.raw;
      } else {
        const rendered = renderSlice(ctx, key.start, key.end);
        access = `${target}[${rendered}]`;
        omitArg = rendered;
      }
      omitArgs.push(omitArg);
      destructureValue(ctx, prop.value, access, decls);
    }
    if (rest) {
      const id = rest.argument;
      if (id.type !== 'Identifier') {
        ctx.error(id, 'Unsupported rest element');
      }
      const binding = ctx.analysis.bindingByNode.get(id);
      const omit = ctx.importIdent('omit', 'solid-js');
      decls.push(`${id.name} = ${omit}(${target}, ${omitArgs.join(', ')})`);
      if (binding) {
        ctx.register(binding, { kind: 'raw', get: id.name });
      }
    }
    return;
  }
  if (pattern.type === 'ArrayPattern') {
    for (let i = 0; i < pattern.elements.length; i++) {
      const element = pattern.elements[i];
      if (!element) {
        continue;
      }
      if (element.type === 'RestElement') {
        ctx.error(element, 'Rest elements in array patterns are not supported');
      }
      destructureValue(ctx, element, `${target}[${i}]`, decls);
    }
    return;
  }
  ctx.error(pattern, `Unsupported pattern: ${pattern.type}`);
}

/** Emits an accessor declarator for a leaf name and registers its binding. */
function registerLeaf(ctx: Ctx, id: Node, body: string, decls: string[]): void {
  decls.push(`${id.name} = ${body}`);
  const binding = ctx.analysis.bindingByNode.get(id);
  if (binding) {
    ctx.register(binding, { kind: 'accessor', get: id.name });
  }
}

/**
 * Handles one pattern element bound to `access` (an expression string):
 * identifiers become `() => access` leaves; defaults compile to a
 * `value === void 0 ? default : value` accessor, with the default hoisted as a
 * plain constant when static or a `createMemo` otherwise; nested patterns
 * recurse through an intermediate `prop_N` accessor.
 */
function destructureValue(ctx: Ctx, value: Node, access: string, decls: string[]): void {
  switch (value.type) {
    case 'Identifier': {
      registerLeaf(ctx, value, `() => ${access}`, decls);
      break;
    }
    case 'AssignmentPattern': {
      const defaultExpr = renderSlice(ctx, value.right.start, value.right.end);
      const original = ctx.code.slice(value.right.start, value.right.end);
      const def = ctx.unique('def');
      let defRead: string;
      if (isStaticExpression(value.right) && defaultExpr === original) {
        decls.push(`${def} = ${defaultExpr}`);
        defRead = def;
      } else {
        const memo = ctx.importIdent('createMemo', 'solid-js');
        decls.push(`${def} = ${memo}(() => ${defaultExpr})`);
        defRead = `${def}()`;
      }
      const valueName = ctx.unique('value');
      const body = `() => { const ${valueName} = ${access}; return ${valueName} === void 0 ? ${defRead} : ${valueName}; }`;
      if (value.left.type === 'Identifier') {
        registerLeaf(ctx, value.left, body, decls);
      } else {
        const mid = ctx.unique('prop');
        decls.push(`${mid} = ${body}`);
        destructurePattern(ctx, value.left, `${mid}()`, decls);
      }
      break;
    }
    case 'ObjectPattern':
    case 'ArrayPattern': {
      const mid = ctx.unique('prop');
      decls.push(`${mid} = () => ${access}`);
      destructurePattern(ctx, value, `${mid}()`, decls);
      break;
    }
    default:
      ctx.error(value, `Unsupported pattern element: ${value.type}`);
  }
}

/**
 * `const { a, b } = $destructure(expr)` compiles the whole declarator into a
 * list of accessor declarators. Non-identifier sources are first bound to an
 * `obj_N` intermediate so the source expression evaluates once.
 */
export function transformDestructure(ctx: Ctx, ref: Ref, site: DeclSite): void {
  const { declarator, call } = site;
  const pattern = declarator.id;
  if (pattern.type !== 'ObjectPattern' && pattern.type !== 'ArrayPattern') {
    ctx.error(pattern, '$destructure requires a destructuring pattern');
  }
  const args = callArgs(ctx, call, 1);
  if (args.length !== 1) {
    ctx.error(call, '$destructure requires a value');
  }
  ctx.consumed.add(ref.node);
  const arg = args[0];
  const decls: string[] = [];
  let target: string;
  if (unwrap(arg)?.type === 'Identifier') {
    target = renderSlice(ctx, arg.start, arg.end);
  } else {
    const obj = ctx.unique('obj');
    decls.push(`${obj} = ${renderSlice(ctx, arg.start, arg.end)}`);
    target = obj;
  }
  destructurePattern(ctx, pattern, target, decls);
  ctx.s.overwrite(declarator.start, declarator.end, decls.join(',\n  '));
}
