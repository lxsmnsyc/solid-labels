const babel = require('@babel/core');
const plugin = require('../dist/cjs');


































const code = `
let { [x]: { y } = { y: 10 } } = $destructure(x);

console.log(y);
`;
babel.transformAsync(code, {
  plugins: [
    [plugin, { dev: false }],
  ],
}).then((result) => {
  console.log(result.code);
}, (err) => {
  console.error(err);
});
