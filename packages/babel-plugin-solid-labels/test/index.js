const babel = require('@babel/core');
const plugin = require('../dist/cjs');


































const code = `
$component(({ [x]: { y, ...z } = { y: 10 } }) => {
  console.log(y, z);
})
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
