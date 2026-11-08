import { describe, expect, it } from 'vitest';
import { compile } from '../compiler';

interface Harness {
  /** Runs the compiled `run` function. */
  run: () => unknown;
  /** Reads the current value of the signal `x`. */
  read: () => unknown;
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

  // The compiled code is the subject of the test, so it has to be evaluated.
  // oxlint-disable-next-line no-new-func, no-implied-eval
  const factory = new Function('_createSignal', 'g', `${code}\nreturn { run, read };`);
  const exported = factory(createSignal, g) as { run: () => unknown; read: () => unknown };
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
