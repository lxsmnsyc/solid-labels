# Outcome: scope-oracle

## Built

- `packages/core/test/scope-oracle.test.ts`: compares `analyze` (`compiler/scope.ts`) with `eslint-scope` on the same oxc AST (`lang: 'jsx'`, `range: true`, `ecmaVersion: 2024`, `sourceType: 'module'`).
  - Compared: for every non-initializer reference, the identifier offset, and the declaring identifier offset or `null` when unresolved. This covers the unresolved set and each resolved reference. Sets of references must match both ways.
  - Property test on `programArb({ jsx: false })`, 100 runs (`FC_RUNS` overrides). Passes, also with `FC_RUNS=5000`.
  - 23 hand-written programs for constructs the generator does not emit (catch, switch, labels, for-in/of, destructuring, hoisting, imports/exports, shorthand, optional chaining). All agree.
  - Two `it.fails` cases for the disagreements below.
- Dev dependency `eslint-scope` ^9.1.2 in `packages/core`, lockfile updated. No `@types` package needed.

### Exclusions (each is named in the test)

- `declaration-init`: eslint-scope records `let x = 1` as a write reference (`ref.init`); `analyze` treats declaring identifiers as bindings only.
- `jsx-names`: `analyze` keeps JSX element names in `jsxNames`; eslint-scope has none. `jsx: false` emits none.
- `typescript`: type-space names; `jsx: false` emits no TS syntax.
- `classes` and `default-param-shadow`: not generated; they are the two known disagreements.

### Disagreements found

Both come from hand-written probes, not from the generator. Orchestrator: one fix node each (owner `compiler/scope.ts`).

1. Parameter default resolved to a body `var`.
   `function f(x=y){ var y=1; return x; } var y;` gives `y` in the default the inner `var y`. It must resolve to the outer `y`. Effect: a global or outer name used in a default can be read as local.
2. Class expression name unresolved inside the class.
   `const o = class C { m(){ return C; } };` gives `C` as unresolved (a global candidate). It must resolve to the class's inner name binding.

## Deviations

- Extra: hand-written probes and `it.fails` cases, beyond the brief's generator-only oracle.

## Stubs left

- None.

## Gotchas

- eslint-scope throws without `range: true` on the parse.
- When a disagreement is fixed, its `it.fails` case goes red; move the program to `AGREEING`.
- Generated programs never hit class or default-parameter shadowing; widening `programArb` to emit them would turn the two known cases into property failures.

## Proposed learnings

- An oracle against a mature library needs a hand-written corpus next to the generator | the generator missed both disagreements | packages/core/test | yes

## Verification

- `pnpm -C packages/core exec vitest run test/scope-oracle.test.ts`: 25 passed, 2 expected fail. With `FC_RUNS=5000`: passed.
- Full check: see the pull request and the report.

## Size

- Estimated M, actual S. The property agreed at once; the time went to the probes.
