import MagicString from 'magic-string';
import * as oxc from 'oxc-parser';
import type { ParserOptions } from 'oxc-parser';
import { Ctx } from './context';
import { CompileError } from './errors';
import { analyze } from './scope';
import { COMPONENTS } from './registry';
import transformProgram from './transform';
import type { CompileOutput, Options } from './types';

// oxc-parser 0.157 does not type this option. Raw transfer is oxc's faster
// parse path (https://github.com/oxc-project/oxc/issues/28275). After an oxc
// minor bump, re-run `benchmarks/compile` and check the oxc changelog for raw
// transfer: a rename makes parsing fall back to the slow path without an error.
// The value must be `rawTransferSupported()`: `true` throws on platforms
// without support.
// The browser build of oxc-parser (wasm) has no `rawTransferSupported` export,
// so the function is read from the namespace and a missing one means "off".
const { parseSync } = oxc;
const PARSE_OPTIONS: ParserOptions & { experimentalRawTransfer?: boolean } = {
  experimentalRawTransfer: 'rawTransferSupported' in oxc && oxc.rawTransferSupported(),
};

export type { CompileOutput, Options };
export { CompileError };

/** Infers the parser language from the file extension (query suffix ignored). */
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

/**
 * Cheap check run before parsing. A module needs compiling only if it holds
 * `$` not followed by `{` (compile-time functions; `${` is a template
 * interpolation), `solid:` (namespace components) or the name
 * of an auto-imported component. Built from the registry so it cannot drift.
 * A false positive only costs the normal path.
 */
const NEEDS_COMPILE = new RegExp(
  `\\$(?!\\{)|solid:|\\b(?:${Object.keys(COMPONENTS).join('|')})\\b`,
);

/**
 * Compiles a module: parse with oxc, analyze scopes (`analyze`), apply all
 * transforms (`transformProgram`) as span edits over a MagicString, and
 * return the code plus a hires source map. Returns `null` when the module has
 * nothing to compile or the transforms made no edits.
 */
export function compile(id: string, code: string, options: Options = {}): CompileOutput | null {
  // Skip parsing for modules without any marker.
  if (!NEEDS_COMPILE.test(code)) {
    return null;
  }
  // Bundlers can add a query to the id. The parser and the source map need
  // the file path without it.
  const filename = id.split('?')[0];
  const result = parseSync(filename, code, {
    lang: languageOf(id),
    sourceType: 'module',
    preserveParens: false,
    ...PARSE_OPTIONS,
  });
  if (result.errors.length > 0) {
    const first = result.errors[0];
    const start = first.labels?.[0]?.start ?? 0;
    throw new CompileError(first.message, code, start);
  }
  const s = new MagicString(code);
  const analysis = analyze(result.program);
  const ctx = new Ctx(s, code, analysis, options.dev === true, options.disabled?.ctf ?? {});
  transformProgram(ctx);
  // Skip the source map when nothing changed.
  if (!s.hasChanged()) {
    return null;
  }
  return {
    code: s.toString(),
    // Include the source text: tools that read the map, such as browser
    // devtools, then show the original code without fetching the file.
    map: s.generateMap({ source: filename, includeContent: true, hires: true }),
  };
}
