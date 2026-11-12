---
'solid-labels': patch
---

Fix signal writes that compiled to wrong code. `a = (1 + 2)` and other parenthesized right-hand sides no longer emit an unbalanced parenthesis, and `count++` / `count--` whose value is used now give the old value, as in plain JavaScript.
