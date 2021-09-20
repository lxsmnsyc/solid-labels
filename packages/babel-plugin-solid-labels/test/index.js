const babel = require('@babel/core');
const plugin = require('../dist/cjs');
























const code = `
destructure: var { a, b: { c, d } } = props;
$: console.log(a);
$: console.log(c, d);
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
