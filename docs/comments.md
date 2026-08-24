# Comments

## Utilities

### `@signal`

Transforms into `createSignal`:

```js
function Counter() {
  // @signal
  let x = 0;

  function increment() {
    x += 1;
  }

  return () => x;
}
```

becomes

```js
import { createSignal as _createSignal } from "solid-js";

function Counter() {
  const [_x, _setx] = _createSignal(0);

  function increment() {
    _setx(_current => _current += 1);
  }

  return () => _x();
}
```

Chained variable declaration is also supported.

```js
// @signal
let x = 0, y = 0, z = 0;
```

### `@memo`

Transforms into `createMemo`:

```js
function Counter() {
  // @signal
  let x = 0;
  // @memo
  const message = `Count: ${x}`;

  return () => message;
}
```

becomes

```js
import { createMemo as _createMemo } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

function Counter() {
  //
  let [_x, _setx] = _createSignal(0, {
    name: "x"
  }); //


  const _message = _createMemo(() => `Count: ${_x()}`, {
    name: "message"
  });

  return () => _message();
}
```

Chained variable declaration is also supported.

```js
// @memo
const y = x + 10, z = y / 10;
```

### `@effect`

Transforms into `createTrackedEffect`.

> Solid 2.0 removed `createComputed`, and `createEffect` / `createRenderEffect` now take a tracked `compute` phase plus an untracked `effect` phase. The single-callback form is `createTrackedEffect`, so the `@computed` and `@renderEffect` pragmas are gone. Use the `$effect` and `$renderEffect` CTFs when you need the two-phase form.

```js
function Counter() {
  // @signal
  let x = 0;

  /* @effect */ {
    console.log('Count', x);
  }
}
```

into

```js
import { createTrackedEffect as _createTrackedEffect } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

function Counter() {
  const [_x, _setx] = _createSignal(0);

  _createTrackedEffect(() => {
    console.log('Count', _x());
  });
}
```

You may use an arrow function instead of a block statement.

`@effect` can also be named:

```js
// @signal
let x = 0;

/* @effect Effect Log */ {
  console.log('Count', x);
}
```

```js
import { createTrackedEffect as _createTrackedEffect } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

//
let [_x, _setx] = _createSignal(0);
/**/


_createTrackedEffect(() => {
  console.log('Count', _x());
}, {
  name: "Effect Log"
});
```

### `@mount`, `@settled` and `@cleanup`

Transforms into `onSettled` (both `@mount` and `@settled`) and `onCleanup`.

> `onMount` and `onError` are gone in Solid 2.0. `onSettled` runs once the current activity settles and accepts a returned cleanup function; errors are handled by `<Errored>` or by the `error` option of `createEffect`.

```js
function Counter() {
  /* @mount */ {
    console.log('Settled!');
  }
  /* @cleanup */ {
    console.log('Cleaned!');
  }
}
```

into

```js
import { onCleanup as _onCleanup } from "solid-js";
import { onSettled as _onSettled } from "solid-js";

function Counter() {
  _onSettled(() => {
    console.log('Settled!');
  });

  _onCleanup(() => {
    console.log('Cleaned!');
  });
}
```

You may also use an arrow function.

### `@untrack`

Transforms into `untrack`.

> Solid 2.0 batches writes by default, so the `@batch` pragma is gone. Use the `$flush` CTF to apply queued writes synchronously.

```js
function Counter() {
  /* @untrack */ {
    console.log('This is untracked!');
  }
}
```

into

```js
import { untrack as _untrack } from "solid-js";

function Counter() {
  _untrack(() => {
    console.log('This is untracked!');
  });
}
```

### `@root`

Transforms into `createRoot`

```js
/* @root */ {
  element = renderComponent(MyComponent);
}
```

into

```js
import { createRoot as _createRoot } from "solid-js";

_createRoot(() => {
  element = renderComponent(MyComponent);
});
```

You can also pass an arrow function instead of a block to receive the `dispose` callback.

### `@children`

Compiles to `children`.

```js
// @children
const nodes = props.children;
```

```js
import { children as _children } from "solid-js";

//
const _nodes = _children(() => props.children);
```

### `@action`

Compiles to `action`. Arrow function can be provided instead of blocks.

```js
// @signal
let data;

/* @action */ {
  data = fetchData();
}
```

```js
import { action as _action } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

//
let [_data, _setdata] = _createSignal(undefined, {
  name: "data"
});
/**/


_action(() => {
  _setdata(() => fetchData());
});
```

### `@destructure`

Destructures an object while retaining reactivity. This partially compiles to `omit` if a rest expression is detected.

`@destructure` also supports nested destructures.

Does not support default assignment.

```js
// @destructure
let { a: { b, c }, b: { d, e }, ...f } = x;

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
import { createTrackedEffect as _createTrackedEffect } from "solid-js";
import { omit as _omit } from "solid-js";
//
const _prop = () => x.a,
  _prop2 = () => _prop().b,
  _prop3 = () => _prop().c,
  _other2 = _omit(_prop(), "b", "c"),
  _prop4 = () => x.b,
  _prop5 = () => _prop4().d,
  _prop6 = () => _prop4().e,
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

## Tooling

### ESLint

```json
{
  "rules": {
    "no-lone-blocks": "off"
  },
}
```
