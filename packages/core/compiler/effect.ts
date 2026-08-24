import { type Node, containsAwaitOrYield, expandParens, isFunctionNode, unwrap } from './ast';
import type { CaptureInfo, Ctx } from './context';
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

  for (const binding of ctx.analysis.bindings) {
    // Declared inside the callback: not free.
    if (binding.node.start >= target.start && binding.node.end <= target.end) {
      continue;
    }
    let reads = false;
    let writes = false;
    let firstRef = -1;
    for (const bindingRef of binding.refs) {
      const pos = bindingRef.node.start;
      if (pos < body.start || bindingRef.node.end > body.end) {
        continue;
      }
      if (firstRef === -1 || pos < firstRef) {
        firstRef = pos;
      }
      if (bindingRef.mode === 'read') {
        reads = true;
      } else {
        // Compound updates read through the setter's functional form.
        writes = true;
      }
    }
    if (firstRef === -1) {
      continue;
    }
    const reactive = ctx.reactive.get(binding);
    if (reactive && reactive.kind !== 'raw') {
      if (writes && !reactive.set) {
        ctx.error(binding.node, `Cannot assign to derived variable "${binding.name}"`);
      }
      const info: CaptureInfo = { get: reads, set: writes };
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
      const info: CaptureInfo = { get: true, set: false };
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
    if (reactive && reactive.kind !== 'raw') {
      if (info.get) {
        // Inside an enclosing effect region the identifier is already a raw
        // captured value; read it plainly there.
        const outer = ctx.regionFor(binding, call.start);
        const outerRaw = outer?.captured.get(binding)?.get === true;
        entries.push(outerRaw ? binding.name : `${reactive.get}()`);
        params.push(binding.name);
      }
      if (info.set && reactive.set) {
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

function isHoistable(ctx: Ctx, target: Node, blocked: boolean): boolean {
  if (blocked) {
    return false;
  }
  const hasThis = ctx.analysis.thisSpans.some(
    ([start, end]) => start >= target.start && end <= target.end,
  );
  const hasArguments = ctx.analysis.unresolved.some(
    (r) => r.node.name === 'arguments' && r.node.start >= target.start && r.node.end <= target.end,
  );
  return !(hasThis || hasArguments);
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
    ctx.regions.push({ start: body.start, end: body.end, captured });

    ctx.consumed.add(ref.node);
    s.overwrite(ref.node.start, ref.node.end, ctx.importIdent(importName, 'solid-js'));
    s.appendLeft(fnStart, `() => [${entries.join(', ')}], `);

    if (isHoistable(ctx, target, blocked)) {
      const name = ctx.unique('effectCallback');
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
  ctx.regions.push({ start: expr.start, end: expr.end, captured });

  ctx.consumed.add(ref.node);
  s.overwrite(ref.node.start, ref.node.end, ctx.importIdent(importName, 'solid-js'));
  const computeText = `() => [${entries.join(', ')}], `;

  if (isHoistable(ctx, expr, blocked)) {
    const name = ctx.unique('effectCallback');
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
    s.appendLeft(exprStart, `${computeText}([${params.join(', ')}]) => { `);
    s.appendLeft(exprEnd, '; }');
  }
}
