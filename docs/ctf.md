# Compile-Time Functions

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
  }
): T;
```

Compiles into `createSignal`.

```js
let count = $signal(0);
```

becomes

```js
import { createSignal as _createSignal } from "solid-js";

let [_count, _setcount] = _createSignal(0, {
  name: "count"
});
```

`$signal` is only allowed to be used on variable declarations, otherwise it raises a compile-time error.

### `$memo`

```ts
function $memo<T>(
  value: T,
  options?: {
    equals?: false | ((prev: T, next: T) => boolean);
    name?: string;
    lazy?: boolean;
    unobserved?: () => void;
  }
): T;
```

Compiles into `createMemo`.

```js
let count = $signal(0);
const message = $memo(`Count: ${count}`);
```

becomes

```js
import { createMemo as _createMemo } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_count, _setcount] = _createSignal(0, {
  name: "count"
});

const _message = _createMemo(() => `Count: ${_count()}`, {
  name: "message"
});
```

`$memo` is only allowed to be used on variable declarations, otherwise it raises a compile-time error.

### `$`

```ts
function $<T>(value: T): T;
```

Compiles into `createMemo` when used in variable declarations, otherwise it compiles to `createTrackedEffect` when used in single-line statements. If used for other expressions, it raises a compile-time error.

```js
let count = $signal(0);
const message = $(`Count: ${count}`);

$(console.log(message));
```

compiles into

```js
import { createTrackedEffect as _createTrackedEffect } from "solid-js";
import { createMemo as _createMemo } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_count, _setcount] = _createSignal(0, {
  name: "count"
});

const _message = _createMemo(() => `Count: ${_count()}`, {
  name: "message"
});

_createTrackedEffect(() => console.log(_message()));
```

### `$untrack`

```ts
function $untrack<T>(value: T): T;
```

Compiles into `untrack`. Unlike `untrack`, `$untrack` doesn't have to provide an arrow function.

> Solid 2.0 batches writes by default, so the old `$batch` CTF is gone. Use `$flush` if you need to apply queued writes synchronously.

```js
let count = $signal(0);

effect: {
  console.log($untrack(count));
}
```

compiles into

```js
import { untrack as _untrack } from "solid-js";
import { createTrackedEffect as _createTrackedEffect } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_count, _setcount] = _createSignal(0, {
  name: "count"
});

_createTrackedEffect(() => {
  console.log(_untrack(() => _count()));
});
```

### `$effect`, `$trackedEffect` and `$renderEffect`

```ts
const $effect: typeof createEffect;
const $trackedEffect: typeof createTrackedEffect;
const $renderEffect: typeof createRenderEffect;
```

Compiles to `createEffect`, `createTrackedEffect` and `createRenderEffect`, respectively.

In Solid 2.0, `createEffect` and `createRenderEffect` take two phases: a tracked `compute` function and an untracked `effect` function. `createTrackedEffect` is the single-callback form, which is what the `effect` label and the `$` statement compile to.

```js
let x = $signal(0);

$effect(() => x, value => {
  console.log('Count', value);
});
$trackedEffect(() => {
  console.log('Count', x);
});
$renderEffect(() => x, value => {
  console.log('Count', value);
});
```

```js
import { createRenderEffect as _createRenderEffect } from "solid-js";
import { createTrackedEffect as _createTrackedEffect } from "solid-js";
import { createEffect as _createEffect } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_x, _setx] = _createSignal(0, {
  name: "x"
});

_createEffect(() => _x(), value => {
  console.log('Count', value);
});

_createTrackedEffect(() => {
  console.log('Count', _x());
});

_createRenderEffect(() => _x(), value => {
  console.log('Count', value);
});
```

### `$root`

```ts
function $root<T>(value: T): T;
function $root<T>(cb: (dispose: () => void) => T): T;
```

Compiles to `createRoot`. Can be called inline. Arrow function is automatically injected if not provided.

```js
const cleanup = $root((dispose) => {
  renderApp();
  return dispose;
});

$root(renderApp());
```

```js
import { createRoot as _createRoot } from "solid-js";

const cleanup = _createRoot(dispose => {
  renderApp();
  return dispose;
});

_createRoot(() => renderApp());
```

### `$reaction`

This CTF is a compile-time alias for `createReaction`.

## Lifecycles

The following CTFs are compile-time aliases:

- `$cleanup` -> `onCleanup`
- `$settled` -> `onSettled`
- `$mount` -> `onSettled`

`onMount` is gone in Solid 2.0. `onSettled` runs once after the current activity settles and accepts a returned cleanup function, so it covers both mount and unmount.

## Objects

### `$destructure`

```ts
function $destructure<T>(value: T): T;
```

Destructures an object while retaining reactivity. This partially compiles to `omit` if a rest expression is detected.

`$destructure` also supports nested destructures.

Does not support default assignment.

```js
let { a: { b, c }, b: { d = defaultD, e = defaultE }, ...f } = $destructure(x);

