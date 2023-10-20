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
let foo = $signal('foo');
let bar = $signal('bar')

const example = {
  foo: $property(foo),
  [Math.random()]: $property(bar),
};

$(console.log(example.foo, example.bar));
`));