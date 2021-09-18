# babel-plugin-solid-labels

> Simple reactive labels for SolidJS

[![NPM](https://img.shields.io/npm/v/babel-plugin-solid-labels.svg)](https://www.npmjs.com/package/babel-plugin-solid-labels) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)[![Open in CodeSandbox](https://img.shields.io/badge/Open%20in-CodeSandbox-blue?style=flat-square&logo=codesandbox)](https://codesandbox.io/s/github/LXSMNSYC/babel-plugin-solid-labels/tree/main/examples/vite-example)

## Install

```bash
yarn add babel-plugin-solid-labels
```

## Features

- 🏷 Labels: Turn labels into SolidJS utility calls!
- 💬 Comments: Turn comments into SolidJS utility calls, too!
- 📦 Auto Imports: No need to import SolidJS utilities, explicitly!
- 🤝 JS and TS Friendly!

## Usage

- [Labels](https://github.com/LXSMNSYC/babel-plugin-solid-labels/tree/main/docs/labels.md)
- [Comments](https://github.com/LXSMNSYC/babel-plugin-solid-labels/tree/main/docs/comments.md)

### Babel

`.babelrc`

```json
{
  "plugins": ["babel-plugin-solid-labels"]
}
```

### Vite

`esbuild-plugin-solid`

```js
// vite.config.js
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import solidLabels from 'babel-plugin-solid-labels';

export default defineConfig({
  plugins: [
    solidPlugin({
      babel: {
        plugins: [solidLabels],
      },
    }),
  ],
});
```

## Limitations

- Detecting shadowed identifier for `signal` and `memo`.

## TODO

- Add `transition` label for `startTransition`.
- Make descriptive errors.

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
