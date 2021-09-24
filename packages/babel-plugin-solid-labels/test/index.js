const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
// @signal
let count = 0;

// @memo
const message = \`Count: \${count}\`;

/* @effect */ {
  console.log(message);
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
