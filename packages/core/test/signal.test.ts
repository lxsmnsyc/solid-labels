import { Script, runInNewContext } from 'node:vm';
import * as solid from 'solid-js';
import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';
import transform from './util';

describe('$signal', () => {
  it('transforms declarations', () => {
    expect(transform('let count = $signal(0);')).toMatchSnapshot();
    expect(transform('let count = $signal<number>();')).toMatchSnapshot();
    expect(transform('let count: number = $signal(0);')).toMatchSnapshot();
    expect(transform('let count = $signal(0, { equals: false });')).toMatchSnapshot();
  });
  it('adds debug names in dev mode', () => {
    expect(transform('let count = $signal(0);', { dev: true })).toMatchSnapshot();
    expect(transform('let count = $signal();', { dev: true })).toMatchSnapshot();
    expect(
      transform('let count = $signal(0, { equals: false });', {
        dev: true,
      }),
    ).toMatchSnapshot();
  });
  it('rewrites reads', () => {
    expect(
      transform(`
let count = $signal(0);
console.log(count);
const doubled = count * 2;
const wrapped = { count };
`),
    ).toMatchSnapshot();
  });
  it('rewrites writes', () => {
    expect(
      transform(`
let count = $signal(0);
count = 10;
count += 5;
count++;
count--;
`),
    ).toMatchSnapshot();
  });
  it('rewrites awaited writes', () => {
    expect(
      transform(`
let count = $signal(0);
async function exampleA() {
  count = await asyncValue();
}
function* exampleB() {
  count = yield asyncValue();
}
const exampleC = async () => (count = await asyncValue());
`),
    ).toMatchSnapshot();
  });
  it('respects shadowing', () => {
    expect(
      transform(`
let count = $signal(0);
{
  const count = 'local';
  console.log(count);
}
console.log(count);
`),
    ).toMatchSnapshot();
  });
  it('supports refs and derefs', () => {
    expect(
      transform(`
let count = $signal(0);
const getter = $get(count);
const setter = $set(count);
const tuple = $refSignal(count);
`),
    ).toMatchSnapshot();
  });
  it('supports object property transforms', () => {
    expect(
      transform(`
let count = $signal(0);
const a = { value: $getter(count) };
const b = { value: $setter(count) };
const c = { value: $property(count) };
`),
    ).toMatchSnapshot();
  });
  it('wraps non-static initializers as computes', () => {
    expect(transform('let value = $signal(foo());')).toMatchSnapshot();
    expect(transform('let value = $signal(props.count);')).toMatchSnapshot();
    expect(
      transform(`
let count = $signal(0);
let doubled = $signal(count * 2);
`),
    ).toMatchSnapshot();
    expect(transform('let value = $signal(() => compute());')).toMatchSnapshot();
  });
  it('keeps static initializers raw', () => {
    expect(
      transform(`
let a = $signal(0);
let b = $signal('text');
let c = $signal({ nested: [1, 2] });
let d = $signal(initial);
`),
    ).toMatchSnapshot();
  });
  it('can be disabled', () => {
    expect(
      transform('let count = $signal(0);', {
        disabled: { ctf: { $signal: true } },
      }),
    ).toMatchSnapshot();
  });

  it('wraps object literal values in parentheses', () => {
    expect(transform('let user = $signal({ name: x() });')).toContain(
      '_createSignal(() => ({ name: x() }))',
    );
    expect(transform('let user = $signal(null);\nuser = { name: "x" };')).toContain(
      'setuser_1(() => ({ name: "x" }))',
    );
    expect(transform('const a = $memo({ b: c() });')).toContain('_createMemo(() => ({ b: c() }))');
  });
});

