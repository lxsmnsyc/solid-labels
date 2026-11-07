# Log: fix-nested-rewrites

- Reproduced classes 0 to 3 on `1.0` with the brief's examples.
- Class 0 and 1: write closers (`)`) were added with `appendLeft` during the write rewrite, so reads at the same offset landed after them and postfix overwrites dropped them. Closers are now collected and inserted after all other rewrites, inner writes first.
- Class 2: `renderSlice` now runs the CTF rewrites inside its span first, renames JSX tags, applies reads on the magic string and returns `s.slice(start, end)`. `jsx.ts` skips tags it already renamed.
- The property found more: a concise `$component` body read landing after the closing brace (class 3), `$(expr)` object statements (class 4), ref-CTF and update overwrites dropping a `)` appended earlier (class 5), CTFs such as `$untrack` inside defaults (class 6), effects inside defaults (class 7).
- Node's `solid-js` is the server build where signals do not update; the test loads `dist/solid.js`.
- Not run: magic-string 1.2 (only 1.4.5 and 0.30 are installed).
