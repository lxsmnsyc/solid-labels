import type { Node } from './ast';
import { unwrap } from './ast';
import transformComponent from './component';
import type { Ctx } from './context';
import { transformDestructure } from './destructure';
import transformEffect, { startsStatementBadly } from './effect';
import transformJSXComponents from './jsx';
import { REF_CTFS, rewriteReferences } from './reactive';
import { ACCESSOR_CTF, ARROW_CTF, AUTO_ALIAS, COMPONENTS } from './registry';
import type { Ref } from './scope';
import {
  findDeclarator,
  isCallee,
  transformAccessorCtf,
  transformArrowCtf,
  transformDerefMemo,
  transformDerefSignal,
  transformMemo,
  transformSignal,
} from './variables';

/** True when the call is the entire expression statement — the `$(expr);` form. */
function isStatementCall(ref: Ref, call: Node): boolean {
  const parents = ref.parents;
  const maybeStatement = parents[parents.length - 2];
  return (
    maybeStatement?.type === 'ExpressionStatement' && unwrap(maybeStatement.expression) === call
  );
}

/**
 * Replaces a bare identifier CTF (or component name) with its auto-imported
 * local, expanding shorthand object properties to keep them valid.
 */
function replaceAlias(ctx: Ctx, ref: Ref, name: string, source: string): void {
  const local = ctx.importIdent(name, source);
  ctx.consumed.add(ref.node);
  if (ref.shorthand) {
    ctx.s.overwrite(ref.node.start, ref.node.end, `${ref.node.name}: ${local}`);
  } else {
    ctx.s.overwrite(ref.node.start, ref.node.end, local);
  }
}

/**
 * Transform pipeline, driven by unresolved (global) references in source
 * order:
 *
 * 1. structural CTFs ($signal, $memo, derefs, $destructure, $component,
 *    accessor/arrow CTFs, aliases) register reactive bindings as they go;
 * 2. $effect / $renderEffect / `$(expr);` run afterwards so capture analysis
 *    sees every reactive binding;
 * 3. `rewriteReferences` rewrites all remaining reads/writes of reactive
 *    bindings (phase 2);
 * 4. leftover ref CTFs are reported as errors, JSX component names are
 *    rewritten, hoisted effect callbacks are moved to module level, and the
 *    import header is prepended.
 */