describe('$signal write rewrites on solid-js', () => {
  // Compiles the source and runs it against solid-js; the source sets `result`.
  function run(source: string): unknown {
    const code = transform(source).replace(
      /import \{([^}]*)\} from "solid-js";/g,
      (_, names: string) => `const {${names.replaceAll(' as ', ': ')}} = solid;`,
    );
    return runInNewContext(`${code}\nresult`, { solid });
  }
  function parses(source: string): void {
    const code = transform(source).replace(/^import .*$/gm, '');
    expect(() => new Script(code)).not.toThrow();
  }

  it('compiles parenthesized right-hand sides to parseable code', () => {
    parses('let a = $signal(0); a = (1 + 2);');
    parses('let a = $signal(0); a = (f());');
    parses('let a = $signal(0); let b = $signal(0); a = (b = 1);');
    parses('let a = $signal(0); a = (c ? 1 : 2);');
    parses('let a = $signal(0); const r = (a = (1 + 2));');
    parses('let a = $signal(0); const r = (a = ((3)));');
    parses('let a = $signal(0); const r = [(a = (1 + 2))];');
  });
  it('writes parenthesized values', () => {
    expect(
      run(`
let a = $signal(0);
let b = $signal(0);
const f = () => 7;
const c = true;
a = (1 + 2);
const first = a;
a = (f());
const second = a;
b = (a = 5);
const third = [a, b];
a = (c ? 10 : 20);
const result = [first, second, third, a];
`),
    ).toEqual([3, 7, [5, 5], 10]);
    expect(
      run(`
let a = $signal(0);
const r = (a = (1 + 2));
const result = [r, a];
`),
    ).toEqual([3, 3]);
  });
  it('compiles parenthesized awaited values', () => {
    parses(`
let a = $signal(0);
async function go() {
  a = (await Promise.resolve(4));
}
const arrow = async () => (a = (await Promise.resolve(5)));
`);
  });
  it('postfix updates give the old value', () => {
    expect(
      run(`
let count = $signal(0);
const x = count++;
const afterInc = count;
const y = count--;
const afterDec = count;
const result = [x, afterInc, y, afterDec];
`),
    ).toEqual([0, 1, 1, 0]);
  });
  it('prefix updates give the new value', () => {
    expect(
      run(`
let count = $signal(5);
const x = ++count;
const y = --count;
const result = [x, y, count];
`),
    ).toEqual([6, 5, 5]);
  });
  it('postfix updates in expression position', () => {
    expect(
      run(`
let count = $signal(1);
const list = [count++, count++, count--];
const result = [list, count];
`),
    ).toEqual([[1, 2, 3], 2]);
  });
  it('keeps statement updates without a temporary', () => {
    const code = transform('let count = $signal(0);\ncount++;\ncount--;\nfor (;;count++) {}');
    expect(code).not.toContain('tmp_');
    expect(code).toContain('setcount_1(current_1 => ++current_1)');
  });
  it('reports for-of and for-in targets instead of emitting a read', () => {
    expect(() => transform('let x = $signal(0);\nfor (x of [1, 2]) {}')).toThrow(
      'Unsupported write to reactive variable "x"',
    );
    expect(() => transform('let x = $signal(0);\nfor (x in { a: 1 }) {}')).toThrow(
      'Unsupported write to reactive variable "x"',
    );
  });
  it('writes through wrapped update targets', () => {
    for (const target of ['x!', '(x as any)', '(x satisfies number)']) {
      const code = transform(`let x = $signal(0);\n${target}++;`);
      expect(code).toContain('setx_1(current_1 => ++current_1)');
      expect(code).not.toContain('x()');
    }
  });
  it('writes through wrapped assignment targets', () => {
    const targets = ['x!', '(x as any)', '(x satisfies number)', '((x as any))', '(x!)'];
    for (const target of targets) {
      for (const dev of [false, true]) {
        const plain = transform(`let x = $signal(0);\n${target} = 1;`, { dev });
        expect(parseSync('out.ts', plain).errors).toEqual([]);
        expect(plain).toContain('setx_1(() => 1);');
        expect(plain).not.toMatch(/as any|satisfies|!|<any>/);
        const compound = transform(`let x = $signal(0);\n${target} += 1;`, { dev });
        expect(parseSync('out.ts', compound).errors).toEqual([]);
        expect(compound).toContain('setx_1(current_1 => current_1 += 1);');
        expect(compound).not.toMatch(/as any|satisfies|!|<any>/);
      }
    }
  });
  it('writes through type assertion targets in .ts files', () => {
    for (const dev of [false, true]) {
      const plain = transform('let x = $signal(0);\n(<any>x) = 1;', { dev }, 'test.ts');
      expect(parseSync('out.ts', plain).errors).toEqual([]);
      expect(plain).toContain('setx_1(() => 1);');
      expect(plain).not.toContain('<any>');
      const compound = transform('let x = $signal(0);\n(<any>x) += 1;', { dev }, 'test.ts');
      expect(parseSync('out.ts', compound).errors).toEqual([]);
      expect(compound).toContain('setx_1(current_1 => current_1 += 1);');
    }
  });
  it('keeps comments that contain the operator out of the way', () => {
    const cases = [
      'x /* += */ += 1;',
      'x // +=\n+= 1;',
      '(x as any) /* += */ += 1;',
      '(x as any /* += */) += 1;',
      'x! /* += */ += 1;',
      '(x as any) /* = */ = 1;',
    ];
    for (const source of cases) {
      for (const dev of [false, true]) {
        const code = transform(`let x = $signal(0);\n${source}`, { dev });
        expect(parseSync('out.ts', code).errors).toEqual([]);
        expect(code).toMatch(/setx_1\((current_1 => current_1 \+= 1|\(\) => 1)\)/);
      }
    }
  });
  it('writes through wrapped targets with await and object values', () => {
    const awaited = transform('let x = $signal(0);\n(x as any) = await f();');
    expect(awaited).toContain('const tmp_1 = await f();\nsetx_1(() => tmp_1)');
    const object = transform('let x = $signal(0);\nx! = { a: 1 };');
    expect(object).toContain('setx_1(() => ({ a: 1 }))');
    const used = transform('let x = $signal(0);\nconst y = (x as any) = 2;');
    expect(used).toContain('const y = setx_1(() => 2);');
    for (const code of [awaited, object, used]) {
      expect(parseSync('out.ts', code).errors).toEqual([]);
    }
  });
  it('still rejects wrapped destructuring targets', () => {
    expect(() => transform('let x = $signal(0);\n[x as any] = [1];')).toThrow(
      'Unsupported write to reactive variable "x"',
    );
  });
});
