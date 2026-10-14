import { describe, expect, it } from 'vitest';
import transform from './util';

describe('$component', () => {
  it('destructures object-pattern props', () => {
    expect(
      transform(`
const App = $component(({ name, count = 0 }) => {
  return <div>{name}: {count}</div>;
});
`),
    ).toMatchSnapshot();
  });
  it('supports concise bodies', () => {
    expect(
      transform(`
const App = $component(({ name }) => <div>{name}</div>);
`),
    ).toMatchSnapshot();
  });
  it('supports rest props', () => {
    expect(
      transform(`
const App = $component(({ name, ...rest }) => <div {...rest}>{name}</div>);
`),
    ).toMatchSnapshot();
  });
  it('leaves plain parameters alone', () => {
    expect(
      transform(`
const App = $component((props) => <div>{props.name}</div>);
`),
    ).toMatchSnapshot();
  });
});
