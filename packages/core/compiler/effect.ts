import {
  type Node,
  containsAwaitOrYield,
  expandParens,
  isFunctionNode,
  isWrapper,
  unwrap,
} from './ast';
import type { CaptureInfo, Ctx, ReactiveCapture } from './context';
import type { Binding, Ref } from './scope';
import { callArgs } from './variables';

interface Capture {
  binding: Binding;
  info: CaptureInfo;
  firstRef: number;
}

interface CaptureResult {
  entries: string[];
  params: string[];
  captured: Map<Binding, CaptureInfo>;
  /** True when a plain outer variable is written: the callback must stay inline. */
  blocked: boolean;
}

/**
 * Collects every free identifier used inside `body` (declared outside
 * `target`) and derives the compute-phase entries plus the destructured
 * parameter list.
 */
function analyzeCaptures(ctx: Ctx, call: Node, target: Node, body: Node): CaptureResult {
  const captures: Capture[] = [];
  const captured = new Map<Binding, CaptureInfo>();
  let blocked = false;

  // Group the references inside the body by binding.
  const byBinding = new Map<
    Binding,
    { tracked: boolean; untracked: boolean; writes: boolean; firstRef: number }
  >();
  for (const bindingRef of ctx.refsIn(body.start, body.end)) {
    const binding = bindingRef.binding!;
    if (binding.node.start >= target.start && binding.node.end <= target.end) {
      continue;
    }
    let entry = byBinding.get(binding);
    if (!entry) {
      entry = { tracked: false, untracked: false, writes: false, firstRef: bindingRef.node.start };
      byBinding.set(binding, entry);
    }
    if (bindingRef.mode === 'read') {
      if (insideUntrack(ctx, bindingRef.node)) {
        entry.untracked = true;
      } else {
        entry.tracked = true;
      }
    } else {
      entry.writes = true;
    }
  }
  // Declaration order, as when every binding was scanned.
  const ordered = [...byBinding].sort(
    (a, b) => ctx.bindingOrder.get(a[0])! - ctx.bindingOrder.get(b[0])!,
  );
  for (const [binding, { tracked, untracked, writes, firstRef }] of ordered) {
    const reactive = ctx.reactive.get(binding);
    if (reactive && reactive.kind !== 'raw') {
      if (writes && reactive.kind !== 'signal') {
        ctx.error(binding.node, `Cannot assign to derived variable "${binding.name}"`);
      }
      // A read outside $untrack tracks the source; untracked-only reads pass
      // the accessor through instead so the source list omits the signal.
      let read: ReactiveCapture['read'] = 'none';
      if (tracked) {
        read = 'value';
      } else if (untracked) {
        read = 'accessor';
      }
      if (read === 'accessor') {
        // Inside an enclosing effect region that captured the raw value the
        // accessor no longer exists; the value is already untracked there.
        const outer = ctx.regionFor(binding, call.start);
        const outerInfo = outer?.captured.get(binding);
        if (outerInfo?.kind === 'reactive' && outerInfo.read === 'value') {
          read = 'value';
        }
      }
      const info: CaptureInfo = { kind: 'reactive', read, write: writes };
      captured.set(binding, info);
      captures.push({ binding, info, firstRef });
      continue;
    }
    // Plain values (including `raw` reactive rest proxies).
    if (writes) {
      // Writes to plain outer variables keep closure semantics; the callback
      // cannot be hoisted and the variable is not captured.
      blocked = true;
      continue;
    }
    if (binding.scope !== ctx.analysis.module || reactive) {
      const info: CaptureInfo = { kind: 'plain' };
      captured.set(binding, info);
      captures.push({ binding, info, firstRef });
    }
  }

  captures.sort((a, b) => a.firstRef - b.firstRef);

  const entries: string[] = [];
  const params: string[] = [];
  for (const capture of captures) {
    const { binding, info } = capture;
    const reactive = ctx.reactive.get(binding);
    if (reactive && reactive.kind !== 'raw' && info.kind === 'reactive') {
      if (info.read === 'value') {
        // Inside an enclosing effect region the identifier is already a raw
        // captured value; read it plainly there.
        const outer = ctx.regionFor(binding, call.start);
        const outerInfo = outer?.captured.get(binding);
        const outerRaw = outerInfo?.kind === 'reactive' && outerInfo.read === 'value';
        entries.push(outerRaw ? binding.name : `${reactive.get}()`);
        params.push(binding.name);
      } else if (info.read === 'accessor') {
        // The accessor itself rides along — stable identity, never triggers.
        entries.push(binding.name);
        params.push(binding.name);
      }
      if (info.write && reactive.kind === 'signal') {
        entries.push(reactive.set);
        params.push(reactive.set);
      }
    } else {
      entries.push(binding.name);
      params.push(binding.name);
    }
  }

  return { entries, params, captured, blocked };
}

