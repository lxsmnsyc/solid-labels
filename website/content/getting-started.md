# Getting started

`solid-labels` targets Solid 2.0 (`solid-js@2.0.0-rc.21` and `@solidjs/web@2.0.0-rc.21`). For Solid 1.x, use `solid-labels@0.17` or older.

## Install

Add the compiler and the plugin for your bundler.

```sh
pnpm add -D solid-labels unplugin-solid-labels
```

```sh
npm install -D solid-labels unplugin-solid-labels
```

```sh
yarn add -D solid-labels unplugin-solid-labels
```

Tell TypeScript about the compile-time functions in any `.d.ts` file of your project.

```ts
/// <reference types="solid-labels" />
```

## Vite

Register `solidLabels.vite()` next to `@solidjs/vite-plugin`. The plugin moves itself ahead of the Solid plugin, so the order in the array does not matter.

```ts
import solidPlugin from '@solidjs/vite-plugin';
import { defineConfig } from 'vite';
import solidLabels from 'unplugin-solid-labels';

export default defineConfig({
  plugins: [
    solidPlugin({}),
    solidLabels.vite({
      filter: {
        include: 'src/**/*.{ts,js,tsx,jsx}',
        exclude: 'node_modules/**/*.{ts,js,tsx,jsx}',
      },
    }),
  ],
});
```

The `dev` option defaults to `false`. In a Vite dev server it follows the mode, and it adds `name` options to signals and memos.

## Rollup

`solidLabels.rollup()` has the same options. It has to run before the step that compiles Solid JSX.

```ts
import { transformAsync } from '@solidjs/compiler';
import solidLabels from 'unplugin-solid-labels';

export default {
  input: 'src/main.tsx',
  plugins: [
    solidLabels.rollup(),
    {
      name: 'solid-jsx',
      async transform(code, id) {
        if (!/\.[jt]sx$/.test(id)) {
          return null;
        }
        const result = await transformAsync(code, {
          filename: id,
          generate: 'dom',
          sourceMap: true,
        });
        return { code: result.code, map: result.map };
      },
    },
  ],
};
```

## Bun

Bun uses the first `onLoad` that returns contents for a file, so `solidLabels.bun()` and a separate Solid JSX plugin never chain, in either order. Put both in one unplugin factory instead. The factory runs their `transform` hooks in order inside a single `onLoad` and combines their source maps. `solidLabels.bun()` needs Bun 1.2.22 or later.

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

Solid 2.0 has no maintained Bun plugin. `@solidjs/compiler` is the compiler that `@solidjs/vite-plugin` uses. Bun plugins such as `bun-plugin-solid` use `babel-preset-solid` 1.x, which emits Solid 1 output.

The [`examples/bun`](https://github.com/lxsmnsyc/solid-labels/tree/main/examples/bun) folder has a full build, and a check that runs the bundle.

## Your first signal

Write the variable, and read and write it like any other.

```ctf tsx
let count = $signal(0);
count += 1;
console.log(count);
```

Reads become `count()`. Writes become `setcount_1(...)`. Open the [REPL](/repl) to try your own code.

## Options

Turn off single compile-time functions with `disabled`.

```ts
solidLabels.vite({
  disabled: {
    ctf: {
      $signal: true,
    },
  },
});
```

## Programmatic use

`compile()` is synchronous. It returns the code and a source map, or `null` when the module has nothing to compile.

```ts
import { compile } from 'solid-labels/compiler';

const output = compile('App.tsx', source, { dev: true });
```

The compiler parses with [oxc-parser](https://www.npmjs.com/package/oxc-parser) and emits span edits through `magic-string`. The untouched parts of your code keep their formatting, and the source map is high-resolution. The [REPL](/repl) runs this same compiler in your browser.
