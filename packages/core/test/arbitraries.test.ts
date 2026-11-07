import fc from 'fast-check';
import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';
import { CompileError, compile } from '../compiler';
import { COMPILE_ERROR_BOUND, programArb, straightLineArb } from './arbitraries';

const RUNS = Number(process.env.FC_RUNS ?? 100);
const SAMPLES = 1000;

function parses(id: string, source: string): string | undefined {
  let lang: 'tsx' | 'jsx' | 'js' = 'js';
  if (id.endsWith('tsx')) {
    lang = 'tsx';
  } else if (id.endsWith('jsx')) {
    lang = 'jsx';
  }
  const result = parseSync(id, source, { lang, sourceType: 'module' });
  return result.errors[0]?.message;
}

function sample<T>(arb: fc.Arbitrary<T>, seed: number): T[] {
  return fc.sample(arb, { numRuns: SAMPLES, seed });
}

/** Share of programs that `compile()` rejects with CompileError. */
function compileErrorShare(programs: { id: string; source: string }[]): number {
  let rejected = 0;
  for (const program of programs) {
    try {
      compile(program.id, program.source);
    } catch (error) {
      // Any other failure is a compiler bug, not a generator limit.
      if (!(error instanceof CompileError)) {
        throw error;
      }
      rejected++;
    }
  }
  return rejected / programs.length;
}

describe('programArb', () => {
  it('produces programs that parse under their language', () => {
    fc.assert(
      fc.property(programArb(), (program) => {
        expect(program.id).toBe('gen.tsx');
        expect(parses(program.id, program.source)).toBeUndefined();
      }),
      { numRuns: RUNS },
    );
    fc.assert(
      fc.property(programArb({ jsx: false }), (program) => {
        expect(program.id).toBe('gen.jsx');
        expect(parses(program.id, program.source)).toBeUndefined();
      }),
      { numRuns: RUNS },
    );
  });

  it('respects maxStatements', () => {
    for (const program of sample(programArb({ maxStatements: 1 }), 7)) {
      expect(parses(program.id, program.source)).toBeUndefined();
    }
  });

  it('keeps jsx: false free of JSX and TypeScript syntax', () => {
    for (const program of sample(programArb({ jsx: false }), 11)) {
      expect(program.source).not.toMatch(/<\/?[A-Za-z>]|\bas (number|any)|satisfies|\)!|\$\w+</);
      expect(parses('gen.js', program.source)).toBeUndefined();
    }
  });

  it('is deterministic for a seed', () => {
    const first = sample(programArb(), 3);
    const second = sample(programArb(), 3);
    for (let i = 0; i < first.length; i++) {
      expect(second[i].source === first[i].source).toBe(true);
    }
  });

  it('is rejected by compile() with CompileError at most COMPILE_ERROR_BOUND of the time', () => {
    for (const jsx of [true, false]) {
      const share = compileErrorShare(sample(programArb({ jsx }), 42));
      expect(share).toBeLessThan(COMPILE_ERROR_BOUND);
    }
  }, 60_000);

  it('covers every syntax form in the contract', () => {
    const programs = sample(programArb(), 2024);
    const forms: Record<string, RegExp> = {
      signal: /\$signal\(/,
      memo: /\$memo\(/,
      'derived declaration': /const d\w+ = \$\(/,
      'derived statement': /^\$\(/m,
      destructure: /\$destructure\(/,
      'destructure default and rest': /\{ \w+, \w+ = [^}]*\.\.\.\w+ \} = \$destructure/,
      component: /\$component\(/,
      'plain write': /(?:s|g)\d+ = [^=(]/,
      'parenthesized write': /(?:s|g)\d+ = \(/,
      'compound write': /(?:s|g)\d+ [-+*]= /,
      'prefix update': /(?:\+\+|--)(?:s|g)\d+/,
      'postfix update': /(?:s|g)\d+(?:\+\+|--)/,
      'update in expression': /\(\+\+(?:s|g)\d+\)|log\((?:s|g)\d+\+\+/,
      effect: /\$effect\(/,
      renderEffect: /\$renderEffect\(/,
      'nested effect': /\$(?:effect|renderEffect)\(\(\) => \{\n[^}]*\$effect\(/,
      'effect capturing a plain local': /let loc\d+ = /,
      'effect writing a plain outer variable': /\$effect\(\(\) => \{ out\d+ = /,
      'effect using arguments': /log\(arguments/,
      'effect using this': /\$effect\(function \(\) \{ log\(this/,
      untrack: /\$untrack\(/,
      $get: /\$get\(/,
      $set: /\$set\(/,
      $refSignal: /\$refSignal\(/,
      $refMemo: /\$refMemo\(/,
      $getter: /\$getter\(/,
      $setter: /\$setter\(/,
      $property: /\$property\(/,
      'shadowed reactive name': /\{ let (?:s|m|d|g)\d+ = 1;|function fh\d+\((?:s|m|d)\d+\)/,
      'shadowed compile-time function': /const \$(?:untrack|get|effect|memo) = \(x\) => x;/,
      'auto-imported component': /<Show /,
      'namespaced component': /<solid:(?:show|for|switch)/,
      'For component': /<For /,
    };
    const missing: string[] = [];
    for (const [name, pattern] of Object.entries(forms)) {
      let found = false;
      for (const program of programs) {
        if (pattern.test(program.source)) {
          found = true;
          break;
        }
      }
      if (!found) {
        missing.push(name);
      }
    }
    expect(missing).toEqual([]);
  }, 30_000);
});

describe('straightLineArb', () => {
  it('produces source and plain programs that parse', () => {
    fc.assert(
      fc.property(straightLineArb(), (program) => {
        expect(program.id).toBe('gen.js');
        expect(parses(program.id, program.source)).toBeUndefined();
        expect(parses(program.id, program.plain)).toBeUndefined();
      }),
      { numRuns: RUNS },
    );
  });

  it('follows the stated shape', () => {
    for (const program of sample(straightLineArb(), 5)) {
      const { source, plain } = program;
      expect(source.startsWith("import { flush } from 'solid-js';\nconst observe = [];\n")).toBe(
        true,
      );
      expect(source.endsWith('export { observe };\n')).toBe(true);
      expect(plain).not.toMatch(/\$signal|\$memo|flush/);
      expect(plain.endsWith('export { observe };\n')).toBe(true);
      const signals = source.match(/let s\d+ = \$signal\(/g) ?? [];
      expect(signals.length).toBeGreaterThanOrEqual(1);
      expect(signals.length).toBeLessThanOrEqual(3);
      expect((source.match(/\$memo\(/g) ?? []).length).toBeLessThanOrEqual(2);
    }
  });

  it('compiles without error', () => {
    fc.assert(
      fc.property(straightLineArb(), (program) => {
        expect(() => compile(program.id, program.source)).not.toThrow();
      }),
      { numRuns: RUNS },
    );
  });

  it('respects maxStatements', () => {
    for (const program of sample(straightLineArb({ maxStatements: 2 }), 9)) {
      const flushes = program.source.match(/flush\(\);/g) ?? [];
      expect(flushes.length).toBeLessThanOrEqual(2);
    }
  });
});
