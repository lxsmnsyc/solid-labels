const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
let value = $derefSignal([getValue, setValue]);

value = newValue;

effect: {
  console.log(value);
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
