# Log: check-green

- Stacked on `origin/chore/deps-update`. Typecheck had only the `effect.ts:102` error.
- `pnpm lint` on an unbuilt tree failed in `packages/unplugin/src/index.ts` and `examples/ctf` (types of the built `solid-labels/compiler` missing). `vite.config.js` needed no edit. Fixed by making the root `lint` script build the packages first.
- `main` has no `check.yml`; its workflow is `main.yml`. Copied it as `check.yml` with action majors v4, set branches to `1.0`, added a typecheck step. The old `main.yml` on `1.0` was removed.
- `packageManager: pnpm@12.18.0` makes pnpm write `packageManagerDependencies` into `pnpm-lock.yaml`; frozen install fails without it, so the lockfile is committed.
