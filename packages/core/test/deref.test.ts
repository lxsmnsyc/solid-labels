import { describe, expect, it } from 'vitest';
import { transform } from './util';

describe('$derefSignal', () => {
  it('adopts external signal tuples', async () => {
    expect(
      await transform(`
let count = $derefSignal(useCounter());
console.log(count);
count = 10;
`),
    ).toMatchSnapshot();
  });
});

describe('$derefMemo', () => {
  it('adopts external accessors', async () => {
    expect(
      await transform(`
const message = $derefMemo(useMessage());
console.log(message);
`),
    ).toMatchSnapshot();
  });
});
