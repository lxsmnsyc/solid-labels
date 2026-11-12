import { describe, expect, it } from 'vitest';
import transform from './util';

describe('$memo', () => {
  it('transforms declarations', () => {
    expect(
      transform(`
let count = $signal(0);
const message = $memo(\`Count: \${count}\`);
console.log(message);
`),
    ).toMatchSnapshot();
    expect(transform('const value = $memo(() => compute());')).toMatchSnapshot();
    expect(transform('const value = $memo(compute(), { lazy: true });')).toMatchSnapshot();
  });
  it('adds debug names in dev mode', () => {
    expect(transform('const value = $memo(compute());', { dev: true })).toMatchSnapshot();
    expect(
      transform('const value = $memo(compute(), { lazy: true });', {
        dev: true,
      }),
    ).toMatchSnapshot();
  });
  it('supports refs', () => {
    expect(
      transform(`
const message = $memo(compute());
const accessor = $refMemo(message);
const getter = $get(message);
const wrapped = { message: $getter(message) };
`),
    ).toMatchSnapshot();
  });
  it('rejects writes', () => {
    expect(() =>
      transform(`
const message = $memo(compute());
message = 'nope';
`),
    ).toThrow('Cannot assign to derived variable');
  });
});

describe('$', () => {
  it('transforms declarations into memos', () => {
    expect(
      transform(`
let count = $signal(0);
const message = $(\`Count: \${count}\`);
`),
    ).toMatchSnapshot();
  });
  it('transforms statements like $effect', () => {
    expect(
      transform(`
let count = $signal(0);
$(console.log(count));
`),
    ).toMatchSnapshot();
  });
  it('captures setters in statements', () => {
    expect(
      transform(`
let count = $signal(0);
$(count += step());
`),
    ).toMatchSnapshot();
  });
  it('stays inline when the statement writes plain outer variables', () => {
    expect(
      transform(`
function App() {
  let el;
  let count = $signal(0);
  $(el = render(count));
}
`),
    ).toMatchSnapshot();
  });
  it('rejects await in statements', () => {
    expect(() => transform('async function go() { $(await work()); }')).toThrow(
      'cannot await or yield',
    );
  });
  it('rejects other positions', () => {
    expect(() => transform('foo($(value));')).toThrow(
      '$ must initialize a variable declaration or be used as a statement',
    );
  });
});
