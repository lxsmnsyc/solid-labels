import fc from 'fast-check';
import MagicString from 'magic-string';
import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';
import { compile } from '../compiler';
import type { Options } from '../compiler';
import { Ctx } from '../compiler/context';
import type { Analysis } from '../compiler/scope';

const RUNS = Number(process.env.FC_RUNS ?? 300);

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
      it(`compiles to parseable code: ${source.slice(0, 40)}`, () => {
        for (const id of ['fixed.tsx', 'fixed.jsx']) {
          let code: string;
          try {
            code = compile(id, source, options)?.code ?? source;
          } catch (error) {
            // The first case is a compile error on purpose.
            expect((error as Error).name).toBe('CompileError');
            continue;
          }
          const lang = id.endsWith('tsx') ? 'tsx' : 'jsx';
          expect(parseSync(id, code, { lang, sourceType: 'module' }).errors).toEqual([]);
        }
      });
    }
  }

  it('reports the first declared derived variable', () => {
    expect(() => compile('fixed.tsx', FIXED[0], {})).toThrow(/"m1"/);
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
