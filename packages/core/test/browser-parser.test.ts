import { describe, expect, it, vi } from 'vitest';

// The wasm build of oxc-parser (the `browser` export condition) has no
// `rawTransferSupported` export. The compiler has to load and parse without it.
vi.mock('oxc-parser', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const { rawTransferSupported: _removed, ...rest } = original;
  return rest;
});

describe('parser without rawTransferSupported', () => {
  it('compiles with raw transfer off', async () => {
    const { compile } = await import('../compiler');
    const output = compile('App.tsx', 'let count = $signal(0); console.log(count);');
    expect(output?.code).toContain('_createSignal(0)');
    expect(output?.code).toContain('console.log(count())');
  });
});
