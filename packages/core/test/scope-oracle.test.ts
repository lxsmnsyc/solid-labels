import { analyze as eslintAnalyze } from 'eslint-scope';
import fc from 'fast-check';
import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';
import { analyze } from '../compiler/scope';
import { programArb } from './arbitraries';

const RUNS = Number(process.env.FC_RUNS ?? 100);

type Pairs = Map<number, string>;

/** Reference identifier start -> declaring identifier start (or null when unresolved) and access mode. */
function ours(program: any): Pairs {
  const result: Pairs = new Map();
  const analysis = analyze(program);
  for (const binding of analysis.bindings) {
    for (const ref of binding.refs) {
      result.set(ref.node.start, `${binding.node.start} ${ref.mode}`);
    }
  }
  for (const ref of analysis.unresolved) {
    result.set(ref.node.start, `null ${ref.mode}`);
  }
  return result;
}

function theirs(program: any): Pairs {
  const result: Pairs = new Map();
  const manager = eslintAnalyze(program, { ecmaVersion: 2024, sourceType: 'module' });
  for (const scope of manager.scopes) {
    for (const ref of scope.references) {
      // Exclusion `declaration-init`: eslint-scope records `let x = 1` and
      // `for (const x of y)` as a write reference to the declared name
      // (`ref.init`); `analyze` treats declaring identifiers as bindings only.
      if (ref.init) {
        continue;
      }
      const declared = ref.resolved ? ref.resolved.identifiers[0] : undefined;
      let mode = 'write';
      if (ref.isRead()) {
        mode = ref.isWrite() ? 'readwrite' : 'read';
      }
      result.set(ref.identifier.start, `${declared ? declared.start : null} ${mode}`);
    }
  }
  return result;
}

/**
 * Exclusions (what the oracle does not compare, and why):
 *
 * - `declaration-init`: eslint-scope records `let x = 1` as a write
 *   reference (`ref.init`); `analyze` treats declaring identifiers as
 *   bindings only. Skipped in `theirs`.
 * - `jsx-names`: `analyze` keeps JSX element names in `jsxNames`, eslint-scope
 *   has no JSX references. `programArb({ jsx: false })` emits none.
 * - `typescript`: type-space names. `jsx: false` emits no TS syntax, and the
 *   source is parsed as `jsx`.
 * - `classes` and `default-param-shadow`: the generator emits no class syntax
 *   and never puts a body `var` under a parameter default's name. The hand
 *   corpus below covers both.
 * - `this`, `super`, `new.target`, `import.meta`: not identifiers, neither
 *   side records them as references.
 */
function compare(source: string): { missing: string[]; extra: string[]; different: string[] } {
  const parsed = parseSync('gen.jsx', source, { lang: 'jsx', sourceType: 'module', range: true });
  if (parsed.errors.length > 0) {
    throw new Error(`generated source does not parse: ${parsed.errors[0]?.message}`);
  }
  const a = ours(parsed.program);
  const b = theirs(parsed.program);
  const missing: string[] = [];
  const extra: string[] = [];
  const different: string[] = [];
  for (const [at, declared] of b) {
    if (!a.has(at)) {
      missing.push(`${at}:${source.slice(at, at + 12)}`);
    } else if (a.get(at) !== declared) {
      different.push(`${at}:${source.slice(at, at + 12)} ours=${a.get(at)} eslint=${declared}`);
    }
  }
  for (const at of a.keys()) {
    if (!b.has(at)) {
      extra.push(`${at}:${source.slice(at, at + 12)}`);
    }
  }
  return { missing, extra, different };
}

describe('scope oracle: analyze vs eslint-scope', () => {
  it('agrees on resolution of every reference', () => {
    fc.assert(
      fc.property(programArb({ jsx: false }), ({ source }) => {
        const result = compare(source);
        expect(result).toEqual({ missing: [], extra: [], different: [] });
      }),
      { numRuns: RUNS },
    );
  }, 120_000);
});

/** Hand-written programs for constructs the generator does not emit. */
const AGREEING = [
  'var a=1; { var a=2; } a;',
  'const f = function g(){ return g; };',
  'try{}catch(e){ e; } e;',
  'try{}catch({m}){ m; }',
  'switch(a){ case 1: let b=1; b; }',
  'l: for(;;){ break l; }',
  'function f(){ arguments; this; }',
  'for (let i=0;i<1;i++){ i; } i;',
  'for (const k in o){ k }',
  'const {a, b:{c}, ...r} = o; a;c;r;',
  'f(); function f(){}',
  'x; let x;',
  'import {p as q} from "m"; q;',
  'export default function h(){}; export {h as z};',
  'const o = {a, b}; o.a;',
  'a = 1; a++; typeof a; delete a.b;',
  // Write targets that are not assignments or declarations.
  'let x; for (x of []) {} for (x in {}) {}',
  'let x; for ([x] of []) {} for ({ x } of []) {}',
  'function f(a){ var a; { function a(){} } }',
  'x => { var x; }',
  'const t = a ? b : c; a?.b; a ??= 1;',
  'label: { let z; z; }',
  'for (var v of []) { v }; v;',
  '{ function q(){} } q;',
  'function f(a, b = a, ...c){ return [a,b,c]; }',
  // A parameter default must not see a body `var`.
  'function f(x=y){ var y=1; return x; } var y;',
  // The inner name of a class expression is a binding inside the class.
  'const o = class C { m(){ return C; } };',
  'const o = class C extends C { static s = C; };',
  // A function expression's name is outside its parameters.
  '(function f(f) { return f; })',
  '(function f(a = f){ var f = 1; return f; })',
];

describe('scope oracle: hand-written programs', () => {
  for (const source of AGREEING) {
    it(`agrees on ${source}`, () => {
      expect(compare(source)).toEqual({ missing: [], extra: [], different: [] });
    });
  }

  it('compares resolved and unresolved references', () => {
    const source = 'let a = 1;\nfunction f(b) { let a = 2; return a + b + g; }\nexport { a };\n';
    const parsed = parseSync('gen.jsx', source, { lang: 'jsx', sourceType: 'module', range: true });
    const values = [...theirs(parsed.program).values()];
    expect(values.some((v) => v.startsWith('null '))).toBe(true);
    expect(values.filter((v) => !v.startsWith('null ')).length).toBeGreaterThan(2);
    expect(compare(source)).toEqual({ missing: [], extra: [], different: [] });
  });
});
