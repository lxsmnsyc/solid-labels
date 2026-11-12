# Log: scope-oracle

- Added `eslint-scope` 9.1.2 as a dev dependency of `packages/core`. It ships no types and `@types/eslint-scope` is not needed: `pnpm typecheck` passes.
- eslint-scope needs `range` on every node (`parseSync(..., { range: true })`), or it throws in `__isValidResolution`.
- First run failed on `let s0 = $signal(0)`: eslint-scope reports declaration initializers as write references (`ref.init`). Filtered as the `declaration-init` exclusion.
- `programArb({ jsx: false })`: 5000 runs agree (`FC_RUNS=5000`, about 9 s). No disagreement came from the generator.
- Hand-written probes (28 constructs) found two disagreements, kept as `it.fails` cases.
