const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
function Example() {
  signal: var x, y = 'Hello', z;
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
