import { type Node, containsAwaitOrYield, expandParens, isWrapper, unwrap } from './ast';
import type { Ctx, ReactiveInfo, SignalInfo } from './context';
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
  const signalOnly = (): SignalInfo => {
    if (info.kind !== 'signal') {
      ctx.error(use.callee, `${use.name} must be used on a signal variable`);
    }
    return info;
  };
  switch (use.name) {
    case '$get': {
      s.overwrite(use.call.start, use.call.end, info.get, { contentOnly: true });
      break;
    }
    case '$set': {
      const signal = signalOnly();
      s.overwrite(use.call.start, use.call.end, signal.set, { contentOnly: true });
      break;
    }
    case '$refSignal': {
      const signal = signalOnly();
      s.overwrite(use.call.start, use.call.end, `[${signal.get}, ${signal.set}]`, {
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
      const signal = signalOnly();
      if (!use.property) {
        ctx.error(use.callee, '$setter must be used as an object property value');
      }
      const prop = use.property;
      const param = ctx.unique('param');
      s.overwrite(
        prop.start,
        prop.end,
        `set ${keyText(ctx, prop)}(${param}) { ${signal.set}(() => ${param}); }`,
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
      if (info.kind === 'signal') {
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

const TS_WRAPPERS = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSTypeAssertion',
]);

/** Parents that hold a list of statements, where several statements can replace one. */
const STATEMENT_LISTS = new Set([
  'BlockStatement',
  'Program',
  'StaticBlock',
  'SwitchCase',
  'TSModuleBlock',
]);

/**
 * Offset of the operator that follows an assignment target, skipping
 * whitespace, closing parentheses and comments (which may contain the
 * operator text).
 */
function skipToOperator(code: string, from: number): number {
  let i = from;
  while (i < code.length) {
    const ch = code[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ')') {
      i++;
    } else if (ch === '/' && code[i + 1] === '*') {
      const close = code.indexOf('*/', i + 2);
      i = close === -1 ? code.length : close + 2;
    } else if (ch === '/' && code[i + 1] === '/') {
      const newline = code.indexOf('\n', i);
      i = newline === -1 ? code.length : newline + 1;
    } else {
      break;
    }
  }
  return i;
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
  if (info.kind !== 'signal') {
    ctx.error(ref.node, `Cannot assign to derived variable "${binding.name}"`);
  }
  const set = info.set;
  const { s, code } = ctx;
  // `x!++` and `(x as T)++` update the signal like `x++`: skip the TS wrappers.
  let top = ref.parents.length - 1;
  while (top >= 0 && TS_WRAPPERS.has(ref.parents[top]?.type ?? '')) {
    top--;
  }
  const parent = ref.parents[top];
  if (parent?.type === 'UpdateExpression') {
    const current = ctx.unique('current');
    const grand = ref.parents[top - 1];
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
  // `x! = 1` and `(x as T) = 1` assign through the wrapper: replace it too.
  if (parent?.type !== 'AssignmentExpression' || unwrap(parent.left) !== ref.node) {
    ctx.error(ref.node, `Unsupported write to reactive variable "${binding.name}"`);
  }
  const assign = parent;
  const target = assign.left;
  const right = assign.right;
  const compound = assign.operator !== '=';
  // oxc drops parentheses, so find the real span of the right-hand side.
  const [rightStart, rightEnd] = expandParens(
    code,
    right.start,
    right.end,
    ref.node.end,
    assign.end,
  );
  if (containsAwaitOrYield(right)) {
    // The setter callback is not async and cannot hold the `await` or `yield`,
    // so the right side is evaluated into a temporary first. JS evaluates the
    // left operand before the right side, so an arithmetic update reads the
    // signal before it. A logical update runs the right side only when the
    // signal does not decide the result.
    const grand = ref.parents[top - 1];
    const arrowIndex = ref.parents.findIndex(
      (p) => p.type === 'ArrowFunctionExpression' && unwrap(p.body) === assign,
    );
    const inStatement = grand?.type === 'ExpressionStatement';
    if (!inStatement && arrowIndex === -1) {
      ctx.error(
        ref.node,
        `Assignments with await/yield to "${binding.name}" are only supported as statements or arrow bodies`,
      );
    }
    const read = `${info.get}()`;
    const operator = assign.operator;
    // A statement ends with the write. A concise arrow body becomes a block
    // that returns the value the expression had.
    let head: string;
    let tail: string;
    if (operator === '||=' || operator === '&&=' || operator === '??=') {
      const old = ctx.unique('tmp');
      const tmp = ctx.unique('tmp');
      let test = `!${old}`;
      if (operator === '&&=') {
        test = old;
      } else if (operator === '??=') {
        test = `${old} == null`;
      }
      head = `const ${old} = ${read}; if (${test}) { const ${tmp} = `;
      tail = inStatement
        ? `;\n${set}(() => ${tmp}); }`
        : `; return ${set}(() => ${tmp}); } return ${old};`;
    } else if (compound) {
      const old = ctx.unique('tmp');
      const tmp = ctx.unique('tmp');
      head = `const ${old} = ${read}; const ${tmp} = `;
      const write = `${set}(() => ${old} ${operator.slice(0, -1)} ${tmp})`;
      tail = inStatement ? `;\n${write}` : `; return ${write};`;
    } else {
      const tmp = ctx.unique('tmp');
      head = `const ${tmp} = `;
      const write = `${set}(() => ${tmp})`;
      tail = inStatement ? `;\n${write}` : `; return ${write};`;
    }
    if (inStatement) {
      // The output is several statements, so a statement that is the body of an
      // `if`, a loop or a label needs braces.
      const owner = ref.parents[top - 2];
      const braces = !STATEMENT_LISTS.has(owner?.type ?? '');
      s.overwrite(assign.start, rightStart, braces ? `{ ${head}` : head, { contentOnly: true });
      closers.push({ order: assign.start, at: rightEnd, text: tail });
      if (braces) {
        // The brace closes after the statement's own `;`, so `do ... while` still parses.
        closers.push({ order: assign.start - 0.5, at: grand.end, text: ' }' });
      }
      return;
    }
    // Concise arrow body: `async () => (count = await value())`
    const arrow = ref.parents[arrowIndex];
    const [bodyStart, bodyEnd] = expandParens(code, assign.start, assign.end, arrow.start);
    s.overwrite(bodyStart, rightStart, `{ ${head}`);
    if (rightEnd < bodyEnd) {
      s.overwrite(rightEnd, bodyEnd, `${tail} }`);
    } else {
      // An unparenthesized body ends with the right side: nothing to overwrite.
      closers.push({ order: assign.start, at: rightEnd, text: `${tail} }` });
    }
    return;
  }
  if (compound) {
    // Compound assignment: functional update over the previous value.
    const current = ctx.unique('current');
    const operator = skipToOperator(code, target.end);
    s.overwrite(assign.start, operator, `${set}(${current} => ${current} `, {
      contentOnly: true,
    });
    closers.push({ order: assign.start, at: right.end, text: ')' });
    return;
  }
  const object = code[rightStart] === '{';
  s.overwrite(assign.start, rightStart, `${set}(() => ${object ? '(' : ''}`, {
    contentOnly: true,
  });
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
        const regionInfo = region?.captured.get(binding);
        if (regionInfo?.kind === 'reactive' && regionInfo.read === 'value') {
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
