import fc from 'fast-check';
import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';
import { CompileError, compile } from '../compiler';
import { COMPILE_ERROR_BOUND, programArb, straightLineArb } from './arbitraries';
import type { GeneratedProgram } from './arbitraries';

const RUNS = Number(process.env.FC_RUNS ?? 100);
// Coverage of every form needs a large sample; the other tests need only a few programs.
const COVERAGE_SAMPLES = 1000;
const SHARE_SAMPLES = 300;
const FEW_SAMPLES = 100;

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

function sample<T>(arb: fc.Arbitrary<T>, seed: number, count = FEW_SAMPLES): T[] {
  return fc.sample(arb, { numRuns: count, seed });
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

type Form = [name: string, matches: RegExp | ((source: string) => boolean)];

/** True when an `$effect(` or `$renderEffect(` call contains another effect call. */
function hasNestedEffect(source: string): boolean {
  const starts = /\$(?:effect|renderEffect)\(/g;
  for (let match = starts.exec(source); match; match = starts.exec(source)) {
    // Find the end of this call by matching parentheses.
    let depth = 0;
    let end = match.index + match[0].length - 1;
    for (; end < source.length; end++) {
      if (source[end] === '(') {
        depth++;
      } else if (source[end] === ')') {
        depth--;
        if (depth === 0) {
          break;
        }
      }
    }
    if (/\$(?:effect|renderEffect)\(/.test(source.slice(match.index + match[0].length, end))) {
      return true;
    }
  }
  return false;
}

// Names: signals are sN, gN or cs; memos are mN; derived variables are dN.
const BASE_FORMS: Form[] = [
  ['signal', /\$signal\(/],
  ['memo', /\$memo\(/],
  ['derived declaration', /^const d\w+ = \$\(/m],
  ['derived statement', /^\$\(/m],
  ['destructure', /\$destructure\(/],
  ['destructure default and rest', /\{ \w+, \w+ = [^}]*\.\.\.\w+ \} = \$destructure/],
  ['component', /\$component\(/],
  ['plain write', /^(?:[sg]\d+|cs) = [^=(]/m],
  ['parenthesized write', /^(?:[sg]\d+|cs) = \(/m],
  ['compound write', /^(?:[sg]\d+|cs) [-+*]= /m],
  ['prefix update', /(?:\+\+|--)(?:[sg]\d+|cs)\b/],
  ['postfix update', /\b(?:[sg]\d+|cs)(?:\+\+|--)/],
  ['update in expression', /\(\+\+(?:[sg]\d+|cs)\)|log\((?:[sg]\d+|cs)\+\+/],
  ['effect', /\$effect\(/],
  ['renderEffect', /\$renderEffect\(/],
  ['nested effect', hasNestedEffect],
  ['effect capturing a plain local', /let loc(\d+) = [^\n]*\$effect\(\(\) => \{ log\(loc\1\b/],
  ['effect writing a plain outer variable', /\$effect\(\(\) => \{ out\d+ = /],
  ['effect using arguments', /log\(arguments/],
  ['effect using this', /\$effect\(function \(\) \{ log\(this/],
  ['untrack', /\$untrack\(/],
  ['$get', /\$get\((?:[smgd]\d+|cs)\)/],
  ['$set', /\$set\((?:[sg]\d+|cs)\)\(/],
  ['$refSignal', /\$refSignal\((?:[sg]\d+|cs)\)/],
  ['$refMemo', /\$refMemo\(m\d+\)/],
  ['$getter', /: \$getter\((?:[smgd]\d+|cs)\)/],
  ['$setter', /: \$setter\((?:[sg]\d+|cs)\)/],
  ['$property', /: \$property\((?:[smgd]\d+|cs)\)/],
  ['shadowed reactive name', /\{ let (?:s|m|d|g)\d+ = 1;|function fh\d+\((?:s|m|d)\d+\)/],
  ['shadowed compile-time function', /const \$(?:untrack|get|effect|memo) = \(x\) => x;/],
];

const JSX_FORMS: Form[] = [
  ['auto-imported component', /<Show /],
  ['namespaced component', /<solid:(?:show|for|switch)/],
  ['For component', /<For /],
];

/** Names of the forms that no sample contains. Each found sample must also parse. */
function findMissingForms(programs: GeneratedProgram[], forms: Form[]): string[] {
  const missing: string[] = [];
  for (const [name, matches] of forms) {
    let found: GeneratedProgram | undefined;
    for (const program of programs) {
      const hit =
        typeof matches === 'function' ? matches(program.source) : matches.test(program.source);
      if (hit) {
        found = program;
        break;
      }
    }
    if (found) {
      expect(parses(found.id, found.source), name).toBeUndefined();
    } else {
      missing.push(name);
    }
  }
  return missing;
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
      for (const seed of [42, 7]) {
        const share = compileErrorShare(sample(programArb({ jsx }), seed, SHARE_SAMPLES));
        expect(share).toBeLessThan(COMPILE_ERROR_BOUND);
      }
    }
  }, 60_000);

  it('covers every syntax form in the contract', () => {
    const missing = findMissingForms(sample(programArb(), 2024, COVERAGE_SAMPLES), [
      ...BASE_FORMS,
      ...JSX_FORMS,
    ]);
    expect(missing).toEqual([]);
  }, 30_000);

  it('covers the forms that need no JSX when jsx is false', () => {
    const missing = findMissingForms(
      sample(programArb({ jsx: false }), 2025, COVERAGE_SAMPLES),
      BASE_FORMS,
    );
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
