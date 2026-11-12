---
'solid-labels': patch
---

`solid-labels/compiler` now loads in a browser build. It no longer requires `oxc-parser` to export `rawTransferSupported`, which the wasm build of `oxc-parser` does not.
