import * as babel from '@babel/core';
import plugin from './dist/esm/development/babel.mjs';

async function compile(code, dev) {
  const result = await babel.transformAsync(code, {
    plugins: [[plugin, { dev }]],
    parserOpts: {
      plugins: ['jsx'],
    },
  });

  return result?.code ?? '';
}

console.log(
  await compile(`
let foo = $signal('foo');
let bar = $signal('bar')
let baz = $memo('baz');

const example = {
  foo: $property(foo),
  [baz]: $property(bar),
  baz: baz,
};

$(console.log(example.foo, example.bar));
`),
);
