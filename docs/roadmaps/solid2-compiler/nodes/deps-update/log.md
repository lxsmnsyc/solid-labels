# Log: deps-update

- Reset to origin/1.0, branch `chore/deps-update`. `pnpm outdated -r` listed 19 entries, so the work was needed.
- Baseline (1.0, before, packages unbuilt): typecheck fails at `compiler/effect.ts(102,35)` TS2322. Lint: 8 `no-unsafe-*` errors in `packages/unplugin/src/index.ts` (lines 59-66, `solid-labels/compiler` types not built), a tsconfig error and 2 errors in `examples/ctf`.
- `pnpm update -r --latest`, then pinned `solid-js` and `@solidjs/web` to `2.0.0-rc.21` (`next` tag; `latest` is 1.9.18 / rc.0).
- Peer ranges `^2.0.0-rc.1` left as they are: they already admit rc.21.
- `magic-string` reset to `^1.2.2` (installs 1.4.5). Core tests pass with 1.2.2 forced (73) and with 1.4.5 (73).
- After: build passes, 73 core tests pass, format passes, `pnpm outdated -r` is empty.
- Typecheck after: the same single error at effect.ts:102.
- Lint after (packages built): 2 new `no-deprecated` errors from solid-js rc.21: `createTrackedEffect` at `packages/core/src/index.ts:102` and `Dynamic` at `:142`. The earlier unplugin and examples/ctf errors no longer appear (the first set came from an unbuilt tree; the ctf set is gone with oxlint 1.91 and config 0.1.3).
