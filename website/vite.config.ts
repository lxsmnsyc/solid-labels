import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import solid from '@solidjs/vite-plugin';
import solidLabels from 'unplugin-solid-labels';
import { defineConfig } from 'vite';
import { replRuntime } from './plugins/repl-runtime.ts';
import { searchIndex } from './plugins/search-index.ts';

// The REPL needs a cross-origin isolated page: the Solid JSX compiler runs as
// a wasm module on shared memory. Vercel sends the same headers for /repl.
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

// `solid-labels/compiler` imports `oxc-parser`, whose browser build imports its
// wasm binding. The binding is not a dependency of `oxc-parser` in the store, so
// the config points at the copy this package installs.
const require = createRequire(import.meta.url);
const oxcWasm = join(
  dirname(require.resolve('@oxc-parser/binding-wasm32-wasip1/package.json')),
  'parser.wasip1-browser.js',
);

export default defineConfig({
  resolve: {
    alias: { '@oxc-parser/binding-wasm32-wasip1': oxcWasm },
  },
  plugins: [
    // `ssr: true` renders every route to HTML. `async` waits for the whole
    // page, so the static files hold no loading fallbacks.
    solid({
      ssr: true,
      start: {
        renderMode: 'async',
        document: './src/Document.tsx',
        clientSetup: './src/client-setup.ts',
      },
    }),
    solidLabels.vite({
      filter: {
        include: 'src/**/*.{ts,tsx}',
        exclude: 'node_modules/**/*.{ts,tsx}',
      },
    }),
    replRuntime(),
    searchIndex(),
  ],
  build: {
    target: 'esnext',
    // The REPL chunk holds the Solid runtime and the TypeScript strip. It loads on /repl only.
    chunkSizeWarningLimit: 1100,
  },
  optimizeDeps: {
    // The wasm bindings load their binary with `new URL(..., import.meta.url)`,
    // which pre-bundling would break.
    exclude: ['@oxc-parser/binding-wasm32-wasip1', '@solidjs/compiler-wasm32-wasi'],
  },
  // The compile worker loads wasm with top-level await, which needs ES modules.
  worker: { format: 'es' },
  server: { headers: isolation },
  preview: { headers: isolation },
});
