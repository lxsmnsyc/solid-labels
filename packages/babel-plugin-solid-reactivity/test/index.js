const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
function Example() {
  signal: var x = 0, y = 1;

  while (true) {
    let y = x;
  }

  x += y = 2;
}
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
