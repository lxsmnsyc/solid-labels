---
'solid-labels': patch
---

Fix writes to a signal through a TypeScript wrapper. `x! = 1`, `(x as any) = 1`, `(x satisfies number) = 1`, `(<any>x) = 1` and their compound forms such as `x! += 1` no longer throw `Unsupported write to reactive variable` and compile like `x = 1`.
