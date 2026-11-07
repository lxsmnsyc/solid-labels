# Wave 2 report (2026-11-07)

Done: `perf-bench` (#39), `plugin-fast-path` (#41), `fuzz-generator` (#42, gate passed). Also #40 (lint ignores `docs/**`; the roadmap's prototype scripts had broken lint on `1.0`). Contract `program-arbitrary` frozen at version 1.

What changed against the plan:

- Baseline on `1.0` after `deps-update`: `ctf n=800` 640 ms (was 857 ms in the analysis session). `GOAL.md` updated.
- The generator found compiler bugs beyond `fix-signal-writes`: bare signal or memo reads on the right side of a write (`a = b` compiles to `seta_1(() => b)()`), postfix updates nested in writes, JSX in destructure defaults (`MagicStringError`), object literals in `$memo`. New must node `fix-nested-rewrites`; `fuzz-properties` and `perf-compiler-indexes` wait on it.
- `plugin-fast-path` benchmark numbers were noisy because the generator's tests ran at the same time. Timing nodes now run alone (`GOAL.md` Verification).
- The prefilter regex needed word boundaries and a `${` exclusion; caught at orchestrator review.
- One worker mistyped the repo path and reported lost files; nothing was lost.

Next: `fix-nested-rewrites` and `scope-oracle` in parallel. `raw-transfer-spike` runs alone afterwards (timing).
