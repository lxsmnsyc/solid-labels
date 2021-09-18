# Comments

## `signal`

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

## `memo`

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
  const [_x, _setx] = _createSignal(0);

  const _message = _createMemo(() => `Count: ${_x()}`);

  return () => _message();
}
```

Chained variable declaration is also supported.

```js
// @memo
const y = x + 10, z = y / 10;
```

## `effect`, `computed` and `renderEffect`

Transforms into `createEffect`, `createComputed` and `createRenderEffect`, respectively.

```js
function Counter() {
  // @signal
  let x = 0;

  /* @effect */ {
    console.log('Count', x);
  }
  /* @computed */ {
    console.log('Count', x);
  }
  /* @renderEffect */ {
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

You may use an arrow function instead of a block statement to accepts the previously returned value.

## `mount`, `cleanup` and `error`

Transforms into `onMount`, `onCleanup` and `onError`.

```js
function Counter() {
  /* @mount */ {
    console.log('Mounted!');
  }
  /* @cleanup */ {
    console.log('Cleaned!');
  }
  /* @error */ {
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

You may also use an arrow function. For `onError`, an arrow function with a parameter may be used to receive the error object.

## `untrack` and `batch`

Transforms into `untrack` and `batch`.

```js
function Counter() {
  /* @batch */ {
    console.log('This is batched!');
  }
  /* @untrack */ {
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

## `root`

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

## Tooling

### ESLint

```json
{
  "rules": {
    "no-lone-blocks": "off"
  },
}
```
