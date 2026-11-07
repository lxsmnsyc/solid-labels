---
id: scope-oracle
title: Oracle test for scope analysis against eslint-scope
status: active
priority: should
type: feature
story:
early: false
outline: false
milestone:
target:
ship: auto
size: M
spike: false
verify: pnpm -C packages/core exec vitest run test/scope-oracle.test.ts
exclusive: []
gate: false
owns:
  - packages/core/test/scope-oracle.test.ts
shared:
  - packages/core/package.json
  - pnpm-lock.yaml
reserves: []
provides: []
depends_on:
  - on: fuzz-generator
    kind: contract
    via: program-arbitrary
---

# Oracle test for scope analysis against eslint-scope

## Goal

Every transform depends on `analyze` (`compiler/scope.ts`) telling local bindings from globals. Check it against `eslint-scope` on generated programs.

## Context

- oxc's AST is ESTree-shaped, so `eslint-scope` (or `@typescript-eslint/scope-manager` for TS input) can analyze the same `result.program`.
- Compare: the set of unresolved identifier nodes (`analysis.unresolved` vs the global scope's `through`), and for each resolved reference, the declaring identifier.
- Known differences to handle or exclude: JSX element names (`analysis.jsxNames`), TS type-space names, class scopes. List every exclusion in the test with the reason.

## Acceptance

- [ ] Oracle passes for `programArb()` with 100 runs.
- [ ] Each real disagreement is listed in the outcome with a failing example; the orchestrator turns it into a fix node.
- [ ] Dev dependency only.

## Sizing

M: a new library to learn and mapping differences, medium uncertainty.

## Notes for the worker

- Does not own `compiler/scope.ts`; `parent-chain-memory` rewrites it. Report disagreements, do not fix them here.
- Use `programArb({ jsx: false })`: `eslint-scope` does not parse TSX the way oxc does. Pass oxc's `result.program` to `eslint-scope.analyze` with `ecmaVersion: 'latest', sourceType: 'module'`.
- Merge after `fuzz-generator` (lockfile).
