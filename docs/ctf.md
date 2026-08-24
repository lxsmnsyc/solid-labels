# Compile-Time Functions

Compile-time functions (CTFs) look like regular calls but are erased at build
time and replaced with Solid 2.0 primitives. They are declared globally by
`solid-labels` — no imports needed — and every emitted Solid API is
auto-imported in the output.

All examples below show real compiler output (production mode; `dev: true`
additionally injects `name` options for signals and memos).

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
static object/array) is stored as-is. A non-static initializer — or one that
reads another reactive variable — is wrapped in a compute function, producing
Solid 2.0's _writable derived_ form:

```js
let value = $signal(foo());
let count = $signal(0);
let doubled = $signal(count * 2);
```

```js
let [value, setvalue_1] = _createSignal(() => foo());
let [count, setcount_1] = _createSignal(0);
let [doubled, setdoubled_1] = _createSignal(() => count() * 2);
```

`doubled` recomputes from `count` until it is written, then holds the written
value — exactly `createSignal(fn)` semantics. Pass a function explicitly
(`$signal(() => expr)`) to opt in regardless of the initializer's shape.

```js
let count = $signal(0);
console.log(count);
count = 10;
count += 1;
count++;
```

```js
import { createSignal as _createSignal } from 'solid-js';

let [count, setcount_1] = _createSignal(0);
console.log(count());
setcount_1(() => 10);
setcount_1((current_1) => (current_1 += 1));
setcount_1((current_2) => ++current_2);
```

Assignments whose right side awaits or yields are split so the setter never
captures the promise:

```js
async function example() {
  count = await asyncValue();
}
```

```js
async function example() {
  const tmp_1 = await asyncValue();
  setcount_1(() => tmp_1);
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

Declares a derived variable. Reads compile to accessor calls; writes are a
compile error.

```js
let count = $signal(0);
const message = $memo(`Count: ${count}`);
console.log(message);
```

```js
import { createSignal as _createSignal } from 'solid-js';
import { createMemo as _createMemo } from 'solid-js';

let [count, setcount_1] = _createSignal(0);
const message = _createMemo(() => `Count: ${count()}`);
console.log(message());
```

### `$`

Shorthand with two forms: in a variable declaration it is `$memo`; as a
statement the expression is compiled exactly like an [`$effect`](#effect-and-rendereffect)
body — captured identifiers, generated compute phase, hoisted callback.

```js
let count = $signal(0);
const message = $(`Count: ${count}`);
$(console.log(message));
```

```js
import { createSignal as _createSignal } from 'solid-js';
import { createMemo as _createMemo } from 'solid-js';
import { createEffect as _createEffect } from 'solid-js';

let [count, setcount_1] = _createSignal(0);
const message = _createMemo(() => `Count: ${count()}`);
_createEffect(() => [message()], effectCallback_1);

function effectCallback_1([message]) {
  console.log(message);
}
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
2. The generated compute phase returns their current values — signals and
   memos are _read there_, so that phase does the tracking.
3. The callback receives the values as a destructured array parameter; its
   body reads plain values and stays untracked.

```js
function App() {
  let bar = $signal(someValue());
  $effect(() => {
    foo(bar);
  });
}
```

```js
import { createSignal as _createSignal } from 'solid-js';
import { createEffect as _createEffect } from 'solid-js';

function App() {
  let [bar, setbar_1] = _createSignal(() => someValue());
  _createEffect(() => [bar()], effectCallback_1);
}

function effectCallback_1([bar]) {
  foo(bar);
}
```

The callback is hoisted to module level as a named function whenever that is
safe. It stays inline — with the same array parameter — when the callback:

- writes to a plain (non-signal) outer variable, which must keep closure
  semantics, or
- uses `this`, `super`, or `arguments`.

```js
function App() {
  let el;
  let count = $signal(0);
  $effect(() => {
    el = render(count);
  });
}
```

```js
function App() {
  let el;
  let [count, setcount_1] = _createSignal(0);
  _createEffect(
    () => [count()],
    ([count]) => {
      el = render(count);
    },
  );
}
```

Signal writes inside the callback work — the compiler captures the setter:

```js
$effect(() => {
  count += 1;
});
```

