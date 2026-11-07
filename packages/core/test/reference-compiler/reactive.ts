import { type Node, containsAwaitOrYield, expandParens, isWrapper, unwrap } from './ast';
import type { Ctx, ReactiveInfo } from './context';
import type { Binding, Ref } from './scope';

/** CTFs applied to a reference of an existing reactive variable. */
export const REF_CTFS = new Set([
  '$get',
  '$set',
  '$refSignal',
  '$refMemo',
  '$getter',
  '$setter',
  '$property',
]);

interface RefCtfUse {
  name: string;
  call: Node;
  callee: Node;
  /** Property node when the call is an object property value. */
  property: Node | null;
  /** Index of the call node inside ref.parents. */
  callIndex: number;
}

/**
 * Matches `$get(count)`-style shapes: the reactive reference must be the sole
 * argument of a call to an unresolved ref CTF. Also captures the enclosing
 * object property for `$getter` / `$setter` / `$property`.
 */
function detectRefCtf(ctx: Ctx, ref: Ref): RefCtfUse | null {
  const parents = ref.parents;
  // Ascend through expression wrappers to the call.
  let index = parents.length - 1;
  while (index >= 0 && isWrapper(parents[index])) {
    index--;
  }
  const call = parents[index];
  if (call?.type !== 'CallExpression') {
    return null;
  }
  const callee = unwrap(call.callee);
  if (callee?.type !== 'Identifier' || !REF_CTFS.has(callee.name)) {
    return null;
  }
  if (!ctx.unresolvedByNode.has(callee)) {
    return null;
  }
  if (ctx.disabled[callee.name]) {
    return null;
  }
  if (call.arguments.length !== 1 || unwrap(call.arguments[0]) !== ref.node) {
    return null;
  }
  // Is the call an object property value?
  let propIndex = index - 1;
  while (propIndex >= 0 && isWrapper(parents[propIndex])) {
    propIndex--;
  }
  const maybeProp = parents[propIndex];
  const property =
    maybeProp?.type === 'Property' &&
    propIndex >= 1 &&
    parents[propIndex - 1].type === 'ObjectExpression' &&
    maybeProp.value !== undefined &&
    unwrap(maybeProp.value) === call
      ? maybeProp
      : null;
  return { name: callee.name, call, callee, property, callIndex: index };
}

/** Source text of a property key, bracketed when computed. */
function keyText(ctx: Ctx, property: Node): string {
  const key = property.key;
  const raw = ctx.code.slice(key.start, key.end);
  return property.computed ? `[${raw}]` : raw;
}

/**
 * Replaces a ref CTF call with the underlying accessor/setter: `$get` with the
 * getter, `$set` with the setter, `$refSignal` with the `[get, set]` tuple, and
 * the property forms with `get`/`set` accessor properties.
 */
