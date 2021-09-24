const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
destructure: var { a: { b, c }, b: { d, e }, ...f } = x;

effect: {
  console.log(b, c);
}
effect: {
  console.log(d, e);
}
effect: {
  console.log(f);
}
`;
babel.transformAsync(code, {
  plugins: [
    [plugin, { dev: true }],
  ],
}).then((result) => {
  console.log(result.code);
}, (err) => {
  console.error(err);
});
