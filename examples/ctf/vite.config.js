import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import solidLabels from 'vite-plugin-solid-labels';

export default defineConfig({
  plugins: [
    solidPlugin({}),
    solidLabels({}),
  ],
});
