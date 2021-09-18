const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
/* @signal */
let x = 0;

/* @memo */
let y = x + 1;
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
