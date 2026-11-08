import {
  type Node,
  expandParens,
  isFunctionNode,
  isStaticExpression,
  isWrapper,
  prependArrow,
  unwrap,
} from './ast';
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

/** Returns the call expression when the reference is its direct callee. */
export function isCallee(ref: Ref): Node | null {
  const call = ref.parents[ref.parents.length - 1];
  if (call?.type === 'CallExpression' && unwrap(call.callee) === ref.node) {
    return call;
  }
  return null;
}

/** Validates a CTF call's arguments: enforces the arity cap, rejects spread. */
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

/** Drops the TS type annotation from a declarator id (the initializer changes shape). */
function removeTypeAnnotation(ctx: Ctx, id: Node): void {
  if (id.typeAnnotation) {
    ctx.s.overwrite(id.typeAnnotation.start, id.typeAnnotation.end, '');
  }
}

/**
 * Dev mode only: injects `{ name: "x" }` into the options argument at
 * `optionsIndex`, merged via `Object.assign` when options exist, appended
 * otherwise, with `void 0` fillers for skipped positional arguments.
 *
 * Every insertion is a `prependRight` at an offset just past an argument and
 * its wrapping parentheses. It then comes after any `appendLeft` text that a
 * rewrite of that argument adds at the same offset (a `()` read or the `)`
 * that closes a setter call), and no overwrite of the argument can drop it.
 */
function devNameOptions(
  ctx: Ctx,
  call: Node,
  args: Node[],
  optionsIndex: number,
  name: string,
  calleeEnd: number,
): void {
  if (!ctx.dev) {
    return;
  }
  const label = JSON.stringify(name);
  if (args.length > optionsIndex) {
    // Wrap the options argument together with its parentheses.
    const options = args[optionsIndex];
    const [start, end] = expandParens(
      ctx.code,
      options.start,
      options.end,
      calleeEnd,
      call.end - 1,
    );
    ctx.s.prependRight(start, `Object.assign({ name: ${label} }, `);
    ctx.s.prependRight(end, ')');
  } else if (args.length === optionsIndex) {
    // Append after the last argument and its parentheses, before any trailing comma.
    const last = args[optionsIndex - 1];
    const [, end] = expandParens(ctx.code, last.start, last.end, calleeEnd, call.end - 1);
    ctx.s.prependRight(end, `, { name: ${label} }`);
  } else {
    // No arguments at all; fill the gaps.
    const filler = [];
    for (let i = args.length; i < optionsIndex; i++) {
      filler.push('void 0');
    }
    filler.push(`{ name: ${label} }`);
    ctx.s.prependRight(call.end - 1, filler.join(', '));
  }
}

/** True when the span reads a reactive variable (rewritten in a later phase). */
function containsReactiveRead(ctx: Ctx, node: Node): boolean {
  for (const bindingRef of ctx.refsIn(node.start, node.end)) {
    const info = ctx.reactive.get(bindingRef.binding!);
    if (info && info.kind !== 'raw') {
      return true;
    }
  }
  return false;
}

/**
 * `let count = $signal(value)` compiles to
 * `let [count, setcount_1] = createSignal(value)` and registers the binding
 * as a signal. Non-static initializers (or ones reading reactive variables)
 * use the memoized signal convention: `createSignal(() => expr)`.
 */
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
      prependArrow(ctx.s, ctx.code, init);
    }
  }
  ctx.s.overwrite(ref.node.start, ref.node.end, ctx.importIdent('createSignal', 'solid-js'));
  devNameOptions(ctx, call, args, 1, name, ref.node.end);
  ctx.consumed.add(ref.node);
  ctx.register(binding, { kind: 'signal', get: name, set });
}

/**
 * `const total = $memo(expr)` (also the `$` declaration form) compiles to
 * `const total = createMemo(() => expr)` and registers an accessor binding.
 * Function-valued arguments are passed through unwrapped.
 */
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
    prependArrow(ctx.s, ctx.code, args[0]);
  }
  devNameOptions(ctx, call, args, 1, name, ref.node.end);
  ctx.consumed.add(ref.node);
  ctx.register(binding, { kind: 'accessor', get: name });
}

/**
 * `let count = $derefSignal(tuple)` binds an existing `[get, set]` tuple as a
 * reactive signal variable: the declarator becomes the destructuring
 * `[count, setcount_1]` and the CTF wrapper is dropped.
 */
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

/**
 * `const total = $derefMemo(accessor)` binds an existing accessor as a
 * reactive read-only variable; the CTF wrapper is dropped.
 */
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

/**
 * Declaration CTFs ($children, $mapArray, $repeat): the call is replaced by
 * the auto-imported runtime function, the first argument is arrow-wrapped
 * when not already a function, and the variable becomes an accessor binding
 * (reads compile to `name()`).
 */
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
  // contentOnly keeps text attached to either edge: an arrow that an enclosing
  // arrow CTF put at the start, or a dev name option appended at the end.
  ctx.s.overwrite(ref.node.start, ref.node.end, ctx.importIdent(importName, source), {
    contentOnly: true,
  });
  if (!isFunctionNode(unwrap(args[0]))) {
    prependArrow(ctx.s, ctx.code, args[0]);
  }
  // createDeferred takes memo options, which include a dev name.
  if (importName === 'createDeferred') {
    devNameOptions(ctx, call, args, 1, id.name as string, ref.node.end);
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
  // contentOnly keeps text attached to either edge: an arrow that an enclosing
  // arrow CTF put at the start, or a dev name option appended at the end.
  ctx.s.overwrite(ref.node.start, ref.node.end, ctx.importIdent(importName, source), {
    contentOnly: true,
  });
  if (!isFunctionNode(unwrap(args[0]))) {
    prependArrow(ctx.s, ctx.code, args[0]);
  }
  ctx.consumed.add(ref.node);
}
