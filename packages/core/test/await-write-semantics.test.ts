import vm from 'node:vm';
import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';
import { compile } from '../compiler';

interface Exported {
  /** Runs the compiled `run` function. */
  run: (...args: unknown[]) => unknown;
  /** Reads the current value of the signal `x`. */
  read: () => unknown;
}

interface Harness extends Exported {
  /** Names of the calls the stub `g` received, in order. */
  calls: string[];
  /** Sets `x` from outside, as another writer would. */
  poke: (next: number) => void;
}

interface Setup {
  initial: string;
  /** Value written to `x` while `g` is pending. */
  during: number;
  /** Value `g` resolves with. */
  result: number;
}

/**
 * Compiles the source and runs it against a stub `createSignal`. `g` records
 * its call and changes `x` before it resolves, so the order of the read of `x`
 * and the await shows in the final value.
 */
function load(body: string, setup: Setup, dev: boolean): Harness {
  const source = `let x = $signal(${setup.initial});\nfunction read() { return x; }\n${body}`;
  const result = compile('test.js', source, { dev });
  expect(result).not.toBeNull();
  const code = (result?.code ?? '').replace(/^import .*\n/gm, '');

  // The stub signal keeps its value in a closure and returns the new value from the setter.
  let value: unknown;
  let write: (next: unknown) => unknown = () => undefined;
  function createSignal(init: unknown): [() => unknown, (update: unknown) => unknown] {
    value = init;
    write = (update) => {
      value = typeof update === 'function' ? (update as (prev: unknown) => unknown)(value) : update;
      return value;
    };
    return [() => value, (update) => write(update)];
  }

  const calls: string[] = [];
  async function g(): Promise<number> {
    calls.push('g');
    write(() => setup.during);
    // Suspends the caller, so `x` can change before the await resumes.
    await Promise.resolve();
    return setup.result;
  }

  // The output must parse before it runs.
  const parsed = parseSync('test.js', code, { lang: 'js', sourceType: 'module' });
  expect(parsed.errors).toEqual([]);

  // Wrapped in a function so the stubs are its parameters.
  const factory = vm.runInThisContext(
    `(function (_createSignal, g) {\n${code}\nreturn { run, read };\n})`,
  ) as (stub: typeof createSignal, record: typeof g) => Exported;
  const exported = factory(createSignal, g);
  return {
    run: exported.run,
    read: exported.read,
    calls,
    poke: (next) => {
      write(() => next);
    },
  };
}

const MODES = [false, true];

describe('arithmetic compound writes with await read the signal first', () => {
  for (const dev of MODES) {
    const mode = dev ? 'dev' : 'default';

    it(`statement += (${mode})`, async () => {
      const h = load(
        'async function run() { x += await g(); }',
        { initial: '1', during: 10, result: 5 },
        dev,
      );
      await h.run();
      expect(h.read()).toBe(6);
    });

    it(`statement **= (${mode})`, async () => {
      const h = load(
        'async function run() { x **= await g(); }',
        { initial: '2', during: 10, result: 3 },
        dev,
      );
      await h.run();
      expect(h.read()).toBe(8);
    });

    it(`statement -= with a parenthesized target (${mode})`, async () => {
      const h = load(
        'async function run() { (x) -= await g(); }',
        { initial: '9', during: 10, result: 4 },
        dev,
      );
      await h.run();
      expect(h.read()).toBe(5);
    });

    it(`concise arrow += keeps the value (${mode})`, async () => {
      const h = load(
        'const run = async () => x += await g();',
        { initial: '1', during: 10, result: 5 },
        dev,
      );
      expect(await h.run()).toBe(6);
      expect(h.read()).toBe(6);
    });

    it(`parenthesized concise arrow |= (${mode})`, async () => {
      const h = load(
        'const run = async () => (x |= await g());',
        { initial: '1', during: 10, result: 6 },
        dev,
      );
      expect(await h.run()).toBe(7);
      expect(h.read()).toBe(7);
    });

    it(`yield += (${mode})`, () => {
      const h = load(
        'function* run() { x += yield 1; }',
        { initial: '1', during: 10, result: 0 },
        dev,
      );
      const iterator = h.run() as Generator<number, void, number>;
      iterator.next();
      // The signal changes while the generator is suspended.
      h.poke(10);
      iterator.next(5);
      expect(h.read()).toBe(6);
    });
  }
});

