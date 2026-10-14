import type { Ctx } from './context';
import { COMPONENTS, NAMESPACE_COMPONENTS } from './registry';

/** Rewrites `<solid:loading>` and unshadowed `<Loading>` JSX names. */
export default function transformJSXComponents(ctx: Ctx): void {
  for (const entry of ctx.analysis.jsxNames) {
    const { opening, closing, resolved } = entry;
    if (opening.type === 'JSXNamespacedName') {
      if (opening.namespace.name !== 'solid') {
        continue;
      }
      const def = NAMESPACE_COMPONENTS[opening.name.name];
      if (!def) {
        continue;
      }
      const local = ctx.importIdent(def[0], def[1]);
      ctx.s.overwrite(opening.start, opening.end, local);
      if (closing) {
        ctx.s.overwrite(closing.start, closing.end, local);
      }
      continue;
    }
    if (opening.type === 'JSXIdentifier' && !resolved) {
      const def = COMPONENTS[opening.name];
      if (!def) {
        continue;
      }
      const local = ctx.importIdent(def[0], def[1]);
      ctx.s.overwrite(opening.start, opening.end, local);
      if (closing) {
        ctx.s.overwrite(closing.start, closing.end, local);
      }
    }
  }
}