effect: {
  console.log(b, c);
}
effect: {
  console.log(d, e);
}
effect: {
  console.log(f);
}
```

```js
import { omit as _omit } from "solid-js";
import { createTrackedEffect as _createTrackedEffect } from "solid-js";
let _prop = () => x.a,
  _prop2 = () => _prop().b,
  _prop3 = () => _prop().c,
  _other2 = _omit(_prop(), "b", "c"),
  _prop4 = () => x.b,
  _def = defaultD,
  _prop5 = () => {
    const _value = _prop4().d;
    return _value === undefined ? _def : _value;
  },
  _def2 = defaultE,
  _prop6 = () => {
    const _value2 = _prop4().e;
    return _value2 === undefined ? _def2 : _value2;
  },
  _other3 = _omit(_prop4(), "d", "e"),
  _other = _omit(x, "a", "b");
_createTrackedEffect(() => {
  console.log(_prop2(), _prop3());
});
_createTrackedEffect(() => {
  console.log(_prop5(), _prop6());
});
_createTrackedEffect(() => {
  console.log(_other);
});
```

### `$merge`

```ts
function $merge<T extends unknown[]>(...args: T): Merge<T>;
```

Merges one or more objects while retaining reactivity. Compiles to `merge` (formerly `mergeProps`).

```js
const mergedObject = $merge(a, b, c, d);
```

```js
import { merge as _merge } from "solid-js";

const mergedObject = _merge(a, b, c, d);
```

### `$omit`

```ts
function $omit<T, K extends readonly (keyof T)[]>(props: T, ...keys: K): Omit<T, K>;
```

Returns a reactive proxy of the object with the given keys hidden. Compiles to `omit` (formerly `splitProps`).

```js
const rest = $omit(props, 'class', 'style');
```

```js
import { omit as _omit } from "solid-js";

const rest = _omit(props, 'class', 'style');
```

### `$component`

A compile-time function used to wrap components and implicitly allow prop destructuring, much like `$destructure`.

```js
$component(({ [x]: { y, ...z } = { y: 10 }, ...a }) => (
  <>
    {y}
    {z}
    {a}
  </>
))
```

```js
import { merge as _merge } from "solid-js";
import { omit as _omit } from "solid-js";
_props => {
  const _def = {
      y: 10
    },
    _prop = () => {
      const _value = _props[x];
      return _value === undefined ? _def : _value;
    },
    _prop2 = () => _prop().y,
    _other2 = _omit(_merge(_prop(), _def), "y"),
    _other = _omit(_props, x);
  return <>
    {_prop2()}
    {_other2}
    {_other}
  </>;
};
```

## Arrays

### `$mapArray`

```ts
function $mapArray<T, U>(
  arr: Accessor<readonly T[] | undefined | null | false>,
  mapFn: (v: T, i: Accessor<number>) => U,
  options?: {
    keyed?: true;
    fallback?: Accessor<any>;
    name?: string;
  },
): U[];
function $mapArray<T, U>(
  arr: Accessor<readonly T[] | undefined | null | false>,
  mapFn: (v: Accessor<T>, i: number) => U,
  options: {
    keyed: false;
    fallback?: Accessor<any>;
    name?: string;
  },
): U[];
```

Compiles to `mapArray`. Automatically treats variable reads as accessor calls like `$memo`. Automatically injects arrow function to `arr`.

```js
let list = $signal([]);
const squaredList = $mapArray(list, (value) => value ** 2);

effect: {
  console.log('1st value', squaredList[0]);
}

list = ['Hello'];
```

```js
import { createTrackedEffect as _createTrackedEffect } from "solid-js";
import { mapArray as _mapArray } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_list, _setlist] = _createSignal([], {
  name: "list"
});

const _squaredList = _mapArray(() => _list(), value => value ** 2);

_createTrackedEffect(() => {
  console.log('1st value', _squaredList()[0]);
});

_setlist(() => ['Hello']);
```

### `$repeat`

```ts
function $repeat<U>(
  count: Accessor<number>,
  mapFn: (i: number) => U,
  options?: {
    from?: Accessor<number | undefined>;
    fallback?: Accessor<any>;
    name?: string;
  },
): U[];
```

Compiles to `repeat`, which replaces `indexArray` for count-driven rendering. Automatically treats variable reads as accessor calls like `$memo`.

```js
let total = $signal(0);
const rows = $repeat(() => total, (index) => index ** 2);

