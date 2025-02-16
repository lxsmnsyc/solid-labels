/* eslint-disable no-template-curly-in-string */
import * as babel from '@babel/core';
import { describe, expect, it } from 'vitest';
import plugin from '../babel';

async function compile(code: string, dev?: boolean): Promise<string> {
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

describe('ctf', () => {
  describe('$signal', () => {
    it('should transform $signal', async () => {
      expect(await compile('let count = $signal(0);')).toMatchSnapshot();
    });
    it('should transform $signal bindings', async () => {
      let code = `
      let count = $signal(0);
      const value = count;
      `;
      expect(await compile(code)).toMatchSnapshot();
      code = `
      let count = $signal(0);
      const value = { count };
      `;
      expect(await compile(code)).toMatchSnapshot();
      code = `
      let count = $signal(0);

      async function exampleA() {
        count = await asyncValue();
      }
      function* exampleB() {
        count = yield asyncValue();
      }
      async function* exampleC() {
        count = yield asyncValue();
      }

      const example = async () => (count = await asyncValue());
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $signal bindings for $set', async () => {
      const code = `
      let count = $signal(0);
      const value = $set(count);
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $signal bindings for $get', async () => {
      const code = `
      let count = $signal(0);
      const value = $get(count);
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $signal bindings for $refSignal', async () => {
      const code = `
      let count = $signal(0);
      const value = $refSignal(count);
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $signal bindings for $getter', async () => {
      const code = `
      let count = $signal(0);
      const value = { count: $getter(count) };
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $signal bindings for $setter', async () => {
      const code = `
      let count = $signal(0);
      const value = { count: $setter(count) };
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $signal bindings for $property', async () => {
      const code = `
      let count = $signal(0);
      const value = { count: $property(count) };
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
  });
  describe('$memo', () => {
    it('should transform $memo', async () => {
      const code = 'const message = $memo(`Count: ${count}`);';
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $memo bindings', async () => {
      let code = `
      const message = $memo(\`Count: \${count}\`)
      const value = message;
      `;
      expect(await compile(code)).toMatchSnapshot();
      code = `
      const message = $memo(\`Count: \${count}\`)
      const value = { message };
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $memo on $get', async () => {
      const code = `
      const message = $memo(\`Count: \${count}\`)
      const value = $get(message);
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $memo on $refMemo', async () => {
      const code = `
      const message = $memo(\`Count: \${count}\`)
      const value = $refMemo(message);
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $memo on $getter', async () => {
      const code = `
      const message = $memo(\`Count: \${count}\`)
      const value = { message: $getter(message) };
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $memo on $property', async () => {
      const code = `
      const message = $memo(\`Count: \${count}\`)
      const value = { message: $property(message) };
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
  });
  describe('$derefSignal', () => {
    it('should transform $derefSignal', async () => {
      const code = `
      const count = $derefSignal(createSignal(0));
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $derefSignal bindings', async () => {
      let code = `
      const count = $derefSignal(createSignal(0));
      const value = count;
      `;
      expect(await compile(code)).toMatchSnapshot();
      code = `
      const count = $derefSignal(createSignal(0));
      const value = { count };
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $derefSignal bindings for $set', async () => {
      const code = `
      const count = $derefSignal(createSignal(0));
      const value = $set(count);
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $derefSignal bindings for $get', async () => {
      const code = `
      const count = $derefSignal(createSignal(0));
      const value = $get(count);
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $derefSignal bindings for $refSignal', async () => {
      const code = `
      const count = $derefSignal(createSignal(0));
      const value = $refSignal(count);
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $derefSignal bindings for $getter', async () => {
      const code = `
      const count = $derefSignal(createSignal(0));
      const value = { count: $getter(count) };
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $derefSignal bindings for $setter', async () => {
      const code = `
      const count = $derefSignal(createSignal(0));
      const value = { count: $setter(count) };
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $derefSignal bindings for $property', async () => {
      const code = `
      const count = $derefSignal(createSignal(0));
      const value = { count: $property(count) };
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
  });
  describe('$derefMemo', () => {
    it('should transform $derefMemo', async () => {
      const code = `
      const message = $derefMemo(() => \`Count: \${count}\`);
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $derefMemo bindings', async () => {
      let code = `
      const message = $derefMemo(() => \`Count: \${count}\`);
      const value = message;
      `;
      expect(await compile(code)).toMatchSnapshot();
      code = `
      const message = $derefMemo(() => \`Count: \${count}\`);
      const value = { message };
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $derefMemo on $get', async () => {
      const code = `
      const message = $derefMemo(() => \`Count: \${count}\`);
      const value = $get(message);
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $derefMemo on $refMemo', async () => {
      const code = `
      const message = $derefMemo(() => \`Count: \${count}\`);
      const value = $refMemo(message);
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $derefMemo on $getter', async () => {
      const code = `
      const message = $derefMemo(() => \`Count: \${count}\`);
      const value = { message: $getter(message) };
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $derefMemo on $property', async () => {
      const code = `
      const message = $derefMemo(() => \`Count: \${count}\`);
      const value = { message: $property(message) };
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
  });
  describe('$destructure', () => {
    it('should transform $destructure', async () => {
      const code = `
      let { a: { b, c }, b: { d = defaultD, e = defaultE }, ...f } = $destructure(x);
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $destructure bindings', async () => {
      let code = `
      let { a: { b, c }, b: { d = defaultD, e = defaultE }, ...f } = $destructure(x);

      effect: {
        console.log(b, c);
      }
      effect: {
        console.log(d, e);
      }
      effect: {
        console.log(f);
      }
      `;
      expect(await compile(code)).toMatchSnapshot();
      code = `
      let { a: { b, c }, b: { d = defaultD, e = defaultE }, ...f } = $destructure(x);

      effect: {
        console.log({ b }, { c });
      }
      effect: {
        console.log({ d }, { e });
      }
      effect: {
        console.log(f);
      }
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $destructure bindings on $get', async () => {
      const code = `
      let { a: { b, c }, b: { d = defaultD, e = defaultE }, ...f } = $destructure(x);

      effect: {
        console.log($get(b), $get(c));
      }
      effect: {
        console.log($get(d), $get(e));
      }
      effect: {
        console.log(f);
      }
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $destructure bindings on $refMemo', async () => {
      const code = `
      let { a: { b, c }, b: { d = defaultD, e = defaultE }, ...f } = $destructure(x);

      effect: {
        console.log($refMemo(b), $refMemo(c));
      }
      effect: {
        console.log($refMemo(d), $refMemo(e));
      }
      effect: {
        console.log(f);
      }
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $destructure bindings on $getter', async () => {
      const code = `
      let { a: { b, c }, b: { d = defaultD, e = defaultE }, ...f } = $destructure(x);

      effect: {
        console.log({ b: $getter(b) }, { c: $getter(c) });
      }
      effect: {
        console.log({ d: $getter(d) }, { e: $getter(e) });
      }
      effect: {
        console.log(f);
      }
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $destructure bindings on $property', async () => {
      const code = `
      let { a: { b, c }, b: { d = defaultD, e = defaultE }, ...f } = $destructure(x);

      effect: {
        console.log({ b: $property(b) }, { c: $property(c) });
      }
      effect: {
        console.log({ d: $property(d) }, { e: $property(e) });
      }
      effect: {
        console.log(f);
      }
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
  });
  describe('$component', () => {
    it('should transform $component', async () => {
      const code = `
      $component(({ a: { b, c }, b: { d = defaultD, e = defaultE }, ...f }) => {
      });
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $component bindings', async () => {
      let code = `
      $component(({ a: { b, c }, b: { d = defaultD, e = defaultE }, ...f }) => {
        effect: {
          console.log(b, c);
        }
        effect: {
          console.log(d, e);
        }
        effect: {
          console.log(f);
        }
      });
      `;
      expect(await compile(code)).toMatchSnapshot();
      code = `
      $component(({ a: { b, c }, b: { d = defaultD, e = defaultE }, ...f }) => {
        effect: {
          console.log({ b }, { c });
        }
        effect: {
          console.log({ d }, { e });
        }
        effect: {
          console.log(f);
        }
      });
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $component bindings on $get', async () => {
      const code = `
        $component(({ a: { b, c }, b: { d = defaultD, e = defaultE }, ...f }) => {
          effect: {
            console.log($get(b), $get(c));
          }
          effect: {
            console.log($get(d), $get(e));
          }
          effect: {
            console.log(f);
          }
        });
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $component bindings on $refMemo', async () => {
      const code = `
      $component(({ a: { b, c }, b: { d = defaultD, e = defaultE }, ...f }) => {
        effect: {
          console.log($refMemo(b), $refMemo(c));
        }
        effect: {
          console.log($refMemo(d), $refMemo(e));
        }
        effect: {
          console.log(f);
        }
      });
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $component bindings on $getter', async () => {
      const code = `
      $component(({ a: { b, c }, b: { d = defaultD, e = defaultE }, ...f }) => {
        effect: {
          console.log({ b: $getter(b) }, { c: $getter(c) });
        }
        effect: {
          console.log({ d: $getter(d) }, { e: $getter(e) });
        }
        effect: {
          console.log(f);
        }
      });
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
    it('should transform $component bindings on $property', async () => {
      const code = `
      $component(({ a: { b, c }, b: { d = defaultD, e = defaultE }, ...f }) => {
        effect: {
          console.log({ b: $property(b) }, { c: $property(c) });
        }
        effect: {
          console.log({ d: $property(d) }, { e: $property(e) });
        }
        effect: {
          console.log(f);
        }
      });
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
  });
  describe('$effect, $renderEffect, $computed', () => {
    it('should transform $effect, $renderEffect, $computed', async () => {
      const code = `
      let x = $signal(0);

      $effect(() => {
        console.log('Count', x);
      });
      $computed(() => {
        console.log('Count', x);
      });
      $renderEffect(() => {
        console.log('Count', x);
      });
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
  });

  describe('variable shadowing', () => {
    it('should respect variable shadowing', async () => {
      const code = `
        const selected = $signal('root');
        {
          const selected = 'local';
          console.log(selected); // 'local'
          {
            console.log(selected); // 'local'
            {
              const selected = $signal('inner');
              console.log(selected); // 'inner'
              {
                console.log(selected); // 'inner'
              }
            }   
          }
        }
      `;
      expect(await compile(code)).toMatchSnapshot();
    });
  });
});
