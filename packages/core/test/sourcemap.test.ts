import { describe, expect, it } from 'vitest';
import { compile } from '../compiler';

const CODE = 'let count = $signal(0);\nconsole.log(count);\n';

describe('source map', () => {
  it('embeds the original source', () => {
    const result = compile('/src/app.tsx', CODE);
    expect(result?.map.sources).toEqual(['/src/app.tsx']);
    expect(result?.map.sourcesContent).toEqual([CODE]);
  });
  it('names the source without the bundler query', () => {
    const result = compile('/src/app.tsx?pick=default', CODE);
    expect(result?.map.sources).toEqual(['/src/app.tsx']);
  });
});
