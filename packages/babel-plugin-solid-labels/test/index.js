const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
function ComponentCTF() {
  let count = $signal(0);
  let message = $memo(\`Count: \${count}\`);
}
function ComponentComment() {
  // @signal
  let count = 0;
  // @memo
  let message = \`Count: \${count}\`;
}
function ComponentLabel() {
  signal: var count = 0;
  memo: message = \`Count: \${count}\`;
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
