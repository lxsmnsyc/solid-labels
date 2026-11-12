# Adversarial review (fresh-context agent, 2026-11-07)

Seven findings. Each was checked against the code before applying.

1. `check-green` missed `compiler/context.ts`, where `CaptureInfo` is declared (`context.ts:23`). Applied: added to owns.
2. `fuzz-suite` and `scope-oracle` both owned `packages/core/package.json` and `pnpm-lock.yaml`. Applied: both moved to `shared`, merge order `fuzz-generator` then `scope-oracle` in `GOAL.md`; `check-green` shares `packages/core/package.json`.
3. `program-arbitrary` was too vague: no file id or language, no definition of the plain program or how values are observed, no coverage list, no error bound, wrong dependent count. Applied: contract rewritten with types, `id`, `observe`, coverage, `COMPILE_ERROR_BOUND`, dependents.
4. `plugin-fast-path` changes what the `plain` benchmark measures, and it shares `compiler/index.ts` with `raw-transfer-spike`. Applied: `plugin-fast-path` hard on `perf-bench`; new `plain-show` case that always takes the full path; `raw-transfer-spike` hard on `plugin-fast-path`.
5. `fuzz-suite`'s hard edge on `fix-signal-writes` put the generator on the critical path. Applied: split into `fuzz-generator` (no dependency, freezes the contract, gated) and `fuzz-properties` (hard on the fix).
6. `scope-oracle` allowed fixes in `scope.ts`, which `parent-chain-memory` rewrites. Applied: `scope-oracle` reports only; `parent-chain-memory` hard on `scope-oracle`. The `capture-info-union` edge on `fix-signal-writes` is kept: after the split it is no longer implied by another path.
7. `parent-chain-memory` used the oracle without a contract edge; `phase-outputs` owns all of `compiler/**`. Applied: contract edge added; `phase-outputs` notes that owns are narrowed when it is un-parked.

Rejected: none. The suggestion to split hot compiler files by feature is declined in `GOAL.md` constraints: each file holds one phase and the nodes that edit them are chained.
