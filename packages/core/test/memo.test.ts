import { describe, expect, it } from 'vitest';
import { transform } from './util';

describe('$memo', () => {
  it('transforms declarations', async () => {
    expect(
      await transform(`
let count = $signal(0);
const message = $memo(\`Count: \${count}\`);
console.log(message);
`),
    ).toMatchSnapshot();
    expect(
      await transform('const value = $memo(() => compute());'),
    ).toMatchSnapshot();
    expect(
      await transform('const value = $memo(compute(), { lazy: true });'),
    ).toMatchSnapshot();
  });
  it('adds debug names in dev mode', async () => {
    expect(
      await transform('const value = $memo(compute());', { dev: true }),
    ).toMatchSnapshot();
    expect(
      await transform('const value = $memo(compute(), { lazy: true });', {
        dev: true,
      }),
    ).toMatchSnapshot();
  });
  it('supports refs', async () => {
    expect(
      await transform(`
const message = $memo(compute());
const accessor = $refMemo(message);
const getter = $get(message);
const wrapped = { message: $getter(message) };
`),
    ).toMatchSnapshot();
  });
  it('rejects writes', async () => {
    await expect(
      transform(`
const message = $memo(compute());
message = 'nope';
`),
    ).rejects.toThrow('Cannot assign to derived variable');
  });
});

describe('$', () => {
  it('transforms declarations into memos', async () => {
    expect(
      await transform(`
let count = $signal(0);
const message = $(\`Count: \${count}\`);
`),
    ).toMatchSnapshot();
  });
  it('transforms statements like $effect', async () => {
    expect(
      await transform(`
let count = $signal(0);
$(console.log(count));
`),
    ).toMatchSnapshot();
  });
  it('captures setters in statements', async () => {
    expect(
      await transform(`
let count = $signal(0);
$(count += step());
`),
    ).toMatchSnapshot();
  });
  it('stays inline when the statement writes plain outer variables', async () => {
    expect(
      await transform(`
function App() {
  let el;
  let count = $signal(0);
  $(el = render(count));
}
`),
    ).toMatchSnapshot();
  });
  it('rejects await in statements', async () => {
    await expect(
      transform('async function go() { $(await work()); }'),
    ).rejects.toThrow('cannot await or yield');
  });
  it('rejects other positions', async () => {
    await expect(transform('foo($(value));')).rejects.toThrow(
      '$ must initialize a variable declaration or be used as a statement',
    );
  });
});
