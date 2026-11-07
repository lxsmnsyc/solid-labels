# Outcome: perf-bench

## Result

Added `benchmarks/compile/bench.mjs`, a plain script (not a workspace package, not published). It imports `packages/core/dist/compiler.js` and finds `oxc-parser` through `packages/core`.

Run it after `pnpm -C packages/core build`, on a quiet machine:

```
node benchmarks/compile/bench.mjs [--runs 15] [--sizes 10,50,200,800]
```

Cases: `ctf` (labels), `plain` (no labels), `plain-show` (no labels, one `<Show>` per component). Each size gets 3 warmup runs and 15 timed runs. The table shows median, min and max of `compile()`, the median of oxc `parseSync` on the same source, and the compile/parse ratio.

## Baseline

Taken on `1.0` at 479ab5e (solid-js rc.21, oxc-parser 0.157), before `plugin-fast-path`.

Machine: Apple M2 x8, darwin 27.0.0, node v26.12.1. Times in ms.

| case       |   n |  KB | compile median |    min |    max | parse median | ratio |
| ---------- | --: | --: | -------------: | -----: | -----: | -----------: | ----: |
| ctf        |  10 |   5 |           2.73 |   1.74 |   4.27 |         0.10 | 26.6x |
| ctf        |  50 |  26 |          13.50 |   9.60 |  23.87 |         0.50 | 27.2x |
| ctf        | 200 | 106 |          92.78 |  83.41 | 112.79 |         2.03 | 45.7x |
| ctf        | 800 | 430 |         640.58 | 597.32 | 679.31 |         7.23 | 88.6x |
| plain      |  10 |   1 |           0.26 |   0.25 |   0.31 |         0.03 |  9.2x |
| plain      |  50 |   6 |           1.47 |   1.26 |   3.16 |         0.15 | 10.1x |
| plain      | 200 |  26 |           4.91 |   4.76 |   7.15 |         0.61 |  8.0x |
| plain      | 800 | 104 |          21.29 |  19.28 |  24.53 |         2.43 |  8.8x |
| plain-show |  10 |   2 |           0.32 |   0.31 |   0.35 |         0.04 |  8.6x |
| plain-show |  50 |   8 |           1.60 |   1.49 |   2.62 |         0.17 |  9.3x |
| plain-show | 200 |  31 |           6.92 |   5.96 |  10.94 |         0.74 |  9.4x |
| plain-show | 800 | 124 |          27.38 |  25.64 |  34.12 |         4.44 |  6.2x |

`ctf n=800` is 641 ms here against 857 ms in the analysis session. The machine and the dependency versions differ, so compare later runs only with this table. Small sizes (n=10, 50) are noisy, with max up to 2x the median; use n=200 and n=800 to judge a change.

## Deviations

- `plain` and `plain-show` use the prototype's `plain` component; `plain-show` swaps the `<div>` root for `<Show when={x > 0}>`.
- No workspace entry: `pnpm-workspace.yaml` is unchanged.
