import { describe, expect, it } from 'vitest';
import transform from './util';

describe('$signal', () => {
  it('transforms declarations', () => {
    expect(transform('let count = $signal(0);')).toMatchSnapshot();
    expect(transform('let count = $signal<number>();')).toMatchSnapshot();
    expect(transform('let count: number = $signal(0);')).toMatchSnapshot();
    expect(transform('let count = $signal(0, { equals: false });')).toMatchSnapshot();
  });
  it('adds debug names in dev mode', () => {
    expect(transform('let count = $signal(0);', { dev: true })).toMatchSnapshot();
    expect(transform('let count = $signal();', { dev: true })).toMatchSnapshot();
    expect(
      transform('let count = $signal(0, { equals: false });', {
        dev: true,
      }),
    ).toMatchSnapshot();
  });
  it('rewrites reads', () => {
    expect(
      transform(`
let count = $signal(0);
console.log(count);
const doubled = count * 2;
const wrapped = { count };
`),
    ).toMatchSnapshot();
  });
  it('rewrites writes', () => {
    expect(
      transform(`
let count = $signal(0);
count = 10;
count += 5;
count++;
count--;
`),
    ).toMatchSnapshot();
  });
  it('rewrites awaited writes', () => {
    expect(
      transform(`
let count = $signal(0);
async function exampleA() {
  count = await asyncValue();
}
function* exampleB() {
  count = yield asyncValue();
}
const exampleC = async () => (count = await asyncValue());
`),
    ).toMatchSnapshot();
  });
  it('respects shadowing', () => {
    expect(
      transform(`
let count = $signal(0);
{
  const count = 'local';
  console.log(count);
}
console.log(count);
`),
    ).toMatchSnapshot();
  });
  it('supports refs and derefs', () => {
    expect(
      transform(`
let count = $signal(0);
const getter = $get(count);
const setter = $set(count);
const tuple = $refSignal(count);
`),
    ).toMatchSnapshot();
  });
  it('supports object property transforms', () => {
    expect(
      transform(`
let count = $signal(0);
const a = { value: $getter(count) };
const b = { value: $setter(count) };
const c = { value: $property(count) };
`),
    ).toMatchSnapshot();
  });
  it('wraps non-static initializers as computes', () => {
    expect(transform('let value = $signal(foo());')).toMatchSnapshot();
    expect(transform('let value = $signal(props.count);')).toMatchSnapshot();
    expect(
      transform(`
let count = $signal(0);
let doubled = $signal(count * 2);
`),
    ).toMatchSnapshot();
    expect(transform('let value = $signal(() => compute());')).toMatchSnapshot();
  });
  it('keeps static initializers raw', () => {
    expect(
      transform(`
let a = $signal(0);
let b = $signal('text');
let c = $signal({ nested: [1, 2] });
let d = $signal(initial);
`),
    ).toMatchSnapshot();
  });
  it('can be disabled', () => {
    expect(
      transform('let count = $signal(0);', {
        disabled: { ctf: { $signal: true } },
      }),
    ).toMatchSnapshot();
  });
});
