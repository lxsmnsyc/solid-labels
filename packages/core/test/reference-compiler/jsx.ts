import type { Node } from './ast';
import type { Ctx } from './context';
import { COMPONENTS, NAMESPACE_COMPONENTS } from './registry';
import type { JSXName } from './scope';

/** The local name a JSX tag should be renamed to, or null to keep it. */
function jsxLocalName(ctx: Ctx, entry: JSXName): string | null {
  const { opening, resolved } = entry;
  if (opening.type === 'JSXNamespacedName') {
    if (opening.namespace.name !== 'solid') {
      return null;
    }
    const def = NAMESPACE_COMPONENTS[opening.name.name];
    return def ? ctx.importIdent(def[0], def[1]) : null;
  }
  if (opening.type === 'JSXIdentifier' && !resolved) {
    const def = COMPONENTS[opening.name];
    return def ? ctx.importIdent(def[0], def[1]) : null;
  }
  return null;
}

/**
 * Name rewrites for the JSX tags inside [start, end], for callers that render
 * the span to text themselves. The tags are marked consumed so
 * `transformJSXComponents` does not edit them a second time.
 */
export function takeJSXNameEdits(
  ctx: Ctx,
  start: number,
  end: number,
): { node: Node; text: string }[] {
  const edits: { node: Node; text: string }[] = [];
  for (const entry of ctx.analysis.jsxNames) {
    const { opening, closing } = entry;
    if (opening.start < start || (closing ?? opening).end > end) {
      continue;
    }
    if (ctx.consumed.has(opening)) {
      continue;
    }
    const local = jsxLocalName(ctx, entry);
    if (local === null) {
      continue;
    }
    ctx.consumed.add(opening);
    edits.push({ node: opening, text: local });
    if (closing) {
      edits.push({ node: closing, text: local });
    }
  }
  return edits;
}

/** Rewrites `<solid:loading>` and unshadowed `<Loading>` JSX names. */
export default function transformJSXComponents(ctx: Ctx): void {
  for (const entry of ctx.analysis.jsxNames) {
    const { opening, closing } = entry;
    if (ctx.consumed.has(opening)) {
      continue;
    }
    const local = jsxLocalName(ctx, entry);
    if (local === null) {
      continue;
    }
    ctx.s.overwrite(opening.start, opening.end, local);
    if (closing) {
      ctx.s.overwrite(closing.start, closing.end, local);
    }
  }
}
