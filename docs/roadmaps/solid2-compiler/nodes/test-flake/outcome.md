# Outcome: test-flake

## Built

- The failing tests were in `packages/core/test/arbitraries.test.ts`, and the failures were timeouts, not fast-check counterexamples. Under load (4 `yes` processes plus two suites at once, `--reporter=verbose`) 8 of 8 finished runs failed, mostly `programArb > is deterministic for a seed` ("Test timed out in 5000ms"), also `keeps jsx: false free of JSX and TypeScript syntax` and the CompileError share test.
- Cause: `sample()` generated 1000 programs per call, and most tests used the 5 s default limit.
- Fix: `sample()` takes a count: 100 programs for the cheap tests, 300 for the CompileError share, 1000 only for the two seeded coverage tests. `packages/core/vitest.config.ts` (new) sets `testTimeout` to 30 s. Calm suite time dropped from about 9 s to about 7 s.
- The root cause named in the brief (#45, a generator counterexample) is a different failure; no counterexample showed up in any loaded run, so no bug is handed over.
- CI seeds stay random: fast-check prints the seed and counterexample on failure, so a CI failure can be replayed.

## Deviations

- `test/scope-oracle.test.ts` is not on `1.0` yet, so its 120 s property was not part of the reproduction. `test/nested-rewrites.test.ts` ran unchanged and never failed.
- Sample counts were lowered rather than the tests being cached; the seeds differ per test, so there was nothing to share.
- No changeset: tests and config only.

## Stubs left

- None.

## Gotchas

- Under this load a suite took up to 83 s against 7 s calm, so a 5 s default limit is not safe for any test that generates hundreds of programs.
- A bash `pkill` of `yes` was denied by the sandbox; start load generators by PID and kill by PID.

## Proposed learnings

- Generate only as many programs as the property needs; keep 1000-sample runs for seeded coverage checks | sampling cost grows with machine load and fails the default 5 s limit | packages/core/test | no

## Verification

- Before: 8 of 8 loaded runs failed (timeouts).
- After: 20 of 20 loaded runs passed with the same load.
- `pnpm -C packages/core test`: 14 files, 119 tests pass.
- Full check: see the pull request.

## Size

- Estimated S, actual S.
