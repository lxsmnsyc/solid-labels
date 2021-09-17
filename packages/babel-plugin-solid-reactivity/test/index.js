const babel = require('@babel/core');
const plugin = require('../dist/cjs');

const code = `
function Component() {
  signal: x = 0;
  memo: y = x + 10;
  effect: {
    console.log('Value', x);
    untrack: {
      console.log('Y-Value', y);
    }
    cleanup: {
      console.log('Cleaned!');
    }
  }
  error: {
    console.log('Something went wrong!');
  }
  function increment() {
    batch: {
      x += 1;
      x += 1;
    }
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
