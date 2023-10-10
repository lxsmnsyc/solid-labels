# unplugin-solid-labels

> [Unplugin](https://github.com/unjs/unplugin) for [`solid-labels`](https://github.com/lxsmnsyc/solid-labels)

[![NPM](https://img.shields.io/npm/v/unplugin-solid-labels.svg)](https://www.npmjs.com/package/unplugin-solid-labels) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)

## Install

```bash
npm install --D unplugin-solid-labels
```

```bash
yarn add -D unplugin-solid-labels
```

```bash
pnpm add -D unplugin-solid-labels
```

## Usage

```js
import solidLabels from 'unplugin-solid-labels';

///...
solidLabels.vite({
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

## Sponsors

![Sponsors](https://github.com/lxsmnsyc/sponsors/blob/main/sponsors.svg?raw=true)

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
