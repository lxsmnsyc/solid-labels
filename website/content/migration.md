# Migration from 0.x

> The 0.x line is in maintenance mode on the
> [`0.x` branch](https://github.com/lxsmnsyc/solid-labels/tree/0.x). It targets Solid 1.x and
> receives fixes only. Version 1.0 targets Solid 2.0 and has no other new features
> of its own to port.

Version 1.0 rewrites the compiler from Babel to [Oxc](https://oxc.rs)
(`oxc-parser` + `magic-string`) and retargets the API surface at Solid 2.0.
Two feature families were removed on purpose:

- **Labels** (`signal: x = 0`, `effect: { ... }`). Removed.
- **Comment pragmas** (`/* @signal */`, `// @memo`). Removed.

Compile-time functions (CTFs) are the single remaining syntax. They are
explicit call sites, easier to type-check, and they survive formatters and
linters that labels and comments never played well with.

CTF names now mirror Solid 2.0 keywords exactly (`onSettled` → `$settled`,
`snapshot` → `$snapshot`). One name per API. The 1.x-flavored aliases
(`$mount`, `$unwrap`) are gone.

## Dropped (the Solid 1.x API no longer exists)

| CTF                                                                       | 1.x API                    | What to use instead                                                                |
| ------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------- |
| `$batch`                                                                  | `batch`                    | Writes batch by default; `$flush` applies them synchronously                       |
| `$computed`                                                               | `createComputed`           | `$memo`, or split `$effect`                                                        |
| `$resource`                                                               | `createResource`           | Async computations: `$memo(fetchUser(id))` + `<Loading>`                           |
| `$selector`                                                               | `createSelector`           | `$projection` / `createStore(fn)`                                                  |
| `$on`                                                                     | `on`                       | `$effect`. The compute phase _is_ the explicit dependency list                     |
| `$observable`                                                             | `observable`               | No replacement. `$from` is the reverse direction (a source into an async iterable) |
| `$error`, `$catchError`                                                   | `onError`, `catchError`    | `<Errored>` or `createEffect`'s `error` option                                     |
| `$startTransition`, `$useTransition`                                      | transitions API            | Built-in transitions; `$isPending`, `$latest`                                      |
| `$indexArray`                                                             | `indexArray`               | `$mapArray(..., { keyed: false })` or `$repeat`                                    |
| `$mutable`, `$produce`                                                    | `createMutable`, `produce` | `$store`. Setters are draft-first                                                  |
| `$mount`                                                                  | `onMount`                  | `$settled` (also covers cleanup via a returned function)                           |
| `$unwrap`                                                                 | `unwrap`                   | `$snapshot`                                                                        |
| `Index`, `Suspense`, `SuspenseList`, `ErrorBoundary`, `Assets` components | none                       | `Repeat` / `<For keyed={false}>`, `Loading`, `Reveal`, `Errored`; `Assets` is gone |
| `Dynamic` component, `<solid:dynamic>`                                    | `Dynamic`                  | Deprecated in 2.0; `dynamic()` from `@solidjs/web`                                 |
| Unknown `<solid:...>` element names                                       | none                       | Now a compile error; they used to pass through as intrinsic elements               |

## Translated (same idea, 2.0 name and semantics)

| CTF                                                                                                                                                                             | Compiles to                                                                                  | Notes                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$signal`, `$memo`, `$`                                                                                                                                                         | `createSignal`, `createMemo`                                                                 | Options follow 2.0 (`ownedWrite`, `lazy`, `unobserved`); non-static `$signal` initializers compile to the writable-derived form `createSignal(() => expr)`                                |
| `$untrack`                                                                                                                                                                      | `untrack`                                                                                    | `$batch` sibling removed                                                                                                                                                                  |
| `$root`, `$uid`, `$reaction`                                                                                                                                                    | `createRoot`, `createUniqueId`, `createReaction`                                             |                                                                                                                                                                                           |
| `$merge`                                                                                                                                                                        | `merge`                                                                                      | Was `mergeProps`                                                                                                                                                                          |
| `$omit`                                                                                                                                                                         | `omit`                                                                                       | New; replaces `splitProps` usage inside `$destructure` too                                                                                                                                |
| `$settled`, `$cleanup`                                                                                                                                                          | `onSettled`, `onCleanup`                                                                     |                                                                                                                                                                                           |
| `$flush`, `$action`, `$isPending`, `$latest`, `$refresh`, `$affects`, `$resolve`, `$until`, `$from`, `$onFlush`                                                                 | same names                                                                                   | New 2.0 async surface. `$from` returns in 2.0 as `from`                                                                                                                                   |
| `$deferred`                                                                                                                                                                     | `createDeferred`                                                                             | Returns in 2.0 with new meaning. In 1.x it lagged a sync signal and took `timeoutMs`. In 2.0 it is an async memo that keeps the previous answer during a refetch, and `timeoutMs` is gone |
| `$store`, `$projection`, `$optimistic`, `$optimisticStore`, `$reconcile`, `$snapshot`, `$deep`                                                                                  | same names                                                                                   | Store APIs live in `solid-js` now                                                                                                                                                         |
| `$mapArray`, `$repeat`                                                                                                                                                          | `mapArray`, `repeat`                                                                         | `$repeat` replaces `$indexArray`                                                                                                                                                          |
| `$children`, `$lazy`, `$createContext`, `$useContext`, `$owner`, `$runWithOwner`                                                                                                | same names                                                                                   |                                                                                                                                                                                           |
| `$observer`, `$isDisposed`, `$isWrappable`, `$flatten`, `$useHead`, `$clientOnly`, `$lazyModule`                                                                                | `getObserver`, `isDisposed`, `isWrappable`, `flatten`, `useHead`, `clientOnly`, `lazyModule` | New CTFs. None existed in 1.x                                                                                                                                                             |
| `$destructure`, `$component`, `$refSignal`, `$refMemo`, `$derefSignal`, `$derefMemo`, `$get`, `$set`, `$getter`, `$setter`, `$property`                                         | none                                                                                         | solid-labels core mechanics, unchanged surface                                                                                                                                            |
| Components (`For`, `Show`, `Switch`, `Match`, `Repeat`, `Errored`, `Loading`, `Reveal`, `Portal`, `HydrationScript`, `Hydration`, `NoHydration`) and the `solid:` JSX namespace | auto-imports                                                                                 | DOM components come from `@solidjs/web`                                                                                                                                                   |

## Decided (was undecided)

### `$effect` / `$renderEffect`: capture compilation

Solid 2.0 split `createEffect` into a tracked compute phase and an untracked
apply phase. Instead of aliasing one of the phases, `$effect` now compiles the
single-callback form into both phases mechanically: the compiler collects
every outer identifier the callback uses, reads them (tracking signals) in a
generated compute phase, and hands the raw values to the callback.

```ctf tsx
let bar = $signal(someValue());
$effect(() => {
  foo(bar);
});
```

The callback is hoisted to module level when possible (no `this`,
`arguments`, `super`, and no writes to plain outer variables); otherwise it
stays inline with a destructured parameter list. See
the [`$effect` reference](/ctf#effect-and-rendereffect) for the full rules.

`$renderEffect` and the `$(expr);` statement compile through the same capture
mechanism (`$` treats the expression as the callback body). There is no alias for
`createTrackedEffect`, which Solid deprecates. Use `$effect`, or `$settled`
for one-time DOM work.

### Output changes from the Babel era

- Signal/memo variables keep their original names. Only setters get generated
  names (`setcount_1` instead of renaming `count` to `count_1`).
- `$getter` / `$setter` / `$property` emit plain own getters/setters instead
  of the shared-`__proto__` objects the Babel compiler produced.
- `$destructure` rest uses `omit(target, "a", "b")`; the `splitProps`
  tuple-index form is gone.
- Output preserves your formatting (span edits, not re-printing), and source
  maps come from `magic-string` in high-resolution mode.

## Compiler API

`compile()` from `solid-labels/compiler` is now synchronous and returns
`CompileOutput` directly. Drop the `await`.

## Plugin packages

`vite-plugin-solid-labels` and `rollup-plugin-solid-labels` are discontinued.
Use `unplugin-solid-labels` for every bundler. The options are the same.

```js
import solidLabels from 'unplugin-solid-labels';

// Vite
solidLabels.vite({ ... });

// Rollup
solidLabels.rollup({ ... });
```

## Plugin options

`disabled.label` and `disabled.pragma` are gone. Only `disabled.ctf` remains:

```js
solidLabels({
  disabled: {
    ctf: {
      $signal: true,
    },
  },
});
```
