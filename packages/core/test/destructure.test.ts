import { describe, expect, it } from 'vitest';
import { transform } from './util';

describe('$destructure', () => {
  it('destructures objects', async () => {
    expect(
      await transform(`
const { a, b } = $destructure(props);
console.log(a, b);
`),
    ).toMatchSnapshot();
  });
  it('supports nested patterns, defaults and rest', async () => {
    expect(
      await transform(`
let { a: { b, c }, b: { d = defaultD, e = compute() }, ...f } = $destructure(x);
console.log(b, c, d, e, f);
`),
    ).toMatchSnapshot();
  });
  it('supports computed keys and array patterns', async () => {
    expect(
      await transform(`
const { [key]: value } = $destructure(props);
const [first, second] = $destructure(pair);
console.log(value, first, second);
`),
    ).toMatchSnapshot();
  });
  it('reads reactive sources per property', async () => {
    expect(
      await transform(`
let state = $signal({ a: 1, b: 2 });
const { a, b } = $destructure(state);
console.log(a, b);
`),
    ).toMatchSnapshot();
  });
  it('lets defaults reference earlier properties', async () => {
    expect(
      await transform(`
const { a, b = a } = $destructure(props);
console.log(b);
`),
    ).toMatchSnapshot();
  });
});
