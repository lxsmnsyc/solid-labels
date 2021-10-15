const babel = require('@babel/core');
const plugin = require('../dist/cjs');























const code = `
function Counter() {
  signal: x = 0;

  effect: effectLog: {
    console.log('Count', x);
  }
  computed: computedLog: {
    console.log('Count', x);
  }
  renderEffect: renderEffectLog: {
    console.log('Count', x);
  }
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
