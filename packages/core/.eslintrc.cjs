module.exports = {
  "root": true,
  "extends": [
    "lxsmnsyc/typescript"
  ],
  "parserOptions": {
    "project": "./tsconfig.eslint.json",
    "tsconfigRootDir": __dirname,
  },
  "rules": {
    "import/no-extraneous-dependencies": [
      "error", {
        "devDependencies": ["**/*.test.ts"]
      }
    ],
    "no-param-reassign": "off"
  }
};