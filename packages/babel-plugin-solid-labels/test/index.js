const babel = require('@babel/core');
const plugin = require('../dist/cjs');






















const code = `
/* @root test */ {
  someEffect();
}
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
