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
    internal?: boolean,
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
  options?: { equals?: false | ((prev: T, next: T) => boolean); name?: string }
): T;
function $memo<T>(
  value: T,
  options?: { equals?: false | ((prev: T, next: T) => boolean); name?: string }
): T;
```

Compiles into `createMemo`.

```js
let count = $signal(0);
const message = $memo(\`Count: \${count}\`);
```

becomes

```js
import { createMemo as _createMemo } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_count, _setcount] = _createSignal(0, {
  name: "count"
});

const _message = _createMemo(() => `Count: ${_count()}`, undefined, {
  name: "message"
});
```

`$memo` is only allowed to be used on variable declarations, otherwise it raises a compile-time error.

### `$`

```ts
function $<T>(value: T): T;
```

Compiles into `createMemo` when used in variable declarations, otherwise it compiles to `createEffect` when used in single-line statements. If used for other expressions, it raises a compile-time error.

```js
let count = $signal(0);
const message = $(`Count: ${count}`);

$(console.log(message));
```

compiles into

```js
import { createEffect as _createEffect } from "solid-js";
import { createMemo as _createMemo } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_count, _setcount] = _createSignal(0, {
  name: "count"
});

const _message = _createMemo(() => `Count: ${_count()}`, undefined, {
  name: "message"
});

_createEffect(() => console.log(_message()));
```

### `$untrack` and `$batch`

```ts
function $untrack<T>(value: T): T;
function $batch<T>(value: T): T;
```

Compiles into `untrack` and `batch`, respectively. Unlike `untrack` and `batch`, `$untrack` and `$batch` doesn't have to provide an arrow function.

```js
let count = $signal(0);

effect: {
  console.log($untrack(count));

  $batch(updateData(count));
}
```

compiles into

```js
import { batch as _batch } from "solid-js";
import { untrack as _untrack } from "solid-js";
import { createEffect as _createEffect } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_count, _setcount] = _createSignal(0, {
  name: "count"
});

_createEffect(() => {
  console.log(_untrack(() => _count()));

  _batch(() => updateData(_count()));
});
```

### `$effect`, `$computed` and `$renderEffect`

```ts
function $effect<T>(fn: (v?: T) => T | undefined): void;
function $effect<T>(fn: (v: T) => T, value: T, options?: { name?: string }): void;

function $computed<T>(fn: (v?: T) => T | undefined): void;
function $computed<T>(fn: (v: T) => T, value: T, options?: { name?: string }): void;

function $renderEffect<T>(fn: (v?: T) => T | undefined): void;
function $renderEffect<T>(fn: (v: T) => T, value: T, options?: { name?: string }): void;
```

Compiles to `createEffect`, `createComputed` and `createRenderEffect`, respectively.

```js
let x = $signal(0);

$effect(() => {
  console.log('Count', x);
});
$computed(() => {
  console.log('Count', x);
});
$renderEffect(() => {
  console.log('Count', x);
});
```

```js
import { createRenderEffect as _createRenderEffect } from "solid-js";
import { createComputed as _createComputed } from "solid-js";
import { createEffect as _createEffect } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_x, _setx] = _createSignal(0, {
  name: "x"
});

_createEffect(() => {
  console.log('Count', _x());
});

_createComputed(() => {
  console.log('Count', _x());
});

_createRenderEffect(() => {
  console.log('Count', _x());
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

### `$selector`

```ts
function $selector<T, U>(
  source: T,
  fn?: (a: U, b: T) => boolean,
  options?: { name?: string }
): (key: U) => boolean;
```

Compiles to `createSelector`. Automatically injects arrow function to `source`.

```js
let selectedID = $signal();

let isSelected = $selector(selectedID);

effect: {
  if (isSelected(userID)) {
    selectUser(userID);
  }
}
```

```js
import { createEffect as _createEffect } from "solid-js";
import { createSelector as _createSelector } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_selectedID, _setselectedID] = _createSignal(undefined, {
  name: "selectedID"
});

let isSelected = _createSelector(() => _selectedID());

_createEffect(() => {
  if (isSelected(userID)) {
    selectUser(userID);
  }
});
```

### `$on`

```ts
function $on<T, U>(
  deps: T,
  fn: (input: T, prevInput: T, prevValue?: U) => U,
  options?: { defer?: boolean }
): (prevValue?: U) => U;
```

Compiles to `on`. Arrow function is automatically injected to `deps`.

```js
let selectedID = $signal();

