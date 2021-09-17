const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
memo: var x = 0, y = 0;
`;
babel.transformAsync(code, {
  plugins: [
    plugin,
  ],
}).then((result) => {
  console.log(result.code);
}, (err) => {
  console.error(err);
});
