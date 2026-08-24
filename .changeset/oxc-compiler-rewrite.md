---
"solid-labels": major
"unplugin-solid-labels": major
"vite-plugin-solid-labels": major
"rollup-plugin-solid-labels": major
---

Rewrite the compiler on Oxc and retarget the API surface at Solid 2.0.

The Babel-based compiler is replaced with `oxc-parser` (native parsing) and
`magic-string` (span-based output): untouched code keeps its formatting and
source maps are high-resolution. The `solid-labels/babel` entry is gone;
plugins consume `solid-labels/compiler`, whose `compile(id, code, options)`
interface is unchanged.

Breaking changes:

- **Labels** (`signal: x = 0`) and **comment pragmas** (`/* @signal */`) are
  removed. Compile-time functions are the single remaining syntax, and
  `disabled.label` / `disabled.pragma` plugin options are gone.
- CTF names follow Solid 2.0 keywords strictly: `$settled` (`onSettled`),
  `$snapshot` (`snapshot`), `$merge`, `$omit`. The `$mount` and `$unwrap`
  aliases are removed.
- CTFs whose underlying 1.x API no longer exists are removed: `$batch`,
  `$computed`, `$resource`, `$selector`, `$on`, `$observable`, `$from`,
  `$error`, `$catchError`, `$startTransition`, `$useTransition`,
  `$indexArray`, `$mutable`, `$produce`, `$deferred`.
- `$effect`, `$renderEffect`, and the `$(expr);` statement compile through a
  new capture mechanism: outer identifiers used by the callback are read in a
  generated tracked compute phase and passed to the untracked callback as a
  destructured array; the callback is hoisted to module level when safe.
- `$signal` adopts the memoized signal convention: non-static initializers
  compile to the writable-derived form `createSignal(() => expr)`.

New CTFs for the Solid 2.0 surface: `$trackedEffect`, `$flush`, `$action`,
`$isPending`, `$latest`, `$refresh`, `$affects`, `$resolve`, `$repeat`,
`$projection`, `$optimistic`, `$optimisticStore`, `$snapshot`, `$deep`, plus
the `Repeat`, `Errored`, `Loading`, `Reveal`, and `Hydration` components.

See `docs/migration.md` for the full migration guide.
