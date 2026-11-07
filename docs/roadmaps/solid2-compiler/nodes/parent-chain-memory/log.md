# Log

- Ref.parents (array copy per identifier) replaced by Ref.up, a shared linked chain (`Ancestor`) built while resolving. Readers walk `.up`. `callIndex` in RefCtfUse was unused and is gone.
- Oracle (test/oracle.test.ts vs test/reference-compiler) and snapshots: pass byte-identical at default runs, FC_RUNS=1000, on magic-string 1.4.5 (lockfile), and 1.2.2. package.json and lockfile restored.
