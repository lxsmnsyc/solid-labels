---
id: fix-nested-rewrites
title: Fix nested rewrites that drop parens or crash
status: todo
priority: must
type: fix
story:
early: false
outline: false
milestone:
target:
ship: auto
size: M
spike: false
verify: pnpm -C packages/core exec vitest run test/nested-rewrites.test.ts
exclusive: []
gate: false
added: 2026-11-07
owns:
  - packages/core/compiler/reactive.ts
  - packages/core/compiler/render.ts
  - packages/core/compiler/destructure.ts
  - packages/core/compiler/component.ts
  - packages/core/test/nested-rewrites.test.ts
shared:
  - packages/core/test/arbitraries.ts
  - .changeset/
reserves: []
provides: []
depends_on:
  - on: fuzz-generator
    kind: hard
    why: the generator finds the failing programs and shows when every class is fixed
---

# Fix nested rewrites that drop parens or crash

## Goal

The program generator (`fuzz-generator`, PR #42) found that about 27% of generated programs compile to code that does not parse, and that one input shape throws `MagicStringError` instead of `CompileError`. Fix every class, so that compiling any `programArb()` program either throws `CompileError` or returns code that parses.

## Context

Confirmed on `1.0` at f1768b8 by the orchestrator:

1. **Nested write with a postfix right side.** `s = t++;` compiles to `sets_1(() => (() => { ... return tmp_1; })();`, missing a `)`. Same for `s += t++`. Cause: the outer write appends `)` at `right.end` (`appendLeft`), then the inner postfix rewrite calls `s.overwrite(parent.start, parent.end, ...)` over the same span, which drops the appended text. Fix the order of edits or the overwrite so outer insertions survive (for example overwrite with `contentOnly: true`, or edit only the operator and operand spans).
2. **JSX component in a destructure default.** `const { x = <Show when={1}>a</Show> } = $destructure(props)` and `$component(({ x = <Show>...</Show> }) => x)` throw `MagicStringError: cannot split a chunk that has already been edited`. Cause: `destructure.ts` overwrites the whole declarator or parameter with text from `renderSlice`, and `transformJSXComponents` later edits the `Show` name inside that span. `renderSlice` must apply the JSX name rewrites for its span too, and mark them done.
3. **Object literals in `$memo`.** The generator reports `createMemo(() => { g0: g0(), k: 1 })` (block body instead of an object) and an unbalanced paren when an object literal is an operand. Simple cases such as `$memo({ g0, k: 1 })` compile correctly, so take the failing programs from the generator (run `programArb` with the property below) and shrink them first.
4. Any other class the property finds. Record each in the outcome with a minimal example.

## Acceptance

- [ ] `test/nested-rewrites.test.ts`: one example test per class above, each checking the output parses (and, for writes, runs on solid-js with the right values).
- [ ] Property, in the same file: for `programArb()` (tsx and jsx), `compile()` throws only `CompileError` or returns code that parses, with 100 runs, and with `FC_RUNS=2000` locally.
- [ ] Remove the generator's avoidance of JSX components in destructure and component defaults (`test/arbitraries.ts`), so the property covers it. The contract is unchanged.
- [ ] Existing snapshots unchanged.
- [ ] Patch changeset.

## Sizing

M: three known classes plus unknown ones the property finds; several compiler files; the generator makes it verifiable.

## Notes for the worker

- Read `packages/core/compiler/CLAUDE.md` first (paren spans, magic-string versions).
- `fuzz-properties` adds the long-term property test file later; this node's property can be the start of it, but keep it in `nested-rewrites.test.ts` so the two nodes do not share a file.
