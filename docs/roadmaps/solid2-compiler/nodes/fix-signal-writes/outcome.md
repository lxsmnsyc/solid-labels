# Outcome: fix-signal-writes

## Built

- `rewriteWrite` in `packages/core/compiler/reactive.ts` finds the real span of a parenthesized right-hand side (plain, await and arrow-await branches) and gives postfix `++` / `--` with a used value the old value through a `tmp` capture.
- Tests in `packages/core/test/signal.test.ts` (`$signal write rewrites on solid-js`) that run the output on solid-js. No snapshot changed.
- `.changeset/fix-signal-writes.md` (patch, `solid-labels`).

## Deviations

- None.

## Stubs left

- None.

## Gotchas

- oxc runs with `preserveParens: false`, so node spans exclude parentheses. Use `expandParens` with an upper bound (`assign.end`) when overwriting around a child node.
- Postfix with an unused value (statement, for-update) keeps the short form. A postfix in a non-last position of a sequence expression still gets the IIFE, which is correct but longer.

## Proposed learnings

- Tests of compiler output should also run the output, not only snapshot it | snapshots hid both bugs | packages/core/test | yes

## Verification

- `pnpm -C packages/core test`: pass (80 tests).
- `pnpm -C packages/core exec tsc --noEmit -p .`: only the existing error at effect.ts:102.

## Size

- Estimated S, actual S.
