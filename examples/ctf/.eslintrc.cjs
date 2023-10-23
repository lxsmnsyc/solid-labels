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
    "no-unused-labels": "off",
    "no-labels": "off",
    "react/jsx-no-undef": "off"
  }
};
