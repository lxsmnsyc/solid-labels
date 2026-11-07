---
id: raw-transfer-spike
title: Spike: oxc experimentalRawTransfer for parsing
status: done
priority: could
type: spike
story:
early: false
outline: false
milestone:
target:
ship: auto
size: S
spike: true
verify:
exclusive:
  - bench
gate: true
owns:
  - docs/roadmaps/solid2-compiler/nodes/raw-transfer-spike/**
shared: []
reserves: []
provides: []
depends_on:
  - on: plugin-fast-path
    kind: hard
    why: measure parse cost on top of the fast path, using the `ctf` and `plain-show` cases
  - on: perf-bench
    kind: hard
    why: needs the benchmark to measure the gain
---

# Spike: oxc experimentalRawTransfer for parsing

## Goal

Decide whether `parseSync(..., { experimentalRawTransfer: rawTransferSupported() })` should ship.

## Context

- In the analysis session it cut the no-label file from 24.6 to 14.4 ms and the 440 KB file from 195 to 121 ms, with all tests passing.
- `deps-update` moved oxc-parser from 0.146 to 0.157; check first whether 0.157 types the option.
- Problems: the option is not in oxc-parser 0.146's `ParserOptions` type, so `tsc` fails; raw transfer reserves a large buffer; the API is experimental and may change in minor oxc versions.

## Acceptance

- [ ] Outcome answers: gain per benchmark case (beyond noise), peak RSS with and without, whether newer oxc-parser types the option, and a recommendation (ship, ship behind an option, or drop).
- [ ] No code merges from this node. Measure on a local branch; if the maintainer approves at the gate, the orchestrator adds a follow-up node for the one-line change.

## Sizing

S: measure and report.

- PR: #55 (report only). Raw transfer: ctf 800 192 -> 151 ms (-21%, beyond noise after 20 pairs), plain-show -44 to -52%, peak RSS unchanged, +4.5 ms on first compile, tests and snapshots unchanged. oxc-parser 0.157 does not type the option. Recommendation: ship without a user option. Gate: waiting for the maintainer.
