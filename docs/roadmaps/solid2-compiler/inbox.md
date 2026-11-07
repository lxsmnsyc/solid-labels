# Inbox

Ideas waiting for triage with the maintainer.

- 2026-11-07, from `deps-update`: solid-js 2.0.0-rc.21 deprecates `createTrackedEffect` (use `createEffect(compute, effect)`, or `onSettled` for one-time DOM work) and `Dynamic` (use `dynamic()`). `$trackedEffect` and the `Dynamic` / `<solid:dynamic>` auto-imports still map to them; lint is silenced at `packages/core/src/index.ts`. Decide: remove or remap `$trackedEffect`, and add a `$dynamic` mapping or keep `Dynamic`. Likely a feature node in the pending major.
