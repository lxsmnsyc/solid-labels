---
'solid-labels': patch
---

Arrow CTFs and accessor CTFs such as `$memo`, `$untrack` and `$children` keep their `() =>` wrapper when the argument starts with an auto-imported name (`$memo($latest(x))`), a component name, another arrow CTF, or a signal write. In dev mode, the `name` option is also kept in these cases.
