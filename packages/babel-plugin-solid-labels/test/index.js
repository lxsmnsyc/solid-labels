const babel = require('@babel/core');
const plugin = require('../dist/cjs');























const code = `
let { a: { b, c }, b: { d, e }, ...f } = $destructure(x);

effect: {
  console.log(b, c, g);
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
    [plugin, { dev: false }],
  ],
}).then((result) => {
  console.log(result.code);
}, (err) => {
  console.error(err);
});
