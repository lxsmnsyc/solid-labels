import fc from 'fast-check';
import { parseSync } from 'oxc-parser';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CompileError, compile } from '../compiler';
import { programArb, straightLineArb } from './arbitraries';

// Node resolves solid-js to the server build, where signals do not update. Load
// the file of the `browser` export condition, which is the reactive build.
const require = createRequire(import.meta.url);
const solidDir = dirname(require.resolve('solid-js/package.json'));
const solidPackage = require('solid-js/package.json') as {
  exports: Record<string, { browser: { default: string } }>;
};
const solid = (await import(
  pathToFileURL(join(solidDir, solidPackage.exports['.'].browser.default)).href
)) as Record<string, unknown>;

const RUNS = Number(process.env.FC_RUNS ?? 100);
// Long runs (FC_RUNS) need more than the default 5 seconds.
const TIMEOUT = Math.max(5000, RUNS * 20);

function parseError(id: string, source: string): string | undefined {
  let lang: 'tsx' | 'jsx' | 'js' = 'js';
  if (id.endsWith('tsx')) {
    lang = 'tsx';
  } else if (id.endsWith('jsx')) {
    lang = 'jsx';
  }
  return parseSync(id, source, { lang, sourceType: 'module' }).errors[0]?.message;
}

/** Runs a module that imports only from solid-js and exports `observe`. */
function runModule(code: string): unknown[] {
  // Imports become destructuring of the solid-js namespace.
  const body = code
    .replace(
      /import\s*\{([^}]*)\}\s*from\s*['"]solid-js['"];?/g,
      (_match, names: string) => `const {${names.replaceAll(' as ', ': ')}} = solid;`,
    )
    .replace(/export\s*\{\s*observe\s*\};?/, 'return observe;');
  // oxlint-disable-next-line eslint/no-new-func, typescript/no-implied-eval
  return new Function('solid', body)(solid) as unknown[];
}

describe('compiler properties', () => {
  for (const jsx of [true, false]) {
    it(
      `output parses or compile throws CompileError (jsx: ${jsx})`,
      () => {
        fc.assert(
          fc.property(programArb({ jsx }), (program) => {
            let out: string;
            try {
              out = compile(program.id, program.source)?.code ?? program.source;
            } catch (error) {
              if (error instanceof CompileError) {
                return;
              }
              throw error;
            }
            const message = parseError(program.id, out);
            if (message !== undefined) {
              throw new Error(`${message}\n--- source\n${program.source}\n--- output\n${out}`);
            }
          }),
          { numRuns: RUNS },
        );
      },
      TIMEOUT,
    );
  }

  it(
    'compiled straight-line programs observe the same values as plain JS',
    () => {
      fc.assert(
        fc.property(straightLineArb(), (program) => {
          const out = compile(program.id, program.source)?.code ?? program.source;
          expect(runModule(out)).toEqual(runModule(program.plain));
        }),
        { numRuns: RUNS },
      );
    },
    TIMEOUT,
  );
});
