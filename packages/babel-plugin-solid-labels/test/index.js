const babel = require('@babel/core');
const plugin = require('../dist/cjs');








const code = `
let x = $signal(0);

$: var y = x + 10;
$: x = compute();
$: {
  console.log(x);
}
$(x = compute());
const z = $(x + 10);
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
