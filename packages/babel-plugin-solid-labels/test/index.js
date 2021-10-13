const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
let count = $signal(0);
const x = $memo(count);
const message = $memo(\`Count: \${count}\`, {
  equal: (a, b) => a === b,
});
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
