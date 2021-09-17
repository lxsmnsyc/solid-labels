module.exports = {
  "root": true,
  "extends": [
    "lxsmnsyc/typescript/react"
  ],
  "parserOptions": {
    "project": "./tsconfig.eslint.json",
    "tsconfigRootDir": __dirname,
  },
  "rules": {
    "react/no-unused-prop-types": "off",
    "react/require-default-props": "off",
    "react/destructuring-assignment": "off",
    "no-var": "off",
    "no-restricted-syntax": "off",
    "no-labels": "off",
    "vars-on-top": "off",
    "no-unused-labels": "off"
  }
};
