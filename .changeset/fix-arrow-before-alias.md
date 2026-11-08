---
'solid-labels': patch
---

Arrow CTFs such as `$memo` and `$untrack` keep their `() =>` wrapper when the argument starts with an auto-imported name (`$memo($latest(x))`), a component name, another arrow CTF, or a signal write.
