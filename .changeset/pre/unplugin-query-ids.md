---
'unplugin-solid-labels': patch
---

Match module ids that carry a query against `filter` by their file path. SolidStart loads route files as `routes/index.tsx?pick=...`, so the default `src/**` filter skipped them and their compile-time functions were left uncompiled.
