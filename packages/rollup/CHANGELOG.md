# rollup-plugin-solid-labels

## 0.17.1

### Patch Changes

- e7766fc: Build with tsdown and update dependencies.

  - Packages still ship ESM and CommonJS builds, but the files moved inside `dist`. Imports through the package `exports` are unaffected.
  - The `development` export condition is removed.
  - The Vite plugin accepts Vite 6, 7 and 8.
  - `unplugin-solid-labels` no longer lists `babel` and `core` in `files`, which did not exist.

- Updated dependencies [e7766fc]
  - solid-labels@0.17.1
  - unplugin-solid-labels@0.17.1
