# Inbox

Ideas waiting for triage with the maintainer.

- 2026-11-07, from the cross-repo scope comparison: solid-sfc's `packages/solid-sfc/src/labels/scope.ts` is a copy of this compiler's `scope.ts` with the same bugs; port `fix-scope-edges` there once it lands. solid-styled does not hoist `var` past blocks in its `css` shadow check. A shared scope analyzer for solid-labels, solid-sfc, solid-optimizer, silmaril and solid-styled is plausible (silmaril's model plus solid-optimizer's iteration, tested by the eslint-scope oracle); weigh it with goal-debate before planning.
