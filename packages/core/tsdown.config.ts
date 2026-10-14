import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    'src/index.ts',
    {
      babel: 'babel/index.ts',
    },
  ],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  dts: true,
  exports: true,
  deps: {
    neverBundle: [/^node:.*$/i],
  },
});