```js
_createEffect(() => [setcount_1], effectCallback_1);

function effectCallback_1([setcount_1]) {
  setcount_1((current_1) => (current_1 += 1));
}
```

Rules:

- The callback takes **no parameters** — captured values are injected by the
  compiler.
- The callback must be synchronous (no `async`, no generators).
- Module-scope plain values are not captured; they resolve directly.
- A function returned from the callback is the **cleanup**: it runs before
  the next application and on dispose, exactly as in `createEffect`. (The
  `$(expr);` statement form discards the expression value — use the callback
  form when you need cleanup.)
- An optional second argument is passed through as `EffectOptions`
  (`{ defer: true }`, …).

`$renderEffect` compiles identically to `createRenderEffect`. Reach for it
only when authoring renderer plumbing.

### `$trackedEffect`

Alias for `createTrackedEffect` — the single-callback tracked form, where the
callback itself is the tracking scope. Use it when value capture is not what
you want (e.g. conditional reads).

### `$untrack`

```ts
function $untrack<T>(value: T): T;
```

Compiles to `untrack`, wrapping the value in an arrow function.

```js
const value = $untrack(count);
```

```js
import { untrack as _untrack } from 'solid-js';

const value = _untrack(() => count());
```

> Solid 2.0 batches writes by default, so there is no `$batch`. Use `$flush`
> to apply queued writes synchronously.

### `$root`, `$reaction`, `$flush`

Aliases for `createRoot`, `createReaction` and `flush`.

## Lifecycles

- `$settled` → `onSettled` — runs once after the current activity settles;
  return a cleanup function for teardown. This replaces the 1.x
  `onMount`/`onCleanup` pairing for component-level lifecycle.
- `$cleanup` → `onCleanup` — reactive cleanup inside computations
  (library/primitive internals).

```js
$settled(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
});
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

```js
const save = $action(function* (todo) {
  yield api.add(todo);
  $refresh(todos);
});
const settled = await $resolve(user);
```

## Objects

### `$destructure`

```ts
function $destructure<T>(value: T): T;
```

Destructures an object or array while retaining reactivity: every leaf
becomes an accessor under its original name; rest elements compile to `omit`.
Supports nesting, defaults, and computed keys.

```js
let {
  a: { b, c },
  b: { d = defaultD, e = compute() },
  ...f
} = $destructure(x);
console.log(b, c, d, e, f);
```

```js
import { createMemo as _createMemo } from 'solid-js';
import { omit as _omit } from 'solid-js';

let prop_1 = () => x.a,
  b = () => prop_1().b,
  c = () => prop_1().c,
  prop_2 = () => x.b,
  def_1 = defaultD,
  d = () => {
    const value_1 = prop_2().d;
    return value_1 === void 0 ? def_1 : value_1;
  },
  def_2 = _createMemo(() => compute()),
  e = () => {
    const value_2 = prop_2().e;
    return value_2 === void 0 ? def_2() : value_2;
  },
  f = _omit(x, 'a', 'b');
console.log(b(), c(), d(), e(), f);
```

If the source is itself reactive, every property access re-reads it:

```js
let state = $signal({ a: 1 });
const { a } = $destructure(state);
```

```js
let [state, setstate_1] = _createSignal({ a: 1 });
const a = () => state().a;
```

### `$component`

Wraps a component function and turns an object-pattern parameter into a
reactive destructure — props stay live even though they look destructured.

```js
const App = $component(({ name, count = 0 }) => {
  return (
    <div>
      {name}: {count}
    </div>
  );
});
```

```js
const App = (props_1) => {
  const name = () => props_1.name,
    def_1 = 0,
    count = () => {
      const value_1 = props_1.count;
      return value_1 === void 0 ? def_1 : value_1;
    };
  return (
    <div>
      {name()}: {count()}
    </div>
  );
};
```

### `$merge` and `$omit`

Aliases for `merge` (formerly `mergeProps`) and `omit` (formerly
`splitProps`).

```js
const merged = $merge(defaults, props);
const rest = $omit(props, 'class', 'style');
```

### `$getter`, `$setter` and `$property`

Expose a reactive variable as a live object property. Only valid as object
property values.

```js
let count = $signal(0);
const a = { value: $getter(count) };
const b = { value: $setter(count) };
const c = { value: $property(count) };
```

```js
let [count, setcount_1] = _createSignal(0);
const a = {
  get value() {
    return count();
  },
};
const b = {
  set value(param_1) {
    setcount_1(() => param_1);
  },
};
const c = {
  get value() {
    return count();
  },
  set value(param_2) {
    setcount_1(() => param_2);
  },
};
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
uses `{ keyed: false }` — `indexArray` is gone in 2.0.

