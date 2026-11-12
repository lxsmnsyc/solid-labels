# Outcome: check-green

## Built

- `CaptureInfo.get` accepts `'plain'` (`packages/core/compiler/context.ts`); plain captures use it (`effect.ts`). No output change.
- Root `lint` script builds the packages before `oxlint`, so lint passes on an unbuilt tree.
- `packages/core` has `"typecheck": "tsc --noEmit -p ."`.
- `.github/workflows/check.yml` replaces `main.yml`: pull requests to `1.0` and pushes to `1.0`, skips drafts and `docs/**`, cancels older pull request runs, runs install, build, lint, format check, typecheck, test. Action majors as on `main` (v4).
- Root `packageManager: pnpm@12.18.0`.

## Deviations

- `examples/ctf/vite.config.js` is unchanged: the lint error came from unbuilt packages and the `lint` script fix covers it.
- `main` has no `check.yml`; its `main.yml` was the reference.
- `pnpm-lock.yaml` changed (pnpm records `packageManagerDependencies`); required for `--frozen-lockfile`.
- No changeset (type-only change).

## Stubs left

- None. `capture-info-union` still owns the full type redesign. No release workflow (GOAL.md decision).

## Gotchas

- `lint` now runs a build first, so CI builds twice (about 1 s).
- Audit still reports `missing release workflow`, by decision.

## Proposed learnings

- None.

## Verification

- `pnpm install --frozen-lockfile`: pass
- `pnpm -r --filter "./packages/*" build`: pass
- `pnpm lint` (unbuilt and built): pass
- `pnpm format:check`: pass
- `pnpm -C packages/core typecheck`: pass
- `pnpm -C packages/core test`: pass (73 tests, snapshots unchanged)
- audit: `ok pnpm pnpm@12.18.0`, `ok check workflow check.yml`, `missing release workflow`

## Size

- Estimated M, actual S.
