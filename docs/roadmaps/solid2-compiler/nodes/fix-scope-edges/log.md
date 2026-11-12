# Log: fix-scope-edges

- Reset to origin/1.0. Fix in compiler/scope.ts: name scopes for named function and class expressions, separate body var scope when parameters have defaults or computed keys (non-recursive check).
- Oracle hand corpus: the two it.fails became AGREEING cases, plus three new programs. All agree with eslint-scope.
- Snapshots unchanged. test/oracle.test.ts (reference compiler) still passes, so reference-compiler/scope.ts is unchanged.
- Load check: 8 busy loops, two suite copies at once. scope-oracle property took 0.55 s and 1.2 s (limit 120 s). Suites 9.6-9.8 s vs 3.5-4.9 s idle. Loops killed.
- A default `$signal(1)` now resolves to the macro and throws "must initialize a variable declaration", which is correct.