effect: {
  console.log('1st value', rows[0]);
}
```

```js
import { createTrackedEffect as _createTrackedEffect } from "solid-js";
import { repeat as _repeat } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_total, _settotal] = _createSignal(0, {
  name: "total"
});

const _rows = _repeat(() => _total(), index => index ** 2);

_createTrackedEffect(() => {
  console.log('1st value', _rows()[0]);
});
```

> Non-keyed list mapping now lives in `$mapArray` with `{ keyed: false }`; `$indexArray` is gone.

## Component APIs

### `$uid`

```ts
function $uid(): string;
```

Compiles to `createUniqueId`.

```js
const elementID = $uid();
```

```ts
import { createUniqueId as _createUniqueId } from "solid-js";

const elementID = _createUniqueId();
```

### `$lazy`

```ts
function $lazy<T extends Component<any>>(fn: Promise<{ default: T }>): T & {
  preload: () => void;
};
```

Compiles into `lazy`. Arrow function is automatically injected.

```js
const LazyComponent = $lazy(import('./LazyComponent'));
```

```js
import { lazy as _lazy } from "solid-js";

const LazyComponent = _lazy(() => import('./LazyComponent'));
```

### `$children`

```ts
function $children(value: JSX.Element): JSX.Element;
```

Compiles to `children`. Arrow function is automatically injected.

```js
const nodes = $children(props.children);
```

```js
import { children as _children } from "solid-js";

const _nodes = _children(() => props.children);
```

### Context

```ts
function $createContext<T>(): Context<T | undefined>;
function $createContext<T>(defaultValue: T): Context<T>;
function $useContext<T>(context: Context<T>): T;
```

Compiles to `createContext` and `useContext`.

```js
const CounterContext = $createContext(0);

const value = $useContext(CounterContext);
```

```js
import { useContext as _useContext } from "solid-js";
import { createContext as _createContext } from "solid-js";

const CounterContext = _createContext(0);

const value = _useContext(CounterContext);
```

### Async

Transitions are built in on Solid 2.0, so `$startTransition` and `$useTransition` are gone. The following CTFs are compile-time aliases for the async APIs:

- `$action` -> `action`
- `$isPending` -> `isPending`
- `$latest` -> `latest`
- `$refresh` -> `refresh`
- `$affects` -> `affects`
- `$flush` -> `flush`
- `$resolve` -> `resolve` (an arrow function is injected to the value)

### Owner

```ts
function $owner(): Owner | null
function $runWithOwner<T>(o: Owner, fn: () => T): T
```

Compiles to `getOwner` and `runWithOwner`.

## Refs and Derefs

Ref and Deref allows opting in and out of the labels syntax. This is useful for scenarios where we want to return the actual signal tuple instead of the signal value or when we have a third-party utility that we want to opt-into

```ts
function $derefSignal<T>(value: [Accessor<T>, Setter<T>]): T;
function $refSignal<T>(value: T): [Accessor<T>, Setter<T>];
function $derefMemo<T>(value: Accessor<T>): T;
function $refMemo<T>(value: T): Accessor<T>;
```

### `$refSignal`

`$refSignal` returns the signal tuple of a given signal variable.

```js
let count = $signal(0);
const [value, setValue] = $refSignal(count);
```

compiles into

```js
import { createSignal as _createSignal } from "solid-js";

let [_count, _setcount] = _createSignal(0, {
  name: "count"
});

const [value, setValue] = [_count, _setcount];
```

`$refSignal` also works with `signal:` label and `@signal` comment.

### `$refMemo`

`$refMemo` returns the accessor of the given memo variable. This is similar to `() => memoVariable`.

```js
let count = $signal(0);
const message = $memo(`Count: ${count}`);
const getMessage = $refMemo(message);

getMessage();
```

compiles into

```js
import { createMemo as _createMemo } from "solid-js";    
import { createSignal as _createSignal } from "solid-js";

let [_count, _setcount] = _createSignal(0, {
  name: "count"
});

const _message = _createMemo(() => `Count: ${_count()}`, {
  name: "message"
});

const getMessage = _message;
getMessage();
```

`$refMemo` also works  with `memo:` label and `@memo` comment.

### `$get` and `$set`

```ts
function $get<T>(value: T): Accessor<T>;
function $set<T>(value: T): Setter<T>;
```

`$get` returns the accessor for a given signal or memo variable.

```js
let count = $signal(0);
const message = $memo(`Count: ${count}`);
const getMessage = $get(message);
const getCount = $get(count);

