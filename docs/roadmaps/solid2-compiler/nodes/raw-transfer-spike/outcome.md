# Outcome: raw-transfer-spike

## Built

- No code merges. The experiment is commit c376ce6 on the local branch `spike/raw-transfer-experiment` (not pushed); this branch holds only `log.md` and this outcome.

## Result

- result: met. Raw transfer gives a gain beyond noise on every case that parses, with no RSS cost. Recommendation: ship, behind no option, with a local type extension for the option.
- numbers: `compile()` median of the per-process medians, in ms. 20 alternating process pairs at n=800, 8 at n=50 and 200. Noise is 3x the larger median absolute deviation; a change below it counts as none.

| case       |   n | base median |  base min-max | raw median |   raw min-max | change | noise | verdict                      |
| ---------- | --: | ----------: | ------------: | ---------: | ------------: | -----: | ----: | ---------------------------- |
| ctf        |  50 |        8.66 |     7.51-9.60 |       5.98 |     5.46-8.69 | -30.9% |  1.17 | faster                       |
| ctf        | 200 |       35.60 |   31.05-39.78 |      26.70 |   22.20-32.98 | -25.0% |  7.68 | faster                       |
| ctf        | 800 |      192.24 | 173.40-250.96 |     151.41 | 135.14-182.40 | -21.2% | 38.24 | faster                       |
| plain      | 800 |        0.04 |     0.04-0.04 |       0.04 |     0.04-0.04 |     0% |     0 | none (not parsed, fast path) |
| plain-show |  50 |        1.90 |     1.60-2.54 |       1.07 |     0.86-2.00 | -43.7% |  0.54 | faster                       |
| plain-show | 200 |        6.97 |    5.96-12.39 |       3.75 |    2.90-10.15 | -46.3% |  2.12 | faster                       |
| plain-show | 800 |       29.68 |   26.35-42.92 |      14.27 |   12.83-18.53 | -51.9% |  5.70 | faster                       |

- Peak RSS (`/usr/bin/time -l`, maximum resident set size, 3 runs per side):

| workload                 | base (MB) | raw (MB)  |
| ------------------------ | --------- | --------- |
| `ctf n=800`, 20 compiles | 374-420   | 370-398   |
| `plain-show n=800`, 20   | 258-268   | 239-266   |
| `ctf n=10`, 1 compile    | 66.9-67.1 | 66.4-66.5 |

No difference. Raw transfer reserves a 6 GiB `ArrayBuffer` (virtual), which does not show in RSS.

- Cold start: the first `compile()` in a process costs about 4.5 ms more (6.4-7.3 against 1.9-2.1 ms) while oxc loads its raw-transfer deserializer. Later calls match.
- Typing: oxc-parser 0.157.0 (latest on npm on 2026-11-07) does not type the option. `tsc` fails with `TS2353: 'experimentalRawTransfer' does not exist in type 'ParserOptions'`. `rawTransferSupported()` is typed.
- Tests with the option on: `pnpm -C packages/core test` 162 passed, 2 expected fail, snapshots unchanged (same as the baseline).
- reproduce: base e48ab38, experiment c376ce6. Build `packages/core` on each, copy `dist` to `dist-base` and `dist-raw`, run a copy of `benchmarks/compile/bench.mjs` that imports `packages/core/$DIST/compiler.js`, alternating sides per process. Apple M2 x8, 8 GB, darwin 27.0.0, node v26.12.1. The user's browser used about 60% of one core; load average 3.2 to 6.2.

### Recommendation

Ship as a follow-up node (size S). The gain is 21 to 52% on every parsed case and makes `ctf n=800` 151 ms, near the 150 ms goal, with no RSS cost and no snapshot change. A user option is not worth it: `rawTransferSupported()` already falls back on platforms without support (32-bit, Bun, node < 22).

The one-line change in `packages/core/compiler/index.ts` (plus adding `rawTransferSupported` to the `oxc-parser` import):

```ts
    experimentalRawTransfer: rawTransferSupported(),
```

Because 0.157 does not type the option, the follow-up also needs a typed options object, for example `const PARSE_OPTIONS: ParserOptions & { experimentalRawTransfer?: boolean }`, or a `declare module 'oxc-parser'` augmentation of `ParserOptions`. Prefer the intersection: it stays local and breaks loudly if oxc renames the option and types it.

## Deviations

- perf-pass's `bench.py` reads one number per process, so the per-case comparison used the same interleaving and noise rule through a small local script over `bench.mjs` output. Not committed.

## Stubs left

- None.

## Gotchas

- The option is experimental and may change in a minor oxc release. Pin the oxc-parser minor or keep a test that fails when raw transfer is not used (for example, spy on `parseSync` options).
- The gain at `ctf n=800` (about 40 ms) is larger than oxc's whole parse time on that source (7.3 ms). The AST from raw transfer seems to speed up the later passes; the reason was not investigated, so do not assume the gain survives a change of AST shape.
- `ctf n=800` varies 170 to 250 ms between processes on this machine. Eight process pairs were not enough to call a 40 ms change real; use 20 or more.

## Proposed learnings

- Compare benchmark sides across many alternating processes, not one long process | per-process medians of `ctf n=800` vary by 40% | benchmarks/compile | no

## Verification

- `pnpm -C packages/core exec tsc --noEmit -p .` on c376ce6: fails, TS2353 at `compiler/index.ts:54`.
- `pnpm -C packages/core test` on c376ce6 and on e48ab38: 162 passed, 2 expected fail.
- `pnpm exec oxfmt` on the node folder.

## Size

- Estimated S, actual S.
