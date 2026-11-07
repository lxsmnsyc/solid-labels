---
id: perf-bench
title: Add the compile benchmark and record the baseline
status: todo
priority: should
type: chore
story:
early: false
outline: false
milestone:
target:
ship: auto
size: S
spike: false
verify:
exclusive:
  - bench
gate: false
owns:
  - benchmarks/compile/**
  - pnpm-workspace.yaml
shared: []
reserves: []
provides: []
depends_on: []
---

# Add the compile benchmark and record the baseline

## Goal

Add `benchmarks/compile/` with a script that times `compile()` on generated files of four sizes, with and without compile-time functions, and record the baseline numbers in this node's outcome.

## Context

- Start from `nodes/perf-bench/prototype-bench.mjs` in this roadmap. It generates `n` components (signals, memos, destructure, effects, `$untrack`, JSX) and plain components, and prints compile and parse times.
- Baseline from the analysis session (one machine): `ctf n=800` (440 KB) 857 ms, `ctf n=200` 81 ms, `plain n=800` 24.6 ms.
- Cases: `ctf` (labels), `plain` (no labels, no component names: measures the fast path once `plugin-fast-path` lands) and `plain-show` (no labels, one `<Show>` per component: always takes the full path, so later nodes can measure scope and parse costs on it).
- Use perf-pass's `bench.py` style: several runs, report median and spread, so later nodes can tell a gain from noise.

## Acceptance

- [ ] `node benchmarks/compile/bench.mjs` runs after `pnpm -C packages/core build` and prints median times per case.
- [ ] Outcome lists the baseline numbers for all three cases and the machine, taken before `plugin-fast-path` lands.
- [ ] The benchmark folder is a private workspace package or a plain script; it is not published.

## Sizing

S: one script from a working prototype.
