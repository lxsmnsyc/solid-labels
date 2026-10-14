import selfConfig from '@lxsmnsyc/oxlint-config';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [selfConfig],
  ignorePatterns: ['**/dist/**', '**/node_modules/**'],
  overrides: [
    {
      // The Babel plugin works on loosely typed AST nodes; property access is
      // inherently untyped there.
      files: ['packages/core/babel/**', 'packages/core/test/**'],
      rules: {
        'typescript/no-unsafe-argument': 'off',
        'typescript/no-unsafe-assignment': 'off',
        'typescript/no-unsafe-call': 'off',
        'typescript/no-unsafe-member-access': 'off',
        'typescript/no-unsafe-return': 'off',
        'typescript/no-unsafe-type-assertion': 'off',
        'typescript/no-unnecessary-condition': 'off',
        'typescript/no-explicit-any': 'off',
        // Each module exports one named helper.
        'import/prefer-default-export': 'off',
      },
    },
    {
      // Example apps log on purpose.
      files: ['examples/**'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      // Label syntax declares variables with `var`.
      files: ['examples/labels/**'],
      rules: {
        'no-var': 'off',
        'no-unused-labels': 'off',
      },
    },
    {
      // Global CTF declarations mirror Solid's own type shapes.
      files: ['packages/core/src/index.ts'],
      rules: {
        'typescript/no-explicit-any': 'off',
        'typescript/no-empty-object-type': 'off',
        'typescript/no-namespace': 'off',
        'typescript/no-unnecessary-type-parameters': 'off',
        'typescript/no-invalid-void-type': 'off',
        // `$error` keeps exposing the deprecated `onError` for Solid 1.x.
        'typescript/no-deprecated': 'off',
      },
    },
  ],
});
