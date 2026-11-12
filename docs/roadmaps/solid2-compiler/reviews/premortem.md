# Premortem

It is some weeks from now and the roadmap shipped late. Why?

1. **The program generator makes mostly rejected programs.** If most generated programs throw `CompileError` (the prototype rejects about 28%), the properties pass while checking little, and the oracle nodes built on it find nothing. Change: `fuzz-generator` acceptance caps the rejected share at 30%, and the node is gated so the maintainer reviews the generator before three nodes build on it.
2. **The postfix fix changes snapshot output the maintainer did not expect.** Wrapping every `count++` in a `tmp` closure would change many snapshots and slow common statement code. Change: `fix-signal-writes` keeps the statement form as it is and uses the `tmp` form only when the value is used.
3. **`s.move` in the hoist rewrite behaves differently in a magic-string version not tested.** The comment in `transform.ts` records a break between 1.2 and 1.4. Change: `perf-compiler-indexes` runs the snapshots on 1.2.2 and 1.4.5 and the old vs new oracle; accept the risk for later versions, since the lockfile pins one.
4. **Benchmark noise hides or fakes gains.** Numbers from one run on a laptop vary. Change: `perf-bench` reports median and spread; gains count only above the spread; benchmark nodes take the `bench` exclusive.
5. **The refactor chain (`capture-info-union`, `parent-chain-memory`) stalls behind review.** They are `could` and sit on the critical path after the `should` work. Accept: the goal is reached at wave 3 without them; they stay in the plan for capacity left over.
