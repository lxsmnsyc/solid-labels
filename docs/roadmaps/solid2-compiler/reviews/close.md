# Closing report (2026-11-08)

The outcome in `GOAL.md` is met on `1.0` at `2e806b8` (after #58).

Acceptance, run on the merged branch:

- `pnpm install --frozen-lockfile && pnpm -r --filter "./packages/*" build && pnpm lint && pnpm format:check && pnpm -C packages/core exec tsc --noEmit -p . && pnpm -C packages/core test`: exits 0, 18 test files, 172 tests.
- The generated tests (`fuzz.test.ts`, `oracle.test.ts`, the scope oracle) run in `pnpm -C packages/core test` and pass.
- `node benchmarks/compile/bench.mjs`, quiet machine (Apple M2), 15 runs, warmup 3: `ctf n=800` median 144.82 ms (min 130.34, max 164.62). Baseline was 640 ms. `plain-show n=800` is 13.61 ms.

Nodes: 15 done, `parent-chain-memory` dropped, `phase-outputs` parked (`later`).

Left outside this roadmap:

- #46 (`for...of` targets and `x!++` compile to invalid code) and #48 (scope analysis misses decorators, namespaces, enums, parameter properties and `import =`). Both were found after the plan was set. They are fixed in their own pull requests to `1.0`.
- `inbox.md`: the solid-js rc.21 deprecations of `createTrackedEffect` and `Dynamic`, and the solid-sfc scope port. Both wait for the maintainer.
- tsdown warns that its `tsgo` generator on TypeScript 7.0 is deprecated. Move to TypeScript 7.1 or later before the next tsdown minor.
