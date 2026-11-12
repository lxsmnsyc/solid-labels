# Compiler notes

- oxc parses with `preserveParens: false`, so node spans exclude wrapping parentheses while the characters stay in the source. When overwriting text around a child node, find its real span with `expandParens` (give it an upper bound such as the parent's end), or the output keeps an unmatched `(` or `)`.
- Snapshot output is the contract. A change that alters a snapshot must say why in its pull request.
- magic-string edge insertions differ between 1.2 and 1.4. Run the tests on both when touching `appendLeft`, `prependRight`, `move` or `slice` around edited spans.
