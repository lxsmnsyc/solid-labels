const babel = require('@babel/core');
const plugin = require('../dist/cjs');


































const code = `
$component(({ [x]: { y, ...z } = { y: 10 }, ...a }) => (
  <>
    {y}
    {z}
    {a}
  </>
))
`;
babel.transformAsync(code, {
  plugins: [
    [plugin, { dev: false }],
  ],
  parserOpts: {
    plugins: [
      'jsx',
    ],
  },
}).then((result) => {
  console.log(result.code);
}, (err) => {
  console.error(err);
});