effect: $on(selectedID, (value) => {
  if (userID === value) {
    selectUser(userID);
  }
})
```

```js
import { on as _on } from "solid-js";
import { createEffect as _createEffect } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_selectedID, _setselectedID] = _createSignal(undefined, {
  name: "selectedID"
});

_createEffect(_on(() => _selectedID(), value => {
  if (userID === value) {
    selectUser(userID);
  }
}));
```

### `$deferred`

```ts
function $deferred<T>(
  source: T,
  options?: {
    equals?: false | ((prev: T, next: T) => boolean);
    name?: string;
    timeoutMs?: number;
  },
): T;
```

Compiles to `createDeferred`. Automatically injects arrow function to `source`. Automatically treats variable reads as accessor calls like `$memo`. Can only be called in variable declarations.

```js
let searchInput = $signal('');
let deferredSearchInput = $deferred(searchInput);

effect: {
  fetchResults(deferredSearchInput);
}
```

```js
import { createEffect as _createEffect } from "solid-js";
import { createDeferred as _createDeferred } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_searchInput, _setsearchInput] = _createSignal('', {
  name: "searchInput"
});

let _deferredSearchInput = _createDeferred(() => _searchInput(), {
  name: "deferredSearchInput"
});

_createEffect(() => {
  fetchResults(_deferredSearchInput());
});
```

## Observables

### `$observable`

```ts
function $observable<T>(value: T): Observable<T>;
```

Compiles to `observable`. Automatically injects arrow function to `value`.

```js
let count = $signal(0);
const counter$ = $observable(count);
```

```js
import { observable as _observable } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_count, _setcount] = _createSignal(0, {
  name: "count"
});

const counter$ = _observable(() => _count());
```

### `$from`

```ts
function $from<T>(observable: Observable<T>): T;
function $from<T>(produce: ((setter: Setter<T>) => () => void)): T;
```

Compiles to `from`. Automatically treats variable reads as accessor calls like `$memo`.

```js
let count = $signal(0);
const counter$ = $observable(count);
const counter = $from(counter$);

effect: {
  console.log('Count:', counter);
}
```

```js
import { createEffect as _createEffect } from "solid-js";
import { from as _from } from "solid-js";
import { observable as _observable } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_count, _setcount] = _createSignal(0, {
  name: "count"
});

const counter$ = _observable(() => _count());

const _counter = _from(counter$);

_createEffect(() => {
  console.log('Count:', _counter());
});
```

## Arrays

### `$mapArray`

```ts
function $mapArray<T, U>(
  arr: readonly T[] | undefined | null | false,
  mapFn: (v: T, i: Accessor<number>) => U,
  options?: {
    fallback?: Accessor<any>;
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
import { createEffect as _createEffect } from "solid-js";
import { mapArray as _mapArray } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_list, _setlist] = _createSignal([], {
  name: "list"
});

const _squaredList = _mapArray(() => _list(), value => value ** 2);

_createEffect(() => {
  console.log('1st value', _squaredList()[0]);
});

_setlist(() => ['Hello']);
```

### `$indexArray`

```ts
function $indexArray<T, U>(
  arr: readonly T[] | undefined | null | false,
  mapFn: (v: Accessor<T>, i: number) => U,
  options?: {
    fallback?: Accessor<any>;
  },
): U[];
```

Compiles to `mapArray`. Automatically treats variable reads as accessor calls like `$memo`. Automatically injects arrow function to `arr`.

```js
let list = $signal([]);
const squaredList = $indexArray(list, (value) => value() ** 2);

effect: {
  console.log('1st value', squaredList[0]);
}

list = ['Hello'];
```

```js
import { createEffect as _createEffect } from "solid-js";
import { indexArray as _indexArray } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_list, _setlist] = _createSignal([], {
  name: "list"
});

const _squaredList = _indexArray(() => _list(), value => value() ** 2);

_createEffect(() => {
  console.log('1st value', _squaredList()[0]);
});

_setlist(() => ['Hello']);
```

## Component APIs

### `$uid`

```ts
function $uid(): string;
```

Compiles to `createUniqueId` (Only available for Solid 1.1.0+)

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

const _message = _createMemo(() => `Count: ${_count()}`, undefined, {
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

const _message = _createMemo(() => `Count: ${_count()}`, undefined, {
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

_createEffect(() => {
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
import { createEffect as _createEffect } from "solid-js";

const _count = useCounterValue();

_createEffect(() => {
  console.log('Count:', _count());
});
```

## Tooling

On any `d.ts` file, add a reference markup

```ts
/// <reference types="babel-plugin-solid-labels" />
```

All CTFs are declared globally so there's no need to import.
