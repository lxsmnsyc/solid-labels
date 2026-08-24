import {
  type Node,
  containsAwaitOrYield,
  expandParens,
  isWrapper,
  unwrap,
} from './ast';
import type { Ctx, ReactiveInfo } from './context';
import type { Binding, Ref } from './scope';

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

function detectRefCtf(ctx: Ctx, ref: Ref): RefCtfUse | null {
  const parents = ref.parents;
  // Ascend through expression wrappers to the call.
  let index = parents.length - 1;
  while (index >= 0 && isWrapper(parents[index])) {
    index--;
  }
  const call = parents[index];
  if (!call || call.type !== 'CallExpression') {
    return null;
  }
  const callee = unwrap(call.callee);
  if (!callee || callee.type !== 'Identifier' || !REF_CTFS.has(callee.name)) {
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
    maybeProp &&
    maybeProp.type === 'Property' &&
    propIndex >= 1 &&
    parents[propIndex - 1].type === 'ObjectExpression' &&
    maybeProp.value !== undefined &&
    unwrap(maybeProp.value) === call
      ? maybeProp
      : null;
  return { name: callee.name, call, callee, property, callIndex: index };
}

function keyText(ctx: Ctx, property: Node): string {
  const key = property.key;
  const raw = ctx.code.slice(key.start, key.end);
  return property.computed ? `[${raw}]` : raw;
}

function rewriteRefCtf(
  ctx: Ctx,
  info: ReactiveInfo,
  ref: Ref,
  use: RefCtfUse,
): void {
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
      s.overwrite(use.call.start, use.call.end, info.get);
      break;
    }
    case '$set': {
      signalOnly();
      s.overwrite(use.call.start, use.call.end, info.set as string);
      break;
    }
    case '$refSignal': {
      signalOnly();
      s.overwrite(use.call.start, use.call.end, `[${info.get}, ${info.set}]`);
      break;
    }
    case '$refMemo': {
      s.overwrite(use.call.start, use.call.end, info.get);
      break;
    }
    case '$getter': {
      if (!use.property) {
        ctx.error(
          use.callee,
          '$getter must be used as an object property value',
        );
      }
      const prop = use.property as Node;
      s.overwrite(
        prop.start,
        prop.end,
        `get ${keyText(ctx, prop)}() { return ${info.get}(); }`,
      );
      break;
    }
    case '$setter': {
      signalOnly();
      if (!use.property) {
        ctx.error(
          use.callee,
          '$setter must be used as an object property value',
        );
      }
      const prop = use.property as Node;
      const param = ctx.unique('param');
      s.overwrite(
        prop.start,
        prop.end,
        `set ${keyText(ctx, prop)}(${param}) { ${info.set}(() => ${param}); }`,
      );
      break;
    }
    case '$property': {
      if (!use.property) {
        ctx.error(
          use.callee,
          '$property must be used as an object property value',
        );
      }
      const prop = use.property as Node;
      const key = keyText(ctx, prop);
      let text = `get ${key}() { return ${info.get}(); }`;
      if (info.kind === 'signal' && info.set) {
        const param = ctx.unique('param');
        text += `, set ${key}(${param}) { ${info.set}(() => ${param}); }`;
      }
      s.overwrite(prop.start, prop.end, text);
      break;
    }
    default:
      break;
  }
}

function rewriteWrite(
  ctx: Ctx,
  binding: Binding,
  info: ReactiveInfo,
  ref: Ref,
): void {
  if (info.kind !== 'signal' || !info.set) {
    ctx.error(ref.node, `Cannot assign to derived variable "${binding.name}"`);
  }
  const set = info.set as string;
  const { s, code } = ctx;
  const parent = ref.parents[ref.parents.length - 1];
  if (parent && parent.type === 'UpdateExpression') {
    const current = ctx.unique('current');
    const op = parent.operator === '++' ? `++${current}` : `--${current}`;
    s.overwrite(parent.start, parent.end, `${set}(${current} => ${op})`);
    return;
  }
  if (
    !parent ||
    parent.type !== 'AssignmentExpression' ||
    parent.left !== ref.node
  ) {
    ctx.error(
      ref.node,
      `Unsupported write to reactive variable "${binding.name}"`,
    );
  }
  const assign = parent as Node;
  const right = assign.right;
  if (assign.operator !== '=') {
    // Compound assignment: functional update over the previous value.
    const current = ctx.unique('current');
    s.overwrite(
      ref.node.start,
      ref.node.end,
      `${set}(${current} => ${current}`,
    );
    s.appendLeft(right.end, ')');
    return;
  }
  if (containsAwaitOrYield(right)) {
    const tmp = ctx.unique('tmp');
    const grand = ref.parents[ref.parents.length - 2];
    if (grand && grand.type === 'ExpressionStatement') {
      s.overwrite(ref.node.start, right.start, `const ${tmp} = `);
      s.appendLeft(right.end, `;\n${set}(() => ${tmp})`);
      return;
    }
    // Concise arrow body: `async () => (count = await value())`
    const arrowIndex = ref.parents.findIndex(
      p => p.type === 'ArrowFunctionExpression' && unwrap(p.body) === assign,
    );
    if (arrowIndex !== -1) {
      const arrow = ref.parents[arrowIndex];
      const [bodyStart, bodyEnd] = expandParens(
        code,
        assign.start,
        assign.end,
        arrow.start,
      );
      s.overwrite(bodyStart, right.start, `{ const ${tmp} = `);
      s.overwrite(right.end, bodyEnd, `; return ${set}(() => ${tmp}); }`);
      return;
    }
    ctx.error(
      ref.node,
      `Assignments with await/yield to "${binding.name}" are only supported as statements or arrow bodies`,
    );
  }
  s.overwrite(ref.node.start, right.start, `${set}(() => `);
  s.appendLeft(right.end, ')');
}

export function rewriteReferences(ctx: Ctx): void {
  const { s } = ctx;
  for (const [binding, info] of ctx.reactive) {
    if (info.kind === 'raw') {
      continue;
    }
    for (const ref of binding.refs) {
      if (ctx.consumed.has(ref.node)) {
        continue;
      }
      if (ref.exported) {
        ctx.error(
          ref.node,
          `Cannot export reactive variable "${binding.name}" directly`,
        );
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
        if (region) {
          // Captured by an effect callback: the identifier resolves to the
          // destructured raw value parameter — leave it untouched.
          ctx.consumed.add(ref.node);
          continue;
        }
        ctx.consumed.add(ref.node);
        if (ref.shorthand) {
          s.overwrite(
            ref.node.start,
            ref.node.end,
            `${binding.name}: ${info.get}()`,
          );
        } else {
          s.appendLeft(ref.node.end, '()');
        }
        continue;
      }
      // write / readwrite
      ctx.consumed.add(ref.node);
      rewriteWrite(ctx, binding, info, ref);
    }
  }
}
