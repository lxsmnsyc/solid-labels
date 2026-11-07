import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The generated-program tests take 10 times longer on a loaded machine or a CI runner.
    testTimeout: 30_000,
  },
});
