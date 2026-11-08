# Wave 5 report (2026-11-08)

Merged: #53 (`capture-info-union`), #54 (`fix-scope-edges`), #55 (`raw-transfer-spike` report), #57 (`raw-transfer-ship`). Closed: #56 (`parent-chain-memory`, dropped). Open: #58 (remove `test/reference-compiler/`).

What changed against the plan:

- `raw-transfer-spike` passed its gate: ship with no user option and no pin, as solid-optimizer does. oxc plans to stabilize raw transfer and make it the default (oxc-project/oxc#28275). After an oxc minor bump, re-run `benchmarks/compile`: a renamed option falls back to the slow path with no error.
- `raw-transfer-ship`: ctf 800 183 to 145 ms, plain-show 800 28.3 to 14.3 ms, on a loaded machine. The 150 ms goal is met there; confirm on a quiet machine.
- `parent-chain-memory` was dropped. Its premise, that the per-identifier parent copy caused 10 to 13% GC, was an inference from a profile taken before `perf-compiler-indexes`; nobody profiled again before starting it. The chains are 5 to 15 deep and GC stayed at 8 to 9%. Its reference-compiler removal moved to #58.
- `fix-scope-edges`: `$signal` inside a parameter default whose body declares `var $signal` now throws instead of staying uncompiled.
- `phase-outputs` (later) no longer depends on the dropped node.

Lesson: before a performance node starts, profile on the current base and show that its target causes the cost. Otherwise make it a spike.

Left: `phase-outputs` (later, parked), `inbox.md` triage, and a quiet-machine benchmark run.
