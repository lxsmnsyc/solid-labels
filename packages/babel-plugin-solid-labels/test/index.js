const babel = require('@babel/core');
const plugin = require('../dist/cjs');























const code = `
// @memo
const distanceFromMouseX = (() => {
  if (mouseX) {
    const width = child.getBoundingClientRect().width;
    const offset = child.offsetLeft - child.parentNode.offsetLeft;

    return Math.abs(offset + width / 2 - mouseX);
  } else {
    return null;
  }
})();
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
