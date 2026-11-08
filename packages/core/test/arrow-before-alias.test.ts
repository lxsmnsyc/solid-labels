import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';
import { compile } from '../compiler';

/**
 * Parses code and returns its statements without imports and source
 * positions, so two texts compare by structure and not by spacing.
 */
function parseBody(code: string): unknown {
  const result = parseSync('test.tsx', code, { lang: 'tsx', sourceType: 'module' });
  expect(result.errors).toEqual([]);
  const body = result.program.body.filter((node) => node.type !== 'ImportDeclaration');
  return JSON.parse(
    JSON.stringify(body, (key, value: unknown) =>
      key === 'start' || key === 'end' || key === 'range' ? undefined : value,
    ),
  );
}

/**
 * Compiles in default and dev mode and parses both outputs. The dev output is
 * compared with `devExpected`, or with `expected` when it is omitted. Pass
 * `null` to only require that the dev output parses.
 */
function expectCompiled(source: string, expected: string, devExpected?: string | null): void {
  const output = compile('test.tsx', source);
  expect(output).not.toBeNull();
  expect(parseBody(output?.code ?? '')).toEqual(parseBody(expected));

  const dev = compile('test.tsx', source, { dev: true });
  expect(dev).not.toBeNull();
  const devBody = parseBody(dev?.code ?? '');
  if (devExpected !== null) {
    expect(devBody).toEqual(parseBody(devExpected ?? expected));
  }
}

describe('arrow inserted before an argument that starts with an alias', () => {
  it('wraps an auto-aliased accessor', () => {
    expectCompiled(
      'const m = $memo($latest(x));',
      'const m = _createMemo(() => _latest(x));',
      'const m = _createMemo(() => _latest(x), { name: "m" });',
    );
    expectCompiled(
      'const m = $memo($merge(a, b));',
      'const m = _createMemo(() => _merge(a, b));',
      'const m = _createMemo(() => _merge(a, b), { name: "m" });',
    );
    expectCompiled(
      'const m = $memo($snapshot(s));',
      'const m = _createMemo(() => _snapshot(s));',
      'const m = _createMemo(() => _snapshot(s), { name: "m" });',
    );
  });

  it('wraps an alias that follows a newline', () => {
    expectCompiled(
      'const m = $memo(\n  $latest(x));',
      'const m = _createMemo(() => _latest(x));',
      'const m = _createMemo(() => _latest(x), { name: "m" });',
    );
  });

  it('keeps the arrow when the alias is not at the start', () => {
    expectCompiled(
      'const m = $memo(foo($latest(x)));',
      'const m = _createMemo(() => foo(_latest(x)));',
      'const m = _createMemo(() => foo(_latest(x)), { name: "m" });',
    );
  });

  it('wraps an alias argument of other arrow CTFs', () => {
    expectCompiled('const m = $untrack($latest(x));', 'const m = _untrack(() => _latest(x));');
    expectCompiled(
      'const m = $mapArray($latest(x), (v) => v);',
      'const m = _mapArray(() => _latest(x), (v) => v);',
    );
    expectCompiled('const m = $children($latest(x));', 'const m = _children(() => _latest(x));');
  });

  it('wraps a component name used as a value', () => {
    expectCompiled(
      'const m = $memo(Show);',
      'const m = _createMemo(() => _Show);',
      'const m = _createMemo(() => _Show, { name: "m" });',
    );
    expectCompiled('const m = $untrack(Show);', 'const m = _untrack(() => _Show);');
  });

  it('wraps an arrow CTF argument that starts with another arrow CTF', () => {
    expectCompiled(
      'let c = $signal(0); const m = $memo($untrack($latest(c)));',
      'let [c, setc_1] = _createSignal(0); const m = _createMemo(() => _untrack(() => _latest(c())));',
      'let [c, setc_1] = _createSignal(0, { name: "c" }); const m = _createMemo(() => _untrack(() => _latest(c())), { name: "m" });',
    );
  });

  it('wraps a JSX component at the start of an argument', () => {
    expectCompiled(
      'const m = $untrack(<Show when={x}>a</Show>);',
      'const m = _untrack(() => <_Show when={x}>a</_Show>);',
    );
  });
});

