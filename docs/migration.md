# Migration: solid-labels 0.x → 1.0 (Solid 2.0 + Oxc)

Version 1.0 rewrites the compiler from Babel to [Oxc](https://oxc.rs)
(`oxc-parser` + `magic-string`) and retargets the API surface at Solid 2.0.
Two feature families were removed on purpose:

- **Labels** (`signal: x = 0`, `effect: { ... }`) — removed.
- **Comment pragmas** (`/* @signal */`, `// @memo`) — removed.

Compile-time functions (CTFs) are the single remaining syntax. They are
explicit call sites, easier to type-check, and they survive formatters and
linters that labels and comments never played well with.

CTF names now mirror Solid 2.0 keywords exactly (`onSettled` → `$settled`,
`snapshot` → `$snapshot`). One name per API — the 1.x-flavored aliases
(`$mount`, `$unwrap`) are gone.

## Dropped (the Solid 1.x API no longer exists)

| CTF | 1.x API | What to use instead |
| --- | ------- | ------------------- |
| `$batch` | `batch` | Writes batch by default; `$flush` applies them synchronously |
| `$computed` | `createComputed` | `$memo`, or split `$effect` |
| `$resource` | `createResource` | Async computations: `$memo(fetchUser(id))` + `<Loading>` |
| `$selector` | `createSelector` | `$projection` / `createStore(fn)` |
| `$on` | `on` | `$effect` — the compute phase *is* the explicit dependency list |
| `$observable`, `$from` | `observable`, `from` | Async iterables in computations |
| `$error`, `$catchError` | `onError`, `catchError` | `<Errored>` or `createEffect`'s `error` option |
| `$startTransition`, `$useTransition` | transitions API | Built-in transitions; `$isPending`, `$latest` |
| `$indexArray` | `indexArray` | `$mapArray(..., { keyed: false })` or `$repeat` |
| `$mutable`, `$produce` | `createMutable`, `produce` | `$store` — setters are draft-first |
| `$deferred` | `createDeferred` | Removed in 2.0; no replacement |
| `$mount` | `onMount` | `$settled` (also covers cleanup via a returned function) |
| `$unwrap` | `unwrap` | `$snapshot` |
| `Index`, `Suspense`, `SuspenseList`, `ErrorBoundary`, `Assets` components | — | `Repeat` / `<For keyed={false}>`, `Loading`, `Reveal`, `Errored`; `Assets` is gone |

## Translated (same idea, 2.0 name and semantics)

| CTF | Compiles to | Notes |
| --- | ----------- | ----- |
| `$signal`, `$memo`, `$` | `createSignal`, `createMemo` | Options follow 2.0 (`ownedWrite`, `lazy`, `unobserved`); non-static `$signal` initializers compile to the writable-derived form `createSignal(() => expr)` |
| `$untrack` | `untrack` | `$batch` sibling removed |
| `$root`, `$uid`, `$reaction` | `createRoot`, `createUniqueId`, `createReaction` | |
| `$merge` | `merge` | Was `mergeProps` |
| `$omit` | `omit` | New; replaces `splitProps` usage inside `$destructure` too |
| `$settled`, `$cleanup` | `onSettled`, `onCleanup` | |
| `$flush`, `$action`, `$isPending`, `$latest`, `$refresh`, `$affects`, `$resolve` | same names | New 2.0 async surface |
| `$store`, `$projection`, `$optimistic`, `$optimisticStore`, `$reconcile`, `$snapshot`, `$deep` | same names | Store APIs live in `solid-js` now |
| `$mapArray`, `$repeat` | `mapArray`, `repeat` | `$repeat` replaces `$indexArray` |
| `$children`, `$lazy`, `$createContext`, `$useContext`, `$owner`, `$runWithOwner` | same names | |
| `$destructure`, `$component`, `$refSignal`, `$refMemo`, `$derefSignal`, `$derefMemo`, `$get`, `$set`, `$getter`, `$setter`, `$property` | — | solid-labels core mechanics, unchanged surface |
| Components (`For`, `Show`, `Switch`, `Match`, `Repeat`, `Errored`, `Loading`, `Reveal`, `Dynamic`, `Portal`, `HydrationScript`, `Hydration`, `NoHydration`) and the `solid:` JSX namespace | auto-imports | DOM components come from `@solidjs/web` |

## Decided (was undecided)

### `$effect` / `$renderEffect` — capture compilation

Solid 2.0 split `createEffect` into a tracked compute phase and an untracked
apply phase. Instead of aliasing one of the phases, `$effect` now compiles the
single-callback form into both phases mechanically: the compiler collects
every outer identifier the callback uses, reads them (tracking signals) in a
generated compute phase, and hands the raw values to the callback.

```js
let bar = $signal(someValue());
$effect(() => {
  foo(bar);
});
```

```js
import { createSignal as _createSignal } from "solid-js";
import { createEffect as _createEffect } from "solid-js";

let [bar, setbar_1] = _createSignal(someValue());
_createEffect(() => [bar()], effectCallback_1);

function effectCallback_1([bar]) {
  foo(bar);
}
```

The callback is hoisted to module level when possible (no `this`,
`arguments`, `super`, and no writes to plain outer variables); otherwise it
stays inline with a destructured parameter list. See
[`docs/ctf.md`](./ctf.md#effect-and-rendereffect) for the full rules.

`$renderEffect` and the `$(expr);` statement compile through the same capture
mechanism (`$` treats the expression as the callback body). `$trackedEffect`
remains a plain alias for `createTrackedEffect` when the single-callback
tracked form — where the callback itself is the tracking scope — is wanted.

### Output changes from the Babel era

- Signal/memo variables keep their original names; only setters get generated
  names (`setcount_1` instead of renaming `count` to `count_1`).
- `$getter` / `$setter` / `$property` emit plain own getters/setters instead
  of the shared-`__proto__` objects the Babel compiler produced.
- `$destructure` rest uses `omit(target, "a", "b")`; the `splitProps`
  tuple-index form is gone.
- Output preserves your formatting (span edits, not re-printing), and source
  maps come from `magic-string` in high-resolution mode.

## Plugin options

`disabled.label` and `disabled.pragma` are gone; only `disabled.ctf` remains:

```js
solidLabels({
  disabled: {
    ctf: {
      $signal: true,
    },
  },
});
```
