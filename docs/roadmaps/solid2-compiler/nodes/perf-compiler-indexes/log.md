# Log: perf-compiler-indexes

- Reset the worktree to `origin/1.0`, copied `compiler/` to `test/reference-compiler/` before any change (the oracle).
- Applied the prototype without its `index.ts` hunk. `context.ts`, `effect.ts`, `variables.ts` applied cleanly; `render.ts` and `transform.ts` conflicted and were merged by hand.
- `transform.ts`: `fix-nested-rewrites` wraps a hoisted statement body that starts with `{`, `function` or `class` in parentheses, from the text. With `s.move` there is no text, so the check reads the original source at `body.start`. An edit never changes the first characters in these cases.
- `PendingHoist.text` removed. `addRegion` throws if regions arrive out of source order.
- `insideUntrack` now lives on `Ctx`: outermost `$untrack` spans, sorted, binary search. Rebuilt lazily when `untrackSpans` grows.
- Oracle compares code only. Source maps differ on purpose: moved bodies keep their original mappings, the old path wrote them as plain text.
- `unique` property: names are not taken, not repeated, and equal to the restart-at-1 names.
- Oracle passes at `FC_RUNS=1000` for both option sets; `pnpm -C packages/core test` passes.
- The machine was busy during measuring: a headless Chromium (not started by this node) used 300 to 400% CPU for the whole session. Timings are noisy; see the outcome.
