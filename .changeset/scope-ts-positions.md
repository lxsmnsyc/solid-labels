---
'solid-labels': patch
---

Fix scope analysis for decorators, namespace bodies, enum initializers, parameter properties and `import x = require()`. A `$signal` read or written in these positions is now rewritten.
