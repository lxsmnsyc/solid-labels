# Compile-time functions

Compile-time functions (CTFs) look like regular calls but are erased at build
time and replaced with Solid 2.0 primitives. `solid-labels` declares them
globally, so they need no imports, and every Solid API the output uses is
imported for you.

Every example on this page is compiled by the real compiler when the site is
built. Where the `dev` build differs from the `prod` build, a switch appears
above the output. In `dev`, signals and memos also get a `name` option.

## Reactivity

### `$signal`

```ts
function $signal<T>(): T | undefined;
function $signal<T>(
  value: T,
  options?: {
    equals?: false | ((prev: T, next: T) => boolean);
    name?: string;
    ownedWrite?: boolean;
    unobserved?: () => void;
  },
): T;
```

Declares a signal variable. Reads compile to accessor calls, writes to setter
calls. Only allowed as a variable initializer.

**Memoized signal convention:** a static initializer (literal, identifier,
static object/array) is stored as-is. A non-static initializer, or one that
reads another reactive variable, is wrapped in a compute function, producing
Solid 2.0's _writable derived_ form:

```ctf tsx
let value = $signal(foo());
let count = $signal(0);
let doubled = $signal(count * 2);
```

`doubled` recomputes from `count` until it is written, then holds the written
value, as `createSignal(fn)` does. Pass a function explicitly
(`$signal(() => expr)`) to opt in regardless of the initializer's shape.

```ctf tsx
let count = $signal(0);
console.log(count);
count = 10;
count += 1;
count++;
```

Assignments whose right side awaits or yields are split so the setter never
captures the promise:

```ctf tsx
let count = $signal(0);

async function example() {
  count = await asyncValue();
}
```

### `$memo`

```ts
function $memo<T>(
  value: T,
  options?: {
    equals?: false | ((prev: T, next: T) => boolean);
    name?: string;
    lazy?: boolean;
    unobserved?: () => void;
  },
): T;
```

Declares a derived variable. Reads compile to accessor calls. Writes are a
compile error.

```ctf tsx
let count = $signal(0);
const message = $memo(`Count: ${count}`);
console.log(message);
```

### `$`

Shorthand with two forms: in a variable declaration it is `$memo`; as a
statement the expression is compiled exactly like an [`$effect`](#effect-and-rendereffect)
body: it captures identifiers, generates a compute phase and hoists the callback.

```ctf tsx
let count = $signal(0);
const message = $(`Count: ${count}`);
$(console.log(message));
```

The expression may not `await` or `yield`, and its value is discarded (it is
emitted as a statement, so a function value is never mistaken for an effect
cleanup).

### `$effect` and `$renderEffect`

```ts
function $effect(callback: () => (() => void) | void, options?: EffectOptions): void;
function $renderEffect(callback: () => (() => void) | void, options?: EffectOptions): void;
```

Solid 2.0 effects have two phases: a tracked `compute` function and an
untracked `effect` function. `$effect` compiles the familiar single-callback
form into both phases mechanically:

1. The compiler collects every outer identifier the callback uses.
2. The generated compute phase returns their current values. Signals and
   memos are _read there_, so that phase does the tracking.
3. The callback receives the values as a destructured array parameter. Its
   body reads plain values and stays untracked.

```ctf tsx
function App() {
  let bar = $signal(someValue());
  $effect(() => {
    foo(bar);
  });
}
```

The callback is hoisted to module level as a named function whenever that is
safe. Its name comes from the nearest enclosing named scope, such as `AppEffect_1`
inside `function App()` (also picked up through `const App = ...`,
`$component(...)`, object methods, and assignments), with `effectCallback_1`
as the module-level fallback. It stays inline, with the same array parameter, when the callback:

- writes to a plain (non-signal) outer variable, which must keep closure
  semantics, or
- uses `this`, `super`, or `arguments`.

```ctf tsx
function App() {
  let el;
  let count = $signal(0);
  $effect(() => {
    el = render(count);
  });
}
```

Signal writes inside the callback work. The compiler captures the setter:

```ctf tsx
let count = $signal(0);
$effect(() => {
  count += 1;
});
```

Rules:

- The callback takes **no parameters**. Captured values are injected by the
  compiler.
- The callback must be synchronous (no `async`, no generators).
- Module-scope plain values are not captured. They resolve directly.
- Reads wrapped in `$untrack(...)` are **excluded from the tracked source
  list**: the signal's accessor is passed through the capture array (a stable
  identity that never triggers the effect) and the body performs a real
  untracked read, `untrack(() => count())`, at effect time. A signal read
  both inside and outside `$untrack` in the same callback is tracked.
