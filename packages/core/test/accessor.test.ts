import { describe, expect, it } from 'vitest';
import transform from './util';

describe('accessor CTFs', () => {
  it('transforms $children', () => {
    expect(
      transform(`
const nodes = $children(props.children);
console.log(nodes);
`),
    ).toMatchSnapshot();
  });
  it('transforms $mapArray', () => {
    expect(
      transform(`
let list = $signal([]);
const squares = $mapArray(list, (value) => value ** 2);
console.log(squares);
`),
    ).toMatchSnapshot();
    expect(
      transform(`
let list = $signal([]);
const squares = $mapArray(list, (value, index) => value ** 2, { keyed: false });
`),
    ).toMatchSnapshot();
  });
  it('transforms $repeat', () => {
    expect(
      transform(`
let total = $signal(10);
const rows = $repeat(total, (index) => index * 2);
console.log(rows);
`),
    ).toMatchSnapshot();
  });
});