```js
let list = $signal([]);
const squares = $mapArray(list, (value) => value ** 2);
```

```js
let [list, setlist_1] = _createSignal([]);
const squares = _mapArray(
  () => list(),
  (value) => value ** 2,
);
```

### `$repeat`

```ts
function $repeat<U>(
  count: number,
  mapFn: (i: number) => U,
  options?: { from?: number; fallback?: Accessor<any>; name?: string },
): U[];
```

Compiles to `repeat` — count-driven rendering, the underlying helper of
`<Repeat>`.

```js
let total = $signal(10);
const rows = $repeat(total, (index) => index * 2);
```

```js
let [total, settotal_1] = _createSignal(10);
const rows = _repeat(
  () => total(),
  (index) => index * 2,
);
```

## Component APIs

### `$uid`

Alias for `createUniqueId`.

### `$lazy`

```ts
function $lazy<T extends Component<any>>(
  fn: Promise<{ default: T }>,
): T & {
  preload: () => void;
};
```

```js
const Page = $lazy(import('./Page'));
```

```js
import { lazy as _lazy } from 'solid-js';

const Page = _lazy(() => import('./Page'));
```

### `$children`

Resolves children into an accessor variable.

```js
const nodes = $children(props.children);
console.log(nodes);
```

```js
import { children as _children } from 'solid-js';

const nodes = _children(() => props.children);
console.log(nodes());
```

### Context

```js
const CounterContext = $createContext(0);
const value = $useContext(CounterContext);
```

Compiles to `createContext` / `useContext`. In 2.0 the context value _is_ the
provider: `<CounterContext value={10}>...</CounterContext>`.

### Owner

`$owner` → `getOwner`, `$runWithOwner` → `runWithOwner`.

## Refs and Derefs

Opt in and out of the variable syntax — for returning real signal tuples or
adopting them from third-party code.

```ts
function $refSignal<T>(value: T): [Accessor<T>, Setter<T>];
function $refMemo<T>(value: T): Accessor<T>;
function $get<T>(value: T): Accessor<T>;
function $set<T>(value: T): Setter<T>;
function $derefSignal<T>(value: [Accessor<T>, Setter<T>]): T;
function $derefMemo<T>(value: Accessor<T>): T;
```

```js
let count = $signal(0);
const tuple = $refSignal(count);
const read = $get(count);
const write = $set(count);

let adopted = $derefSignal(useCounter());
adopted += 1;
```

```js
let [count, setcount_1] = _createSignal(0);
const tuple = [count, setcount_1];
const read = count;
const write = setcount_1;

let [adopted, setadopted_1] = useCounter();
setadopted_1((current_1) => (current_1 += 1));
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

`createMutable` and `produce` are gone; store setters are draft-first.

## Components

Unshadowed component identifiers are auto-imported, in JSX and in expression
positions: `For`, `Show`, `Switch`, `Match`, `Repeat`, `Errored`, `Loading`,
`Reveal` from `solid-js`; `Dynamic`, `Portal`, `HydrationScript`, `Hydration`,
`NoHydration` from `@solidjs/web`.

The `solid:` JSX namespace maps the same set — see
[`docs/namespace.md`](./namespace.md).

## Tooling

### TypeScript

On any `d.ts` file, add:

```ts
/// <reference types="solid-labels" />
```

All CTFs are declared globally, so no imports are needed.

### Disabling CTFs

```js
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

const { code, map } = await compile('App.tsx', source, { dev: true });
```

The compiler parses with [oxc-parser](https://www.npmjs.com/package/oxc-parser)
and emits span edits through `magic-string`, so the untouched parts of your
code keep their formatting and the source map is high-resolution.