- A function returned from the callback is the **cleanup**: it runs before
  the next application and on dispose, exactly as in `createEffect`. (The
  `$(expr);` statement form discards the expression value. Use the callback
  form when you need cleanup.)
- An optional second argument is passed through as `EffectOptions`
  (`{ defer: true }`, …).

`$renderEffect` compiles identically to `createRenderEffect`. Reach for it
only when authoring renderer internals.

```ctf tsx
let width = $signal(0);

$renderEffect(() => {
  element.style.width = `${width}px`;
});
```

### `$untrack`

```ts
function $untrack<T>(value: T): T;
```

Compiles to `untrack`, wrapping the value in an arrow function.

```ctf tsx
let count = $signal(0);
const value = $untrack(count);
```

Inside an [`$effect`](#effect-and-rendereffect) callback, `$untrack` also
changes what the effect tracks: reads wrapped in it are excluded from the
generated source list.

> Solid 2.0 batches writes by default, so there is no `$batch`. Use `$flush`
> to apply queued writes synchronously.

### `$root`, `$reaction`, `$flush`, `$onFlush`

Aliases for `createRoot`, `createReaction`, `flush` and `onFlush`.
`$onFlush(callback)` runs the callback once after the pending flush.

```ctf tsx
let count = $signal(0);

const dispose = $root((dispose) => {
  $onFlush(() => console.log('flushed'));
  return dispose;
});

const track = $reaction(() => console.log('changed'));

count += 1;
$flush();
```

### `$owner`, `$observer`, `$isDisposed`

Aliases for `getOwner`, `getObserver` and `isDisposed`. `$observer()` returns
the current tracking scope, or `null` outside one.
`$isDisposed(owner)` tells a late callback whether its owner is gone.

```ctf tsx
const owner = $owner();
const scope = $observer();
queueMicrotask(() => {
  if (!$isDisposed(owner)) {
    $runWithOwner(owner, work);
  }
});
```

## Lifecycles

- `$settled` → `onSettled`. Runs once after the current activity settles.
  Return a cleanup function for teardown. This replaces the 1.x
  `onMount`/`onCleanup` pairing for component-level lifecycle.
- `$cleanup` → `onCleanup`. Reactive cleanup inside computations
  (library/primitive internals).

```ctf tsx
$settled(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
});

$cleanup(() => console.log('the owner is disposed'));
```

## Async

Compile-time aliases for the Solid 2.0 async surface:

- `$action` → `action`
- `$isPending` → `isPending`
- `$latest` → `latest`
- `$refresh` → `refresh`
- `$affects` → `affects`
- `$flush` → `flush`
- `$resolve` → `resolve` (the value is wrapped in an arrow function)
- `$until` → `until` (the predicate is wrapped in an arrow function)
- `$from` → `from`. Turns a subscription, an Observable or an async
  iterable into an async iterable for a computation

```ctf tsx
const save = $action(function* (todo) {
  yield api.add(todo);
  $refresh(todos);
});
const settled = await $resolve(user);
await $until(user, { timeout: 5000 });
const fresh = $latest(() => user);
$affects(save);
const position = $memo(() =>
  $from((next, error) => {
    const id = navigator.geolocation.watchPosition(next, error);
    return () => navigator.geolocation.clearWatch(id);
  }),
);
```

### `$deferred`

Declaration CTF for `createDeferred`. The variable becomes an accessor under
its original name, like `$memo`. After its first answer, a refetch keeps the
previous value until the new one lands, and `$isPending` reports the refetch.
The value is wrapped in an arrow function.

In 1.x, `$deferred` lagged a sync signal and took `timeoutMs`. In 2.0 it wraps
an async computation, and `timeoutMs` is gone.

```ctf tsx
let period = $signal('week');
const rows = $deferred(fetchRows(period));
const stale = $isPending(() => rows);
```

## Objects

### `$destructure`

```ts
function $destructure<T>(value: T): T;
```

Destructures an object or array while retaining reactivity: every leaf
becomes an accessor under its original name. Rest elements compile to `omit`.
Supports nesting, defaults, and computed keys.

```ctf tsx
let {
  a: { b, c },
  b: { d = defaultD, e = compute() },
  ...f
} = $destructure(x);
console.log(b, c, d, e, f);
```

If the source is itself reactive, every property access re-reads it:

```ctf tsx
let state = $signal({ a: 1 });
const { a } = $destructure(state);
```

### `$component`

Wraps a component function and turns an object-pattern parameter into a
reactive destructure. Props stay live even though they look destructured.

```ctf tsx
const App = $component(({ name, count = 0 }) => {
  return (
    <div>
      {name}: {count}
    </div>
  );
});
```

### `$merge` and `$omit`

Aliases for `merge` (formerly `mergeProps`) and `omit` (formerly
`splitProps`).

```ctf tsx
const merged = $merge(defaults, props);
const rest = $omit(props, 'class', 'style');
```

### `$getter`, `$setter` and `$property`

Expose a reactive variable as a live object property. Only valid as object
property values.

```ctf tsx
let count = $signal(0);
const a = { value: $getter(count) };
const b = { value: $setter(count) };
const c = { value: $property(count) };
```

## Arrays

### `$mapArray`

```ts
function $mapArray<T, U>(
  arr: readonly T[] | undefined | null | false,
  mapFn: (v: T, i: Accessor<number>) => U,
  options?: { keyed?: true; fallback?: Accessor<any>; name?: string },
): U[];
function $mapArray<T, U>(
  arr: readonly T[] | undefined | null | false,
  mapFn: (v: Accessor<T>, i: number) => U,
  options: { keyed: false; fallback?: Accessor<any>; name?: string },
): U[];
```

Compiles to `mapArray`; the result is an accessor variable. Non-keyed mapping
uses `{ keyed: false }`. `indexArray` is gone in 2.0.

```ctf tsx
let list = $signal([]);
const squares = $mapArray(list, (value) => value ** 2);
```

### `$repeat`

```ts
function $repeat<U>(
  count: number,
  mapFn: (i: number) => U,
  options?: { from?: number; fallback?: Accessor<any>; name?: string },
): U[];
```

Compiles to `repeat`. Count-driven rendering, the underlying helper of
`<Repeat>`.

```ctf tsx
let total = $signal(10);
const rows = $repeat(total, (index) => index * 2);
```

## Component APIs

### `$uid`

Alias for `createUniqueId`.

```ctf tsx
const id = $uid();
```

### `$lazy`

```ts
function $lazy<T extends Component<any>>(
  fn: Promise<{ default: T }>,
): T & {
  preload: () => void;
};
```

```ctf tsx
const Page = $lazy(import('./Page'));
```

### `$lazyModule`

Wraps a dynamic import for a module that is not a component, like `$lazy`
does for a component. The promise is wrapped in an arrow function. The result
is callable and has `preload()` and `peek()`.

```ctf tsx
const admin = $lazyModule(import('./admin/routes'));
```

### `$children`

Resolves children into an accessor variable.

```ctf tsx
const nodes = $children(props.children);
console.log(nodes);
```

### Context

```ctf tsx
const CounterContext = $createContext(0);
const value = $useContext(CounterContext);
```

Compiles to `createContext` / `useContext`. In 2.0 the context value _is_ the
provider: `<CounterContext value={10}>...</CounterContext>`.

### Owner

`$owner` → `getOwner`, `$runWithOwner` → `runWithOwner`.

## Refs and Derefs

Opt in and out of the variable syntax. Use these to return real signal tuples or
to adopt them from third-party code.

```ts
function $refSignal<T>(value: T): [Accessor<T>, Setter<T>];
function $refMemo<T>(value: T): Accessor<T>;
function $get<T>(value: T): Accessor<T>;
function $set<T>(value: T): Setter<T>;
function $derefSignal<T>(value: [Accessor<T>, Setter<T>]): T;
function $derefMemo<T>(value: Accessor<T>): T;
```

```ctf tsx
let count = $signal(0);
const tuple = $refSignal(count);
const read = $get(count);
const write = $set(count);

let adopted = $derefSignal(useCounter());
adopted += 1;

const double = $memo(count * 2);
const accessor = $refMemo(double);
const external = $derefMemo(useDouble());
console.log(external);
```

## Stores

Store APIs live in `solid-js` on Solid 2.0:

- `$store` → `createStore`
- `$projection` → `createProjection`
- `$optimistic` → `createOptimistic`
- `$optimisticStore` → `createOptimisticStore`
- `$reconcile` → `reconcile`
- `$snapshot` → `snapshot`
- `$deep` → `deep`
- `$isWrappable` → `isWrappable`

```ctf tsx
const [state, setState] = $store({ user: { name: 'Ada' }, items: [] });
const [view] = $projection((draft) => {
  draft.count = state.items.length;
}, { count: 0 });
const [likes, setLikes] = $optimistic(0);
const [todos, setTodos] = $optimisticStore({ list: [] });

setState((draft) => {
  draft.user = $reconcile(next.user);
});

console.log($snapshot(state), $deep(state), $isWrappable(state));
```

`createMutable` and `produce` are gone. Store setters are draft-first.

## Children

- `$flatten` → `flatten`

```ctf tsx
const flat = $flatten(props.children);
```

## Web

From `@solidjs/web`:

- `$useHead` → `useHead`
- `$clientOnly` → `clientOnly`. Like `$lazy`, the promise is wrapped in an
  arrow function: `$clientOnly(import('./Chart'))`.

```ctf tsx
$useHead({ tag: 'title', props: { children: 'Docs' } });

const Chart = $clientOnly(import('./Chart'));
```

`dynamic`, `render`, `hydrate`, `isServer`, `isDev`, `isHydrating`,
`isHydratable` and `onHydrationEnd` have no CTF. Import
them from `@solidjs/web`.

## Components

Unshadowed component identifiers are auto-imported, in JSX and in expression
positions: `For`, `Show`, `Switch`, `Match`, `Repeat`, `Errored`, `Loading`,
`Reveal` from `solid-js`; `Portal`, `HydrationScript`, `Hydration`,
`NoHydration` from `@solidjs/web`. `Dynamic` is not auto-imported, because
Solid deprecates it. Use `dynamic()` from `@solidjs/web`.

```ctf jsx
const view = (
  <>
    <For each={list}>{(item) => <li>{item}</li>}</For>
    <Show when={user} fallback={<p>Signed out</p>}>
      <p>Signed in</p>
    </Show>
    <Switch fallback={<p>Not found</p>}>
      <Match when={route === 'home'}>
        <p>Home</p>
      </Match>
    </Switch>
    <Repeat count={3}>{(index) => <i>{index}</i>}</Repeat>
    <Errored fallback={<p>Failed</p>}>
      <Panel />
    </Errored>
    <Loading fallback={<p>Loading</p>}>
      <Panel />
    </Loading>
    <Reveal collapsed>
      <Loading>
        <Panel />
      </Loading>
    </Reveal>
    <Portal mount={document.body}>
      <p>Moved</p>
    </Portal>
    <NoHydration>
      <p>Static</p>
      <Hydration>
        <Panel />
      </Hydration>
    </NoHydration>
    <HydrationScript />
  </>
);
```

The `solid:` JSX namespace maps the same set. See
[`solid:` namespace](/docs/namespace). Any other `solid:` element name is a
compile error.

## Tooling

### TypeScript

On any `d.ts` file, add:

```ts
/// <reference types="solid-labels" />
```

All CTFs are declared globally, so no imports are needed.

### Disabling CTFs

```ts
solidLabels({
  disabled: {
    ctf: {
      $signal: true,
    },
  },
});
```

### Programmatic use

```ts
import { compile } from 'solid-labels/compiler';

const { code, map } = compile('App.tsx', source, { dev: true });
```

The compiler parses with [oxc-parser](https://www.npmjs.com/package/oxc-parser)
and emits span edits through `magic-string`, so the untouched parts of your
code keep their formatting and the source map is high-resolution.
