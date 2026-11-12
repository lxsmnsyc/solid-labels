# Log: fuzz-generator

- Branch `feat/fuzz-generator` reset onto `origin/1.0`. Added `fast-check ^4.10.2` and `@fast-check/vitest ^0.5.0` (npm latest) to `packages/core` devDependencies. `@fast-check/vitest` is installed but unused; the tests use `fc.assert` with `FC_RUNS`.
- Design: a scope model (signals, memos, derived, destructured, plains, rebound names) threads through `fc.chain`. Arbitraries are cached per scope key. Putting the name counter in the cache key for expressions made memory grow without bound (OOM at 2 GB across the test file); expressions now use a key without the counter.
- First draft had 50% CompileErrors. Causes: ref functions (`$get`, `$set`, `$refSignal`, `$refMemo`, `$getter`, `$property`) on captured variables inside effect callbacks, and ref functions inside `$destructure` defaults. Both are compile errors by design, so the generator tracks `inEffect` and skips them there.
- First draft also produced source that did not parse: object literals as arrow bodies or statements, `fallback={{...}}`, `??` mixed with `&&`/`||`, JSX next to `<`. Fixed with parentheses.
- Compiler crash found: a JSX component inside a `$destructure` or `$component` parameter default throws `MagicStringError: cannot split a chunk that has already been edited`, not a `CompileError`. The generator keeps JSX out of defaults. Not fixed here.
- Shrinking: `withCrossShrink` on every `oneOf` lets expressions shrink to literals. Statement lists shrink by count only (a chain per statement), so a counterexample keeps some unrelated statements.
