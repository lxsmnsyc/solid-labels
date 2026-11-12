# Checklist

- Data and migrations: N/A. The compiler stores nothing; no saved state.
- Compatibility: `solid-labels/compiler` API shape (GOAL constraints; open question in `plugin-fast-path`). Output changes only in `fix-signal-writes`, which changes code that was wrong. magic-string 1.2 and 1.4 checked in `perf-compiler-indexes`.
- Auth and permissions: N/A. Build-time library.
- Failure modes: `fuzz-generator` checks that every failure is a `CompileError` and every success parses.
- Concurrency: N/A at runtime (synchronous compile). Benchmarks take the `bench` exclusive.
- Limits: large files covered by `perf-bench` (440 KB case); empty file and no-label files covered by `plugin-fast-path`. Raw transfer memory covered by `raw-transfer-spike`.
- Security: N/A. The input is the user's own source code; the output is not run by the compiler. The run-the-output oracle runs only generated programs in tests.
- Observability: N/A. Build tool; errors carry line and column already.
- Performance: baseline and harness in `perf-bench`; budgets in `GOAL.md` acceptance and in `perf-compiler-indexes`.
- Testing: snapshot tests plus `fuzz-generator`, `scope-oracle`, the old vs new oracle in `perf-compiler-indexes`. All run in parallel worktrees with no shared resources.
- Local files: N/A. No gitignored inputs; `pnpm install` in each worktree.
- Developer experience: N/A for new APIs. Error messages unchanged.
- Rollout: changesets per node; the `1.0` branch is not published from CI yet (open question).
- Cleanup: `test/reference-compiler/` removed in `parent-chain-memory`. `PendingHoist.text` removed in `perf-compiler-indexes`.
- Coverage: every finding mapped in `GOAL.md`.
- Dependencies: `fast-check`, `@fast-check/vitest` (`fuzz-generator`), `eslint-scope` (`scope-oracle`), dev only, MIT/BSD. Lockfile edits: `fuzz-generator` and `scope-oracle` run in different waves.
