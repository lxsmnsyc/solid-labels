# Log: fix-signal-writes

- Step 1: both inputs failed on the built `dist/compiler.js` (unbalanced paren, new value for postfix). Not fulfilled.
- Paren fix: `expandParens(code, right.start, right.end, ref.node.end, assign.end)` gives the real span; used in the plain, statement-await and arrow-await branches. The object-literal check reads `code[rightStart]`.
- Postfix: value unused (ExpressionStatement, for-update) keeps the old output. Otherwise an IIFE with a `tmp` capture. Prefix is unchanged.
- Tests run the compiled output on solid-js 2.0.0-rc.1. Reads right after a write return the new value in these tests, no flush needed.
- Typecheck: only the known error at effect.ts:102.
