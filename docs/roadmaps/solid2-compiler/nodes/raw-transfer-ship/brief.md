---
id: raw-transfer-ship
title: Parse with oxc raw transfer
status: active
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
added: 2026-11-08
owns:
  - packages/core/compiler/index.ts
  - packages/core/test/raw-transfer.test.ts
shared:
  - .changeset/
reserves: []
provides: []
depends_on:
  - on: raw-transfer-spike
    kind: hard
    why: the maintainer approved shipping at the spike's gate
---

# Parse with oxc raw transfer

## Goal

Pass `experimentalRawTransfer: rawTransferSupported()` to `parseSync` in `packages/core/compiler/index.ts`, the same way solid-optimizer does (`solid-optimizer/packages/solid-optimizer/src/ast.ts:85-99`). Approved by the maintainer on 2026-11-08: ship with no user option, no version pin.

## Context

- Spike numbers (`nodes/raw-transfer-spike/outcome.md`): ctf 800 192 to 151 ms (-21%), plain-show 800 -52%, peak RSS unchanged, first compile about 4.5 ms slower. Tests and snapshots unchanged with the option on.
- oxc-parser 0.157 hides the option from `ParserOptions` on purpose (oxc PR #16387). Use a local `ParserOptions & { experimentalRawTransfer?: boolean }` object, not a cast or `@ts-expect-error`.
- The switch is in oxc's JS wrapper: `parseSync` checks `options?.experimentalRawTransfer`. Passing `true` on an unsupported platform throws, so the value must be `rawTransferSupported()`. Compute it once at module level.
- oxc plans to stabilize raw transfer and make it the default (oxc-project/oxc#28275, "P1: Stabilize Raw Transfer"). A rename before then makes parsing fall back silently to the slow path. `^0.157.0` already holds oxc to 0.157.x, so this can only happen on a deliberate minor bump.

## Acceptance

- [ ] `compile()` parses with raw transfer when `rawTransferSupported()` is true. A short comment at the option links oxc-project/oxc#28275 and says: after an oxc minor bump, re-run `benchmarks/compile` and check the oxc changelog for raw transfer.
- [ ] `tsc --noEmit` passes without casts or ts-comments.
- [ ] Snapshots unchanged; full check passes.
- [ ] Benchmark: ctf 800 and plain-show 800 faster beyond noise against `1.0` (alternating processes, 3x MAD rule as in the spike). Numbers in the outcome.
- [ ] Patch changeset.

## Sizing

S: one option and a typed options object.

- PR: #57. ctf 800 183 -> 145 ms (-21%), plain-show 800 28.3 -> 14.3 ms (-50%), beyond 3x MAD over 20 pairs. Snapshots unchanged. Self-review, one round, clean.
