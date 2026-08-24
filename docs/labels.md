# Labels

## Utilities

### `signal`

Transforms into `createSignal`:

```js
function Counter() {
  signal: x = 0;

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
signal: var x = 0, y = 0, z = 0;
```

### `memo`

Transforms into `createMemo`:

```js
function Counter() {
  signal: x = 0;
  memo: message = `Count: ${x}`;

  return () => message;
}
```

becomes

```js
import { createMemo as _createMemo } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

function Counter() {
  const [_x, _setx] = _createSignal(0, {
    name: "x"
  });

  const _message = _createMemo(() => `Count: ${_x()}`, {
    name: "message"
  });

  return () => _message();
}
```

Chained variable declaration is also supported.

```js
memo: var y = x + 10, z = y / 10;
```

### `effect`

Transforms into `createTrackedEffect`.

> Solid 2.0 removed `createComputed`, and `createEffect` / `createRenderEffect` now take a tracked `compute` phase plus an untracked `effect` phase. The single-callback form is `createTrackedEffect`, so the `computed` and `renderEffect` labels are gone. Use the `$effect` and `$renderEffect` CTFs when you need the two-phase form.

```js
function Counter() {
  signal: x = 0;

  effect: {
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

You may use an arrow function instead of a block statement. If an expression (e.g. identifier, function call for `label: expr;`) is supplied, it compiles to `hook(expr)`.

It can also be named by adding another labeled statement:

```js
function Counter() {
  signal: x = 0;

  effect: effectLog: {
    console.log('Count', x);
  }
}
```

```js
import { createTrackedEffect as _createTrackedEffect } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

function Counter() {
  const [_x, _setx] = _createSignal(0);

  _createTrackedEffect(() => {
    console.log('Count', _x());
  }, {
    name: "effectLog"
  });
}
```

### `$`

Similar to `memo` and `effect`, `$` compiles to `createMemo` for variable declaration, while `createTrackedEffect(() => expr)` for other kinds of expressions (including block statements). `$` is ideal for single-line effects.

```js
let x = $signal(0);

$: var y = x + 10;
$: x = compute();
$: {
  console.log(x);
}
```

compiles into

```js
import { createTrackedEffect as _createTrackedEffect } from "solid-js";
import { createMemo as _createMemo } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_x, _setx] = _createSignal(0, {
  name: "x"
});

const _y = _createMemo(() => _x() + 10, {
  name: "y"
});

_createTrackedEffect(() => _setx(() => compute()));

_createTrackedEffect(() => {
  console.log(_x());
});
```

### `mount`, `settled` and `cleanup`

Transforms into `onSettled` (both `mount` and `settled`) and `onCleanup`.

> `onMount` and `onError` are gone in Solid 2.0. `onSettled` runs once the current activity settles and accepts a returned cleanup function; errors are handled by `<Errored>` or by the `error` option of `createEffect`.

```js
function Counter() {
  mount: {
    console.log('Settled!');
  }
  cleanup: {
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

You may also use an arrow function. If an expression (e.g. identifier, function call for `label: expr;`) is supplied, it compiles to `hook(expr)`.

### `untrack`

Transforms into `untrack`.

> Solid 2.0 batches writes by default, so the `batch` label is gone. Use the `$flush` CTF to apply queued writes synchronously.

```js
function Counter() {
  untrack: {
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

You may also use an arrow function. If an expression (e.g. identifier, function call for `label: expr;`) is supplied, it compiles to `hook(expr)`.

### `root`

Transforms into `createRoot`

```js
root: {
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

You can also pass an arrow function instead of a block to receive the `dispose` callback. If an expression (e.g. identifier, function call for `label: expr;`) is supplied, it compiles to `hook(expr)`.

### `children`

Compiles to `children`.

```js
children: var nodes = props.children;
```

```js
import { children as _children } from "solid-js";

const _nodes = _children(() => props.children);
```

### `action`

Compiles to `action`.

```js
signal: var data;

action: {
  data = fetchData();
}
```

```js
import { action as _action } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

const [_data, _setdata] = _createSignal(undefined, {
  name: "data"
});

_action(() => {
  _setdata(() => fetchData());
});
```

### `destructure`

Destructures an object while retaining reactivity. This partially compiles to `omit` if a rest expression is detected.

`destructure` also supports nested destructures.

Does not support default assignment.

```js
destructure: var { a: { b, c }, b: { d, e }, ...f } = x;

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

### TypeScript

`tsconfig.json`

```json
{
  "compilerOptions": {
    "allowUnusedLabels": true,
  }
}
```

For `signal` and `memo` sugar, you'll need to use `@ts-ignore` to suppress warnings for TS1344 when using strict mode.

### ESLint

```json
{
  "rules": {
    "no-var": "off",
    "no-restricted-syntax": "off",
    "no-labels": "off",
    "vars-on-top": "off",
    "no-unused-labels": "off"
  },
}
```
