const babel = require('@babel/core');
const plugin = require('../dist/cjs');


































const code = `
<solid:assets>
  <link rel="stylesheet" href="/styles.css" />
</solid:assets>
`;
babel.transformAsync(code, {
  plugins: [
    [plugin, { dev: false }],
  ],
  parserOpts: {
    plugins: [
      'jsx',
    ],
  },
}).then((result) => {
  console.log(result.code);
}, (err) => {
  console.error(err);
});
