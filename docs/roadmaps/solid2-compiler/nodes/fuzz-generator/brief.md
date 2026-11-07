---
id: fuzz-generator
title: Add fast-check and the program generator
status: active
priority: must
type: contract
story:
early: false
outline: false
milestone:
target:
ship: auto
size: M
spike: false
verify: pnpm -C packages/core exec vitest run test/arbitraries.test.ts
exclusive: []
gate: true
owns:
  - packages/core/test/arbitraries.ts
  - packages/core/test/arbitraries.test.ts
shared:
  - packages/core/package.json
  - pnpm-lock.yaml
reserves: []
provides:
  - program-arbitrary
depends_on: []
---

# Add fast-check and the program generator

## Goal

Install fast-check in `packages/core` and build the arbitraries described in `contracts/program-arbitrary.md`. This node freezes that contract; three nodes build on it.

## Context

- Prototype: `nodes/fuzz-generator/prototype-fuzz.mjs`, a hand-rolled random generator. Over 3000 programs per seed it found 22 outputs that do not parse, 0 non-`CompileError` crashes and about 28% `CompileError`s. Port its grammar to fast-check arbitraries so failures shrink, and widen it to the coverage the contract requires.
- `references/testing.md` in the repo-setup skill: 100 runs by default, `FC_RUNS` for longer runs.
- Install `fast-check` and `@fast-check/vitest` (latest) in `packages/core` only. Merge before `scope-oracle`, which also edits the lockfile.

## Acceptance

- [ ] `test/arbitraries.ts` exports everything the contract lists, with the stated types.
- [ ] `test/arbitraries.test.ts` checks the generator itself: every program parses with oxc under the stated language, the `CompileError` share is under the contract's bound, and each syntax form in the contract's coverage list appears in a 1000-sample run.
- [ ] No compiler properties here; those are `fuzz-properties`.
- [ ] Fast check passes: `pnpm -C packages/core test`

## Sizing

M: new generator, known pattern, prototype exists.

## Notes for the worker

- Gate: the maintainer reviews the generator before dependents start.
