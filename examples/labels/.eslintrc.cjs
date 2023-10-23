module.exports = {
  "root": true,
  "extends": [
    "lxsmnsyc/typescript/solid"
  ],
  "parserOptions": {
    "project": "./tsconfig.eslint.json",
    "tsconfigRootDir": __dirname,
  },
  "rules": {
    "no-var": "off",
    "no-restricted-syntax": "off",
    "no-labels": "off",
    "vars-on-top": "off",
    "no-unused-labels": "off"
  }
};
