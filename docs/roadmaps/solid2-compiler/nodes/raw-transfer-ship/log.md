# Log: raw-transfer-ship

- Added `PARSE_OPTIONS` (`ParserOptions & { experimentalRawTransfer?: boolean }`) in `compiler/index.ts`, spread into `parseSync`. Value is `rawTransferSupported()`, computed once at module level.
- No `test/raw-transfer.test.ts`: the flag has no user switch, so a test cannot compare on and off output. The existing snapshots run with it on and are unchanged.
- Benchmark: built `origin/1.0` and this branch, ran `bench.mjs --sizes 800 --runs 15` in 20 alternating process pairs (copy of bench.mjs reading the dist folder from `DIST`). The user's browser was open: load average 4 to 6.
