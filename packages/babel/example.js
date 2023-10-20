import * as babel from '@babel/core';
import plugin from './dist/esm/development/index.mjs';

async function compile(code, dev) {
  const result = await babel.transformAsync(code, {
    plugins: [
      [plugin, { dev }],
    ],
    parserOpts: {
      plugins: [
        'jsx',
      ],
    },
  });

  return result?.code ?? '';
}

console.log(await compile(`
let count = $signal(0);

const example = {
  count: $property(count),
};
`));