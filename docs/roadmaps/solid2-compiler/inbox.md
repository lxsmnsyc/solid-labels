# Inbox

Ideas waiting for triage with the maintainer.

- 2026-11-07, from `deps-update`: solid-js 2.0.0-rc.21 deprecates `createTrackedEffect` (use `createEffect(compute, effect)`, or `onSettled` for one-time DOM work) and `Dynamic` (use `dynamic()`). `$trackedEffect` and the `Dynamic` / `<solid:dynamic>` auto-imports still map to them; lint is silenced at `packages/core/src/index.ts`. Decide: remove or remap `$trackedEffect`, and add a `$dynamic` mapping or keep `Dynamic`. Likely a feature node in the pending major.

- 2026-11-07, from the cross-repo scope comparison: solid-sfc's `packages/solid-sfc/src/labels/scope.ts` is a copy of this compiler's `scope.ts` with the same bugs; port `fix-scope-edges` there once it lands. solid-styled does not hoist `var` past blocks in its `css` shadow check. A shared scope analyzer for solid-labels, solid-sfc, solid-optimizer, silmaril and solid-styled is plausible (silmaril's model plus solid-optimizer's iteration, tested by the eslint-scope oracle); weigh it with goal-debate before planning.
