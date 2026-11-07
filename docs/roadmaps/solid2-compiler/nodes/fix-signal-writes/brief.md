---
id: fix-signal-writes
title: Fix signal write rewrites: parenthesized right-hand sides and postfix updates
status: todo
priority: must
type: fix
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
  - packages/core/compiler/reactive.ts
  - packages/core/test/signal.test.ts
  - packages/core/test/__snapshots__/signal.test.ts.snap
shared:
  - .changeset/
reserves: []
provides: []
depends_on: []
---

# Fix signal write rewrites: parenthesized right-hand sides and postfix updates

## Goal

Two bugs in `rewriteWrite` (`packages/core/compiler/reactive.ts`) make signal writes compile wrong. Fix both and add regression tests.

## Context

1. **Unbalanced paren.** `a = (1 + 2);` compiles to `seta_1(() => 1 + 2));`, which does not parse. oxc runs with `preserveParens: false`, so `right.start` is after the `(`. The `overwrite(ref.node.start, right.start, ...)` at line 211 removes the `(` and the `)` stays. The same happens with `a = (b = 1)` and any parenthesized ternary. The await/yield branch at line 190 has the same span.
2. **Postfix value.** `const a = count++` compiles to `setcount_1(current_1 => ++current_1)` and gives the new value (1). Plain JS gives the old one (0). `count--` is the same. Prefix is correct.

This is not a regression. The 0.x Babel plugin (`main`, `packages/core/babel/core/deref-signal.ts`, `transformUpdateExpression`) has both forms swapped: its `prefix` branch returns the old value through a `tmp` capture, and the postfix branch returns the setter result. The fix for 1.0 is to use that `tmp` capture shape for **postfix**:

```js
(() => { let tmp_1; setcount_1(current_1 => (tmp_1 = current_1) + 1); return tmp_1; })()
```

- Source: analysis session 2026-11-07, confirmed by running the compiled output on solid-js 2.0.0-rc.1 and the 0.x plugin on solid-js 1.9.

## Acceptance

- [ ] `a = (1 + 2);`, `a = (f());`, `a = (b = 1);` and `a = (c ? 1 : 2);` compile to code that parses, in statement and expression position.
- [ ] Running the output on solid-js: `const x = count++` gives the old value, `++count` the new one, and `count` ends the same as in plain JS, for both `++` and `--`.
- [ ] `count++;` as a whole statement keeps its current output (the value is unused, so no `tmp`). Existing snapshots stay the same.
- [ ] Patch changeset for `solid-labels`.
- [ ] Fast check passes: `pnpm -C packages/core test`

## Sizing

S: one function, two shapes, tests that run the output.

## Notes for the worker

- Use `expandParens` from `ast.ts` to find the real span of the right-hand side, or overwrite only up to the `=` operator. Check both magic-string 1.2 and 1.4 if you touch edge insertions.
- Do not port the 0.x prefix form: 1.0's prefix output is already correct.
