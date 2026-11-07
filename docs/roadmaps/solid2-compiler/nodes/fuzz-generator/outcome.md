# Outcome: fuzz-generator

## Built

- `packages/core/test/arbitraries.ts`: `programArb`, `straightLineArb`, `COMPILE_ERROR_BOUND` (0.3), `GeneratedProgram`, `StraightLineProgram`, with the contract's types and defaults.
- `packages/core/test/arbitraries.test.ts`: 10 tests on the generator itself (parse under the stated language, `maxStatements`, `jsx: false` has no JSX or TS, determinism for a seed, CompileError share, coverage of every form in a 1000-sample run, straight-line shape and compile). `FC_RUNS` sets the run count (default 100). No compiler properties.
- `fast-check ^4.10.2` and `@fast-check/vitest ^0.5.0` in `packages/core` devDependencies, lockfile updated.
- Programs have an exported `App` function (with or without `props`), optional module-level signals and statements, and an optional exported `$component`. Statements nest up to depth 2.

### Measured on 1000 samples per seed (seeds 42 and 7)

- CompileError share: tsx 6.9% and 6.6%, jsx 8.4% and 7.4%. The bound is 30%. Non-CompileError crashes: 0.
- All remaining CompileErrors are ref functions (`$get`, `$set`, `$refSignal`, `$refMemo`, `$getter`, `$setter`, `$property`) used on a captured variable inside an effect callback, or in a nested function reached from one.
- Coverage forms present in a 1000-sample run (checked by regex in the test): `$signal`, `$memo`, `$` declaration and statement, `$destructure` (defaults, rest, nested, array), `$component`, `=` writes with and without parentheses, compound writes, prefix and postfix updates in statement and expression position, `$effect`, `$renderEffect`, nested effects, effects capturing a plain local, effects writing a plain outer variable, effects using `arguments` or `this`, `$untrack`, `$get`, `$set`, `$refSignal`, `$refMemo`, `$getter`, `$setter`, `$property`, reactive names shadowed by a block, parameter or function, rebound `$untrack`/`$get`/`$effect`/`$memo`, `<Show>`, `<For>`, `<solid:*>`. Also generated but not in the contract list: `||=`, shorthand properties of reactive names, async functions, `try`, `for...of`, TS casts and generic arguments (tsx only).
- Compiling the samples gives unparsable output for about 27% of tsx and 29% of jsx programs. These are existing compiler bugs, which `fuzz-properties` will hit at once:
  - a postfix update in expression position leaves an unbalanced paren (`(tmp_1 = current_2) + 1); return tmp_1; })()`);
  - a compound write whose right side is a signal write (`s *= $set(t)(...)`, `s += s2++`) leaves an unbalanced paren;
  - an object literal in a `$memo` becomes a block body (`createMemo(() => { g0: g0(), k: 1 })`), and an object literal operand leaves an unbalanced paren;
  - a JSX component inside a `$destructure` or `$component` default throws `MagicStringError`, not `CompileError` (the generator avoids it).

## Deviations

- Dependencies use caret ranges (`^4.10.2`, `^0.5.0`) like the rest of the file, set to the latest versions read from npm.
- `@fast-check/vitest` is installed as asked but nothing imports it.
- Shrinking is partial: expressions shrink to literals, but statement lists shrink by count, not by deleting single statements. One probe shrank a failing program to about 20 lines.
- `pnpm lint` fails on the base branch in `docs/roadmaps/solid2-compiler/nodes/*/prototype-*.mjs` (type-aware rules on `.mjs` prototypes). Those files are not owned by this node and are untouched. The new files lint clean.

## Stubs left

- None.

## Gotchas

- Do not put the name counter in an expression's cache key; the cache then grows without bound.
- Ref functions in effect callbacks and in destructure defaults are CompileErrors; keep them out of generated code there.
- Do not compare 1000 programs with `toEqual`; a failed diff exhausts memory. Compare the `source` strings.
- A property test over the generated programs fails right away on the existing compiler bugs above, so `fuzz-properties` needs the `fix-signal-writes` fixes first or must skip known classes.

## Proposed learnings

- Generated test helpers that cache arbitraries must key the cache on what the arbitrary reads | an extra field in the key multiplied cache entries until memory ran out | packages/core/test | no

## Verification

- `pnpm -C packages/core exec vitest run test/arbitraries.test.ts`: 10 passed; also with `FC_RUNS=1000`.
- `pnpm -C packages/core test`: 12 files, 90 tests passed. `pnpm -C packages/core typecheck` passes. `oxfmt` clean. `oxlint packages/core/test` clean.
- Full check: see the pull request.

## Size

- Estimated M, actual L. The scope model, cache growth and CompileError tuning took several rounds.
