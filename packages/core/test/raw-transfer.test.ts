import type * as OxcParser from 'oxc-parser';
import { describe, expect, it, vi } from 'vitest';

const calls: unknown[] = [];

// `rawTransferSupported` says yes, so the compiler must ask for raw transfer.
// The real parser runs without it, which works on every platform.
vi.mock('oxc-parser', async (importOriginal) => {
  const original = await importOriginal<typeof OxcParser>();
  return {
    ...original,
    rawTransferSupported: () => true,
    parseSync: (filename: string, code: string, options: Record<string, unknown>) => {
      calls.push(options);
      return original.parseSync(filename, code, { ...options, experimentalRawTransfer: false });
    },
  };
});

describe('raw transfer', () => {
  it('stays on when the parser supports it', async () => {
    const { compile } = await import('../compiler');
    compile('App.tsx', 'let count = $signal(0);');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ experimentalRawTransfer: true });
  });
});
