# unplugin-solid-labels

> [Unplugin](https://github.com/unjs/unplugin) for [`solid-labels`](https://github.com/lxsmnsyc/solid-labels)

[![NPM](https://img.shields.io/npm/v/unplugin-solid-labels.svg)](https://www.npmjs.com/package/unplugin-solid-labels) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)

## Install

```bash
npm install --D solid-labels unplugin-solid-labels
```

```bash
yarn add -D solid-labels unplugin-solid-labels
```

```bash
pnpm add -D solid-labels unplugin-solid-labels
```

## Usage

```js
import solidLabels from 'unplugin-solid-labels';

///...
solidLabels.vite({
  dev: true, // defaults to false
  disabled: {
    ctf: {
      $signal: true,
    },
  },
  filter: {
    include: 'src/**/*.{ts,js,tsx,jsx}',
    exclude: 'node_modules/**/*.{ts,js,tsx,jsx}',
  },
});
```

### Bun

`solidLabels.bun(options)` needs Bun 1.2.22 or later.

Bun uses the first `onLoad` that returns contents for a file. Two separate Bun plugins, `solidLabels.bun()` and a Solid JSX plugin, never chain, in either order. The second one never receives the output of the first.

Plugins returned from one unplugin factory run their `transform` hooks in order inside a single `onLoad`, and their source maps are combined. Put solid-labels and the JSX step in one factory:

```ts
import { transformAsync } from '@solidjs/compiler';
import { createUnplugin } from 'unplugin';
import type { UnpluginOptions } from 'unplugin';
import solidLabels from 'unplugin-solid-labels';

const solidJsx: UnpluginOptions = {
  name: 'solid-jsx',
  transform: {
    filter: { id: /\/src\/.*\.[jt]sx$/ },
    async handler(code, id) {
      const result = await transformAsync(code, { filename: id, generate: 'dom', sourceMap: true });
      return { code: result.code, map: result.map };
    },
  },
};

const solidBun = createUnplugin((_options: undefined, meta) => [
  solidLabels.raw({ filter: { include: '**/src/**/*.{ts,tsx}' } }, meta),
  solidJsx,
]).bun;

await Bun.build({
  entrypoints: ['./src/main.tsx'],
  outdir: './dist',
  sourcemap: 'external',
  plugins: [solidBun()],
});
```

- Solid 2.0 has no maintained Bun plugin. `@solidjs/compiler` is the compiler that `@solidjs/vite-plugin` uses.
- Bun plugins such as `bun-plugin-solid` and `@angius/bun-plugin-solid` use `babel-preset-solid` 1.x, which emits Solid 1 output.

See [`examples/bun`](https://github.com/lxsmnsyc/solid-labels/tree/main/examples/bun) for a full build and a check that runs the bundle.

## Sponsors

![Sponsors](https://github.com/lxsmnsyc/sponsors/blob/main/sponsors.svg?raw=true)

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
