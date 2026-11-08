---
id: phase-outputs
title: Pass compile phase outputs explicitly instead of mutating Ctx
status: todo
priority: later
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
  - packages/core/compiler/**
shared: []
reserves: []
provides: []
depends_on: []
---

# Pass compile phase outputs explicitly instead of mutating Ctx

## Goal

`transformProgram` runs phases in a fixed order that only comments state: structural transforms, `untrackSpans`, effects, `rewriteReferences`, leftover-call errors, JSX, hoists, `finalize`. `regionFor` is meaningful only after effects; `untrackSpans` must be filled before effects. Make each phase take the previous phase's output as an argument, so calling one out of order does not type-check.

## Context

- Owned paths are a placeholder; narrow them when this node is un-parked.
- Parked: value is maintainability only. Revisit if a new compile-time function needs a new phase.

## Acceptance

- [ ] Output byte-identical.

## Sizing

M.
