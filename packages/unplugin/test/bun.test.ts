import { describe, expect, it } from 'vitest';
import solidLabels from '../src/index';

const SOURCE = 'export function App() { let count = $signal(0); return count; }';
const ID = '/project/src/App.tsx';

type Result = { code: string; map?: unknown } | string | null;
type TransformHook = (code: string, id: string) => Promise<Result>;

function getTransform(
  framework: 'bun' | 'vite',
  options: Parameters<typeof solidLabels.raw>[0],
): TransformHook {
  const plugin = solidLabels.raw(options, { framework });
  if (Array.isArray(plugin) || typeof plugin.transform !== 'function') {
    throw new Error('expected one plugin with a transform hook');
  }
  const transform = plugin.transform;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return async (code, id) => (await transform.call({} as never, code, id)) as Result;
}

function getCode(result: Result): string {
  if (result === null) {
    throw new Error('expected a result');
  }
  return typeof result === 'string' ? result : result.code;
}

describe('bun hand-off', () => {
  it('passes the solid-labels output to bun.transform', async () => {
    const seen: string[] = [];
    const transform = getTransform('bun', {
      bun: {
        transform(code) {
          seen.push(code);
          return `/* jsx */\n${code}`;
        },
      },
    });

    const result = await transform(SOURCE, ID);

    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain('createSignal');
    expect(seen[0]).not.toContain('$signal');
    expect(result).toBe(`/* jsx */\n${seen[0]}`);
  });

  it('hands off the original code when solid-labels has nothing to compile', async () => {
    const plain = 'export const a = 1;';
    const seen: string[] = [];
    const transform = getTransform('bun', {
      bun: {
        transform(code) {
          seen.push(code);
          return null;
        },
      },
    });

    const result = await transform(plain, ID);

    expect(seen).toEqual([plain]);
    expect(result).toBeNull();
  });

  it('keeps the solid-labels result when the hand-off returns nothing', async () => {
    const transform = getTransform('bun', { bun: { transform: () => null } });

    const result = await transform(SOURCE, ID);

    expect(getCode(result)).toContain('createSignal');
  });

  it('ignores bun.transform outside Bun', async () => {
    const transform = getTransform('vite', {
      bun: {
        transform() {
          throw new Error('must not run');
        },
      },
    });

    const result = await transform(SOURCE, ID);

    expect(getCode(result)).toContain('createSignal');
  });
});
