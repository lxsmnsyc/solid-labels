# Log: raw-transfer-spike

## 2026-11-07

- Base: `1.0` at e48ab38 (after `perf-compiler-indexes`, PR #52). oxc-parser 0.157.0, which is also the latest on npm today.
- Machine: Apple M2 x8, 8 GB, darwin 27.0.0, node v26.12.1. No other agent ran. The user's browser (Dia, about 60% CPU over its helpers) and WindowServer (about 46%) were busy; load average 3.2 to 6.2 during the runs.
- Experiment commit c376ce6 (local branch `spike/raw-transfer-experiment`, not pushed) changes `packages/core/compiler/index.ts`: imports `rawTransferSupported` and passes `experimentalRawTransfer: rawTransferSupported()` to `parseSync`.
- Typing: `pnpm -C packages/core exec tsc --noEmit -p .` fails with `compiler/index.ts(54,5): error TS2353: ... 'experimentalRawTransfer' does not exist in type 'ParserOptions'`. 0.157 exports `rawTransferSupported()` in `index.d.ts` but `ParserOptions` lists only `lang`, `sourceType`, `astType`, `range`, `preserveParens`, `showSemanticErrors`. The JS (`src-js/index.js`) reads `options.experimentalRawTransfer`.
- Tests with the option on: `pnpm -C packages/core test` 17 files, 162 passed, 2 expected fail, snapshots unchanged. Same counts on the baseline.
- Method: built `packages/core` once per side and copied `dist` to `dist-base` and `dist-raw` (untracked). A copy of `benchmarks/compile/bench.mjs` that reads the dist folder from `DIST` ran in alternating processes (base, raw, base, raw, ...). perf-pass's `bench.py` reads one number per run, so the per-case table came from a small script over the bench outputs instead, with the same rule: a change is real only when it exceeds 3x the larger median absolute deviation of the per-process medians.
  - Rounds 1 to 8: `--sizes 50,200,800 --runs 15`.
  - Rounds 9 to 20: `--sizes 800 --runs 21`, to tighten `ctf n=800`, whose spread was large (base 173 to 251 ms across processes).
- First pass at `ctf n=800` (8 pairs): -24.8%, within noise (noise 55.7 ms). With 20 pairs: 192.24 -> 151.41 ms, noise 38.2 ms, faster.
- The gain at `ctf n=800` (about 40 ms) is far above the parse column (7.3 ms for oxc's own `parseSync` on that source). The raw-transfer AST appears to make the later passes faster too, probably through object shapes or less GC; not investigated.
- Peak RSS (`/usr/bin/time -l`, 3 alternating runs per side, 20 compiles per process): no difference. Raw transfer reserves a 6 GiB `ArrayBuffer` (`process.memoryUsage().arrayBuffers` = 6144 MiB) but only the touched pages count toward RSS.
- Cold start: the first `compile()` in a fresh process costs 6.4 to 7.3 ms with raw transfer against 1.9 to 2.1 ms without (loads `raw-transfer/eager.js` and the deserializer). Later calls are the same.
