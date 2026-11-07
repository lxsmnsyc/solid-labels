# Log: plugin-fast-path

- Reset to origin/1.0, built core, ran baseline bench (noisy: another node was running).
- Added prefilter regex from `COMPONENTS`, `$`, `solid:`; `hasChanged()` check before the map; unplugin returns `null`.
- `util.ts` null check; changeset text updated; tests added.
- After bench: `plain` n=800 54.5 ms to 0.04 ms.
