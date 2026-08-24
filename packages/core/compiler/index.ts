import MagicString from 'magic-string';
import { parseSync } from 'oxc-parser';
import { Ctx } from './context';
import { CompileError } from './errors';
import { analyze } from './scope';
import { transformProgram } from './transform';
import type { CompileOutput, Options } from './types';

export type { CompileOutput, Options };
export { CompileError };

const TSX_FILE = /\.tsx$/i;
const TS_FILE = /\.[mc]?ts$/i;

function languageOf(filename: string): 'js' | 'jsx' | 'ts' | 'tsx' {
  const clean = filename.split('?')[0];
  if (TSX_FILE.test(clean)) {
    return 'tsx';
  }
  if (TS_FILE.test(clean)) {
    return 'ts';
  }
  return 'jsx';
}

// biome-ignore lint/suspicious/useAwait: async keeps the public API stable
export async function compile(
  id: string,
  code: string,
  options: Options = {},
): Promise<CompileOutput> {
  const result = parseSync(id.split('?')[0], code, {
    lang: languageOf(id),
    sourceType: 'module',
    preserveParens: false,
  });
  if (result.errors.length > 0) {
    const first = result.errors[0];
    const start = first.labels?.[0]?.start ?? 0;
    throw new CompileError(first.message, code, start);
  }
  const s = new MagicString(code);
  const analysis = analyze(result.program as never);
  const ctx = new Ctx(
    s,
    code,
    analysis,
    options.dev === true,
    options.disabled?.ctf ?? {},
  );
  transformProgram(ctx);
  return {
    code: s.toString(),
    map: s.generateMap({ source: id, hires: true }),
  };
}
