import { join } from 'node:path';
import { build } from 'vite';
import type { Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:repl-runtime';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
// One module that holds `solid-js` and `@solidjs/web`. The preview iframe maps
// both package names to it, so the two share a single copy of the reactive core.
const ENTRY_FILE = 'plugins/runtime-entry.js';

async function bundleRuntime(root: string): Promise<string> {
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    resolve: { conditions: ['browser', 'production', 'module'] },
    build: {
      write: false,
      minify: true,
      target: 'esnext',
      lib: { entry: join(root, ENTRY_FILE), formats: ['es'], fileName: 'runtime' },
    },
  });

  // `write: false` returns the bundle, one output per format.
  const outputs = Array.isArray(result) ? result : [result];
  for (const item of outputs) {
    if ('output' in item) {
      for (const chunk of item.output) {
        if (chunk.type === 'chunk') {
          return chunk.code;
        }
      }
    }
  }
  throw new Error('The REPL runtime bundle is empty.');
}

/** Serves the browser build of Solid 2.0 as a string, for the REPL preview iframe. */
export function replRuntime(): Plugin {
  let cached: Promise<string> | undefined;
  let root = process.cwd();

  return {
    name: 'repl-runtime',
    configResolved(config): void {
      root = config.root;
    },
    resolveId(id): string | null {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    async load(id): Promise<string | null> {
      if (id !== RESOLVED_ID) {
        return null;
      }
      cached ??= bundleRuntime(root);
      return `export default ${JSON.stringify(await cached)};`;
    },
  };
}
