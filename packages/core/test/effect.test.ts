import { describe, expect, it } from 'vitest';
import { transform } from './util';

describe('$effect', () => {
  it('captures outer identifiers and hoists the callback', async () => {
    expect(
      await transform(`
function App() {
  let bar = $signal(someValue());
  $effect(() => {
    foo(bar);
  });
}
`),
    ).toMatchSnapshot();
  });
  it('captures signals, memos and plain locals', async () => {
    expect(
      await transform(`
function App(props) {
  let count = $signal(0);
  const message = $memo(\`Count: \${count}\`);
  const step = props.step;
  $effect(() => {
    render(message, count, step);
  });
}
`),
    ).toMatchSnapshot();
  });
  it('captures setters for writes', async () => {
    expect(
      await transform(`
function App() {
  let count = $signal(0);
  $effect(() => {
    count += 1;
  });
  $effect(() => {
    count = compute(count);
  });
}
`),
    ).toMatchSnapshot();
  });
  it('does not capture module-scope plain values', async () => {
    expect(
      await transform(`
const CONFIG = { step: 1 };
let count = $signal(0);
$effect(() => {
  advance(count, CONFIG.step);
});
`),
    ).toMatchSnapshot();
  });
  it('stays inline when the callback writes plain outer variables', async () => {
    expect(
      await transform(`
function App() {
  let el;
  let count = $signal(0);
  $effect(() => {
    el = render(count);
  });
}
`),
    ).toMatchSnapshot();
  });
  it('stays inline when the callback uses this', async () => {
    expect(
      await transform(`
class Widget {
  attach() {
    let count = $signal(0);
    $effect(function () {
      this.render(count);
    });
  }
}
`),
    ).toMatchSnapshot();
  });
  it('supports concise bodies', async () => {
    expect(
      await transform(`
let count = $signal(0);
$effect(() => track(count));
`),
    ).toMatchSnapshot();
  });
  it('passes options through', async () => {
    expect(
      await transform(`
let count = $signal(0);
$effect(() => {
  track(count);
}, { defer: true });
`),
    ).toMatchSnapshot();
  });
  it('supports nested effects', async () => {
    expect(
      await transform(`
function App() {
  let count = $signal(0);
  $effect(() => {
    outer(count);
    $effect(() => {
      inner(count);
    });
  });
}
`),
    ).toMatchSnapshot();
  });
  it('hoists multiple callbacks in order', async () => {
    expect(
      await transform(`
let a = $signal(0);
let b = $signal(0);
$effect(() => {
  first(a);
});
$effect(() => {
  second(b);
});
`),
    ).toMatchSnapshot();
  });
  it('transforms $renderEffect the same way', async () => {
    expect(
      await transform(`
let title = $signal('');
$renderEffect(() => {
  el.title = title;
});
`),
    ).toMatchSnapshot();
  });
  it('rejects callbacks with parameters', async () => {
    await expect(
      transform('$effect((value) => console.log(value));'),
    ).rejects.toThrow('callbacks take no parameters');
  });
  it('rejects async callbacks', async () => {
    await expect(
      transform('$effect(async () => { await work(); });'),
    ).rejects.toThrow('must be synchronous');
  });
});