describe('logical compound writes with await short-circuit', () => {
  const cases = [
    { op: '||=', initial: '1', result: 5, skipped: true, final: 1 },
    { op: '||=', initial: '0', result: 5, skipped: false, final: 5 },
    { op: '&&=', initial: '0', result: 5, skipped: true, final: 0 },
    { op: '&&=', initial: '1', result: 5, skipped: false, final: 5 },
    { op: '??=', initial: '0', result: 5, skipped: true, final: 0 },
    { op: '??=', initial: 'null', result: 5, skipped: false, final: 5 },
  ];

  for (const dev of MODES) {
    const mode = dev ? 'dev' : 'default';
    for (const item of cases) {
      const title = `x = ${item.initial}, ${item.op} ${item.skipped ? 'skips' : 'runs'} g (${mode})`;

      it(`statement: ${title}`, async () => {
        // `during` is the initial value again, so a skipped `g` leaves `x` unchanged.
        const during = item.initial === 'null' ? 0 : Number(item.initial);
        const h = load(
          `async function run() { x ${item.op} await g(); }`,
          { initial: item.initial, during, result: item.result },
          dev,
        );
        await h.run();
        expect(h.calls).toEqual(item.skipped ? [] : ['g']);
        expect(h.read()).toBe(item.final);
      });

      it(`concise arrow: ${title}`, async () => {
        const during = item.initial === 'null' ? 0 : Number(item.initial);
        const h = load(
          `const run = async () => x ${item.op} await g();`,
          { initial: item.initial, during, result: item.result },
          dev,
        );
        expect(await h.run()).toBe(item.final);
        expect(h.calls).toEqual(item.skipped ? [] : ['g']);
        expect(h.read()).toBe(item.final);
      });
    }

    it(`yield with ||= skips the yield when x is truthy (${mode})`, () => {
      const h = load(
        'function* run() { x ||= yield 1; }',
        { initial: '1', during: 1, result: 0 },
        dev,
      );
      const iterator = h.run() as Generator<number, void, number>;
      expect(iterator.next().done).toBe(true);
      expect(h.read()).toBe(1);
    });

    it(`yield with ||= yields when x is falsy (${mode})`, () => {
      const h = load(
        'function* run() { x ||= yield 1; }',
        { initial: '0', during: 0, result: 0 },
        dev,
      );
      const iterator = h.run() as Generator<number, void, number>;
      expect(iterator.next().done).toBe(false);
      iterator.next(7);
      expect(h.read()).toBe(7);
    });
  }
});

describe('writes with await as the body of a statement', () => {
  // Each statement is the whole body of its parent, so the output needs braces.
  // The last one is a statement list and needs none.
  const parents = [
    { kind: 'if consequent', make: (w: string) => `if (true) ${w}` },
    { kind: 'if alternate', make: (w: string) => `if (false) {} else ${w}` },
    { kind: 'for', make: (w: string) => `for (let i = 0; i < 1; i++) ${w}` },
    { kind: 'for-of', make: (w: string) => `for (const v of [1]) ${w}` },
    { kind: 'for-in', make: (w: string) => `for (const k in { a: 1 }) ${w}` },
    { kind: 'while', make: (w: string) => `let n = 1; while (n-- > 0) ${w}` },
    { kind: 'do-while', make: (w: string) => `do ${w} while (false);` },
    { kind: 'labeled', make: (w: string) => `label: ${w}` },
    { kind: 'switch case', make: (w: string) => `switch (1) { case 1: ${w} }` },
  ];
  const operators = ['=', '+=', '||='];

  for (const dev of MODES) {
    for (const parent of parents) {
      for (const op of operators) {
        it(`${parent.kind} with ${op} (${dev ? 'dev' : 'default'})`, async () => {
          const body = parent.make(`x ${op} await g();`);
          const h = load(
            `async function run() { ${body} }`,
            { initial: '0', during: 10, result: 5 },
            dev,
          );
          await h.run();
          // The old value is 0, so `+=` gives 5 and a stale read would give 15.
          expect(h.read()).toBe(5);
          expect(h.calls).toEqual(['g']);
        });
      }
    }
  }
});

describe('plain writes with await keep working', () => {
  for (const dev of MODES) {
    it(`statement and concise arrow (${dev ? 'dev' : 'default'})`, async () => {
      const h = load(
        'async function run() { x = await g(); }',
        { initial: '1', during: 10, result: 5 },
        dev,
      );
      await h.run();
      expect(h.read()).toBe(5);

      const arrow = load(
        'const run = async () => x = await g();',
        { initial: '1', during: 10, result: 5 },
        dev,
      );
      expect(await arrow.run()).toBe(5);
    });
  }
});
