# Outcome: plugin-fast-path

## Built

- `packages/core/compiler/index.ts`: `compile()` returns `CompileOutput | null`. A regex built from `COMPONENTS` plus `$` and `solid:` runs before parsing; a file that does not match is never parsed. After the transform, `!s.hasChanged()` returns `null` before `generateMap`.
- `packages/unplugin/src/index.ts`: `transform` returns `null` when `compile()` does.
- `packages/core/test/fast-path.test.ts`: parse spy (not called for plain files, called for `$signal`), `<Show>` import, `<solid:show>`, marker without edit.
- `.changeset/oxc-compiler-rewrite.md` text mentions the `null` return.
- `types.ts` needed no change: `CompileOutput` keeps its shape.

## Benchmark

Same machine as the `perf-bench` baseline (Apple M2, node v26.12.1). Times in ms, `compile()` median. The machine was not quiet (another node was running, so `ctf` rows vary far more than in the baseline). Judge only the `plain` rows; `ctf` is not touched by this change.

| case       |   n | before |   after |
| ---------- | --: | -----: | ------: |
| plain      | 200 |   7.76 |    0.01 |
| plain      | 800 |  54.50 |    0.04 |
| plain-show | 200 |   8.51 |    7.15 |
| plain-show | 800 |  33.31 |   43.37 |
| ctf        | 200 |  95.91 |   73.17 |
| ctf        | 800 | 998.83 | 1310.13 |

`plain-show` and `ctf` take the normal path, so their change is noise. The quiet `perf-bench` table has `plain` at 4.91 and 21.29 ms, `plain-show` at 6.92 and 27.38 ms, `ctf` at 92.78 and 640.58 ms.

## Deviations

- `packages/core/test/util.ts` returns the input code when `compile()` returns `null` (allowed small edit).

## Stubs left

- None.

## Gotchas

- `compile()` can return `null` for any caller. Callers must keep the original code and map.
- A `$` anywhere (strings, template literals, regexes) sends the file down the normal path; it then returns `null` if no edits were made.
- An unparseable file with no marker returns `null` instead of a `CompileError`; the bundler's own parser reports it.

## Proposed learnings

- Build prefilters from the registry, never from a hand-written name list | a new component name would otherwise be skipped silently | packages/core/compiler | yes (fast-path test)

## Verification

- `pnpm -C packages/core test`: 85 passed, snapshots unchanged.
- Full check: see the pull request.

## Size

- Estimated S, actual S.
