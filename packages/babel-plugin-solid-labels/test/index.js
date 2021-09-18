const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
signal: var x = 0;
refSignal: var y = x;
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
