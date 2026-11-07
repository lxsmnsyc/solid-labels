---
id: deps-update
title: Update dependencies to latest
status: todo
priority: must
type: chore
story:
early: false
outline: false
milestone:
target:
ship: pr
size: S
spike: false
verify: pnpm install --frozen-lockfile && pnpm -r --filter "./packages/*" build && pnpm -C packages/core test
exclusive: []
gate: false
added: 2026-11-07
owns:
  - packages/unplugin/package.json
  - examples/ctf/package.json
shared:
  - package.json
  - packages/core/package.json
  - pnpm-lock.yaml
  - pnpm-workspace.yaml
  - .changeset/
reserves: []
provides: []
depends_on: []
---

# Update dependencies to latest

## Goal

Update every dependency in the workspace to its latest version before the rest of the roadmap builds on it, and fix what breaks.

## Context

- Asked by the maintainer on 2026-11-07, before the must nodes start.
- Solid 2.0 is a release candidate on the `next` tag: pin `solid-js` and `@solidjs/web` to the newest exact RC version, not a range, and not `latest` (which is 1.x).
- magic-string: the compiler supports 1.2 and 1.4; keep the range starting at a version the snapshots pass on.

## Acceptance

- [ ] `pnpm outdated -r` lists nothing except packages kept back on purpose, each with a reason in the PR.
- [ ] Build and core tests pass. Lint and typecheck results are no worse than on `1.0` (both already fail there; `check-green` fixes them).
- [ ] Patch changeset when a published package's dependency ranges change.

## Sizing

S: version bumps and lockfile.
