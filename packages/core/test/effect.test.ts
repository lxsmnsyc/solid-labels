import { describe, expect, it } from 'vitest';
import transform from './util';

describe('$effect', () => {
  it('captures outer identifiers and hoists the callback', () => {
    expect(
      transform(`
function App() {
  let bar = $signal(someValue());
  $effect(() => {
    foo(bar);
  });
}
`),
    ).toMatchSnapshot();
  });
  it('captures signals, memos and plain locals', () => {
    expect(
      transform(`
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
  it('captures setters for writes', () => {
    expect(
      transform(`
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
  it('does not capture module-scope plain values', () => {
    expect(
      transform(`
const CONFIG = { step: 1 };
let count = $signal(0);
$effect(() => {
  advance(count, CONFIG.step);
});
`),
    ).toMatchSnapshot();
  });
  it('stays inline when the callback writes plain outer variables', () => {
    expect(
      transform(`
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
  it('stays inline when the callback uses this', () => {
    expect(
      transform(`
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
  it('supports concise bodies', () => {
    expect(
      transform(`
let count = $signal(0);
$effect(() => track(count));
`),
    ).toMatchSnapshot();
  });
  it('passes options through', () => {
    expect(
      transform(`
let count = $signal(0);
$effect(() => {
  track(count);
}, { defer: true });
`),
    ).toMatchSnapshot();
  });
  it('preserves a returned cleanup function', () => {
    expect(
      transform(`
function App() {
  let count = $signal(0);
  $effect(() => {
    const id = setInterval(() => poll(), count);
    return () => clearInterval(id);
  });
}
`),
    ).toMatchSnapshot();
  });

  it('supports nested effects', () => {
    expect(
      transform(`
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
  it('hoists multiple callbacks in order', () => {
    expect(
      transform(`
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
  it('transforms $renderEffect the same way', () => {
    expect(
      transform(`
let title = $signal('');
$renderEffect(() => {
  el.title = title;
});
`),
    ).toMatchSnapshot();
  });
  it('rejects callbacks with parameters', () => {
    expect(() => transform('$effect((value) => console.log(value));')).toThrow(
      'callbacks take no parameters',
    );
  });
  it('rejects async callbacks', () => {
    expect(() => transform('$effect(async () => { await work(); });')).toThrow(
      'must be synchronous',
    );
  });
});
