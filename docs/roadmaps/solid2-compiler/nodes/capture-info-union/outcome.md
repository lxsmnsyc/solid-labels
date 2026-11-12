# Outcome: capture-info-union

## Built

- `ReactiveInfo` is `SignalInfo` (`set` required) or `AccessorInfo` (`accessor` and `raw`, no `set`) in `packages/core/compiler/context.ts`.
- `CaptureInfo` is `{ kind: 'plain' }` or `{ kind: 'reactive'; read: 'value' | 'accessor' | 'none'; write: boolean }`.
- `effect.ts` and `reactive.ts` use the kinds. No `info.set!` and no `!info.set` checks remain; `rewriteRefCtf` uses a `signalOnly()` that returns a `SignalInfo`.
- `.changeset/capture-info-union.md` (patch).

## Deviations

- `variables.ts` and `destructure.ts` needed no edit: their `register` calls already fit the union.
- `analyzeCaptures` still reads `ctx.reactive` once in its first loop, to choose between reactive and plain captures. The second lookup the brief mentions is only used for accessor names now.

## Stubs left

- None.

## Gotchas

- Capture `kind` and the reactive kind are separate: a `raw` reactive binding still produces a `plain` capture.

## Proposed learnings

- Model state with one type per case instead of optional fields | optional fields forced `!` assertions | packages/core/compiler | no

## Verification

- `pnpm -C packages/core exec tsc --noEmit -p .`: pass (the old effect.ts:102 error is gone).
- `pnpm -C packages/core test`: 17 files pass, snapshots and `oracle.test.ts` unchanged.
- Full check: see the pull request.

## Size

- Estimated M, actual S.
