---
id: capture-info-union
title: Make CaptureInfo and ReactiveInfo discriminated unions
status: done
priority: could
type: refactor
story:
early: false
outline: false
milestone:
target:
ship: auto
size: M
spike: false
verify:
exclusive: []
gate: false
owns:
  - packages/core/compiler/context.ts
  - packages/core/compiler/effect.ts
  - packages/core/compiler/reactive.ts
  - packages/core/compiler/variables.ts
  - packages/core/compiler/destructure.ts
shared: []
reserves: []
provides: []
depends_on:
  - on: perf-compiler-indexes
    kind: hard
    why: rewrites the same functions in effect.ts and context.ts
  - on: fix-signal-writes
    kind: hard
    why: rewrites rewriteWrite in reactive.ts
---

# Make CaptureInfo and ReactiveInfo discriminated unions

## Goal

Replace two implicit state shapes with types where each case carries only its valid data.

## Context

- `CaptureInfo` mixes plain and reactive captures: `get: false | 'value' | 'accessor'` plus the `'plain'` value added by `check-green`, and `analyzeCaptures` calls `ctx.reactive.get(binding)` a second time to tell them apart. Target: `{ kind: 'plain' } | { kind: 'reactive'; read: 'value' | 'accessor' | 'none'; write: boolean }`.
- `ReactiveInfo` has `set?` that is valid only for `kind: 'signal'`, which causes `info.kind !== 'signal' || !info.set` checks and `info.set!` in `reactive.ts`. Target: one type per kind, `set` required on signals.
- Both are internal. Not exported from `solid-labels/compiler`.

## Acceptance

- [ ] No `!` non-null assertions on `info.set` remain.
- [ ] Output byte-identical (snapshots and the `perf-compiler-indexes` oracle test).
- [ ] Typecheck passes.

## Sizing

M: several files, mechanical, oracle-checked.

- PR: #53. Output identical (oracle and snapshots untouched). Fresh review: clean, 3 nits left as is (redundant guard at effect.ts:115, `AccessorInfo.kind` covers accessor and raw, reference copy keeps the old shape).
