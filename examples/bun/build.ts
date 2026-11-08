import { transformAsync } from '@solidjs/compiler';
import { createUnplugin } from 'unplugin';
import type { UnpluginOptions } from 'unplugin';
import solidLabels from 'unplugin-solid-labels';

const root = import.meta.dir;

// Compiles Solid JSX. The Solid compiler leaves TypeScript untouched, and Bun strips it.
const solidJsx: UnpluginOptions = {
  name: 'solid-jsx',
  transform: {
    filter: { id: /\/src\/.*\.[jt]sx$/ },
    async handler(code, id) {
      const result = await transformAsync(code, { filename: id, generate: 'dom', sourceMap: true });
      return { code: result.code, map: result.map };
    },
  },
};

// Bun uses the first `onLoad` that returns contents, so two separate Bun plugins
// never chain. Plugins from one unplugin factory run their `transform` hooks in
// order inside a single `onLoad`, and their source maps are combined.
const solidBun = createUnplugin((_options: undefined, meta) => [
  solidLabels.raw({ filter: { include: '**/src/**/*.{ts,tsx}' } }, meta),
  solidJsx,
]).bun;

const output = await Bun.build({
  entrypoints: [`${root}/src/main.tsx`],
  outdir: `${root}/dist`,
  target: 'browser',
  sourcemap: 'external',
  plugins: [solidBun()],
});

if (!output.success) {
  for (const log of output.logs) {
    console.error(log);
  }
  process.exit(1);
}

// The source map must point at the original files.
const map: unknown = JSON.parse(await Bun.file(`${root}/dist/main.js.map`).text());
const sources: string[] = [];
if (typeof map === 'object' && map !== null && 'sources' in map && Array.isArray(map.sources)) {
  for (const source of map.sources) {
    sources.push(String(source));
  }
}
for (const file of ['src/App.tsx', 'src/main.tsx']) {
  let found = false;
  for (const source of sources) {
    if (source.endsWith(file)) {
      found = true;
    }
  }
  if (!found) {
    console.error(`source map is missing ${file}`);
    process.exit(1);
  }
}

console.log(`Built ${output.outputs.length} file(s) to ${root}/dist`);
