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
const solidFile = join(solidDir, solidPackage.exports['.'].browser.default);
expect(solidFile.endsWith('solid.js')).toBe(true);
const solid = (await import(pathToFileURL(solidFile).href)) as Record<string, unknown>;

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
  const result = parseSync(id, source, { lang, sourceType: 'module' });
  return result.errors[0]?.message;
}

function compiled(id: string, source: string): string {
  const result = compile(id, source);
  return result === null ? source : result.code;
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

function check(id: string, source: string): string {
  const out = compiled(id, source);
  expect(parseError(id, out)).toBeUndefined();
  return out;
}

const HEAD = "import { flush } from 'solid-js';\nconst observe = [];\n";

describe('class 0: bare signal or memo on the right side of a write', () => {
  it('a = b', () => {
    const source = `${HEAD}let a = $signal(1);\nlet b = $signal(2);\na = b;\nflush();\nobserve.push(a);\nexport { observe };\n`;
    const out = check('t.js', source);
    expect(out).toContain('seta_1(() => b())');
    expect(runModule(out)).toEqual([2]);
  });

  it('a += b', () => {
    const source = `${HEAD}let a = $signal(1);\nlet b = $signal(2);\na += b;\nflush();\nobserve.push(a);\nexport { observe };\n`;
    const out = check('t.js', source);
    expect(out).toContain('current_1 += b()');
    expect(runModule(out)).toEqual([3]);
  });

  it('a = m and a -= m', () => {
    const source = `${HEAD}let a = $signal(1);\nconst m = $memo(a + 4);\nlet c = $signal(0);\nc = m;\nflush();\nobserve.push(c);\nc -= m;\nflush();\nobserve.push(c);\nexport { observe };\n`;
    const out = check('t.js', source);
    expect(runModule(out)).toEqual([5, 0]);
  });
});

describe('class 1: nested write with a postfix right side', () => {
  it('s = t++', () => {
    const source = `${HEAD}let s = $signal(1);\nlet t = $signal(5);\ns = t++;\nflush();\nobserve.push(s, t);\nexport { observe };\n`;
    const out = check('t.js', source);
    expect(runModule(out)).toEqual([5, 6]);
  });

  it('s += t++', () => {
    const source = `${HEAD}let s = $signal(1);\nlet t = $signal(5);\ns += t++;\nflush();\nobserve.push(s, t);\nexport { observe };\n`;
    const out = check('t.js', source);
    expect(runModule(out)).toEqual([6, 6]);
  });

  it('a = b = c keeps both closers in order', () => {
    const source = `${HEAD}let a = $signal(1);\nlet b = $signal(2);\nlet c = $signal(3);\na = b = c;\nflush();\nobserve.push(a, b, c);\nexport { observe };\n`;
    const out = check('t.js', source);
    expect(runModule(out)).toEqual([3, 3, 3]);
  });
});

describe('class 2: JSX component in a destructure default', () => {
  it('$destructure default', () => {
    const source =
      'export function f(props) {\n  const { x = <Show when={1}>a</Show> } = $destructure(props);\n  return x;\n}\n';
    const out = check('t.tsx', source);
    expect(out).toContain('<_Show when={1}>a</_Show>');
    expect(out).toContain('import { Show as _Show }');
  });

  it('$component parameter default', () => {
    const source =
      'export const C = $component(({ x = <solid:show when={1}>a</solid:show> }) => x);\n';
    const out = check('t.tsx', source);
    expect(out).toContain('<_Show when={1}>a</_Show>');
  });

  it('a component name outside the default is still renamed', () => {
    const source =
      'export function f(props) {\n  const { x = <Show when={1}>a</Show> } = $destructure(props);\n  return <For each={[x]}>{(v) => v}</For>;\n}\n';
    const out = check('t.tsx', source);
    expect(out).toContain('<_For each');
    expect(out).toContain('</_For>');
  });
});

describe('class 3: concise $component body that reads a destructured name', () => {
  it('closes the block before the read call', () => {
    const source = 'export const C = $component(({ x }) => x);\n';
    const out = check('t.tsx', source);
    expect(out).toContain('return x();');
  });
});

describe('class 3b: object literals in $memo', () => {
  it('keeps the object', () => {
    const source =
      'let g0 = $signal(1);\nconst m = $memo({ g0, k: 1 });\nexport const r = () => m;\n';
    const out = check('t.tsx', source);
    expect(out).toContain('({ g0: g0(), k: 1 })');
  });
});

describe('class 4: other crashes and unbalanced output found by the property', () => {
  it('object literal as a $(expr) statement', () => {
    const source = 'let a = $signal(0);\n$({ a });\n$({ k: 1, b: a + 1 });\n';
    const out = check('t.js', source);
    expect(out).toContain('({ a });');
    expect(out).toContain('({ k: 1, b: a + 1 });');
  });

  it('object literal as a hoisted $(expr) statement', () => {
    const out = check('t.js', '$({ k: 1 });\n');
    expect(out).toContain('({ k: 1 });');
  });

  it('object literal before a ref function: the closing paren survives', () => {
    const source = 'let g = $signal(0);\nconst m = $memo({ k: 1 } + $refSignal(g));\n';
    const out = check('t.js', source);
    expect(out).toContain('() => ({ k: 1 } + [g, setg_1])');
  });

  it('object literal before a prefix update: the closing paren survives', () => {
    const source = 'let g = $signal(0);\nconst m = $memo({ k: 1 } + ++g);\n';
    check('t.js', source);
  });

  it('$untrack in a destructure default', () => {
    const source = 'export const C = $component(({ x = $untrack(1 + 1) }) => x);\n';
    const out = check('t.tsx', source);
    expect(out).toContain('_untrack(() => 1 + 1)');
  });

  it('a signal read and an object in a destructure default', () => {
    const source =
      'let s = $signal(1);\nexport function f(props) {\n  const { x = { k: s } } = $destructure(props);\n  return x;\n}\n';
    const out = check('t.tsx', source);
    expect(out).toContain('() => ({ k: s() })');
  });

  it('an effect inside a destructure default is a CompileError', () => {
    const source =
      'export function f(props) {\n  const { x = () => { $effect(() => {}); } } = $destructure(props);\n  return x;\n}\n';
    expect(() => compile('t.tsx', source)).toThrow(CompileError);
  });
});

describe('properties', () => {
  for (const jsx of [true, false]) {
    it(
      `compile throws only CompileError or returns parsable code (${jsx ? 'tsx' : 'jsx'})`,
      () => {
        fc.assert(
          fc.property(programArb({ jsx }), (program) => {
            let out: string;
            try {
              out = compiled(program.id, program.source);
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
    'straight-line programs behave like their plain version',
    () => {
      fc.assert(
        fc.property(straightLineArb(), (program) => {
          const out = compiled(program.id, program.source);
          expect(runModule(out)).toEqual(runModule(program.plain));
        }),
        { numRuns: RUNS },
      );
    },
    TIMEOUT,
  );
});
