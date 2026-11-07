import fc from 'fast-check';
import MagicString from 'magic-string';
import { describe, expect, it } from 'vitest';
import { compile } from '../compiler';
import type { Options } from '../compiler';
import { Ctx } from '../compiler/context';
import type { Analysis } from '../compiler/scope';
import { compile as compileReference } from './reference-compiler';
import { programArb } from './arbitraries';

const RUNS = Number(process.env.FC_RUNS ?? 300);
// Long runs (FC_RUNS) need more than the default 5 seconds.
const TIMEOUT = Math.max(5000, RUNS * 20);

// Maps are not compared: hoisted bodies keep their own mappings now.
type Outcome = { code: string } | null | { error: string };

function run(
  compiler: (id: string, code: string, options?: Options) => unknown,
  id: string,
  source: string,
  options: Options,
): Outcome {
  try {
    const result = compiler(id, source, options) as { code: string } | null;
    if (result === null) {
      return null;
    }
    return { code: result.code };
  } catch (error) {
    if (error instanceof Error && error.name === 'CompileError') {
      return { error: error.message };
    }
    throw error;
  }
}

describe('old vs new compiler', () => {
  for (const options of [{}, { dev: true }] as Options[]) {
    it(
      `gives the same output as the reference compiler (${JSON.stringify(options)})`,
      () => {
        fc.assert(
          fc.property(programArb(), ({ source, id }) => {
            const expected = run(compileReference, id, source, options);
            const actual = run(compile, id, source, options);
            expect(actual).toEqual(expected);
          }),
          { numRuns: RUNS },
        );
      },
      TIMEOUT,
    );
  }
});

// Fixed cases for orderings and bounds the generator rarely hits.
const FIXED: string[] = [
  // Two derived writes: the error names the first declared variable.
  'let c = $signal(0); const m1 = $memo(c); const m2 = $memo(c + 1);\n$effect(() => { m2 = 1; m1 = 2; });',
  // A read right after an effect body, and after a nested one.
  'let s = $signal(0); let t = $signal(1);\n$effect(() => { log(s); }); log(s);\n$effect(() => { $effect(() => { log(t); }); log(s); }); log(t);',
  'let s = $signal(0);\nfunction f() { $effect(() => log(s)); return s; }\nconst g = () => { $(log(s)); };\nlog(s);',
  // $untrack: reads next to, inside and after the call span.
  'let s = $signal(0); let t = $signal(1);\n$effect(() => { log($untrack(s), t); log(s); });\n$effect(() => { log(s, $untrack(t)); });\n$effect(() => { log($untrack(s)); log($untrack(t)); log(s); });',
  'let s = $signal(0);\n$effect(() => { log($untrack(() => $untrack(s))); }); $effect(() => s + $untrack(s));',
];

describe('fixed cases', () => {
  for (const source of FIXED) {
    for (const options of [{}, { dev: true }] as Options[]) {
      it(`matches the reference compiler: ${source.slice(0, 40)}`, () => {
        for (const id of ['fixed.tsx', 'fixed.jsx']) {
          expect(run(compile, id, source, options)).toEqual(
            run(compileReference, id, source, options),
          );
        }
      });
    }
  }

  it('reports the first declared derived variable', () => {
    const outcome = run(compile, 'fixed.tsx', FIXED[0], {});
    expect(outcome).toEqual({ error: expect.stringContaining('"m1"') });
  });
});

function makeCtx(taken: string[]): Ctx {
  const analysis = {
    names: new Set(taken),
    unresolved: [],
    bindings: [],
  } as unknown as Analysis;
  return new Ctx(new MagicString(''), '', analysis, false, {});
}

describe('Ctx.unique', () => {
  it('never returns a taken name or the same name twice', () => {
    const base = fc.constantFrom('a', 'b', 'effect');
    const suffixed = base.chain((name) =>
      fc.integer({ min: 1, max: 6 }).map((index) => `${name}_${index}`),
    );
    fc.assert(
      fc.property(
        fc.array(fc.oneof(base, suffixed), { maxLength: 12 }),
        fc.array(base, { maxLength: 30 }),
        (taken, requests) => {
          const ctx = makeCtx(taken);
          const takenSet = new Set(taken);
          const seen = new Set<string>();
          for (const request of requests) {
            const name = ctx.unique(request);
            expect(name.startsWith(`${request}_`)).toBe(true);
            expect(takenSet.has(name)).toBe(false);
            expect(seen.has(name)).toBe(false);
            seen.add(name);
          }
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('gives the same names as restarting at 1', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('a', 'b_1', 'b_3'), { maxLength: 6 }),
        fc.array(fc.constantFrom('a', 'b'), { maxLength: 20 }),
        (taken, requests) => {
          const ctx = makeCtx(taken);
          const names = new Set(taken);
          for (const request of requests) {
            let index = 1;
            while (names.has(`${request}_${index}`)) {
              index++;
            }
            const expected = `${request}_${index}`;
            names.add(expected);
            expect(ctx.unique(request)).toBe(expected);
          }
        },
      ),
      { numRuns: RUNS },
    );
  });
});
