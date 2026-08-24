import { describe, expect, it } from 'vitest';
import { transform } from './util';

describe('accessor CTFs', () => {
  it('transforms $children', async () => {
    expect(
      await transform(`
const nodes = $children(props.children);
console.log(nodes);
`),
    ).toMatchSnapshot();
  });
  it('transforms $mapArray', async () => {
    expect(
      await transform(`
let list = $signal([]);
const squares = $mapArray(list, (value) => value ** 2);
console.log(squares);
`),
    ).toMatchSnapshot();
    expect(
      await transform(`
let list = $signal([]);
const squares = $mapArray(list, (value, index) => value ** 2, { keyed: false });
`),
    ).toMatchSnapshot();
  });
  it('transforms $repeat', async () => {
    expect(
      await transform(`
let total = $signal(10);
const rows = $repeat(total, (index) => index * 2);
console.log(rows);
`),
    ).toMatchSnapshot();
  });
});
