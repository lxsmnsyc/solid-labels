---
id: check-green
title: Make typecheck and lint pass on 1.0 and align the check workflow
status: active
priority: must
type: fix
story:
early: false
outline: false
milestone:
target:
ship: auto
size: M
spike: false
verify: pnpm lint && pnpm -C packages/core exec tsc --noEmit -p .
exclusive: []
gate: false
owns:
  - packages/core/compiler/effect.ts
  - packages/core/compiler/context.ts
  - examples/ctf/vite.config.js
  - .github/workflows/**
  - package.json
shared:
  - packages/core/package.json
reserves: []
provides: []
depends_on:
  - on: deps-update
    kind: hard
    why: updated oxlint and typescript change the lint and typecheck results this node fixes
---

# Make typecheck and lint pass on 1.0 and align the check workflow

## Goal

`tsc --noEmit` fails in `packages/core` and `pnpm lint` fails in the example. Fix both, add a `typecheck` script, and replace `main.yml` with a check workflow that runs it.

## Context

- `packages/core/compiler/effect.ts:102`: `const info: CaptureInfo = { get: true, set: false }` for plain captures, but `CaptureInfo['get']` is `false | 'value' | 'accessor'`. Readers only compare `get` to `'value'` and `'accessor'`, so a plain capture works today by accident. Minimal fix: add a plain value to the type (for example `'plain'`) and use it here. The full type redesign is `capture-info-union`; do not do it here.
- `examples/ctf/vite.config.js:8`: `no-unsafe-call` and `no-unsafe-member-access` on the unplugin import. These appear only when the packages are not built (CI builds first, so CI lint passes after `deps-update`). Make `pnpm lint` pass on an unbuilt tree too, or make the `lint` script build first; do not disable the rule for the whole repo.
- Base: this node stacks on `chore/deps-update` (PR #36): solid-js rc.21, vitest 5, oxlint 1.91, unplugin 3. Its PR targets `chore/deps-update` until #36 merges.
- Add `"typecheck": "tsc --noEmit -p ."` to `packages/core/package.json`.

- CI: the `1.0` branch runs `main.yml`, which lacks typecheck, the draft skip, the docs skip and cancel-in-progress. Copy `main`'s `.github/workflows/check.yml` (`git show main:.github/workflows/check.yml`), including its action majors. Run on pull requests to `1.0` and pushes to `1.0`.
- Add `packageManager` to the root `package.json` from `npm view pnpm version`.
- The repo-setup audit (`agent-skills:repo-setup`, `scripts/audit.py`) on `1.0` reports `missing pnpm`, `migrate check workflow` and `missing release workflow`. The release workflow waits for the open question in `GOAL.md`; leave it out unless the maintainer answered.

## Acceptance

- [ ] `pnpm lint` exits 0.
- [ ] `pnpm -C packages/core typecheck` exits 0.
- [ ] Snapshots unchanged.
- [ ] `check.yml` runs install, build, lint, format check, typecheck and tests, skips drafts and `docs/**`-only pushes, and cancels older runs on pull requests only. `main.yml` removed.
- [ ] The audit script shows `ok` for pnpm and check workflow.

## Sizing

M: two small known errors plus one workflow copied from `main`. Two commits: the fixes, then the workflow.

## Notes for the worker

- No changeset needed unless the published code changes behavior. A type-only change gets none.