describe('$signal initializers', () => {
  it('wraps an arrow CTF in the initializer', () => {
    expectCompiled(
      'let s = $signal($untrack(x));',
      'let [s, sets_1] = _createSignal(() => _untrack(() => x));',
      'let [s, sets_1] = _createSignal(() => _untrack(() => x), { name: "s" });',
    );
  });

  it('wraps an alias in the initializer', () => {
    expectCompiled(
      'let s = $signal($latest(x));',
      'let [s, sets_1] = _createSignal(() => _latest(x));',
      'let [s, sets_1] = _createSignal(() => _latest(x), { name: "s" });',
    );
  });

  it('leaves a component name as a static initializer', () => {
    expectCompiled(
      'let s = $signal(Show);',
      'let [s, sets_1] = _createSignal(_Show);',
      'let [s, sets_1] = _createSignal(_Show, { name: "s" });',
    );
  });
});

describe('arrow inserted before a signal access at the start of an argument', () => {
  const HEAD = 'let c = $signal(0); ';
  const OUT = 'let [c, setc_1] = _createSignal(0); ';
  const DEV_OUT = 'let [c, setc_1] = _createSignal(0, { name: "c" }); ';

  it('wraps a read', () => {
    expectCompiled(
      `${HEAD}const m = $memo(c + 1);`,
      `${OUT}const m = _createMemo(() => c() + 1);`,
      `${DEV_OUT}const m = _createMemo(() => c() + 1, { name: "m" });`,
    );
    expectCompiled(
      `${HEAD}const m = $memo(c);`,
      `${OUT}const m = _createMemo(() => c());`,
      // Dev mode puts the name before the `()` of a bare read on `1.0`. That is
      // tracked apart from this fix, so the dev output is only parsed.
      null,
    );
    expectCompiled(
      `${HEAD}const m = $memo({ c });`,
      `${OUT}const m = _createMemo(() => ({ c: c() }));`,
      `${DEV_OUT}const m = _createMemo(() => ({ c: c() }), { name: "m" });`,
    );
  });

  // Dev mode attaches the memo name to the setter in these cases. That is
  // tracked apart from this fix, so the dev output is only parsed.
  it('wraps a write', () => {
    expectCompiled(
      `${HEAD}const m = $untrack(c = 2);`,
      `${OUT}const m = _untrack(() => setc_1(() => 2));`,
      `${DEV_OUT}const m = _untrack(() => setc_1(() => 2));`,
    );
    expectCompiled(
      `${HEAD}const m = $memo(c += 2);`,
      `${OUT}const m = _createMemo(() => setc_1((current_1) => current_1 += 2));`,
      null,
    );
    expectCompiled(
      `${HEAD}const m = $untrack(c++);`,
      `${OUT}const m = _untrack(() => (() => { let tmp_1; setc_1((current_1) => (tmp_1 = current_1) + 1); return tmp_1; })());`,
      `${DEV_OUT}const m = _untrack(() => (() => { let tmp_1; setc_1((current_1) => (tmp_1 = current_1) + 1); return tmp_1; })());`,
    );
  });

  it('wraps a write through a TypeScript wrapper', () => {
    expectCompiled(
      `${HEAD}const m = $memo((c as any) = 3);`,
      `${OUT}const m = _createMemo(() => setc_1(() => 3));`,
      null,
    );
    expectCompiled(
      `${HEAD}const m = $memo(c! += 2);`,
      `${OUT}const m = _createMemo(() => setc_1((current_1) => current_1 += 2));`,
      null,
    );
    expectCompiled(
      `${HEAD}const m = $untrack((c as number)++);`,
      `${OUT}const m = _untrack(() => (() => { let tmp_1; setc_1((current_1) => (tmp_1 = current_1) + 1); return tmp_1; })());`,
      `${DEV_OUT}const m = _untrack(() => (() => { let tmp_1; setc_1((current_1) => (tmp_1 = current_1) + 1); return tmp_1; })());`,
    );
  });
});

describe('hoisted $effect', () => {
  it('keeps the arrows in a write that is the effect body', () => {
    expectCompiled(
      'let c = $signal(0);\n$effect(() => { c = $untrack($latest(x)); });',
      'let [c, setc_1] = _createSignal(0);\n_createEffect(() => [setc_1], effectCallback_1);\nfunction effectCallback_1([setc_1]) { setc_1(() => _untrack(() => _latest(x))); }',
      'let [c, setc_1] = _createSignal(0, { name: "c" });\n_createEffect(() => [setc_1], effectCallback_1);\nfunction effectCallback_1([setc_1]) { setc_1(() => _untrack(() => _latest(x))); }',
    );
  });
});

describe('$deferred', () => {
  it('wraps an alias argument like $memo', () => {
    expectCompiled(
      'const m = $deferred($latest(x));',
      'const m = _createDeferred(() => _latest(x));',
      'const m = _createDeferred(() => _latest(x));',
    );
  });
});