/**
 * A callback can move to module level only when it closes over nothing the
 * capture array cannot carry: no writes to plain outer variables (`blocked`),
 * and no `this` / `super` / meta-property / `arguments` inside the span.
 */
/** True when the node sits inside a `$untrack(...)` call span. */
function insideUntrack(ctx: Ctx, node: Node): boolean {
  return ctx.insideUntrack(node.start, node.end);
}

/**
 * Derives the hoisted callback's base name from the nearest enclosing named
 * scope — a named function, or a function expression bound to a variable,
 * property, method, or assignment — so the module-level function reads as
 * `AppEffect_1` instead of an anonymous `effectCallback_1`.
 */
function hoistBaseName(ref: Ref): string {
  for (let link = ref.up; link; link = link.up) {
    const node = link.node;
    if (!isFunctionNode(node)) {
      continue;
    }
    if (node.id?.type === 'Identifier') {
      return `${node.id.name}Effect`;
    }
    // Wrappers and call expressions (`$component(fn)`, `memo(fn)`) are
    // transparent: the name comes from whatever the call is bound to.
    let outer = link.up;
    while (outer && (isWrapper(outer.node) || outer.node.type === 'CallExpression')) {
      outer = outer.up;
    }
    const parent = outer?.node;
    if (!parent) {
      continue;
    }
    if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
      return `${parent.id.name}Effect`;
    }
    if (
      (parent.type === 'Property' ||
        parent.type === 'MethodDefinition' ||
        parent.type === 'PropertyDefinition') &&
      !parent.computed &&
      parent.key?.type === 'Identifier'
    ) {
      return `${parent.key.name}Effect`;
    }
    if (parent.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
      return `${parent.left.name}Effect`;
    }
  }
  return 'effectCallback';
}

function isHoistable(ctx: Ctx, target: Node, blocked: boolean): boolean {
  if (blocked) {
    return false;
  }
  const hasThis = ctx.analysis.thisSpans.some(
    ([start, end]) => start >= target.start && end <= target.end,
  );
  const hasArguments = ctx.argumentsRefs.some(
    (r) => r.node.start >= target.start && r.node.end <= target.end,
  );
  return !(hasThis || hasArguments);
}

