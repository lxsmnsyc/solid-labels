const babel = require('@babel/core');
const plugin = require('../dist/cjs');



const code = `
let count = $signal(0);
let a = $derefSignal([$get(count), $set(count)]);

a += 1;

let b = $derefSignal($refSignal(count));

b += 1;

let c = $derefSignal([
  () => count,
  (value) => {
    count = c;
  },
]);
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
