---
id: parent-chain-memory
title: Stop copying the parent chain for every identifier
status: active
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
exclusive:
  - bench
gate: false
owns:
  - packages/core/compiler/scope.ts
  - packages/core/compiler/transform.ts
  - packages/core/compiler/reactive.ts
  - packages/core/compiler/variables.ts
  - packages/core/compiler/effect.ts
  - packages/core/test/reference-compiler/**
  - packages/core/test/oracle.test.ts
shared: []
reserves: []
provides: []
depends_on:
  - on: fix-scope-edges
    kind: hard
    why: both edit compiler/scope.ts
  - on: fuzz-generator
    kind: contract
    via: program-arbitrary
  - on: scope-oracle
    kind: hard
    why: rewrites reference() in scope.ts; run after the oracle reports scope disagreements so fixes land on the new structure
  - on: capture-info-union
    kind: hard
    why: touches the same files; run after so each diff stays small
---

# Stop copying the parent chain for every identifier

## Goal

`reference()` in `compiler/scope.ts:300` copies the whole ancestor stack into every `Ref`. That is O(identifiers x depth) memory and 10 to 13% of compile time in garbage collection. Replace it with a parent map (node to parent) or a shared persistent stack, and update the readers of `ref.parents`.

## Context

- Readers: `findDeclarator`, `isCallee` (variables.ts), `isStatementCall` (transform.ts), `detectRefCtf`, `rewriteWrite` (reactive.ts), `hoistBaseName` (effect.ts). They read the last few parents, except `hoistBaseName` and the arrow search in `rewriteWrite`, which walk up.

- Model to follow: solid-optimizer (`/Users/alexis/Documents/GitHub/solid-optimizer/packages/solid-optimizer/src/ast.ts`, `Parents` and `forEachChild` ~38-53) keeps a node-to-parent `Map` and iterates children with oxc's `visitorKeys` instead of `Object.keys`. Consider both: `eachChild` in `compiler/ast.ts` uses `Object.keys` on every node.
- Same copy elsewhere: solid-sfc's `labels/scope.ts` is a copy of this file; a later port there is out of scope here.

## Acceptance

- [ ] Output byte-identical (snapshots and oracle test).
- [ ] After the oracle passes, delete `test/reference-compiler/` and turn `test/oracle.test.ts` into a parse-and-run check, or delete it if `fuzz-properties` covers that. This is the last rewrite that needs the old compiler.
- [ ] Benchmark: GC share and `plain-show n=800` time drop beyond noise. Numbers in the outcome.

## Sizing

M: one data structure, six readers.