function rewriteRefCtf(ctx: Ctx, info: ReactiveInfo, ref: Ref, use: RefCtfUse): void {
  ctx.consumed.add(ref.node);
  ctx.consumed.add(use.callee);
  const { s } = ctx;
  const signalOnly = (): void => {
    if (info.kind !== 'signal' || !info.set) {
      ctx.error(use.callee, `${use.name} must be used on a signal variable`);
    }
  };
  switch (use.name) {
    case '$get': {
      s.overwrite(use.call.start, use.call.end, info.get, { contentOnly: true });
      break;
    }
    case '$set': {
      signalOnly();
      s.overwrite(use.call.start, use.call.end, info.set!, { contentOnly: true });
      break;
    }
    case '$refSignal': {
      signalOnly();
      s.overwrite(use.call.start, use.call.end, `[${info.get}, ${info.set}]`, {
        contentOnly: true,
      });
      break;
    }
    case '$refMemo': {
      s.overwrite(use.call.start, use.call.end, info.get, { contentOnly: true });
      break;
    }
    case '$getter': {
      if (!use.property) {
        ctx.error(use.callee, '$getter must be used as an object property value');
      }
      const prop = use.property;
      s.overwrite(prop.start, prop.end, `get ${keyText(ctx, prop)}() { return ${info.get}(); }`, {
        contentOnly: true,
      });
      break;
    }
    case '$setter': {
      signalOnly();
      if (!use.property) {
        ctx.error(use.callee, '$setter must be used as an object property value');
      }
      const prop = use.property;
      const param = ctx.unique('param');
      s.overwrite(
        prop.start,
        prop.end,
        `set ${keyText(ctx, prop)}(${param}) { ${info.set}(() => ${param}); }`,
        { contentOnly: true },
      );
      break;
    }
    case '$property': {
      if (!use.property) {
        ctx.error(use.callee, '$property must be used as an object property value');
      }
      const prop = use.property;
      const key = keyText(ctx, prop);
      let text = `get ${key}() { return ${info.get}(); }`;
      if (info.kind === 'signal' && info.set) {
        const param = ctx.unique('param');
        text += `, set ${key}(${param}) { ${info.set}(() => ${param}); }`;
      }
      s.overwrite(prop.start, prop.end, text, { contentOnly: true });
      break;
    }
    default:
      break;
  }
}

/**
 * Text that closes a rewritten write after its right side. It is inserted
 * after every other edit, so reads and nested rewrites inside the right side
 * (which overwrite spans and add `()` at the same offset) cannot drop it or
 * land after it.
 */
interface Closer {
  /** Start of the assignment; inner writes close before outer ones. */
  order: number;
  at: number;
  text: string;
}

/**
 * Rewrites a write to a signal binding into a setter call:
 * `++count` compiles to `setcount_1(current_1 => ++current_1)`, a postfix
 * update whose value is used keeps the old value through a temporary, compound
 * assignment to the functional-update form, and plain `=` to
 * `setcount_1(() => value)`. Right-hand sides containing await/yield are
 * split into a temporary first (statement or concise arrow body only) so the
 * setter never receives a promise.
 */
function rewriteWrite(
  ctx: Ctx,
  binding: Binding,
  info: ReactiveInfo,
  ref: Ref,
  closers: Closer[],
): void {
  if (info.kind !== 'signal' || !info.set) {
    ctx.error(ref.node, `Cannot assign to derived variable "${binding.name}"`);
  }
  const set = info.set;
  const { s, code } = ctx;
  const parent = ref.parents[ref.parents.length - 1];
  if (parent?.type === 'UpdateExpression') {
    const current = ctx.unique('current');
    const grand = ref.parents[ref.parents.length - 2];
    const unused =
      grand?.type === 'ExpressionStatement' ||
      (grand?.type === 'ForStatement' && grand.update === parent);
    if (parent.prefix || unused) {
      const op = parent.operator === '++' ? `++${current}` : `--${current}`;
      s.overwrite(parent.start, parent.end, `${set}(${current} => ${op})`, { contentOnly: true });
      return;
    }
    // Postfix with a used value evaluates to the old value.
    const tmp = ctx.unique('tmp');
    const sign = parent.operator === '++' ? '+' : '-';
    s.overwrite(
      parent.start,
      parent.end,
      `(() => { let ${tmp}; ${set}(${current} => (${tmp} = ${current}) ${sign} 1); return ${tmp}; })()`,
      { contentOnly: true },
    );
    return;
  }
  if (parent?.type !== 'AssignmentExpression' || parent.left !== ref.node) {
    ctx.error(ref.node, `Unsupported write to reactive variable "${binding.name}"`);
  }
  const assign = parent;
  const right = assign.right;
  if (assign.operator !== '=') {
    // Compound assignment: functional update over the previous value.
    const current = ctx.unique('current');
    s.overwrite(ref.node.start, ref.node.end, `${set}(${current} => ${current}`);
    closers.push({ order: assign.start, at: right.end, text: ')' });
    return;
  }
  // oxc drops parentheses, so find the real span of the right-hand side.
  const [rightStart, rightEnd] = expandParens(
    code,
    right.start,
    right.end,
    ref.node.end,
    assign.end,
  );
  if (containsAwaitOrYield(right)) {
    const tmp = ctx.unique('tmp');
    const grand = ref.parents[ref.parents.length - 2];
    if (grand?.type === 'ExpressionStatement') {
      s.overwrite(ref.node.start, rightStart, `const ${tmp} = `);
      closers.push({ order: assign.start, at: rightEnd, text: `;\n${set}(() => ${tmp})` });
      return;
    }
    // Concise arrow body: `async () => (count = await value())`
    const arrowIndex = ref.parents.findIndex(
      (p) => p.type === 'ArrowFunctionExpression' && unwrap(p.body) === assign,
    );
    if (arrowIndex !== -1) {
      const arrow = ref.parents[arrowIndex];
      const [bodyStart, bodyEnd] = expandParens(code, assign.start, assign.end, arrow.start);
      s.overwrite(bodyStart, rightStart, `{ const ${tmp} = `);
      s.overwrite(rightEnd, bodyEnd, `; return ${set}(() => ${tmp}); }`);
      return;
    }
    ctx.error(
      ref.node,
      `Assignments with await/yield to "${binding.name}" are only supported as statements or arrow bodies`,
    );
  }
  const object = code[rightStart] === '{';
  s.overwrite(ref.node.start, rightStart, `${set}(() => ${object ? '(' : ''}`);
  closers.push({ order: assign.start, at: rightEnd, text: object ? '))' : ')' });
}

