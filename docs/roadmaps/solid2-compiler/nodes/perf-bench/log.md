# Log: perf-bench

- Reset to `origin/1.0`, built core. No `benchmarks/` existed.
- Wrote `benchmarks/compile/bench.mjs` from the prototype. Resolves oxc-parser with `createRequire` on `packages/core/package.json`.
- Baseline taken with nothing else running: 15 runs, 3 warmup.
