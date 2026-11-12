# Outcome: raw-transfer-ship

## Built

- `compile()` in `packages/core/compiler/index.ts` parses with oxc raw transfer when `rawTransferSupported()` is true. The option sits in a local `PARSE_OPTIONS` typed `ParserOptions & { experimentalRawTransfer?: boolean }`, with a comment linking oxc-project/oxc#28275 and the re-check step after an oxc minor bump.
- Patch changeset `.changeset/raw-transfer.md`.

## Result

Experiment nodes only.

- Not an experiment node. Benchmark: `compile()` at n=800, median of the per-process medians (ms), 20 alternating process pairs on `origin/1.0` and this branch. Noise is 3x the larger median absolute deviation (MAD).

| case       | base median | base MAD | raw median | raw MAD | change |  gain | 3x MAD | verdict                      |
| ---------- | ----------: | -------: | ---------: | ------: | -----: | ----: | -----: | ---------------------------- |
| ctf        |      183.20 |     2.75 |     144.88 |    2.55 | -20.9% | 38.32 |   8.26 | faster                       |
| plain-show |       28.34 |     0.54 |      14.32 |    0.43 | -49.5% | 14.02 |   1.63 | faster                       |
| plain      |        0.04 |     0.00 |       0.04 |    0.00 |     0% |     0 |      0 | none (not parsed, fast path) |

- reproduce: build `packages/core` on each side, copy `dist`, run `benchmarks/compile/bench.mjs --sizes 800 --runs 15` against each copy, alternating the order per pair. Apple M2 x8, node v26.12.1. The user's browser was open; load average 4 to 6.
- `ctf n=800` is 144.88 ms, under the 150 ms goal on this machine.

## Deviations

- No `test/raw-transfer.test.ts`. The option has no user switch, so output cannot be compared on and off; the snapshots already run with it on.

## Stubs left

- None.

## Gotchas

- After an oxc minor bump, re-run `benchmarks/compile` and check the oxc changelog: a rename of the option makes parsing fall back to the slow path with no error.
- The first `compile()` in a process costs about 4.5 ms more (spike measurement).

## Proposed learnings

- Re-run `benchmarks/compile` after an oxc-parser minor bump | the raw transfer option can be renamed and fall back silently | packages/core/compiler | no

## Verification

- `pnpm -C packages/core exec tsc --noEmit -p .` and `pnpm -C packages/core test`: pass, 174 tests, snapshots unchanged.

## Size

- Estimated S, actual S.
