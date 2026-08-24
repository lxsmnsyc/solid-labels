
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

- 🏷 Labels: Turn labels into SolidJS utility calls!
- 💬 Comments: Turn comments into SolidJS utility calls, too!
- ⏱ Compile-time Functions: Use functions that are evaluated during compile-time!
- 📦 Auto Imports: No need to import SolidJS utilities, explicitly!
- 🤝 JS and TS Friendly!

## Usage

- [Labels](https://github.com/LXSMNSYC/solid-labels/tree/main/docs/labels.md)
[![Open in CodeSandbox](https://img.shields.io/badge/Open%20in-CodeSandbox-blue?style=flat-square&logo=codesandbox)](https://codesandbox.io/s/github/LXSMNSYC/solid-labels/tree/main/examples/labels)
- [Comments](https://github.com/LXSMNSYC/solid-labels/tree/main/docs/comments.md)
[![Open in CodeSandbox](https://img.shields.io/badge/Open%20in-CodeSandbox-blue?style=flat-square&logo=codesandbox)](https://codesandbox.io/s/github/LXSMNSYC/solid-labels/tree/main/examples/comments)
- [Compile-Time Functions](https://github.com/LXSMNSYC/solid-labels/tree/main/docs/ctf.md)
[![Open in CodeSandbox](https://img.shields.io/badge/Open%20in-CodeSandbox-blue?style=flat-square&logo=codesandbox)](https://codesandbox.io/s/github/LXSMNSYC/solid-labels/tree/main/examples/ctf)
- [Solid Namespace](https://github.com/LXSMNSYC/solid-labels/tree/main/docs/namespace.md)

### Typescript

`<any file>.d.ts`

```ts
/// <reference types="solid-labels" />
```

### Babel

`.babelrc`

```json
{
  "plugins": [
    ["solid-labels/babel", { "dev": false }]
  ]
}
```

[!INFO]: You don't have to use this if you're using Vite or Rollup plugins

## Integrations

- [Vite](https://github.com/lxsmnsyc/solid-labels/tree/main/packages/vite)
- [Rollup](https://github.com/lxsmnsyc/solid-labels/tree/main/packages/rollup)
- [Unplugin](https://github.com/lxsmnsyc/solid-labels/tree/main/packages/unplugin)

### Disabling features

You can disable some features by passing `disabled` option to the plugin options.

```js
{
  disabled: {
    labels: {
      signal: true,
    },
    pragma: {
      '@signal': true,
    },
    ctf: {
      $signal: true,
    },
  }
}
```

## Limitations

- Detecting shadowed identifier for `signal` and `memo`.

## Sponsors

![Sponsors](https://github.com/lxsmnsyc/sponsors/blob/main/sponsors.svg?raw=true)

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
