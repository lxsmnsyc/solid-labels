import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/index.ts',
    {
      compiler: 'compiler/index.ts',
      babel: 'compiler/plugin.ts',
    },
  ],
  platform: 'neutral',
  dts: true,
  exports: true,
  deps: {
    neverBundle: [/^node\:.*$/i],
  },
});
