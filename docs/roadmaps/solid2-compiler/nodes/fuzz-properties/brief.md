---
id: fuzz-properties
title: Compiler properties: no-crash and run-the-output oracle
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
verify: pnpm -C packages/core test
exclusive: []
gate: false
owns:
  - packages/core/test/fuzz.test.ts
shared: []
reserves: []
provides: []
depends_on:
  - on: fuzz-generator
    kind: contract
    via: program-arbitrary
  - on: fix-signal-writes
    kind: hard
    why: both properties fail on the base until the two write bugs are fixed
---

# Compiler properties: no-crash and run-the-output oracle

## Goal

Add two generated tests to `packages/core/test/fuzz.test.ts`, using `contracts/program-arbitrary.md`:

1. **Property:** for any `programArb()` program, `compile()` either throws `CompileError` or returns code that oxc parses without errors.
2. **Oracle:** for any `straightLineArb()` program, running the compiled `source` on solid-js 2.0 and running `plain` give the same `observe` values.

## Context

- The prototype generator found the paren bug fixed by `fix-signal-writes`; the postfix bug was found by running output. Both properties fail on the base until that node lands.
- Each counterexample found becomes a plain example test (repo-setup `references/testing.md`).

## Acceptance

- [ ] Both properties pass with 100 runs, and with `FC_RUNS=5000` locally.
- [ ] Reverting `fix-signal-writes` makes both fail (check once, note it in the outcome).
- [ ] Fast check passes: `pnpm -C packages/core test`

## Sizing

S: two tests over a frozen generator.

## Notes for the worker

- Running compiled output: write it to a temp `.mjs` inside the package or evaluate it with the `solid-js` exports passed in. `solid-js` resolves from `packages/core`.
