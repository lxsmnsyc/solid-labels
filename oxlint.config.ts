import selfConfig from '@lxsmnsyc/oxlint-config';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [selfConfig],
  // Roadmaps and their prototype scripts are not build inputs.
  ignorePatterns: ['**/dist/**', '**/node_modules/**', 'docs/**'],
  overrides: [
    {
      // The compiler works on a structural AST type; property access is
      // inherently untyped there.
      files: ['packages/core/compiler/**', 'packages/core/test/**'],
      rules: {
        'typescript/no-unsafe-argument': 'off',
        'typescript/no-unsafe-assignment': 'off',
        'typescript/no-unsafe-call': 'off',
        'typescript/no-unsafe-member-access': 'off',
        'typescript/no-unsafe-return': 'off',
        'typescript/no-unsafe-type-assertion': 'off',
        'typescript/no-unnecessary-condition': 'off',
        'typescript/no-explicit-any': 'off',
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
      // Small modules and components export one name on purpose.
      files: ['website/**'],
      rules: {
        'import/prefer-default-export': 'off',
      },
    },
    {
      // `export *` from packages that oxlint cannot read the exports of.
      files: ['website/plugins/runtime-entry.js'],
      rules: {
        'import/export': 'off',
      },
    },
    {
      // The Markdown lexer types its tokens loosely.
      files: ['website/plugins/search-index.ts'],
      rules: {
        'typescript/no-unsafe-argument': 'off',
        'typescript/no-unsafe-call': 'off',
        'typescript/no-unsafe-member-access': 'off',
        'typescript/no-unsafe-return': 'off',
        'typescript/no-unsafe-type-assertion': 'off',
      },
    },
    {
      // Node scripts that run after the build. They log, and their imports are
      // untyped plain .mjs modules.
      files: ['website/scripts/**'],
      rules: {
        'no-console': 'off',
        'typescript/no-unsafe-argument': 'off',
        'typescript/no-unsafe-assignment': 'off',
        'typescript/no-unsafe-call': 'off',
        'typescript/no-unsafe-member-access': 'off',
        'typescript/no-unsafe-return': 'off',
        'typescript/no-misused-promises': 'off',
        'typescript/strict-void-return': 'off',
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
      },
    },
  ],
});
