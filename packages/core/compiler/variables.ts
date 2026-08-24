import { type Node, isFunctionNode, isStaticExpression, isWrapper, unwrap } from './ast';
import type { Ctx } from './context';
import type { Ref } from './scope';

export interface DeclSite {
  declarator: Node;
  call: Node;
}

/**
 * Matches `let x = $ctf(...)` shapes: the reference must be the callee of a
 * call used (possibly through TS wrappers) as a variable initializer.
 */
export function findDeclarator(ref: Ref): DeclSite | null {
  const parents = ref.parents;
  const call = parents[parents.length - 1];
  if (call?.type !== 'CallExpression' || unwrap(call.callee) !== ref.node) {
    return null;
  }
  let index = parents.length - 2;
  while (index >= 0 && isWrapper(parents[index])) {
    index--;
  }
  const declarator = parents[index];
  if (declarator?.type === 'VariableDeclarator' && unwrap(declarator.init) === call) {
    return { declarator, call };
  }
  return null;
}

export function isCallee(ref: Ref): Node | null {
  const call = ref.parents[ref.parents.length - 1];
  if (call?.type === 'CallExpression' && unwrap(call.callee) === ref.node) {
    return call;
  }
  return null;
}

export function callArgs(ctx: Ctx, call: Node, max: number): Node[] {
  const args: Node[] = call.arguments;
  if (args.length > max) {
    ctx.error(call, `Expected at most ${max} argument(s), got ${args.length}`);
  }
  for (const arg of args) {
    if (arg.type === 'SpreadElement') {
      ctx.error(arg, 'Spread arguments are not supported here');
    }
  }
  return args;
}

function removeTypeAnnotation(ctx: Ctx, id: Node): void {
  if (id.typeAnnotation) {
    ctx.s.remove(id.typeAnnotation.start, id.typeAnnotation.end);
  }
}

function devNameOptions(
  ctx: Ctx,
  call: Node,
  args: Node[],
  optionsIndex: number,
  name: string,
): void {
  if (!ctx.dev) {
    return;
  }
  const label = JSON.stringify(name);
  if (args.length > optionsIndex) {
    const options = args[optionsIndex];
    ctx.s.prependRight(options.start, `Object.assign({ name: ${label} }, `);
    ctx.s.appendLeft(options.end, ')');
  } else if (args.length === optionsIndex) {
    ctx.s.appendLeft(args[optionsIndex - 1].end, `, { name: ${label} }`);
  } else {
    // No arguments at all; fill the gaps.
    const filler = [];
    for (let i = args.length; i < optionsIndex; i++) {
      filler.push('void 0');
    }
    filler.push(`{ name: ${label} }`);
    ctx.s.appendLeft(call.end - 1, filler.join(', '));
  }
}

/** True when the span reads a reactive variable (rewritten in a later phase). */
function containsReactiveRead(ctx: Ctx, node: Node): boolean {
  for (const [binding, info] of ctx.reactive) {
    if (info.kind === 'raw') {
      continue;
    }
    for (const bindingRef of binding.refs) {
      if (bindingRef.node.start >= node.start && bindingRef.node.end <= node.end) {
        return true;
      }
    }
  }
  return false;
}

export function transformSignal(ctx: Ctx, ref: Ref, site: DeclSite): void {
  const { declarator, call } = site;
  const id = declarator.id;
  if (id.type !== 'Identifier') {
    ctx.error(id, '$signal must be assigned to a plain variable');
  }
  const binding = ctx.analysis.bindingByNode.get(id);
  if (!binding) {
    ctx.error(id, 'Unable to resolve binding');
  }
  const name = id.name as string;
  const args = callArgs(ctx, call, 2);
  const set = ctx.unique(`set${name}`);
  ctx.s.overwrite(id.start, id.end, `[${name}, ${set}]`);
  if (args.length > 0) {
    const init = args[0];
    // Memoized signal convention: a non-static initializer (or one reading
    // reactive variables) becomes a compute function — Solid 2.0's writable
    // derived form, `createSignal(() => expr)`.
    const wrap =
      !isFunctionNode(unwrap(init)) &&
      (!isStaticExpression(init) || containsReactiveRead(ctx, init));
    if (wrap) {
      ctx.s.prependRight(init.start, '() => ');
    }
  }
  ctx.s.overwrite(ref.node.start, ref.node.end, ctx.importIdent('createSignal', 'solid-js'));
  devNameOptions(ctx, call, args, 1, name);
  ctx.consumed.add(ref.node);
  ctx.register(binding, { kind: 'signal', get: name, set });
}

