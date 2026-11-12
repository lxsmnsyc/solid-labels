import { describe, expect, it } from 'vitest';
import transform from './util';

describe('auto-import aliases', () => {
  it('compiles reactivity aliases', () => {
    expect(
      transform(`
const dispose = $root(() => setup());
const track = $reaction(() => console.log('reacted'));
$flush();
`),
    ).toMatchSnapshot();
  });
  it('compiles lifecycle aliases', () => {
    expect(
      transform(`
$settled(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
});
$cleanup(() => dispose());
`),
    ).toMatchSnapshot();
  });
  it('compiles async aliases', () => {
    expect(
      transform(`
const save = $action(function* (todo) {
  yield api.add(todo);
  $refresh(todos);
});
const pending = $isPending(() => user());
const peeked = $latest(id);
$affects(user);
`),
    ).toMatchSnapshot();
  });
  it('compiles component API aliases', () => {
    expect(
      transform(`
const id = $uid();
const merged = $merge(defaults, props);
const rest = $omit(props, 'class');
const Ctx = $createContext(0);
const value = $useContext(Ctx);
const owner = $owner();
$runWithOwner(owner, () => work());
`),
    ).toMatchSnapshot();
  });
  it('compiles store aliases', () => {
    expect(
      transform(`
const [store, setStore] = $store({ list: [] });
const items = $projection(() => api.list(), [], { key: 'id' });
const [name, setName] = $optimistic('Alice');
const [todos, setTodos] = $optimisticStore(() => api.list(), []);
setStore(s => { $reconcile(data, 'id')(s.list); });
const plain = $snapshot(store);
const tracked = $deep(store);
`),
    ).toMatchSnapshot();
  });
  it('compiles arrow CTFs', () => {
    expect(
      transform(`
let count = $signal(0);
const value = $untrack(count);
const Page = $lazy(import('./Page'));
const settled = $resolve(user);
`),
    ).toMatchSnapshot();
  });
  it('compiles the remaining reactive aliases', () => {
    expect(
      transform(`
$onFlush(() => close());
const owner = $owner();
const gone = $isDisposed(owner);
const watching = $observer();
const ticks = $from((next) => {
  const id = setInterval(next, 1000);
  return () => clearInterval(id);
});
const resolved = $flatten(props.children);
const wrappable = $isWrappable(value);
`),
    ).toMatchSnapshot();
  });
  it('compiles $from inside a memo callback', () => {
    expect(
      transform(`
const position = $memo(() => $from((next) => watch(next)));
console.log(position);
`),
    ).toMatchSnapshot();
  });
  it('compiles web aliases', () => {
    expect(
      transform(`
$useHead({ tag: 'title', props: { children: 'Home' } });
`),
    ).toMatchSnapshot();
  });
  it('compiles $until and $clientOnly', () => {
    expect(
      transform(`
await $until(() => ready());
await $until(done, { timeout: 500 });
const routes = $lazyModule(import('./routes'));
const Chart = $clientOnly(import('./Chart'));
const Named = $clientOnly(import('./Chart'), { lazy: true, export: 'Chart' });
`),
    ).toMatchSnapshot();
  });
  it('respects shadowing', () => {
    expect(
      transform(`
const $merge = (a, b) => ({ ...a, ...b });
const merged = $merge(a, b);
`),
    ).toMatchSnapshot();
  });
});
