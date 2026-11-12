# Log: test-flake

- Calm run on `1.0`: 14 files, 119 tests pass in about 9 s.
- `scope-oracle.test.ts` is not on `1.0` yet, so its 120 s property was not part of the reproduction.
- Load: 4 `yes` processes plus two suites at once (`vitest run --reporter=verbose`). 8 of 8 finished runs failed (the loop was stopped there).
- Every failure was a timeout, none a fast-check counterexample. 10 times `is deterministic for a seed` ("Test timed out in 5000ms", 5.7 to 93 s), plus once each `is rejected by compile() ...` and twice `keeps jsx: false free of JSX and TypeScript syntax`.
- Cause: `sample()` generated 1000 programs per call and most tests used the default 5 s limit.
- Fix: `sample()` takes a count. 100 programs for the cheap tests, 300 for the CompileError share, 1000 only for the two coverage tests (seeded, so unchanged). `packages/core/vitest.config.ts` sets `testTimeout` to 30 s as the floor.
- CI seeds: left random. fast-check prints the seed and counterexample on failure, which is enough to replay it.
- After the fix: 20 of 20 loaded runs passed under the same load (the first run took 83 s against 7 s calm).