getMessage();
getCount();
```

compiles into

```js
import { createMemo as _createMemo } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_count, _setcount] = _createSignal(0, {
  name: "count"
});

const _message = _createMemo(() => `Count: ${_count()}`, {
  name: "message"
});

const getMessage = _message;
const getCount = _count;
getMessage();
getCount();
```

`$get` works with `signal:` and `memo:` labels as well as `@signal` and `@memo` comments.

### `$set`

`$set` returns the setter of the given signal variable.

```js
let count = $signal(0);
const setCount = $set(count);

setCount(10);
```

compiles into

```js
import { createSignal as _createSignal } from "solid-js";

let [_count, _setcount] = _createSignal(0, {
  name: "count"
});

const setCount = _setcount;
setCount(10);
```

`$set` also works with `signal:` label and `@signal` comment.

### `$derefSignal`

`$derefSignal` converts any kind of signal tuple into a signal variable.

```js
let count = $derefSignal(useCounter());

count += 10;
```

compiles into

```js
let [_count, _setcount] = useCounter();

_setcount(_current => _current += 10);
```

You can provide any kind of get/set tuples.

```js
let value = $derefSignal([getValue, setValue]);

value = newValue;

effect: {
  console.log(value);
}
```

```js
let [_value, _setvalue] = [getValue, setValue];

_setvalue(() => newValue);

_createTrackedEffect(() => {
  console.log(_value());
});
```

### `$derefMemo`

`$derefMemo` converts any kind of accessor into a memo variable.

```js
const count = $derefMemo(useCounterValue());

effect: {
  console.log('Count:', count);
}
```

compiles into

```js
import { createTrackedEffect as _createTrackedEffect } from "solid-js";

const _count = useCounterValue();

_createTrackedEffect(() => {
  console.log('Count:', _count());
});
```

## Reactive properties

### `$getter`

Assigns the given memo or signal ref to the property, transforming it into a getter property. Reading the property allows the assigned ref to be tracked.

```js
let count = $signal(0);

const obj = {
  count: $getter(count),
};
```

```js
import { createSignal as _createSignal } from "solid-js";
const _proto = {
  get count() {
    return this.__$get$count();
  }
};
let [_count, _setcount] = _createSignal(0);
const obj = {
  __proto__: _proto,
  __$get$count: _count
};
```

### `$setter`

Assigns the given signal ref to the property, transforming it into a setter property. Setting the property allows the assigned ref to be reactively updated.

```js
let count = $signal(0);

const obj = {
  count: $setter(count),
};
```

```js
import { createSignal as _createSignal } from "solid-js";
const _proto = {
  set count(_param) {
    this.__$set$count(() => _param);
  }
};
let [_count, _setcount] = _createSignal(0);
const obj = {
  __proto__: _proto,
  __$set$count: _setcount
};
```

### `$property`

A combination of `$getter` and `$setter`. For memo refs, this only outputs the getter property.

```js
let count = $signal(0);
const message = $memo(`Count: ${count}`);

const obj = {
  count: $property(count),
  message: $property(message),
};
```

```js
import { createMemo as _createMemo } from "solid-js";
import { createSignal as _createSignal } from "solid-js";
const _proto = {
  get count() {
    return this.__$get$count();
  },
  set count(_param) {
    this.__$set$count(() => _param);
  },
  get message() {
    return this.__$get$message();
  }
};
let [_count, _setcount] = _createSignal(0);
const _message = _createMemo(() => `Count: ${_count()}`);
const obj = {
  __proto__: _proto,
  __$get$count: _count,
  __$set$count: _setcount,
  __$get$message: _message
};
```

## Store

Store APIs moved into `solid-js` on Solid 2.0.

- `$store` -> `createStore`
- `$projection` -> `createProjection`
- `$optimistic` -> `createOptimistic`
- `$optimisticStore` -> `createOptimisticStore`
- `$reconcile` -> `reconcile`
- `$snapshot` (also `$unwrap`) -> `snapshot`
- `$deep` -> `deep`

`createMutable` and `produce` are gone; store setters are draft-first.

## Components

These CTFs are auto-imported components from `solid-js` and `@solidjs/web`. You can still use their original identifiers since those are already supported by `babel-preset-solid`.

Available: `For`, `Show`, `Switch`, `Match`, `Repeat`, `Errored`, `Loading`, `Reveal`, `Dynamic`, `Portal`, `HydrationScript`, `Hydration` and `NoHydration`.

## Tooling

On any `d.ts` file, add a reference markup

```ts
/// <reference types="solid-labels" />
```

All CTFs are declared globally so there's no need to import.
