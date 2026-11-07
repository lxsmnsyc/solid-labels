# Outcome: perf-compiler-indexes

## Built

- The prototype is ported (without its `index.ts` hunk) in `packages/core/compiler/`:
  - `context.ts`: `sortedRefs` and `refsIn(start, end)` (binary search), `argumentsRefs`, per-base counters for `unique`, `addRegion` with a `parent` link and binary-search `enclosingRegion`/`regionFor`, and `insideUntrack(start, end)` (outermost `$untrack` spans, sorted, binary search, rebuilt when `untrackSpans` grows). `PendingHoist.text` removed. `addRegion` throws if regions arrive out of source order.
  - `effect.ts`: `analyzeCaptures` groups the references inside the body with `refsIn`; `isHoistable` uses `argumentsRefs`; `insideUntrack` calls the `Ctx` method.
  - `render.ts`, `variables.ts`: `refsIn` instead of scanning all reactive references.
  - `transform.ts`: hoisted bodies are moved to the end with `s.move`, with `prependRight`/`appendLeft` for the header. The statement wrap from `fix-nested-rewrites` (`startsStatementBadly`) reads the original source at `body.start`.
- `packages/core/test/reference-compiler/`: a copy of `compiler/` from `origin/1.0` at f775a91, taken before any change (the oracle).
- `packages/core/test/oracle.test.ts`: for `programArb()` programs, new and reference compilers give identical code (with `{}` and `{ dev: true }`), or both throw `CompileError` with the same message. Property: `Ctx.unique` never returns a taken or repeated name, and returns the same names as restarting at 1.
- `.changeset/perf-compiler-indexes.md` (patch).

## Result

Not an experiment node. Benchmark (`benchmarks/compile/bench.mjs`, `ctf n=800`, 430 KB, 15 runs per row, warmup 3), reference and new compilers alternated, same session, Apple M2, node v26.12.1:

- The machine was not quiet. A headless Chromium (not started by this node) used 300 to 400% CPU for the whole session, so most rows are inflated and have wide spread. I could not remove it.
- Perf-bench baseline on a quiet machine: 640 ms median (min 597, max 679). A first run here before the Chromium load grew: reference 858 ms, then 725 ms.
- Six alternating pairs (reference median [min, max] vs new median [min, max], ms):

| pair | reference         | new            |
| ---: | ----------------- | -------------- |
|    1 | 1963 [790, 3278]  | 539 [323, 932] |
|    2 | 2731 [1004, 4616] | 232 [219, 269] |
|    3 | 2588 [1106, 3591] | 560 [430, 677] |
|    4 | 1023 [949, 3357]  | 232 [219, 257] |
|    5 | 1074 [906, 3045]  | 497 [459, 633] |
|    6 | 946 [919, 1162]   | 238 [217, 280] |

- The least disturbed pairs (4 and 6, plus the first pair of an earlier run: reference 725 [684, 762], new 186 [175, 321]): the reference is 725 to 1023 ms, the new compiler 186 to 238 ms, about 4x faster. The gain is far larger than the spread. Medians of all six new rows range 232 to 560 ms because of the load; the min of every new row is 217 to 459 ms.
- Criterion "`ctf n=800` median under 250 ms": met in the undisturbed rows (186, 232, 232, 238 ms) and missed in the loaded ones. The orchestrator should re-run `node benchmarks/compile/bench.mjs` on a quiet machine to confirm; the goal's 150 ms target is not reached by this node alone (raw transfer and the other perf nodes remain).
- Reproduce: build `packages/core` at this commit, then `node benchmarks/compile/bench.mjs --sizes 800`. The reference build was `test/reference-compiler/index.ts` bundled with tsdown into a temporary directory and benchmarked with a copy of `bench.mjs` pointing at it; both were deleted.

## Review fixes

- `analyzeCaptures` visits bindings in declaration order again (`Ctx.bindingOrder`), so an effect that writes two derived variables reports the same one as the reference compiler. Regression case in `oracle.test.ts` (fails if the sort is removed).
- The oracle default is 300 runs per option set, plus fixed cases (derived-write order, reads right after effect bodies, `$untrack` neighbours).
- The `<` bound in `enclosingRegion` and the `<=` bound in `insideUntrack` are equivalent to their opposites, so no test can pin them. Both compare the start of a resolved identifier reference: no reference starts at an effect body's end (a token or `)`/`;` always follows), and none ends at the end of a `$untrack(...)` call (the call ends with `)`, and the `$untrack` identifier is unresolved, so it is not in `sortedRefs`). Flipping either bound leaves every test passing.

## Deviations

- Source maps are not compared by the oracle and are not byte-identical to the old ones: moved bodies keep their original mappings, the old path wrote them as plain text. Code output is identical (all snapshots pass). The changeset says so.
- `context.ts`'s `untrackOuter` and `untrackOuterCount` fields exist only for the `insideUntrack` cache.
- The `compiler/index.ts` hunk of the prototype (raw transfer) is not applied, as the brief says.
- `package.json` and the lockfile were changed temporarily to test magic-string 1.2.2, then restored.

## Stubs left

- None. `test/reference-compiler/` stays until `parent-chain-memory` and later nodes no longer need the oracle; it is a copy and goes stale as `compiler/` changes by design. Remove or freeze it when the last perf node lands.

## Gotchas

- `test/reference-compiler/` is a full copy of the compiler and is linted and formatted with the repo. A later node that fixes a bug in `compiler/` makes the oracle fail on programs hitting that bug; update the copy in the same pull request.
- Hoisted bodies are moved, not copied, so a change that edits the text inside a hoisted body after `extractHoistedCallbacks` runs would still apply; run such edits before it.
- `addRegion` needs effects processed in source order (they are sorted by start today).

## Proposed learnings

- Look up references and spans through the sorted indexes on `Ctx` (`refsIn`, `enclosingRegion`, `insideUntrack`), not by scanning all bindings | the scans made compile time quadratic | packages/core/compiler | no

## Verification

- `pnpm -C packages/core exec vitest run test/oracle.test.ts`: 4 passed; also with `FC_RUNS=1000`.
- `pnpm -C packages/core test` on magic-string 1.4.5 and on 1.2.2: all files passed, snapshots unchanged.
- Full check: see the pull request.

## Size

- Estimated M, actual M. The merge with `fix-nested-rewrites` in `render.ts` and `transform.ts` was small; measuring took longer because of the machine load.
