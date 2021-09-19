# Labels

## `signal`

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

## `memo`

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
  const [_x, _setx] = _createSignal(0);

  const _message = _createMemo(() => `Count: ${_x()}`);

  return () => _message();
}
```

Chained variable declaration is also supported.

```js
memo: var y = x + 10, z = y / 10;
```

## `effect`, `computed` and `renderEffect`

Transforms into `createEffect`, `createComputed` and `createRenderEffect`, respectively.

```js
function Counter() {
  signal: x = 0;

  effect: {
    console.log('Count', x);
  }
  computed: {
    console.log('Count', x);
  }
  renderEffect: {
    console.log('Count', x);
  }
}
```

into

```js
import { createRenderEffect as _createRenderEffect } from "solid-js";
import { createComputed as _createComputed } from "solid-js";
import { createEffect as _createEffect } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

function Counter() {
  const [_x, _setx] = _createSignal(0);

  _createEffect(() => {
    console.log('Count', _x());
  });

  _createComputed(() => {
    console.log('Count', _x());
  });

  _createRenderEffect(() => {
    console.log('Count', _x());
  });
}
```

You may use an arrow function instead of a block statement to accepts the previously returned value. If an expression (e.g. identifier, function call for `label: expr;`) is supplied, it compiles to `hook(expr)`.

## `$`

Similar to `memo` and `effect`, `$` compiles to `createMemo` for variable declaration, while `createEffect(() => expr)` for other kinds of expressions (including block statements). `$` is ideal for single-line effects.

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
import { createEffect as _createEffect } from "solid-js";
import { createMemo as _createMemo } from "solid-js";
import { createSignal as _createSignal } from "solid-js";

let [_x, _setx] = _createSignal(0, {
  name: "x"
});

const _y = _createMemo(() => _x() + 10, {
  name: "y"
});

_createEffect(() => _setx(() => compute()));

_createEffect(() => {
  console.log(_x());
});
```

## `mount`, `cleanup` and `error`

Transforms into `onMount`, `onCleanup` and `onError`.

```js
function Counter() {
  mount: {
    console.log('Mounted!');
  }
  cleanup: {
    console.log('Cleaned!');
  }
  error: {
    console.log('Something went wrong.');
  }
}
```

into

```js
import { onError as _onError } from "solid-js";    
import { onCleanup as _onCleanup } from "solid-js";
import { onMount as _onMount } from "solid-js";    

function Counter() {
  _onMount(() => {
    console.log('Mounted!');
  });

  _onCleanup(() => {
    console.log('Cleaned!');
  });

  _onError(() => {
    console.log('Something went wrong.');
  });
}
```

You may also use an arrow function. For `onError`, an arrow function with a parameter may be used to receive the error object. If an expression (e.g. identifier, function call for `label: expr;`) is supplied, it compiles to `hook(expr)`.

## `untrack` and `batch`

Transforms into `untrack` and `batch`.

```js
function Counter() {
  batch: {
    console.log('This is batched!');
  }
  untrack: {
    console.log('This is untracked!');
  }
}
```

into

```js
import { untrack as _untrack } from "solid-js";
import { batch as _batch } from "solid-js";

function Counter() {
  _batch(() => {
    console.log('This is batched!');
  });

  _untrack(() => {
    console.log('This is untracked!');
  });
}
```

You may also use an arrow function. If an expression (e.g. identifier, function call for `label: expr;`) is supplied, it compiles to `hook(expr)`.

## `root`

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
