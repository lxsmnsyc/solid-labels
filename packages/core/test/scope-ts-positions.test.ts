import { analyze as tsAnalyze } from '@typescript-eslint/scope-manager';
import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';
import { analyze } from '../compiler/scope';
import transform from './util';

type Pairs = Map<number, number | null>;

/** Reference identifier start -> declaring identifier start, or null when unresolved. */
function ours(code: string): Pairs {
  const result: Pairs = new Map();
  const analysis = analyze(parseSync('x.tsx', code, { sourceType: 'module' }).program);
  for (const binding of analysis.bindings) {
    for (const ref of binding.refs) {
      result.set(ref.node.start, binding.node.start);
    }
  }
  for (const ref of analysis.unresolved) {
    result.set(ref.node.start, null);
  }
  return result;
}

/** Same pairs from `@typescript-eslint/scope-manager`, value references only. */
function theirs(code: string): Pairs {
  const result: Pairs = new Map();
  // oxc emits a TypeScript-ESTree compatible tree, which the scope manager accepts.
  const ast = parseSync('x.tsx', code, { sourceType: 'module', range: true }).program;
  const manager = tsAnalyze(ast as any, { sourceType: 'module', lib: [] });
  for (const scope of manager.scopes) {
    for (const ref of scope.references) {
      // Declaring identifiers (`let x = 1`) are bindings only in `analyze`.
      if (ref.init || !ref.isValueReference) {
        continue;
      }
      const declared = ref.resolved ? ref.resolved.identifiers[0] : undefined;
      result.set(ref.identifier.range[0], declared ? declared.range[0] : null);
    }
  }
  return result;
}

/** Start offset of the nth whole-word occurrence of `text` in `code`. */
function at(code: string, text: string, nth = 0): number {
  const matches = [...code.matchAll(new RegExp(`\\b${text}\\b`, 'g'))];
  return matches[nth].index;
}

interface Case {
  name: string;
  code: string;
  /** Name and occurrence index of the reference. */
  ref: [string, number];
  /** Name and occurrence index of the declaration, or null when unresolved. */
  decl: [string, number] | null;
}

const CASES: Case[] = [
  { name: 'class decorator', code: 'const d = 1; @d class C {}', ref: ['d', 1], decl: ['d', 0] },
  {
    name: 'method decorator',
    code: 'const d = 1; class C { @d m() {} }',
    ref: ['d', 1],
    decl: ['d', 0],
  },
  {
    name: 'property decorator',
    code: 'const d = 1; class C { @d p = 1; }',
    ref: ['d', 1],
    decl: ['d', 0],
  },
  {
    name: 'parameter decorator',
    code: 'const d = 1; class C { m(@d x) {} }',
    ref: ['d', 1],
    decl: ['d', 0],
  },
  {
    name: 'decorator before a parameter of the same name',
    code: 'const d = 1; class C { m(@d d) { d } }',
    ref: ['d', 1],
    decl: ['d', 0],
  },
  {
    name: 'constructor decorator before a parameter property of the same name',
    code: 'const s = 1; class C { constructor(@dec(s) private s) { s } }',
    ref: ['s', 1],
    decl: ['s', 0],
  },
  {
    name: 'decorator of a class expression with the same name',
    code: 'const d = 1; const X = @d class d {}',
    ref: ['d', 1],
    decl: ['d', 0],
  },
  {
    name: 'namespace body write',
    code: 'let a = 1; namespace N { a = 2 }',
    ref: ['a', 1],
    decl: ['a', 0],
  },
  {
    name: 'namespace body shadow',
    code: 'let a = 1; namespace N { export const a = 2; a }',
    ref: ['a', 2],
    decl: ['a', 1],
  },
  {
    name: 'nested namespace body',
    code: 'let a = 1; namespace N.M { a }',
    ref: ['a', 1],
    decl: ['a', 0],
  },
  { name: 'namespace name', code: 'namespace N {} N', ref: ['N', 1], decl: ['N', 0] },
  {
    name: 'enum member initializer',
    code: 'enum E { A = 2, B = A }',
    ref: ['A', 1],
    decl: ['A', 0],
  },
  {
    name: 'enum initializer reads outer binding',
    code: 'const x = 1; enum E { A = x }',
    ref: ['x', 1],
    decl: ['x', 0],
  },
  {
    name: 'enum member shadows outer binding',
    code: 'const A = 1; enum E { A = 2, B = A }',
    ref: ['A', 2],
    decl: ['A', 1],
  },
  {
    name: 'parameter property',
    code: 'class C { constructor(private p) { p } }',
    ref: ['p', 1],
    decl: ['p', 0],
  },
  {
    name: 'parameter property default',
    code: 'const d = 1; class C { constructor(public p = d) {} }',
    ref: ['d', 1],
    decl: ['d', 0],
  },
  {
    name: 'import equals require',
    code: 'import fs = require("fs"); fs.x',
    // Occurrence 1 is the module string.
    ref: ['fs', 2],
    decl: ['fs', 0],
  },
  {
    name: 'import equals entity name',
    code: 'namespace A { export namespace B {} } import x = A.B;',
    ref: ['A', 1],
    decl: ['A', 0],
  },
  { name: 'import equals of unknown name', code: 'import x = A.B;', ref: ['A', 0], decl: null },
];

