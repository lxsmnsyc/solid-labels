---
milestones: []
run: parallel
review: auto
merge:
  mode: maintainer
branches:
  default: '1.0'
budget:
release:
  publish:
  paths: []
  fence: merge
---

# Solid 2.0 compiler: correctness, checks, speed

## Outcome

The `1.0` branch (solid-js 2.0.0-rc.1) compiles every valid input to code that parses and behaves like the source program, its lint and typecheck pass, and compiling a 440 KB file with labels takes under 150 ms (640 ms baseline on `1.0` after `deps-update`, `ctf n=800` in `benchmarks/compile`). Generated tests guard the compiler against regressions.

## Acceptance

- `pnpm -r --filter "./packages/*" build && pnpm lint && pnpm -C packages/core exec tsc --noEmit -p . && pnpm -C packages/core test` exits 0.
- The generated tests (`fuzz-properties`) run in `pnpm -C packages/core test` and passes.
- `node benchmarks/compile/bench.mjs` reports the `ctf n=800` case under 150 ms on the maintainer's machine.

## Priorities

- must: the compiler emits valid, correct code and the checks pass on `1.0`.
- should: generated tests and the measured speed fixes.
- could: internal refactors that only make the code easier to change.
- later: parked ideas.

## Constraints

- Every pull request targets `1.0`, not `main`. `main` is the Solid 1.x line.
- Output must stay byte-identical to the current snapshots unless a node fixes a bug in that output. A node that changes a snapshot says why in its pull request.
- `solid-labels/compiler` exports only `compile`, `CompileError`, `Options` and `CompileOutput`. Do not change their shape without a `major` changeset and the maintainer's approval.
- Supports magic-string 1.2 and 1.4 (commit 18df205). Edge insertions behave differently between them.
- `compiler/context.ts`, `effect.ts`, `reactive.ts` and `variables.ts` are edited by several nodes. They are not split by feature first: each file already holds one phase, and the nodes that touch them run in a `hard` chain on purpose, so no two edit them at the same time.
- Dev dependencies merge in this order: `fuzz-generator`, then `scope-oracle` (lockfile).
- Each change to `packages/*` gets a changeset (changesets skill). `.changeset/` takes new files only.

## Non-goals

- The Rust compiler on the local `rust-compiler` branch.
- Solid 1.x (`main`, `0.x`).
- New compile-time functions or syntax.

## Verification

- Fast check (safe in parallel worktrees): `pnpm -C packages/core test && pnpm -C packages/core exec tsc --noEmit -p .`
- Full check (after merging): `pnpm install --frozen-lockfile && pnpm -r --filter "./packages/*" build && pnpm lint && pnpm format:check && pnpm -C packages/core test` (under 1 minute, no shared resources)
- Benchmarks (`benchmarks/compile/`) need a quiet machine. A node that times runs alone: the orchestrator starts no other worker while it measures (`exclusive: [bench]` only stops other benchmark nodes; test runs in other worktrees also skew timings, seen in `plugin-fast-path`).

## Numbered resources

- None. Changesets use random file names.

## Sources

- Analysis session on 2026-11-07: findings on PBT, model and oracle tests, implicit state machines, compiler structure and speed. The prototype patch and scripts are stored in the node folders.

## Coverage

- `x = (expr)` emits an unbalanced paren -> fix-signal-writes
- postfix `count++` / `count--` returns the new value -> fix-signal-writes
- typecheck error at `compiler/effect.ts:102` -> check-green
- lint error in `examples/ctf/vite.config.js` -> check-green
- repo-setup audit: packageManager, check workflow (types, draft skip, docs skip, cancel-in-progress), release workflow -> check-green
- property and run-the-output oracle tests -> fuzz-generator, fuzz-properties
- `analyze` oracle against eslint-scope -> scope-oracle
- old vs new oracle for the speed rewrite -> perf-compiler-indexes
- `unique` property -> perf-compiler-indexes
- speed: captures, hoists, regions, unique, isHoistable, renderSlice -> perf-compiler-indexes
- speed: oxc `experimentalRawTransfer` -> raw-transfer-spike
- speed: skip files with nothing to compile, skip the map when nothing changed -> plugin-fast-path
- speed: per-identifier parent chain copy (`scope.ts:300`) -> parent-chain-memory
- speed: `insideUntrack` linear scan -> perf-compiler-indexes
- state: `CaptureInfo` and `ReactiveInfo` -> capture-info-union
- state: compile phases mutate `Ctx` -> phase-outputs
- generator findings (nested writes, JSX in destructure defaults, `$memo` objects) -> fix-nested-rewrites
- scope disagreements (class expression names, parameter defaults) -> fix-scope-edges
- Rust branch as an oracle -> dropped: branch parked, non-goal

## Decisions

- 2026-11-07: no release workflow on `1.0` yet. `check-green` adds only the check workflow.
- 2026-11-07: for a file with nothing to compile, `compile()` returns `null` and the unplugin returns `null` from `transform`, so bundlers keep the original code and map. `solid-labels/compiler` is new in the pending major (`.changeset/oxc-compiler-rewrite.md`), so this needs no extra major; `plugin-fast-path` updates that changeset's text.
- 2026-11-07: dependencies are updated first (`deps-update`); `check-green` stacks on it because tool updates change lint and typecheck results.

## Open questions

- None.

## Gates

- `fuzz-generator` is gated: the generator is a contract that `fuzz-properties`, `perf-compiler-indexes`, `scope-oracle` and `parent-chain-memory` build on.
- `raw-transfer-spike` is gated: its result decides whether the option ships.
