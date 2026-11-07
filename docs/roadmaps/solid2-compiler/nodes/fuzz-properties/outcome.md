# Outcome: fuzz-properties

## Built

`packages/core/test/fuzz.test.ts` with two properties over `arbitraries.ts`:
- `programArb({ jsx: true | false })`: `compile()` throws `CompileError` or returns code that oxc parses without errors.
- `straightLineArb()`: the compiled `source` run on solid-js 2.0 gives the same `observe` as `plain`.

Run count follows `FC_RUNS` (default 100). No new bugs found. No changeset (test only).

## Deviations

- `nested-rewrites.test.ts` (fix-nested-rewrites) already has the same two properties, so `fuzz.test.ts` duplicates them (helpers included). Not edited, to keep nodes apart; a later cleanup could share the helpers.

## Stubs left

- None.

## Gotchas

- Node resolves `solid-js` to the server build; load the `browser` export file, as the test does.

## Proposed learnings

- None.

## Verification

- `pnpm -C packages/core exec vitest run test/fuzz.test.ts`: 3 passed. `FC_RUNS=5000`: 3 passed (64 s).
- Reverting `compiler/reactive.ts` to the commit before fix-signal-writes (`b6566a3^`, which also drops the nested-rewrite closers fix in that file): all 3 tests fail. A clean revert of only that commit does not apply.
- Full check: see the pull request.

## Size

- Estimated S, actual S.
