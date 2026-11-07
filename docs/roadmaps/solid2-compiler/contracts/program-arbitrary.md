---
name: program-arbitrary
status: draft
version: 0
defined_by: fuzz-generator
---

# program-arbitrary

fast-check arbitraries that produce source programs using the compile-time functions, shared by every generated test in `packages/core`.

## Interface

`packages/core/test/arbitraries.ts` exports:

```ts
export interface GeneratedProgram {
  /** Module source, valid before compiling. */
  source: string;
  /** File id to pass to compile(); its extension sets the language. */
  id: 'gen.tsx' | 'gen.jsx';
}

export interface StraightLineProgram {
  /** Uses $signal/$memo; imports `flush` from 'solid-js'; exports `observe`. */
  source: string;
  /** The same statements as plain JS; exports `observe`. */
  plain: string;
  id: 'gen.js';
}

export function programArb(options?: { maxStatements?: number; jsx?: boolean }): fc.Arbitrary<GeneratedProgram>;
export function straightLineArb(options?: { maxStatements?: number }): fc.Arbitrary<StraightLineProgram>;
export const COMPILE_ERROR_BOUND: number; // 0.3
```

Defaults: `maxStatements: 8`, `jsx: true` (`id: 'gen.tsx'`); `jsx: false` gives `id: 'gen.jsx'` with no JSX and no TS syntax, for parsers that do not read TSX.

## programArb coverage

Functions that declare `$signal`, `$memo`, `$` (declaration and statement forms), `$destructure` (with defaults and rest) and `$component` variables, and use them in:

- reads, `=` writes (with and without parenthesized right-hand sides), compound writes, prefix and postfix updates in statement and expression position
- `$effect`, `$renderEffect` and `$(expr);`, including nested effects, effects that capture plain locals, effects that write a plain outer variable (not hoisted), and effects using `arguments` or `this` (not hoisted)
- `$untrack`, and ref functions `$get`, `$set`, `$refSignal`, `$refMemo`, `$getter`, `$setter`, `$property`
- nested blocks and functions that shadow a reactive name or a compile-time function name
- JSX with auto-imported components (`<Show>`, `<For>`) and `<solid:*>` names, when `jsx` is on

At most `COMPILE_ERROR_BOUND` of samples may be rejected by `compile()` with `CompileError`.

## straightLineArb shape

- `source`: `import { flush } from 'solid-js';`, then 1 to 3 `let sN = $signal(<int>)`, 0 to 2 `const mN = $memo(<expr over signals>)`, then statements that write signals (`=`, `+=`, `-=`, `++`, `--`, prefix and postfix, with and without using the value), each followed by `flush();`, and record values with `observe.push(<expr>)`. Ends with `export { observe };` where `const observe = [];` is declared first.
- `plain`: the same text with `$signal(x)` replaced by `x`, `$memo(e)` declarations replaced by a function `mN = () => e` and each read of `mN` by `mN()`, and the `flush` import and calls removed.
- Integers only, small range, so `+`, `-` and the update operators never overflow or produce strings.

## Rules

- Deterministic for a seed; shrinks to small programs.
- Changes after freezing go through a change request. Dependents: `fuzz-properties`, `scope-oracle`, `perf-compiler-indexes`, `parent-chain-memory`.
