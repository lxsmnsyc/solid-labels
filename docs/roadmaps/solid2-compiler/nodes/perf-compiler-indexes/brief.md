---
id: perf-compiler-indexes
title: Remove the quadratic scans in the compiler
status: done
priority: should
type: refactor
story:
early: false
outline: false
milestone:
target:
ship: auto
size: M
spike: false
verify: pnpm -C packages/core exec vitest run test/oracle.test.ts
exclusive:
  - bench
gate: false
owns:
  - packages/core/compiler/context.ts
  - packages/core/compiler/effect.ts
  - packages/core/compiler/render.ts
  - packages/core/compiler/transform.ts
  - packages/core/compiler/variables.ts
  - packages/core/test/reference-compiler/**
  - packages/core/test/oracle.test.ts
shared:
  - .changeset/
reserves: []
provides: []
depends_on:
  - on: fix-nested-rewrites
    kind: hard
    why: both edit renderSlice in render.ts, and the old vs new oracle needs a compiler whose output parses
  - on: fuzz-generator
    kind: contract
    via: program-arbitrary
  - on: perf-bench
    kind: hard
    why: before and after numbers come from the benchmark and its baseline
  - on: check-green
    kind: hard
    why: both edit compiler/effect.ts capture code; land the type fix first
---

# Remove the quadratic scans in the compiler

## Goal

Apply the measured prototype that makes compiling a 440 KB file with labels 4.4x faster (857 ms to 195 ms) with byte-identical output, and prove it with an old vs new oracle test.

## Context

Prototype: `nodes/perf-compiler-indexes/prototype.patch` (made on `1.0` at a2ff706, before `fix-signal-writes`, `check-green` and `deps-update` landed). `effect.ts` now uses `get: 'plain'` for plain captures and `reactive.ts` changed, so the patch may not apply cleanly; port it by hand where it does not. Drop its `compiler/index.ts` hunk: raw transfer is `raw-transfer-spike`. Changes, with their profile share before the fix:

- `analyzeCaptures` looped over every binding's refs for each effect. Now `Ctx.sortedRefs` plus a binary-search `refsIn(start, end)`. (18%)
- `extractHoistedCallbacks` copied each body with `MagicString#slice`, which walks the chunk list from the start. Now `s.move` to the end, with `prependRight`/`appendLeft` for the header. (42% after the first fix)
- `regionFor`/`enclosingRegion` scanned all regions. Now binary search over regions in source order, with a `parent` link per region. (17%)
- `unique` restarted at 1. Now a counter per base name; same names as before. (10%)
- `isHoistable` rescanned all unresolved names for `arguments`. Now a precomputed list. (7%)
- `renderSlice` and `containsReactiveRead` scanned all reactive refs. Now `refsIn`. (9%)

Also fix `insideUntrack` (linear scan over `untrackSpans`) the same way.

## Acceptance

- [ ] Before changing the compiler, copy `compiler/` to `test/reference-compiler/` (the oracle).
- [ ] `test/oracle.test.ts`: for `programArb()` programs, the new and reference compilers give byte-identical code, or both throw `CompileError` with the same message.
- [ ] Property: `Ctx.unique` never returns a name that is taken and never returns the same name twice.
- [ ] All 73 snapshot tests pass on magic-string 1.2.2 and 1.4.5.
- [ ] Benchmark: `ctf n=800` median under 250 ms, and the gain is larger than the spread. Numbers in the outcome.
- [ ] Patch changeset.

## Sizing

M: the code exists and passed the tests; the work is porting, the oracle and measuring. Blast radius medium (core context).

## Notes for the worker

- `addRegion` assumes regions arrive in source order (effects are processed sorted by start). Assert it in dev or keep the order explicit.
- `PendingHoist.text` is unused after the change; remove it.
- `parent-chain-memory` removes the reference copy later. Leave it in place.

- PR: #52. About 4x faster (ctf n=800: 725 ms to 186 ms in the least disturbed pair; machine was loaded, quiet re-run needed for the 250 ms criterion). Fresh review: error-order regression in `analyzeCaptures` and two nits, fixed in 7a3b2d4. Source maps for hoisted callbacks now keep original mappings.
