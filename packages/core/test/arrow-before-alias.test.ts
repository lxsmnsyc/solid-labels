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

function expectCompiled(source: string, expected: string): void {
  const result = compile('test.tsx', source);
  expect(result).not.toBeNull();
  expect(parseBody(result?.code ?? '')).toEqual(parseBody(expected));
}

describe('arrow inserted before an argument that starts with an alias', () => {
  it('wraps an auto-aliased accessor', () => {
    expectCompiled('const m = $memo($latest(x));', 'const m = _createMemo(() => _latest(x));');
    expectCompiled('const m = $memo($merge(a, b));', 'const m = _createMemo(() => _merge(a, b));');
    expectCompiled('const m = $memo($snapshot(s));', 'const m = _createMemo(() => _snapshot(s));');
  });

  it('wraps an alias that follows a newline', () => {
    expectCompiled('const m = $memo(\n  $latest(x));', 'const m = _createMemo(() => _latest(x));');
  });

  it('keeps the arrow when the alias is not at the start', () => {
    expectCompiled(
      'const m = $memo(foo($latest(x)));',
      'const m = _createMemo(() => foo(_latest(x)));',
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
    expectCompiled('const m = $memo(Show);', 'const m = _createMemo(() => _Show);');
    expectCompiled('const m = $untrack(Show);', 'const m = _untrack(() => _Show);');
  });

  it('wraps an arrow CTF argument that starts with another arrow CTF', () => {
    expectCompiled(
      'let c = $signal(0); const m = $memo($untrack($latest(c)));',
      'let [c, setc_1] = _createSignal(0); const m = _createMemo(() => _untrack(() => _latest(c())));',
    );
  });

  it('wraps a JSX component at the start of an argument', () => {
    expectCompiled(
      'const m = $untrack(<Show when={x}>a</Show>);',
      'const m = _untrack(() => <_Show when={x}>a</_Show>);',
    );
  });
});

describe('arrow inserted before a signal access at the start of an argument', () => {
  const HEAD = 'let c = $signal(0); ';
  const OUT = 'let [c, setc_1] = _createSignal(0); ';

  it('wraps a read', () => {
    expectCompiled(`${HEAD}const m = $memo(c + 1);`, `${OUT}const m = _createMemo(() => c() + 1);`);
    expectCompiled(`${HEAD}const m = $memo(c);`, `${OUT}const m = _createMemo(() => c());`);
    expectCompiled(
      `${HEAD}const m = $memo({ c });`,
      `${OUT}const m = _createMemo(() => ({ c: c() }));`,
    );
  });

  it('wraps a write', () => {
    expectCompiled(
      `${HEAD}const m = $untrack(c = 2);`,
      `${OUT}const m = _untrack(() => setc_1(() => 2));`,
    );
    expectCompiled(
      `${HEAD}const m = $memo(c += 2);`,
      `${OUT}const m = _createMemo(() => setc_1((current_1) => current_1 += 2));`,
    );
    expectCompiled(
      `${HEAD}const m = $untrack(c++);`,
      `${OUT}const m = _untrack(() => (() => { let tmp_1; setc_1((current_1) => (tmp_1 = current_1) + 1); return tmp_1; })());`,
    );
  });
});

describe('$deferred', () => {
  it('is not a compile-time function, so its arguments stay untouched', () => {
    expectCompiled('const m = $deferred($latest(x));', 'const m = $deferred(_latest(x));');
  });
});
