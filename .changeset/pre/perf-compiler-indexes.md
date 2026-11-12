---
'solid-labels': patch
---

Compile large files faster: the compiler looks up references, effect regions and `$untrack` spans through sorted indexes instead of scanning everything. The output code is unchanged. Source maps of hoisted effect callbacks now point at the original callback.
