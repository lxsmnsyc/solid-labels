import { describe, expect, it } from 'vitest';
import { transform } from './util';

describe('typescript', () => {
  it('keeps type arguments and strips conflicting annotations', async () => {
    expect(
      await transform(`
let count: number = $signal(0);
const message: string = $memo<string>(\`Count: \${count}\`);
console.log(count, message);
`),
    ).toMatchSnapshot();
  });
  it('sees through TS expression wrappers', async () => {
    expect(
      await transform(`
let count = $signal(0 as number);
const value = $untrack(count satisfies number);
`),
    ).toMatchSnapshot();
  });
  it('compiles plain .ts files', async () => {
    expect(
      await transform('let count = $signal(0); count += 1;', {}, 'test.ts'),
    ).toMatchSnapshot();
  });
});