export function transformMemo(ctx: Ctx, ref: Ref, site: DeclSite): void {
  const { declarator, call } = site;
  const id = declarator.id;
  if (id.type !== 'Identifier') {
    ctx.error(id, `${ref.node.name} must be assigned to a plain variable`);
  }
  const binding = ctx.analysis.bindingByNode.get(id);
  if (!binding) {
    ctx.error(id, 'Unable to resolve binding');
  }
  const name = id.name as string;
  const args = callArgs(ctx, call, 2);
  if (args.length === 0) {
    ctx.error(call, `${ref.node.name} requires a value`);
  }
  removeTypeAnnotation(ctx, id);
  ctx.s.overwrite(ref.node.start, ref.node.end, ctx.importIdent('createMemo', 'solid-js'));
  if (!isFunctionNode(unwrap(args[0]))) {
    ctx.s.prependRight(args[0].start, '() => ');
  }
  devNameOptions(ctx, call, args, 1, name);
  ctx.consumed.add(ref.node);
  ctx.register(binding, { kind: 'accessor', get: name });
}

export function transformDerefSignal(ctx: Ctx, ref: Ref, site: DeclSite): void {
  const { declarator, call } = site;
  const id = declarator.id;
  if (id.type !== 'Identifier') {
    ctx.error(id, '$derefSignal must be assigned to a plain variable');
  }
  const binding = ctx.analysis.bindingByNode.get(id);
  if (!binding) {
    ctx.error(id, 'Unable to resolve binding');
  }
  const name = id.name as string;
  const args = callArgs(ctx, call, 1);
  if (args.length !== 1) {
    ctx.error(call, '$derefSignal requires a signal tuple');
  }
  const set = ctx.unique(`set${name}`);
  ctx.s.overwrite(id.start, id.end, `[${name}, ${set}]`);
  ctx.s.overwrite(call.start, args[0].start, '');
  ctx.s.overwrite(args[0].end, call.end, '');
  ctx.consumed.add(ref.node);
  ctx.register(binding, { kind: 'signal', get: name, set });
}

export function transformDerefMemo(ctx: Ctx, ref: Ref, site: DeclSite): void {
  const { declarator, call } = site;
  const id = declarator.id;
  if (id.type !== 'Identifier') {
    ctx.error(id, '$derefMemo must be assigned to a plain variable');
  }
  const binding = ctx.analysis.bindingByNode.get(id);
  if (!binding) {
    ctx.error(id, 'Unable to resolve binding');
  }
  const args = callArgs(ctx, call, 1);
  if (args.length !== 1) {
    ctx.error(call, '$derefMemo requires an accessor');
  }
  removeTypeAnnotation(ctx, id);
  ctx.s.overwrite(call.start, args[0].start, '');
  ctx.s.overwrite(args[0].end, call.end, '');
  ctx.consumed.add(ref.node);
  ctx.register(binding, { kind: 'accessor', get: id.name as string });
}

export function transformAccessorCtf(
  ctx: Ctx,
  ref: Ref,
  site: DeclSite,
  importName: string,
  source: string,
  maxArgs: number,
): void {
  const { declarator, call } = site;
  const id = declarator.id;
  if (id.type !== 'Identifier') {
    ctx.error(id, `${ref.node.name} must be assigned to a plain variable`);
  }
  const binding = ctx.analysis.bindingByNode.get(id);
  if (!binding) {
    ctx.error(id, 'Unable to resolve binding');
  }
  const args = callArgs(ctx, call, maxArgs);
  if (args.length === 0) {
    ctx.error(call, `${ref.node.name} requires a value`);
  }
  removeTypeAnnotation(ctx, id);
  ctx.s.overwrite(ref.node.start, ref.node.end, ctx.importIdent(importName, source));
  if (!isFunctionNode(unwrap(args[0]))) {
    ctx.s.prependRight(args[0].start, '() => ');
  }
  ctx.consumed.add(ref.node);
  ctx.register(binding, { kind: 'accessor', get: id.name as string });
}

/** `$untrack(expr)` and friends: wrap the first argument in an arrow. */
export function transformArrowCtf(
  ctx: Ctx,
  ref: Ref,
  call: Node,
  importName: string,
  source: string,
  maxArgs: number,
): void {
  const args = callArgs(ctx, call, maxArgs);
  if (args.length === 0) {
    ctx.error(call, `${ref.node.name} requires a value`);
  }
  ctx.s.overwrite(ref.node.start, ref.node.end, ctx.importIdent(importName, source));
  if (!isFunctionNode(unwrap(args[0]))) {
    ctx.s.prependRight(args[0].start, '() => ');
  }
  ctx.consumed.add(ref.node);
}
