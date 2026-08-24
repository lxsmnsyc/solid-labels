import type { Node } from './ast';
import { unwrap } from './ast';
import { transformComponent } from './component';
import type { Ctx } from './context';
import { transformDestructure } from './destructure';
import { transformEffect } from './effect';
import { transformJSXComponents } from './jsx';
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

function isStatementCall(ref: Ref, call: Node): boolean {
  const parents = ref.parents;
  const maybeStatement = parents[parents.length - 2];
  return (
    maybeStatement != null &&
    maybeStatement.type === 'ExpressionStatement' &&
    unwrap(maybeStatement.expression) === call
  );
}

function replaceAlias(ctx: Ctx, ref: Ref, name: string, source: string): void {
  const local = ctx.importIdent(name, source);
  ctx.consumed.add(ref.node);
  if (ref.shorthand) {
    ctx.s.overwrite(ref.node.start, ref.node.end, `${ref.node.name}: ${local}`);
  } else {
    ctx.s.overwrite(ref.node.start, ref.node.end, local);
  }
}

export function transformProgram(ctx: Ctx): void {
  const unresolved = [...ctx.analysis.unresolved].sort(
    (a, b) => a.node.start - b.node.start,
  );
  const effects: Ref[] = [];

  for (const ref of unresolved) {
    if (ctx.consumed.has(ref.node)) {
      continue;
    }
    const name = ref.node.name as string;
    if (ctx.disabled[name]) {
      continue;
    }
    if (name === '$effect' || name === '$renderEffect') {
      if (isCallee(ref)) {
        effects.push(ref);
      } else {
        ctx.error(ref.node, `${name} must be called directly`);
      }
      continue;
    }
    if (name === '$signal') {
      const site = findDeclarator(ref);
      if (!site) {
        ctx.error(ref.node, '$signal must initialize a variable declaration');
      }
      transformSignal(ctx, ref, site);
      continue;
    }
    if (name === '$memo') {
      const site = findDeclarator(ref);
      if (!site) {
        ctx.error(ref.node, '$memo must initialize a variable declaration');
      }
      transformMemo(ctx, ref, site);
      continue;
    }
    if (name === '$') {
      const site = findDeclarator(ref);
      if (site) {
        transformMemo(ctx, ref, site);
        continue;
      }
      const call = isCallee(ref);
      if (call && isStatementCall(ref, call)) {
        // Compiled like $effect; deferred so every reactive binding is known.
        effects.push(ref);
        continue;
      }
      ctx.error(
        ref.node,
        '$ must initialize a variable declaration or be used as a statement',
      );
    }
    if (name === '$derefSignal') {
      const site = findDeclarator(ref);
      if (!site) {
        ctx.error(
          ref.node,
          '$derefSignal must initialize a variable declaration',
        );
      }
      transformDerefSignal(ctx, ref, site);
      continue;
    }
    if (name === '$derefMemo') {
      const site = findDeclarator(ref);
      if (!site) {
        ctx.error(
          ref.node,
          '$derefMemo must initialize a variable declaration',
        );
      }
      transformDerefMemo(ctx, ref, site);
      continue;
    }
    if (name === '$destructure') {
      const site = findDeclarator(ref);
      if (!site) {
        ctx.error(
          ref.node,
          '$destructure must initialize a variable declaration',
        );
      }
      transformDestructure(ctx, ref, site);
      continue;
    }
    if (name in ACCESSOR_CTF) {
      const site = findDeclarator(ref);
      if (!site) {
        ctx.error(ref.node, `${name} must initialize a variable declaration`);
      }
      const [importName, source, maxArgs] = ACCESSOR_CTF[name];
      transformAccessorCtf(ctx, ref, site, importName, source, maxArgs);
      continue;
    }
    if (name === '$component') {
      const call = isCallee(ref);
      if (!call) {
        ctx.error(ref.node, '$component must be called directly');
      }
      transformComponent(ctx, ref, call);
      continue;
    }
    if (name in ARROW_CTF) {
      const call = isCallee(ref);
      if (!call) {
        ctx.error(ref.node, `${name} must be called directly`);
      }
      const [importName, source, maxArgs] = ARROW_CTF[name];
      transformArrowCtf(ctx, ref, call, importName, source, maxArgs);
      continue;
    }
    if (name in AUTO_ALIAS) {
      if (ref.exported) {
        continue;
      }
      const [importName, source] = AUTO_ALIAS[name];
      replaceAlias(ctx, ref, importName, source);
      continue;
    }
    if (name in COMPONENTS && !ref.exported) {
      const [importName, source] = COMPONENTS[name];
      replaceAlias(ctx, ref, importName, source);
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
        ref.node.name === '$renderEffect'
          ? 'createRenderEffect'
          : 'createEffect',
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
      ctx.error(
        ref.node,
        `${ref.node.name} must be used on a reactive variable`,
      );
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
  const byDepth = [...ctx.pendingHoists].sort(
    (a, b) => b.body.start - a.body.start,
  );
  for (const pending of byDepth) {
    pending.text = ctx.s.snip(pending.body.start, pending.body.end).toString();
    ctx.s.remove(pending.body.start, pending.body.end);
  }
  let trailer = '';
  for (const pending of ctx.pendingHoists) {
    const header = `function ${pending.name}([${pending.params.join(', ')}]) `;
    let body = pending.text;
    if (pending.concise) {
      body = pending.statement
        ? `{\n  ${pending.text};\n}`
        : `{\n  return ${pending.text};\n}`;
    }
    trailer += `\n${header}${body}\n`;
  }
  ctx.s.append(trailer);
}
