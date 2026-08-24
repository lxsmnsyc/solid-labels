import { type Node, expandParens, isFunctionNode, unwrap } from './ast';
import type { Ctx } from './context';
import { destructurePattern } from './destructure';
import type { Ref } from './scope';
import { callArgs } from './variables';

/**
 * `$component((props) => ...)` unwraps to the component function itself,
 * turning an object-pattern parameter into a reactive destructure.
 */
export function transformComponent(ctx: Ctx, ref: Ref, call: Node): void {
  const args = callArgs(ctx, call, 1);
  if (args.length !== 1) {
    ctx.error(call, '$component requires a function');
  }
  const fn = unwrap(args[0]);
  if (!(fn && isFunctionNode(fn)) || fn.type === 'FunctionDeclaration') {
    ctx.error(args[0], '$component requires a function expression');
  }
  const target = fn as Node;
  ctx.consumed.add(ref.node);
  // Drop the `$component(...)` wrapper.
  ctx.s.overwrite(call.start, target.start, '');
  ctx.s.overwrite(target.end, call.end, '');

  const param = target.params[0];
  if (!param) {
    return;
  }
  const pattern = param.type === 'AssignmentPattern' ? param.left : param;
  if (pattern.type !== 'ObjectPattern') {
    return;
  }
  const props = ctx.unique('props');
  const decls: string[] = [];
  destructurePattern(ctx, pattern, props, decls);
  ctx.s.overwrite(param.start, param.end, props);
  if (decls.length === 0) {
    return;
  }
  const declText = `const ${decls.join(',\n    ')};`;
  const body = target.body;
  if (body.type === 'BlockStatement') {
    ctx.s.appendLeft(body.start + 1, `\n  ${declText}`);
  } else {
    const [bodyStart, bodyEnd] = expandParens(
      ctx.code,
      body.start,
      body.end,
      target.start,
    );
    ctx.s.prependLeft(bodyStart, `{\n  ${declText}\n  return `);
    ctx.s.appendLeft(bodyEnd, ';\n}');
  }
}
