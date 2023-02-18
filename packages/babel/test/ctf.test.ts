/* eslint-disable no-template-curly-in-string */
import * as babel from '@babel/core';
import { describe, expect, it } from 'vitest';
import plugin from '../src';

async function compile(code: string, dev?: boolean) {
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
});
