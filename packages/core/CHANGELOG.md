# solid-labels

## 1.0.0

### Major Changes

- 713a3c4: Support Solid 2.0 and rewrite the compiler on Oxc.

  `solid-labels` now targets Solid 2.0. The peer dependencies are `solid-js@^2.0.0` and `@solidjs/web@^2.0.0`, and `unplugin-solid-labels` requires the matching `solid-labels` major. Solid 1 users stay on the previous major: `solid-labels@0.17` and `unplugin-solid-labels@0.17`, maintained on the `0.x` branch.

  The Babel-based compiler is replaced with `oxc-parser` (native parsing) and
  `magic-string` (span-based output): untouched code keeps its formatting and
  source maps are high-resolution. The `solid-labels/babel` entry is gone;
  plugins consume `solid-labels/compiler`, whose `compile(id, code, options)`
  takes the same arguments as before. It returns `null` when the file has
  nothing to compile, and the plugin then keeps the original code and map.

  Breaking changes:

  - **Labels** (`signal: x = 0`) and **comment pragmas** (`/* @signal */`) are
    removed. Compile-time functions are the single remaining syntax, and
    `disabled.label` / `disabled.pragma` plugin options are gone.
  - CTF names follow Solid 2.0 keywords strictly: `$settled` (`onSettled`),
    `$snapshot` (`snapshot`), `$merge`, `$omit`. The `$mount` and `$unwrap`
    aliases are removed.
  - CTFs whose underlying 1.x API no longer exists are removed: `$batch`,
    `$computed`, `$resource`, `$selector`, `$on`, `$observable`,
    `$error`, `$catchError`, `$startTransition`, `$useTransition`,
    `$indexArray`, `$mutable`, `$produce`.
  - The `Dynamic` auto-import and `<solid:dynamic>` are removed, because Solid
    2.0 deprecates `Dynamic`. Use `dynamic()` from `@solidjs/web`.
  - An unknown `solid:` element name is a compile error. It used to pass through
    as an intrinsic element.
  - `$effect`, `$renderEffect`, and the `$(expr);` statement compile through a
    new capture mechanism: outer identifiers used by the callback are read in a
    generated tracked compute phase and passed to the untracked callback as a
    destructured array; the callback is hoisted to module level when safe.
  - `$signal` adopts the memoized signal convention: non-static initializers
    compile to the writable-derived form `createSignal(() => expr)`.
  - The `vite-plugin-solid-labels` and `rollup-plugin-solid-labels` packages
    are discontinued. Use `unplugin-solid-labels` instead. It serves Vite and
    Rollup through `solidLabels.vite(options)` and `solidLabels.rollup(options)`
    with the same options.

  New CTFs for the Solid 2.0 surface: `$flush`, `$action`,
  `$isPending`, `$latest`, `$refresh`, `$affects`, `$resolve`, `$repeat`,
  `$projection`, `$optimistic`, `$optimisticStore`, `$snapshot`, `$deep`,
  `$until`, `$from`, `$deferred`, `$onFlush`, `$observer`, `$isDisposed`,
  `$isWrappable`, `$flatten`, `$useHead`, `$clientOnly`, `$lazyModule`, plus the
  `Repeat`, `Errored`, `Loading`, `Reveal`, and `Hydration` components.

  `$deferred` returns with a new meaning. In 1.x it lagged a sync signal and took
  `timeoutMs`. In 2.0 it wraps an async computation, and `timeoutMs` is removed.

  See `docs/migration.md` for the full migration guide.

### Patch Changes

- 8fa4b58: The `solid:` JSX elements accept the props of every overload of their component. `<solid:for each={list}>` no longer requires `keyed`, and `<solid:show>` and `<solid:match>` accept `keyed` and function children.
- 509d0f2: Source maps now embed the original source in `sourcesContent`, and name the source by its file path without the bundler query (`/src/app.tsx`, not `/src/app.tsx?pick=default`).

## 0.17.1

### Patch Changes

- e7766fc: Build with tsdown and update dependencies.

  - Packages still ship ESM and CommonJS builds, but the files moved inside `dist`. Imports through the package `exports` are unaffected.
  - The `development` export condition is removed.
  - The Vite plugin accepts Vite 6, 7 and 8.
  - `unplugin-solid-labels` no longer lists `babel` and `core` in `files`, which did not exist.
