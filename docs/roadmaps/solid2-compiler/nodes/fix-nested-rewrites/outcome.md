# Outcome: fix-nested-rewrites

## Built

`compile()` on any `programArb()` program (tsx and jsx) now throws only `CompileError` or returns parsable code, and `straightLineArb()` programs behave like their plain version. `packages/core/test/nested-rewrites.test.ts` holds one example test per class, the parse property and the oracle. Classes fixed, each with a minimal example, cause and fix:

0. Bare signal or memo as the right side of a write. `a = b;` gave `seta_1(() => b)();`, `a += m` gave `seta_1(current_1 => current_1 += m)();`. Cause: the write's `)` and the read's `()` were both `appendLeft` at the same offset, write first. Fix (`reactive.ts`): closers are collected in `rewriteReferences` and inserted after all other rewrites, inner writes first. Now `seta_1(() => b())`.
1. Nested write with a postfix right side. `s = t++;` lost a `)`. Cause: the inner overwrite of the same span reset the outro that held the outer `)`. Fix: the same deferred closers.
2. JSX component in a destructure or component default. `const { x = <Show when={1}>a</Show> } = $destructure(props)` and `$component(({ x = <Show/> }) => x)` threw `MagicStringError`. Cause: the span was overwritten with text from `renderSlice`, and `transformJSXComponents` edited the tag inside it. Fix (`render.ts`, `jsx.ts`): `renderSlice` renames the tags in its span (`takeJSXNameEdits`, which marks them consumed) and returns `s.slice` of the edited span.
3. Object literals in defaults and concise component bodies.
   - `{ x = { k: 1, ...o } }` with a non-static default gave `createMemo(() => { k: 1, ...o })`. Fix (`destructure.ts`): parenthesize a default that starts with `{`.
   - `$component(({ x }) => x)` gave `... return x;\n}()`: the read `()` landed after the closing brace. Fix (`component.ts`): the closing brace is part of the overwrite of the call tail, so the read lands before it.
   - `$memo({ g0, k: 1 })` was already correct on `1.0`; the generator's other failing cases were classes 0, 1 and 5.
4. Object or `function` expression as a `$(expr);` statement. `$({ k: 1 });` gave `() => { { k: 1 }; }`. Fix (`effect.ts`, `transform.ts`): `startsStatementBadly` wraps the statement in parentheses, in the inline and the hoisted callback.
5. A `)` appended earlier at a span end was dropped by a later overwrite. `$memo({ k: 1 } + $refSignal(g))` and `$memo({ k: 1 } + ++g)` lost the arrow's closing `)`. Fix (`reactive.ts`): the ref CTF and update overwrites use `contentOnly: true`.
6. CTFs inside a destructure or component default (`$component(({ x = $untrack(1) }) => x)`) threw `MagicStringError`: they were rewritten after the span was replaced. Fix (`transform.ts`, `context.ts`): `processRef` is a function and `ctx.processWithin(start, end)` runs the rewrites of a span's references before `renderSlice` reads it.
7. `$effect`, `$renderEffect` or `$(expr);` inside a destructure default. Its callback can be hoisted out of the span that is replaced, so it now throws `CompileError` ("cannot be used inside a destructuring default") instead of `MagicStringError`. This is a limit, not support: supporting it needs hoisting from replaced text.

No class was left out of the property.

Generator: the three `KNOWN-CRASH` avoidances are removed. The component default now uses an expression scope without the pattern's own names (reading `count` inside `count = ...` is a self-reference). The contract is unchanged.

Changeset: `.changeset/fix-nested-rewrites.md` (patch).

## Deviations

- Edits outside the owned paths, each the real cause: `compiler/jsx.ts` (shared tag renaming), `compiler/transform.ts` (`processRef`, `processWithin`, hoisted statement wrapping), `compiler/context.ts` (the `processWithin` hook), `compiler/effect.ts` (`startsStatementBadly`, inline statement wrap).
- Class 7 is a `CompileError`, not support.
- Not run on magic-string 1.2 (not installed; 1.4.5 only). `renderSlice` now relies on `s.slice` including edge insertions, which the compiler notes say differ between versions.
- No snapshot changed.

## Stubs left

- None.

## Gotchas

- Node resolves `solid-js` to the server build, where signals never update. The tests load `dist/solid.js` through `import.meta.resolve`.
- Text added with `appendLeft` at a span end is lost when that span is overwritten later without `contentOnly`; add closers last or overwrite with `contentOnly: true`.
- `renderSlice` edits the magic string inside its span; only call it when the caller overwrites a range that covers the span.

## Proposed learnings

- Text that closes a rewritten expression must be inserted after every other edit, or the overwrite must keep it with `contentOnly` | later overwrites and same-offset `appendLeft` drop or reorder it | packages/core/compiler | yes (the property in `nested-rewrites.test.ts`)

## Verification

- `pnpm -C packages/core exec vitest run test/nested-rewrites.test.ts`: 21 passed (100 runs).
- `FC_RUNS=2000` and `FC_RUNS=10000` on that file: all passed.
- `pnpm -C packages/core test`: all files passed with no snapshot change. Full check: see the pull request.

## Size

- Estimated M, actual M. The property found classes 4 to 7 beyond the brief.
