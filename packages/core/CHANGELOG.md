# solid-labels

## 1.0.0-next.0

### Major Changes

- 713a3c4: Rewrite the compiler on Oxc and retarget the API surface at Solid 2.0.

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

- 8627380: `solid-labels/compiler` now loads in a browser build. It no longer requires `oxc-parser` to export `rawTransferSupported`, which the wasm build of `oxc-parser` does not.
- a0b5abf: Internal: the compiler models reactive bindings and effect captures as discriminated unions. The output code is unchanged.
- 804e111: Arrow CTFs and accessor CTFs such as `$memo`, `$untrack` and `$children` keep their `() =>` wrapper when the argument starts with an auto-imported name (`$memo($latest(x))`), a component name, another arrow CTF, or a signal write. In dev mode, the `name` option is also kept in these cases.
- d99b2db: - `$deferred` gets a dev name like `$memo`.
  - Dev names for `$signal` and `$memo` land after the argument and its parentheses. `$memo(c)`, `$memo((a + 1))` and `$memo(c += 2)` no longer compile to broken code in dev mode.
  - `async () => x = await g()` compiles instead of throwing a raw MagicString error.
  - Compound writes with `await` or `yield` on the right side, such as `x += await g()`, no longer leave the `await` inside the setter callback. They read `x` before the `await`, as plain code does. `||=`, `&&=` and `??=` run the right side only when `x` does not decide the result.
- 01a7f77: Fix rewrites that produced wrong or unparsable code. A write whose right side is a signal or memo (`a = b`, `a += m`) now reads it. Nested writes (`s = t++`), object literals next to ref functions or updates, and object literals in `$(expr);` statements and destructure defaults keep their parentheses. JSX components, `$untrack` and signal reads inside `$destructure` and `$component` defaults compile instead of throwing `MagicStringError`, and a concise `$component` body that reads a destructured name returns the value. `$effect` inside a destructure default throws a `CompileError`.
- b538dbc: Fix scope analysis: a class expression's own name is local inside the class, a parameter default no longer sees a body `var`, and a function expression's name no longer shadows a same-named parameter.
- 9ad98b3: Fix `$signal` writes through wrapped update targets such as `x!++` and `(x as any)++`. They compiled to `x()!++`, a syntax error, and now call the setter like `x++`. A `$signal` used as a `for (x of xs)` or `for (x in o)` target is now a compile error ("Unsupported write") instead of invalid output.
- b6566a3: Fix signal writes that compiled to wrong code. `a = (1 + 2)` and other parenthesized right-hand sides no longer emit an unbalanced parenthesis, and `count++` / `count--` whose value is used now give the old value, as in plain JavaScript.
- 5c0ef0d: Fix writes to a signal through a TypeScript wrapper. `x! = 1`, `(x as any) = 1`, `(x satisfies number) = 1`, `(<any>x) = 1` and their compound forms such as `x! += 1` no longer throw `Unsupported write to reactive variable` and compile like `x = 1`.
- 8dc5a86: Compile large files faster: the compiler looks up references, effect regions and `$untrack` spans through sorted indexes instead of scanning everything. The output code is unchanged. Source maps of hoisted effect callbacks now point at the original callback.
- 5227b2d: Parse with oxc raw transfer where the platform supports it. Compiling a large file with labels is about 20% faster and a file without labels in `Show` about 50% faster. The output is unchanged.
- 09c586f: - Enum members with a string-literal name that is a valid identifier (`"a" = 1`) can be referenced by that name.
  - Members of an earlier `enum E {}` block, and exported members of another `namespace N {}` block, resolve in later blocks of the same declaration. A `$signal` exported from one namespace block is read as `s()` in another.
  - A write to an exported `$memo` from another block of the same namespace now throws `Cannot assign to derived variable`, which matches the TypeScript merge rules.
- 2203dcb: Fix scope analysis for decorators, namespace bodies, enum initializers, parameter properties and `import x = require()`. A `$signal` read or written in these positions is now rewritten.

  `export let` of a `$signal` inside a namespace exports the setter as a namespace member, the same as at top level.

- 8fa4b58: The `solid:` JSX elements accept the props of every overload of their component. `<solid:for each={list}>` no longer requires `keyed`, and `<solid:show>` and `<solid:match>` accept `keyed` and function children.
- 509d0f2: Source maps now embed the original source in `sourcesContent`, and name the source by its file path without the bundler query (`/src/app.tsx`, not `/src/app.tsx?pick=default`).
- 16160fb: Update dependencies: `oxc-parser` 0.157, `unplugin` 3.7, `@rollup/pluginutils` 5.5. `magic-string` keeps its `^1.2.2` range.

## 0.17.1

### Patch Changes

- e7766fc: Build with tsdown and update dependencies.

  - Packages still ship ESM and CommonJS builds, but the files moved inside `dist`. Imports through the package `exports` are unaffected.
  - The `development` export condition is removed.
  - The Vite plugin accepts Vite 6, 7 and 8.
  - `unplugin-solid-labels` no longer lists `babel` and `core` in `files`, which did not exist.
