---
'solid-labels': patch
---

Fix rewrites that produced wrong or unparsable code. A write whose right side is a signal or memo (`a = b`, `a += m`) now reads it. Nested writes (`s = t++`), object literals next to ref functions or updates, and object literals in `$(expr);` statements and destructure defaults keep their parentheses. JSX components, `$untrack` and signal reads inside `$destructure` and `$component` defaults compile instead of throwing `MagicStringError`, and a concise `$component` body that reads a destructured name returns the value. `$effect` inside a destructure default throws a `CompileError`.
