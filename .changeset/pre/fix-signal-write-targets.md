---
'solid-labels': patch
---

Fix `$signal` writes through wrapped update targets such as `x!++` and `(x as any)++`. They compiled to `x()!++`, a syntax error, and now call the setter like `x++`. A `$signal` used as a `for (x of xs)` or `for (x in o)` target is now a compile error ("Unsupported write") instead of invalid output.