/** True when the expression would parse as a block, declaration or class at the start of a statement. */
export function startsStatementBadly(text: string): boolean {
  return /^(\{|function\b|class\b|async\s+function\b)/.test(text);
}

/**
 * `$effect(() => { ... })` (also `$renderEffect` and the `$(expr);`
 * statement) — two-phase compilation:
 *
 * 1. every outer identifier used by the callback is collected;
 * 2. the compute phase returns their current values (signals are read, and
 *    therefore tracked, there);
 * 3. the callback receives the values as a destructured array parameter, so
 *    its body reads plain values and stays untracked.
 *
 * When the callback captures nothing that blocks it, the callback is hoisted
 * to module level as a named function.
 */
export default function transformEffect(
  ctx: Ctx,
  ref: Ref,
  call: Node,
  importName: 'createEffect' | 'createRenderEffect',
): void {
  const isDollar = ref.node.name === '$';
  const args = callArgs(ctx, call, isDollar ? 1 : 2);
  if (args.length === 0) {
    ctx.error(call, `${ref.node.name} requires a callback`);
  }
  const fn = unwrap(args[0]);
  const isCallback = fn != null && isFunctionNode(fn) && fn.type !== 'FunctionDeclaration';
  if (!(isCallback || isDollar)) {
    ctx.error(args[0], `${ref.node.name} requires a function expression`);
  }
  const { code, s } = ctx;
  const callParen = code.indexOf('(', call.callee.end);

  if (isCallback) {
    const target = fn;
    if (target.params.length > 0) {
      ctx.error(
        target.params[0],
        `${ref.node.name} callbacks take no parameters; captured values are injected by the compiler`,
      );
    }
    if (target.async || target.generator) {
      ctx.error(target, `${ref.node.name} callbacks must be synchronous`);
    }
    const body = target.body;
    const [fnStart, fnEnd] = expandParens(
      code,
      target.start,
      target.end,
      callParen + 1,
      call.end - 1,
    );

    const { entries, params, captured, blocked } = analyzeCaptures(ctx, call, target, body);
    ctx.addRegion({ start: body.start, end: body.end, captured });

    ctx.consumed.add(ref.node);
    s.overwrite(ref.node.start, ref.node.end, ctx.importIdent(importName, 'solid-js'));
    s.appendLeft(fnStart, `() => [${entries.join(', ')}], `);

    if (isHoistable(ctx, target, blocked)) {
      const name = ctx.unique(hoistBaseName(ref));
      s.overwrite(fnStart, body.start, name);
      if (fnEnd > body.end) {
        s.overwrite(body.end, fnEnd, '');
      }
      // The body is extracted after all reference rewrites are applied; see
      // `extractHoistedCallbacks`.
      ctx.pendingHoists.push({
        name,
        params,
        body,
        concise: body.type !== 'BlockStatement',
      });
    } else {
      // Inline: rewrite the empty parameter list to the destructured captures.
      const parenIndex = code.indexOf('(', target.start);
      s.appendLeft(parenIndex + 1, `[${params.join(', ')}]`);
    }
    return;
  }

  // `$(expression);` — the expression is the callback body.
  const expr = args[0];
  if (containsAwaitOrYield(expr)) {
    ctx.error(expr, '$ expressions cannot await or yield');
  }
  const [exprStart, exprEnd] = expandParens(
    code,
    expr.start,
    expr.end,
    callParen + 1,
    call.end - 1,
  );

  const { entries, params, captured, blocked } = analyzeCaptures(ctx, call, expr, expr);
  ctx.addRegion({ start: expr.start, end: expr.end, captured });

  ctx.consumed.add(ref.node);
  s.overwrite(ref.node.start, ref.node.end, ctx.importIdent(importName, 'solid-js'));
  const computeText = `() => [${entries.join(', ')}], `;

  if (isHoistable(ctx, expr, blocked)) {
    const name = ctx.unique(hoistBaseName(ref));
    s.appendLeft(exprStart, `${computeText}${name}`);
    // The expression is extracted after all reference rewrites are applied;
    // see `extractHoistedCallbacks`.
    ctx.pendingHoists.push({
      name,
      params,
      body: { type: 'ExpressionSpan', start: exprStart, end: exprEnd },
      concise: true,
      statement: true,
    });
  } else {
    // A statement cannot start with `{`, `function` or `class`.
    const open = startsStatementBadly(code.slice(exprStart, exprEnd)) ? '(' : '';
    s.appendLeft(exprStart, `${computeText}([${params.join(', ')}]) => { ${open}`);
    s.appendLeft(exprEnd, `${open ? ')' : ''}; }`);
  }
}
