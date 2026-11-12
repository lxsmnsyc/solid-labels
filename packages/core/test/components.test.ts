import { describe, expect, it } from 'vitest';
import transform from './util';

describe('components', () => {
  it('auto-imports components in JSX', () => {
    expect(
      transform(`
let count = $signal(0);
const view = (
  <Show when={count % 2 === 0} fallback={<h1>Odd</h1>}>
    <h1>Even</h1>
  </Show>
);
`),
    ).toMatchSnapshot();
  });
  it('auto-imports 2.0 components', () => {
    expect(
      transform(`
const view = (
  <Errored fallback={(err, reset) => <button onClick={reset}>retry</button>}>
    <Loading fallback={<Spinner />}>
      <Repeat count={10}>{(i) => <Row index={i} />}</Repeat>
    </Loading>
  </Errored>
);
`),
    ).toMatchSnapshot();
  });
  it('supports the solid: namespace', () => {
    expect(
      transform(`
const view = (
  <solid:errored fallback={report}>
    <solid:loading fallback={<Spinner />}>
      <solid:for each={items()}>{(item) => <Row item={item} />}</solid:for>
    </solid:loading>
  </solid:errored>
);
`),
    ).toMatchSnapshot();
  });
  it('respects shadowed components', () => {
    expect(
      transform(`
import { Show } from './my-show';
const view = <Show when={cond}>hi</Show>;
`),
    ).toMatchSnapshot();
  });
});
