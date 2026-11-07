# Outcome: deps-update

## Built

- Every workspace dependency is at latest (`pnpm outdated -r` is empty). `solid-js` and `@solidjs/web` are pinned to `2.0.0-rc.21` in `packages/core/package.json` and `examples/ctf/package.json`.
- Patch changeset `.changeset/update-dependencies.md`.

Version changes that matter:

- `unplugin` 2.2.0 to 3.7.0 (major, unplugin-solid-labels)
- `vitest` 4.1.11 to 5.1.0 (major)
- `@types/node` to 26.6.6 (major, both packages)
- `vite` dev 6.1.1 to 8.3.6 in unplugin-solid-labels (peer range unchanged)
- `oxc-parser` 0.146.0 to 0.157.0, `oxlint` 1.79 to 1.91, `oxfmt` 0.64 to 0.76, `tsdown` 0.23.1 to 0.23.7, `rollup` 4.34 to 4.67
- `solid-js` and `@solidjs/web` 2.0.0-rc.1 to 2.0.0-rc.21
- `@solidjs/vite-plugin` 3.0.0-next.32 to next.56

## Deviations

- `magic-string` range stays `^1.2.2` (the lockfile has 1.4.5). Tests pass on both 1.2.2 and 1.4.5.
- Nothing else kept back.

## Stubs left

- None.

## Gotchas

- New lint errors for `check-green`: `no-deprecated` on `createTrackedEffect` (`packages/core/src/index.ts:102`) and `Dynamic` (`:142`), from solid-js rc.21. They are re-exports, so a lint ignore is likely the fix.
- Typecheck still has only the old `compiler/effect.ts:102` error.
- The `examples/ctf/vite.config.js` lint error and the unplugin `no-unsafe-*` errors no longer show (the unplugin ones need packages built first).
- pnpm prints "Agent skills awaiting approval" for tsdown, solid-js and @solidjs/web. The build is not affected.

## Proposed learnings

- Run lint after building packages | unplugin lint reads the built types of `solid-labels/compiler` | repo root | no

## Verification

- `pnpm install --frozen-lockfile && pnpm -r --filter "./packages/*" build`: pass
- `pnpm -C packages/core test`: pass (73 tests)
- `pnpm format:check`: pass
- `pnpm lint`: fail (2 new deprecation errors, see Gotchas)
- `pnpm -C packages/core exec tsc --noEmit -p .`: fail (unchanged effect.ts:102)

## Size

- Estimated S, actual S.
