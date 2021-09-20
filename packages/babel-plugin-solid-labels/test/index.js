const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
signal: var data;

transition: {
  data = fetchData();
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
