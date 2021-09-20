const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
function Example(props) {
  let list = $signal(0, {
    name: 'example',
  });
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
