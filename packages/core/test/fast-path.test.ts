import * as oxc from 'oxc-parser';
import { describe, expect, it, vi } from 'vitest';
import { compile } from '../compiler';

vi.mock('oxc-parser', async (importOriginal) => {
  const actual = await importOriginal<typeof oxc>();
  return { ...actual, parseSync: vi.fn(actual.parseSync) };
});

describe('fast path', () => {
  it('does not parse a file without markers', () => {
    const spy = vi.mocked(oxc.parseSync);
    spy.mockClear();
    expect(compile('a.tsx', 'export const a = 1 + 2;\n')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('parses a file with a compile-time function', () => {
    const spy = vi.mocked(oxc.parseSync);
    spy.mockClear();
    const result = compile('a.tsx', 'const a = $signal(0);\n');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result?.code).toContain('createSignal');
  });

  it('still imports Show for a file that only uses <Show>', () => {
    const result = compile('a.tsx', 'export const a = <Show when={x}>y</Show>;\n');
    expect(result?.code).toContain('Show');
    expect(result?.code).toContain('solid-js');
  });

  it('handles namespace components', () => {
    const result = compile('a.tsx', 'export const a = <solid:show when={x}>y</solid:show>;\n');
    expect(result?.code).toContain('solid-js');
  });

  it('returns null when a marker is present but no edit is made', () => {
    expect(compile('a.tsx', 'const price = "$5";\nconst Showing = 1;\n')).toBeNull();
  });
});
