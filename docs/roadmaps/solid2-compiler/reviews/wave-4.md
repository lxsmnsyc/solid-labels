# Wave 4 report (2026-11-07)

Open for the maintainer: #43 (`scope-oracle`), #50 (`fuzz-properties`), #51 (`test-flake`), #52 (`perf-compiler-indexes`). Set each to `done` when it merges.

What changed against the plan:

- `fuzz-properties` duplicates the two properties that `fix-nested-rewrites` already added to `nested-rewrites.test.ts`. The maintainer decides whether to keep #50 or close it.
- `test-flake`: the failures were timeouts, not counterexamples. `sample()` built 1000 programs per call; now sized per test, with a 30 s `testTimeout`. 20 of 20 loaded runs pass. `scope-oracle`'s 120 s property was not in the loaded runs; re-check it under load after #43 merges.
- `perf-compiler-indexes`: about 4x faster with identical code. The fresh review found that `CompileError` named a different variable when one effect writes two derived values; fixed by visiting bindings in declaration order. The under-250 ms criterion needs a benchmark run on a quiet machine (a foreign headless Chromium loaded the CPU). The 150 ms goal needs more than this node.
- `test/reference-compiler/` goes stale as `compiler/` changes; any later bug fix fails the oracle on programs that hit it. Decide whether to remove it before `parent-chain-memory`.
- `pnpm lint` misreports through the rtk wrapper; run `oxlint` directly, or `rtk proxy pnpm lint`.

Next:

- `fix-scope-edges` after #43.
- `raw-transfer-spike` (gate) after #52, alone, since it benchmarks.
- `capture-info-union` after #52.
