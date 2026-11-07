---
id: plugin-fast-path
title: Skip work for files with nothing to compile
status: todo
priority: should
type: feature
story:
early: false
outline: false
milestone:
target:
ship: auto
size: S
spike: false
verify:
exclusive:
  - bench
gate: false
owns:
  - packages/core/compiler/index.ts
  - packages/core/compiler/types.ts
  - .changeset/oxc-compiler-rewrite.md
  - packages/unplugin/src/index.ts
  - packages/core/test/fast-path.test.ts
shared:
  - .changeset/
reserves: []
provides: []
depends_on:
  - on: perf-bench
    kind: hard
    why: the plain-case baseline must be recorded before the fast path changes what it measures
---

# Skip work for files with nothing to compile

## Goal

A file with no compile-time functions still costs 5 to 10 times its parse time (parse, scope analysis, MagicString, hires source map). Skip that work.

## Context

- Prefilter before parsing: a file needs compiling only if it contains `$`, `solid:`, or one of the auto-imported component names (`COMPONENTS` in `compiler/registry.ts`). A cheap regex built from the registry is enough; false positives only cost the normal path.
- After the transform, if `!s.hasChanged()`, skip `generateMap`.
- The unplugin should return `null` from `transform` when nothing changed, so Vite keeps the original code and map.
- Decided (GOAL.md): `compile()` returns `CompileOutput | null`; `null` means nothing to compile or no edits. The unplugin returns `null` from `transform` in that case. `solid-labels/compiler` is new in the pending major, so update the text of `.changeset/oxc-compiler-rewrite.md` (it says the interface is unchanged) instead of adding a major changeset.

## Acceptance

- [ ] A file with no compile-time functions and no component names is not parsed (test with a spy or by timing).
- [ ] Unplugin returns `null` for such files.
- [ ] A file that only uses `<Show>` still gets the import.
- [ ] Benchmark `plain` before and after in the outcome.
- [ ] Snapshots unchanged.
- [ ] `.changeset/oxc-compiler-rewrite.md` mentions the `null` return.

## Sizing

S: two entry points, one regex.
