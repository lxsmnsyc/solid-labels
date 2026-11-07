import type { Ctx } from './context';
import { takeJSXNameEdits } from './jsx';

/**
 * Renders a source span into a string with every pending rewrite inside it
 * applied: CTF calls, JSX component names and reads of reactive bindings.
 * Those references are marked consumed so the main rewrite phase skips them.
 * The caller is about to overwrite a range that covers the span, so the edits
 * made here only feed the returned text.
 */
export default function renderSlice(ctx: Ctx, start: number, end: number): string {
  const { s } = ctx;
  ctx.processWithin(start, end);
  for (const edit of takeJSXNameEdits(ctx, start, end)) {
    s.overwrite(edit.node.start, edit.node.end, edit.text);
  }
  for (const [binding, info] of ctx.reactive) {
    if (info.kind === 'raw') {
      continue;
    }
    for (const ref of binding.refs) {
      if (ref.node.start < start || ref.node.end > end) {
        continue;
      }
      if (ctx.consumed.has(ref.node)) {
        continue;
      }
      if (ref.mode !== 'read') {
        ctx.error(ref.node, `Cannot assign to reactive variable "${binding.name}" here`);
      }
      ctx.consumed.add(ref.node);
      if (ref.shorthand) {
        s.overwrite(ref.node.start, ref.node.end, `${binding.name}: ${info.get}()`);
      } else {
        s.appendLeft(ref.node.end, '()');
      }
    }
  }
  return s.slice(start, end);
}
