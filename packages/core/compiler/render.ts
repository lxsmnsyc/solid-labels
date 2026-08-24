import type { Ctx } from './context';

/**
 * Renders a source span into a string, applying pending read rewrites for
 * reactive bindings whose references fall inside the span. Those references
 * are marked consumed so the main rewrite phase skips them — the caller is
 * about to overwrite the span with the rendered text.
 */
export function renderSlice(ctx: Ctx, start: number, end: number): string {
  interface Edit {
    start: number;
    end: number;
    text: string;
  }
  const edits: Edit[] = [];
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
        ctx.error(
          ref.node,
          `Cannot assign to reactive variable "${binding.name}" here`,
        );
      }
      ctx.consumed.add(ref.node);
      if (ref.shorthand) {
        edits.push({
          start: ref.node.start,
          end: ref.node.end,
          text: `${binding.name}: ${info.get}()`,
        });
      } else {
        edits.push({
          start: ref.node.end,
          end: ref.node.end,
          text: '()',
        });
      }
    }
  }
  edits.sort((a, b) => a.start - b.start);
  let result = '';
  let cursor = start;
  for (const edit of edits) {
    result += ctx.code.slice(cursor, edit.start);
    result += edit.text;
    cursor = edit.end;
  }
  result += ctx.code.slice(cursor, end);
  return result;
}
