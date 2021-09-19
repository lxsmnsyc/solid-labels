# Compile-Time Functions

## `$signal`

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

## `$memo`

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

const _message = _createMemo(() => `Count: ${_count()}`, {
  name: "message"
});
```

`$memo` is only allowed to be used on variable declarations, otherwise it raises a compile-time error.

## `$`

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

const _message = _createMemo(() => `Count: ${_count()}`, {
  name: "message"
});

_createEffect(() => console.log(_message()));
```

## `$untrack` and `$batch`

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

## Refs and Derefs

Ref and Deref allows opting in and out of the labels syntax. This is useful for scenarios where we want to return the actual signal tuple instead of the signal value or when we have a third-party utility that we want to opt-into

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
