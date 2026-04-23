import babel from '@babel/core';
import path from 'node:path';
import type { Options } from './core/types';
import solidStyledPlugin from './plugin';

export type { Options };

export interface CompileOutput {
  code: string;
  map: babel.BabelFileResult['map'];
}

const FILE_FILTER = /\.[mc]?tsx?$/i;

export async function compile(
  id: string,
  code: string,
  options: Options,
): Promise<CompileOutput> {
  const plugins: NonNullable<
    NonNullable<babel.TransformOptions['parserOpts']>['plugins']
  > = ['jsx'];
  if (FILE_FILTER.test(id.split('?')[0])) {
    plugins.push('typescript');
  }
  const result = await babel.transformAsync(code, {
    plugins: [[solidStyledPlugin, options]],
    parserOpts: {
      plugins,
    },
    filename: path.basename(id),
    ast: false,
    sourceMaps: true,
    configFile: false,
    babelrc: false,
    sourceFileName: id,
  });

  if (result) {
    return {
      code: result.code || '',
      map: result.map,
    };
  }
  throw new Error('invariant');
}
