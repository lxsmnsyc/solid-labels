---
id: test-flake
title: Find and fix the core test that fails under load
status: todo
priority: should
type: fix
story:
early: false
outline: false
milestone:
target:
ship: auto
size: S
spike: false
verify:
exclusive: []
gate: false
added: 2026-11-07
owns:
  - packages/core/test/arbitraries.test.ts
  - packages/core/vitest.config.ts
shared:
  - packages/core/test/scope-oracle.test.ts
  - packages/core/test/nested-rewrites.test.ts
reserves: []
provides: []
depends_on:
  - on: fix-nested-rewrites
    kind: hard
    why: its property tests add load and must be part of the reproduction
---

# Find and fix the core test that fails under load

## Goal

`pnpm -C packages/core test` failed one test, unidentified, in two separate runs under load: once during `scope-oracle` (1 of 3 runs, with another worktree testing at the same time) and once during the `fix-nested-rewrites` review (on magic-string 1.2.2, a 27 s run against 8 to 13 s normally). Five calm runs passed. CI runners are slower than the maintainer's machine, so this can fail CI. Find the test and make the suite reliable.

## Context

- Likely cause found on 2026-11-07: CI on #43 failed with a fast-check counterexample, not a timeout. The generator emitted `(0) as any ? --cs : 0`, which TypeScript rejects; fixed in #45. Random seeds make such bugs show only sometimes. This node now confirms no other failure remains under load, and decides how CI handles random seeds (for example keep random seeds but make the failure message carry the seed, which fast-check already prints).

- Suspects (not confirmed): the long timeouts in `test/arbitraries.test.ts` (60 s on the CompileError share test, 30 s on the two coverage tests), the 120 s oracle property in `test/scope-oracle.test.ts`, and the `FC_RUNS` properties in `test/nested-rewrites.test.ts`.
- A fast-check counterexample prints a seed and "Counterexample"; a timeout prints "Test timed out". Tell them apart before fixing.

## Acceptance

- [ ] Reproduce under load: run the suite while loading the CPU (for example two copies of the suite at once, or `stress`/`yes` processes), with `--reporter=verbose`, until a failure shows, or 20 loaded runs pass. Record the failing test and its error in the outcome.
- [ ] If it is a timeout: cut the cost (fewer samples in the coverage and share tests, cached compile results) rather than only raising limits. The default suite should finish well under the smallest timeout on a loaded machine.
- [ ] If it is a counterexample: add it as an example test and hand the bug to the orchestrator as a new node.
- [ ] 20 loaded runs pass after the fix.

## Sizing

S: one reproduction, one targeted change.
