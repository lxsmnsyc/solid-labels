import { transformAsync } from '@solidjs/compiler';
import solidLabels from 'unplugin-solid-labels';

const root = import.meta.dir;

// Bun runs the first `onLoad` that returns contents, so a second Bun plugin
// for Solid JSX never sees the solid-labels output. Compile the JSX in the
// `bun.transform` hook instead, which runs right after solid-labels.
const SolidLabels = solidLabels.bun({
  filter: { include: '**/src/**/*.{ts,tsx}' },
  bun: {
    async transform(code, id) {
      // The Solid compiler leaves TypeScript untouched, and Bun strips it.
      const result = await transformAsync(code, { filename: id, generate: 'dom' });
      return { code: result.code, map: result.map };
    },
  },
});

const output = await Bun.build({
  entrypoints: [`${root}/src/main.tsx`],
  outdir: `${root}/dist`,
  target: 'browser',
  plugins: [SolidLabels],
});

if (!output.success) {
  for (const log of output.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(`Built ${output.outputs.length} file(s) to ${root}/dist`);
