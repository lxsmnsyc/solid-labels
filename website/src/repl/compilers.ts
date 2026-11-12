// The browser side of the compile pipeline, in the order the REPL shows it:
// solid-labels (oxc-parser as wasm), then the Solid JSX compiler (wasm), then a
// TypeScript strip so the preview can run the result.
import { transform } from '@solidjs/compiler-wasm32-wasi';
import { CompileError, compile } from 'solid-labels/compiler';
import { transform as stripTypes } from 'sucrase';

export interface Problem {
  stage: 'solid-labels' | 'solid';
  message: string;
  line?: number;
  column?: number;
}

export interface Compiled {
  /** Output of solid-labels. Equals the source when nothing needed compiling. */
  labels: string;
  /** Output of the Solid JSX compiler. */
  solid: string;
  /** The same output with TypeScript removed, ready to run. */
  runnable: string;
  /** Calls of `$name` that solid-labels left in the output, so they are not compile-time functions. */
  unknown: string[];
  ms: number;
}

export type Outcome = { ok: true; value: Compiled } | { ok: false; problem: Problem };

const STRING_OR_COMMENT =
  /\/\/[^\n]*|\/\*[\s\S]*?\*\/|`(?:\\[\s\S]|[^`\\])*`|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g;
const DOLLAR_CALL = /(?<![\w$.])(\$[\w$]*)\s*\(/g;

/** Finds `$name(...)` calls in compiled output. A compile-time function never survives compiling. */
function findUnknownCalls(output: string): string[] {
  const code = output.replace(STRING_OR_COMMENT, ' ');
  const names: string[] = [];
  for (const match of code.matchAll(DOLLAR_CALL)) {
    if (!names.includes(match[1])) {
      names.push(match[1]);
    }
  }
  return names;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Runs the whole pipeline. It never throws, so a typing session never ends in an exception. */
export function run(source: string, dev: boolean): Outcome {
  const started = performance.now();

  // Step 1: solid-labels. A `null` result means the source needs no compiling.
  let labels = source;
  try {
    const output = compile('repl.tsx', source, { dev });
    if (output !== null) {
      labels = output.code;
    }
  } catch (error) {
    if (error instanceof CompileError) {
      // The position is shown beside the message, so the "(line:column)" suffix goes.
      const message = error.message.replace(/ \(\d+:\d+\)$/, '');
      return {
        ok: false,
        problem: { stage: 'solid-labels', message, line: error.line, column: error.column },
      };
    }
    return { ok: false, problem: { stage: 'solid-labels', message: describe(error) } };
  }

  // Step 2: the Solid JSX compiler, then a TypeScript strip for the preview.
  try {
    const solid = transform(labels, { filename: 'repl.tsx', generate: 'dom', dev }).code;
    const runnable = stripTypes(solid, {
      transforms: ['typescript'],
      disableESTransforms: true,
    }).code;
    const unknown = findUnknownCalls(labels);
    return {
      ok: true,
      value: { labels, solid, runnable, unknown, ms: performance.now() - started },
    };
  } catch (error) {
    return { ok: false, problem: { stage: 'solid', message: describe(error) } };
  }
}
