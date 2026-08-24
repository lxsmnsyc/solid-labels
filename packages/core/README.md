# `solid-labels`

[![NPM](https://img.shields.io/npm/v/solid-labels.svg)](https://www.npmjs.com/package/solid-labels) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)

<p align="center">
  <img
    src="https://github.com/LXSMNSYC/solid-labels/blob/main/images/ctf.png?raw=true"
    alt="Example"
    style="width: 80%; height: auto;"
  />
</p>

> This version targets **Solid 2.0** (`solid-js@2.0.0-rc.1` and `@solidjs/web@2.0.0-rc.1`). For Solid 1.x, use `solid-labels@0.17` or older.

## Install

```bash
npm install solid-labels
```

```bash
yarn add solid-labels
```

```bash
pnpm add solid-labels
```

## Features

- ⏱ Compile-time Functions: Use functions that are evaluated during compile-time!
- 📦 Auto Imports: No need to import SolidJS utilities, explicitly!
- ⚡ Oxc-powered: native-speed parsing, span-based output, high-resolution source maps!
- 🤝 JS and TS Friendly!

> Labels (`signal: x = 0`) and comment pragmas (`/* @signal */`) were removed
> in 1.0 — see the [migration guide](https://github.com/LXSMNSYC/solid-labels/tree/main/docs/migration.md).

## Usage

- [Compile-Time Functions](https://github.com/LXSMNSYC/solid-labels/tree/main/docs/ctf.md)
  [![Open in CodeSandbox](https://img.shields.io/badge/Open%20in-CodeSandbox-blue?style=flat-square&logo=codesandbox)](https://codesandbox.io/s/github/LXSMNSYC/solid-labels/tree/main/examples/ctf)
- [Solid Namespace](https://github.com/LXSMNSYC/solid-labels/tree/main/docs/namespace.md)
- [Migration from 0.x](https://github.com/LXSMNSYC/solid-labels/tree/main/docs/migration.md)

### Typescript

`<any file>.d.ts`

```ts
/// <reference types="solid-labels" />
```

### Programmatic

```ts
import { compile } from 'solid-labels/compiler';

const { code, map } = await compile('App.tsx', source, { dev: true });
```

## Integrations

- [Vite](https://github.com/lxsmnsyc/solid-labels/tree/main/packages/vite)
- [Rollup](https://github.com/lxsmnsyc/solid-labels/tree/main/packages/rollup)
- [Unplugin](https://github.com/lxsmnsyc/solid-labels/tree/main/packages/unplugin)

### Disabling features

You can disable some features by passing `disabled` option to the plugin options.

```js
{
  disabled: {
    ctf: {
      $signal: true,
    },
  }
}
```

## Sponsors

![Sponsors](https://github.com/lxsmnsyc/sponsors/blob/main/sponsors.svg?raw=true)

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
