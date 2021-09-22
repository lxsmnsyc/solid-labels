const babel = require('@babel/core');
const plugin = require('../dist/cjs');



































const code = `
const { a, b: { c, d, ...e }, ...f } = $destructure(props);
$: console.log(a);
$: console.log(c, d);
$: console.log(e, f);
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
