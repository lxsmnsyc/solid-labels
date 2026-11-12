---
'solid-labels': patch
---

Source maps now embed the original source in `sourcesContent`, and name the source by its file path without the bundler query (`/src/app.tsx`, not `/src/app.tsx?pick=default`).
