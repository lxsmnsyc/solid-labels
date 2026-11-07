# Wave 3 report (2026-11-07)

Open for the maintainer: #43 (`scope-oracle`, clean review) and #44 (`fix-nested-rewrites`, clean review on magic-string 1.2.2 and 1.4.5). Set both to `done` when they merge.

What changed against the plan:

- `fix-nested-rewrites` fixed eight classes (bare reads on the right side of writes, postfix in nested writes, JSX and compile-time functions in destructure defaults, object literals, `$(expr);` statement starts, dropped `)` after ref functions); `$effect` in a destructure default is now a `CompileError` by design. The program property passes at `FC_RUNS=10000`.
- `scope-oracle` found two scope bugs that change output (class expression names, parameter defaults); a cross-repo comparison found a third (function expression name vs parameter). New node `fix-scope-edges`, modelled on silmaril's scope.
- One core test fails under load, twice, unidentified. New node `test-flake`.
- Cross-repo findings outside this roadmap are in `inbox.md` (solid-sfc copy of `scope.ts`, solid-styled hoisting, shared analyzer idea).
- Agents mistyped the repo folder as `solid-labs` three times; check for `/Users/alexis/Documents/GitHub/solid-labs` after each agent and keep the warning in worker prompts.

Next, once #43 and #44 merge (no worker is running now):

- `fix-scope-edges` (after #43), `fuzz-properties` and `perf-compiler-indexes` (after #44), `test-flake` (after #44).
- `perf-compiler-indexes` times benchmarks: start it alone, after the others finish, or give the others no overlap with its timed runs.
- `raw-transfer-spike` runs alone after `perf-compiler-indexes`.
