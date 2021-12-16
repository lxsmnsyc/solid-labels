const babel = require('@babel/core');
const plugin = require('../dist/cjs');























const code = `
let x = $signal(0);

effect: {
  console.log(x);
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
