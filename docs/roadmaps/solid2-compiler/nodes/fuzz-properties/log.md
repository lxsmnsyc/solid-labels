# Log: fuzz-properties

- nested-rewrites.test.ts (other node) already holds the same two properties; the brief owns fuzz.test.ts, which did not exist. Added it as a standalone file.
- 100 runs and FC_RUNS=5000 pass. Reverting reactive.ts to b6566a3^ makes all 3 tests fail.
