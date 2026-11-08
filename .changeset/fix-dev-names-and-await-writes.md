---
'solid-labels': patch
---

- Dev names for `$signal` and `$memo` land after the argument and its parentheses. `$memo(c)`, `$memo((a + 1))` and `$memo(c += 2)` no longer compile to broken code in dev mode.
- `async () => x = await g()` compiles instead of throwing a raw MagicString error.
- `x += await g()` and `x += yield v` evaluate the right side first, so no `await` or `yield` is left inside the setter callback.