describe('TypeScript and decorator positions in scope analysis', () => {
  for (const { name, code, ref, decl } of CASES) {
    it(`resolves ${name}`, () => {
      const pairs = ours(code);
      const declAt = decl ? at(code, decl[0], decl[1]) : null;
      expect(pairs.get(at(code, ref[0], ref[1]))).toBe(declAt);
    });
  }
});

describe('oracle: @typescript-eslint/scope-manager', () => {
  for (const { name, code } of CASES) {
    it(`agrees on ${name}`, () => {
      expect(ours(code)).toEqual(theirs(code));
    });
  }
});

describe('$signal in these positions compiles to a rewritten read or write', () => {
  const prefix = 'let a = $signal(1);';

  it('reads in a class decorator', () => {
    expect(transform(`${prefix} const d = (v: any) => v; @d(a) class C {}`)).toContain('@d(a())');
  });
  it('reads in member and parameter decorators', () => {
    const out = transform(`${prefix} class C { @d(a) p = 1; @d(a) m(@d(a) x) {} }`);
    expect(out).toContain('@d(a()) p = 1');
    expect(out).toContain('@d(a()) m(@d(a()) x)');
  });
  it('writes and reads in a namespace body', () => {
    const out = transform(`${prefix} namespace N { a = 2; export const b = a; }`);
    expect(out).toContain('seta_1(() => 2)');
    expect(out).toContain('export const b = a()');
  });
  it('reads in a parameter decorator despite a parameter of the same name', () => {
    const out = transform('let s = $signal(1); class C { constructor(@dec(s) s) { s } }');
    expect(out).toContain('constructor(@dec(s()) s) { s }');
  });
  it('reads in a decorator of a class expression with the same name', () => {
    const out = transform('let s = $signal(1); const X = @dec(s) class s { m() { return s; } };');
    expect(out).toContain('@dec(s()) class s { m() { return s; } }');
  });
  it('reads in a nested namespace body', () => {
    expect(transform(`${prefix} namespace N.M { console.log(a); }`)).toContain('console.log(a())');
  });
  it('declares a $signal inside a namespace', () => {
    const out = transform('namespace N { let s = $signal(1); s = 2; console.log(s); }');
    expect(out).toContain('_createSignal(1)');
    expect(out).toContain('console.log(s())');
  });
  it('reads in an enum initializer', () => {
    expect(transform(`${prefix} enum E { A = 2, B = A, C = a }`)).toContain(
      'enum E { A = 2, B = A, C = a() }',
    );
  });
  it('keeps a parameter property that shadows the signal', () => {
    const out = transform(`${prefix} class C { constructor(private a: number) { a; } }`);
    expect(out).toContain('constructor(private a: number) { a; }');
  });
  it('keeps a namespace member that shadows the signal', () => {
    const out = transform(`${prefix} namespace N { export const a = 5; console.log(a); }`);
    expect(out).toContain('export const a = 5; console.log(a);');
  });
  it('treats an import equals binding as local', () => {
    const code = 'import $signal = require("x"); $signal;';
    expect(transform(code)).toBe(code);
  });
});