export default function transformProgram(ctx: Ctx): void {
  const unresolved = [...ctx.analysis.unresolved].sort((a, b) => a.node.start - b.node.start);
  const effects: Ref[] = [];

  const done = new Set<Ref>();
  function processRef(ref: Ref): void {
    if (done.has(ref)) {
      return;
    }
    done.add(ref);
    if (ctx.consumed.has(ref.node)) {
      return;
    }
    const name = ref.node.name as string;
    if (ctx.disabled[name]) {
      return;
    }
    if (name === '$effect' || name === '$renderEffect') {
      if (isCallee(ref)) {
        effects.push(ref);
      } else {
        ctx.error(ref.node, `${name} must be called directly`);
      }
      return;
    }
    if (name === '$signal') {
      const site = findDeclarator(ref);
      if (!site) {
        ctx.error(ref.node, '$signal must initialize a variable declaration');
      }
      transformSignal(ctx, ref, site);
      return;
    }
    if (name === '$memo') {
      const site = findDeclarator(ref);
      if (!site) {
        ctx.error(ref.node, '$memo must initialize a variable declaration');
      }
      transformMemo(ctx, ref, site);
      return;
    }
    if (name === '$') {
      const site = findDeclarator(ref);
      if (site) {
        transformMemo(ctx, ref, site);
        return;
      }
      const call = isCallee(ref);
      if (call && isStatementCall(ref, call)) {
        // Compiled like $effect; deferred so every reactive binding is known.
        effects.push(ref);
        return;
      }
      ctx.error(ref.node, '$ must initialize a variable declaration or be used as a statement');
    }
    if (name === '$derefSignal') {
      const site = findDeclarator(ref);
      if (!site) {
        ctx.error(ref.node, '$derefSignal must initialize a variable declaration');
      }
      transformDerefSignal(ctx, ref, site);
      return;
    }
    if (name === '$derefMemo') {
      const site = findDeclarator(ref);
      if (!site) {
        ctx.error(ref.node, '$derefMemo must initialize a variable declaration');
      }
      transformDerefMemo(ctx, ref, site);
      return;
    }
    if (name === '$destructure') {
      const site = findDeclarator(ref);
      if (!site) {
        ctx.error(ref.node, '$destructure must initialize a variable declaration');
      }
      transformDestructure(ctx, ref, site);
      return;
    }
    if (name in ACCESSOR_CTF) {
      const site = findDeclarator(ref);
      if (!site) {
        ctx.error(ref.node, `${name} must initialize a variable declaration`);
      }
      const [importName, source, maxArgs] = ACCESSOR_CTF[name];
      transformAccessorCtf(ctx, ref, site, importName, source, maxArgs);
      return;
    }
    if (name === '$component') {
      const call = isCallee(ref);
      if (!call) {
        ctx.error(ref.node, '$component must be called directly');
      }
      transformComponent(ctx, ref, call);
      return;
    }
    if (name in ARROW_CTF) {
      const call = isCallee(ref);
      if (!call) {
        ctx.error(ref.node, `${name} must be called directly`);
      }
      const [importName, source, maxArgs] = ARROW_CTF[name];
      transformArrowCtf(ctx, ref, call, importName, source, maxArgs);
      return;
    }
    if (name in AUTO_ALIAS) {
      if (ref.exported) {
        return;
      }
      const [importName, source] = AUTO_ALIAS[name];
      replaceAlias(ctx, ref, importName, source);
      return;
    }
    if (name in COMPONENTS && !ref.exported) {
      const [importName, source] = COMPONENTS[name];
      replaceAlias(ctx, ref, importName, source);
    }
  }

  // Rendering a span to text (destructure defaults) needs the CTFs inside it
  // rewritten first, so it can read the edited text back from the span.
  ctx.processWithin = (start, end) => {
    for (const ref of unresolved) {
      if (ref.node.start >= start && ref.node.end <= end) {
        processRef(ref);
      }
    }
    // An effect callback may be hoisted out of its span, which is about to be
    // replaced by text, so effects inside it are not supported.
    for (const ref of effects) {
      if (ref.node.start >= start && ref.node.end <= end) {
        ctx.error(ref.node, `${ref.node.name} cannot be used inside a destructuring default`);
      }
    }
  };

  for (const ref of unresolved) {
    processRef(ref);
  }

  // Collected before effect analysis: reads inside $untrack(...) are
  // excluded from the tracked source list.
  for (const ref of unresolved) {
    if (ref.node.name === '$untrack' && !ctx.disabled.$untrack) {
      const call = isCallee(ref);
      if (call) {
        ctx.untrackSpans.push([call.start, call.end]);
      }
    }
  }

  for (const ref of effects) {
    if (ctx.consumed.has(ref.node)) {
      continue;
    }
    const call = isCallee(ref);
    if (call) {
      transformEffect(
        ctx,
        ref,
        call,
        ref.node.name === '$renderEffect' ? 'createRenderEffect' : 'createEffect',
      );
    }
  }

  rewriteReferences(ctx);

  // Any ref CTF that survived to this point was not applied to a reactive
  // variable.
  for (const ref of unresolved) {
    if (
      REF_CTFS.has(ref.node.name) &&
      !ctx.consumed.has(ref.node) &&
      !ctx.disabled[ref.node.name]
    ) {
      ctx.error(ref.node, `${ref.node.name} must be used on a reactive variable`);
    }
  }

  transformJSXComponents(ctx);
  extractHoistedCallbacks(ctx);
  ctx.finalize();
}

/**
 * Moves hoistable effect callbacks to module level. Bodies are extracted
 * innermost-first so nested effect callbacks land as sibling functions.
 */
function extractHoistedCallbacks(ctx: Ctx): void {
  if (ctx.pendingHoists.length === 0) {
    return;
  }
  const byDepth = [...ctx.pendingHoists].sort((a, b) => b.body.start - a.body.start);
  for (const pending of byDepth) {
    // slice/overwrite treat edge insertions the same across magic-string
    // versions; snip/remove changed in 1.4.
    pending.text = ctx.s.slice(pending.body.start, pending.body.end);
    ctx.s.overwrite(pending.body.start, pending.body.end, '');
  }
  let trailer = '';
  for (const pending of ctx.pendingHoists) {
    const header = `function ${pending.name}([${pending.params.join(', ')}]) `;
    const text = pending.text ?? '';
    let body = text;
    if (pending.concise) {
      if (pending.statement) {
        const wrap = startsStatementBadly(text);
        body = `{\n  ${wrap ? '(' : ''}${text}${wrap ? ')' : ''};\n}`;
      } else {
        body = `{\n  return ${text};\n}`;
      }
    }
    trailer += `\n${header}${body}\n`;
  }
  ctx.s.append(trailer);
}
