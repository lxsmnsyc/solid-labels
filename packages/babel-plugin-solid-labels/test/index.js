const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
function Example() {
  let count = $signal(0);

  return $refSignal(count);
}

let count = 0;
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