/**
 * Phase 2: rewrites every remaining reference of each reactive binding.
 * Reads get `()` appended (or shorthand-expanded), writes go through
 * `rewriteWrite`, ref CTFs through `rewriteRefCtf`. References captured by an
 * effect region are left untouched — inside the callback the name is the
 * destructured raw value parameter.
 */
export function rewriteReferences(ctx: Ctx): void {
  const { s } = ctx;
  const closers: Closer[] = [];
  for (const [binding, info] of ctx.reactive) {
    if (info.kind === 'raw') {
      continue;
    }
    for (const ref of binding.refs) {
      if (ctx.consumed.has(ref.node)) {
        continue;
      }
      if (ref.exported) {
        ctx.error(ref.node, `Cannot export reactive variable "${binding.name}" directly`);
      }
      const use = detectRefCtf(ctx, ref);
      if (use) {
        const region = ctx.enclosingRegion(ref.node.start);
        if (region?.captured.has(binding)) {
          ctx.error(
            use.callee,
            `${use.name} cannot be used on captured variables inside effect callbacks`,
          );
        }
        rewriteRefCtf(ctx, info, ref, use);
        continue;
      }
      if (ref.mode === 'read') {
        const region = ctx.regionFor(binding, ref.node.start);
        if (region?.captured.get(binding)?.get === 'value') {
          // Captured by an effect callback: the identifier resolves to the
          // destructured raw value parameter — leave it untouched. (An
          // 'accessor' capture keeps the normal `name()` rewrite below.)
          ctx.consumed.add(ref.node);
          continue;
        }
        ctx.consumed.add(ref.node);
        if (ref.shorthand) {
          s.overwrite(ref.node.start, ref.node.end, `${binding.name}: ${info.get}()`);
        } else {
          s.appendLeft(ref.node.end, '()');
        }
        continue;
      }
      // write / readwrite
      ctx.consumed.add(ref.node);
      rewriteWrite(ctx, binding, info, ref, closers);
    }
  }
  // Inner writes first, so they close before the writes that contain them.
  closers.sort((a, b) => b.order - a.order);
  for (const closer of closers) {
    s.appendLeft(closer.at, closer.text);
  }
}
