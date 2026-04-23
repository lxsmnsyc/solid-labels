import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/index.ts',
    {
      'compiler': 'compiler/index.ts'
    },
  ],
  platform: 'neutral',
  dts: true,
  exports: true,
  deps: {
    neverBundle: [
      /^node\:.*$/i,
    ],
  },
});
