---
'solid-labels': patch
---

- Dev names for `$signal` and `$memo` land after the argument and its parentheses. `$memo(c)`, `$memo((a + 1))` and `$memo(c += 2)` no longer compile to broken code in dev mode.
- `async () => x = await g()` compiles instead of throwing a raw MagicString error.
- Compound writes with `await` or `yield` on the right side, such as `x += await g()`, no longer leave the `await` inside the setter callback. They read `x` before the `await`, as plain code does. `||=`, `&&=` and `??=` run the right side only when `x` does not decide the result.
