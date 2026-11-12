# Wave 1 report (2026-11-07)

Done: `deps-update` (#36), `fix-signal-writes` (#37), `check-green` (#38), roadmap docs (#35). All must work is merged; lint, typecheck and tests pass on `1.0`.

What changed against the plan:

- `deps-update` brought solid-js 2.0.0-rc.21, which deprecates `createTrackedEffect` and `Dynamic`. Lint is silenced at `packages/core/src/index.ts`; the follow-up is in `inbox.md` for the maintainer.
- `check-green`: `main` names its workflow `main.yml`, not `check.yml` as the brief assumed. The `lint` script now builds first.
- `verify` commands of six later nodes ran the whole suite and passed before any work; they now target each node's own test file.

Promoted: `packages/core/compiler/CLAUDE.md` (paren spans, snapshot rule, magic-string versions).

Updated briefs: `perf-compiler-indexes` (patch base moved), `raw-transfer-spike` (oxc-parser 0.157).

Next: `fuzz-generator` (gated) and `perf-bench`. After the gate: `fuzz-properties`, `perf-compiler-indexes`, `scope-oracle`; after `perf-bench`: `plugin-fast-path`.
