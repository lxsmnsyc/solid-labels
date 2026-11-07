# Outcome: parent-chain-memory

## Built

- `Ref.parents: Node[]` (a copy of the ancestor stack per identifier) is now `Ref.up: Ancestor | null` in `packages/core/compiler/scope.ts`. `Ancestor` is `{ node, up }`, a persistent linked chain pushed once per visited node and shared by every reference below it. The readers in `effect.ts` (`hoistBaseName`), `reactive.ts` (`detectRefCtf`, `rewriteWrite`), `transform.ts` (`isStatementCall`) and `variables.ts` (`findDeclarator`, `isCallee`) walk `.up`. The unused `callIndex` of `RefCtfUse` is gone.
- Commit 1 holds the change with the oracle still in place. Commit 2 removes `test/reference-compiler/` and the old-vs-new comparison.
- `test/oracle.test.ts` is kept for what is not covered elsewhere: the two `Ctx.unique` properties, and the fixed order and bound cases, which now check that the output parses (or is the expected `CompileError`) instead of comparing with the old compiler. The generated old-vs-new property is deleted: `test/fuzz.test.ts` already parses the output of `programArb` and runs `straightLineArb` programs against plain JS, and `test/nested-rewrites.test.ts` covers the rewrites.
- `.changeset/parent-chain-memory.md` (patch).

## Result

- result: missed. The change is correct and byte-identical, but time and GC share did not move beyond noise.
- Same machine, one session, 15 alternating base/new process pairs per case, 15 timed runs per process (median of each process). Load average was 4 to 5 (the maintainer's browser was open), so noise is higher than on a quiet machine.

| case             | base median ms (MAD) | after median ms (MAD) | gain       | 3 x MAD | verdict      |
| ---------------- | -------------------- | --------------------- | ---------- | ------- | ------------ |
| plain-show n=800 | 29.50 (0.96)         | 28.89 (0.51)          | 0.6 (2.1%) | 2.9     | within noise |
| ctf n=800        | 182.88 (4.62)        | 185.51 (3.26)         | -2.6       | 13.9    | within noise |
| plain-show n=200 | 7.25 (0.42)          | 7.64 (0.14)           | -0.4       | 1.3     | within noise |
| ctf n=200        | 32.59 (0.51)         | 32.94 (0.90)          | -0.4       | 2.7     | within noise |

- GC share (PerformanceObserver `gc` entries over the timed loop, 6 alternating processes each, median): ctf n=800 base 7.9%, after 8.0%; plain-show n=800 base 8.8%, after 9.4% (range 7.9 to 10.3% vs 8.8 to 10.7%). GC counts per run are the same (70 to 72 vs 70 to 71 for ctf).
- Why: after `perf-compiler-indexes` the chain is only 5 to 15 nodes deep, and the copy is one small array per identifier. The 8 to 10% GC comes from elsewhere.
- Also tried and dropped: caching `Object.keys` per node type in `eachChild` (`compiler/ast.ts`). Output stayed identical, but the gain was again within noise (ctf n=800 -5.3 ms against 3 x MAD of 11.4). Not committed.
- Reproduce: build the base commit (`7f9d70d`) and this branch, copy each `dist` next to a script that alternates processes; the scripts were kept outside the repo (in `node_modules/.bench`) and are not committed. Node version and CPU are in the PR.

## Deviations

- `compiler/ast.ts` is unchanged (the `eachChild` experiment was reverted).
- `test/oracle.test.ts` was kept and reduced, not deleted, for the `Ctx.unique` properties.
- Acceptance 3 (benchmark drop beyond noise) is missed. The refactor still removes the per-identifier copy; keep or drop it is the maintainer's call.

## Stubs left

- None.

## Gotchas

- `ref.up` excludes the identifier itself. Pattern identifiers (assignment targets, shorthand values) are not pushed as nodes, so their chain skips the pattern nodes; the old array did the same, so readers behave as before.
- solid-sfc's `labels/scope.ts` still copies the chain; out of scope.

## Proposed learnings

- Measure the cost before replacing a data structure for speed: the copy looked large at depth 30 but not at the depth the compiler sees | the change gave no gain | packages/core/compiler | no

## Verification

- Before the oracle was removed: `pnpm -C packages/core test` passes (174 tests, snapshots unchanged) with default runs, with `FC_RUNS=1000`, and with magic-string 1.4.5 (lockfile) and 1.2.2 (installed temporarily; `package.json` and lockfile restored).
- After removal: `pnpm -C packages/core test` 172 passed; `tsc --noEmit` clean.
- Full check: see the pull request.

## Size

- Estimated M, actual S. The data structure is simple; the time went to measuring.
