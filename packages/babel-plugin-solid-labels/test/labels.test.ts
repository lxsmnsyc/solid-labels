import * as babel from '@babel/core';
import plugin from '../src';
import { describe, expect, it } from 'vitest';

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

describe('labels', () => {
  describe('signal', () => {
    it('should transform labelled variables', async () => {
      expect(await compile('signal: var count = 0')).toMatchSnapshot();
    });
    it('should transform labelled variables and add name', async () => {
      expect(await compile('signal: var count = 0', true)).toMatchSnapshot();
    });
    it('should variable read', async () => {
      expect(await compile(`signal: var count = 0; console.log(count);`)).toMatchSnapshot();
    });
    it('should variable write', async () => {
      expect(await compile(`signal: var count = 0; count = 1`)).toMatchSnapshot();
    });
  });
  describe('memo', () => {
    it('should transform labelled variables', async () => {
      expect(await compile('memo: var count = 0')).toMatchSnapshot();
    });
    it('should transform labelled variables and add name', async () => {
      expect(await compile('memo: var count = 0', true)).toMatchSnapshot();
    });
    it('should variable read', async () => {
      expect(await compile(`memo: var count = 0; console.log(count);`)).toMatchSnapshot();
    });
  });
  describe('effect', () => {
    it('should transform labels', async () => {
      expect(await compile('effect: { console.log(count); }')).toMatchSnapshot();
    });
    it('should transform labels with names', async () => {
      expect(await compile('effect: countLog: { console.log(count); }')).toMatchSnapshot();
    });
    it('should transform labels with expressions', async () => {
      expect(await compile('effect: myFunction;')).toMatchSnapshot();
    });
  });
  describe('renderEffect', () => {
    it('should transform labels', async () => {
      expect(await compile('renderEffect: { console.log(count); }')).toMatchSnapshot();
    });
    it('should transform labels with names', async () => {
      expect(await compile('renderEffect: countLog: { console.log(count); }')).toMatchSnapshot();
    });
    it('should transform labels with expressions', async () => {
      expect(await compile('renderEffect: myFunction;')).toMatchSnapshot();
    });
  });
  describe('computed', () => {
    it('should transform labels', async () => {
      expect(await compile('computed: { console.log(count); }')).toMatchSnapshot();
    });
    it('should transform labels with names', async () => {
      expect(await compile('computed: countLog: { console.log(count); }')).toMatchSnapshot();
    });
    it('should transform labels with expressions', async () => {
      expect(await compile('computed: myFunction;')).toMatchSnapshot();
    });
  });
  describe('$', () => {
    it('should transform labels with variable declarations', async () => {
      expect(await compile('$: var x = 0;')).toMatchSnapshot();
    });
    it('should transform labels with expressions', async () => {
      expect(await compile('$: console.log(x);')).toMatchSnapshot();
    });
    it('should transform labels with block expressions', async () => {
      expect(await compile('$: { console.log(x); }')).toMatchSnapshot();
    });
  });
  describe('mount', () => {
    it('should transform labels', async () => {
      expect(await compile('mount: { console.log(count); }')).toMatchSnapshot();
    });
    it('should transform labels with expressions', async () => {
      expect(await compile('mount: myFunction;')).toMatchSnapshot();
    });
  });
  describe('cleanup', () => {
    it('should transform labels', async () => {
      expect(await compile('cleanup: { console.log(count); }')).toMatchSnapshot();
    });
    it('should transform labels with expressions', async () => {
      expect(await compile('cleanup: myFunction;')).toMatchSnapshot();
    });
  });
  describe('error', () => {
    it('should transform labels', async () => {
      expect(await compile('error: { console.log(count); }')).toMatchSnapshot();
    });
    it('should transform labels with expressions', async () => {
      expect(await compile('error: myFunction;')).toMatchSnapshot();
    });
  });
});
