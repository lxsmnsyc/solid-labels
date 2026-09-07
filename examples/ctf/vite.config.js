import solidPlugin from '@solidjs/vite-plugin';
import { defineConfig } from 'vite';
import solidLabels from 'unplugin-solid-labels';

export default defineConfig({
  plugins: [
    solidPlugin({}),
    solidLabels.vite({
      filter: {
        include: 'src/**/*.{ts,js,tsx,jsx}',
        exclude: 'node_modules/**/*.{ts,js,tsx,jsx}',
      },
    }),
  ],
});
