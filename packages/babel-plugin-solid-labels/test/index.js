const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
function Component() {
  /* @signal */
  let x = 0;
  
  /* @memo */
  const y = x + 10, z = y + 10;
  
  /* @effect */ {
    console.log('X Value:', x);
    console.log('Y Value:', y);
  }
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
