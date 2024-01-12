# rollup-plugin-solid-labels

> Rollup plugin for [`solid-labels`](https://github.com/lxsmnsyc/solid-labels)

[![NPM](https://img.shields.io/npm/v/rollup-plugin-solid-labels.svg)](https://www.npmjs.com/package/rollup-plugin-solid-labels) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)

## Install

```bash
npm install --D solid-labels rollup-plugin-solid-labels
```

```bash
yarn add -D solid-labels rollup-plugin-solid-labels
```

```bash
pnpm add -D solid-labels rollup-plugin-solid-labels
```

## Usage

```js
import solidLabels from 'rollup-plugin-solid-labels';

///...
solidLabels({
  dev: true, // defaults to false
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
  },
  filter: {
    include: 'src/**/*.{ts,js,tsx,jsx}',
    exclude: 'node_modules/**/*.{ts,js,tsx,jsx}',
  },
})
```

> [!INFO]
> When you are using a SolidJS Rollup plugin, make sure that solid-labels runs first.

## Sponsors

![Sponsors](https://github.com/lxsmnsyc/sponsors/blob/main/sponsors.svg?raw=true)

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
