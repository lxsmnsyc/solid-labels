# Outcome: fix-scope-edges

## Built

- `packages/core/compiler/scope.ts`: a named class expression and a named function expression get their own name scope (visible only inside), and a function whose parameters have defaults or computed keys declares body `var`s in a separate scope. Reference resolution is untouched.
- `packages/core/test/scope-edges.test.ts`: compile examples for each case.
- `packages/core/test/scope-oracle.test.ts`: the two `it.fails` cases and the `KNOWN_DISAGREEMENTS` table are gone; their programs plus three more (`(function f(f) { return f; })`, a class that extends its own name, `(function f(a = f){ var f = 1; })`) are in `AGREEING`.
- `.changeset/fix-scope-edges.md`: patch.

## Deviations

- None. `test/reference-compiler/scope.ts` needed no change: `oracle.test.ts` still passes, since its programs do not hit these cases.
- A default `$signal(1)` next to a body `var $signal` now compiles as the macro and throws `$signal must initialize a variable declaration`. That is the correct result; the test checks it.

## Stubs left

- None.

## Gotchas

- `scope.kind` of a body block is `'function'` when the function has parameter expressions. Only `scope.ts` reads kind.
- Name scopes have kind `'block'` and are keyed by the expression node in `nameScopeMap`, not `scopeMap`.
- Class declarations still use one binding in the enclosing scope (no inner name scope).

## Proposed learnings

- None.

## Verification

- `pnpm -C packages/core exec vitest run test/scope-oracle.test.ts test/scope-edges.test.ts`: 37 passed.
- `pnpm -C packages/core test`: 174 passed, snapshots unchanged.
- Under load (8 busy loops, two suites at once): scope-oracle property 0.55 s and 1.2 s against a 120 s limit.

## Size

- Estimated S, actual S.
