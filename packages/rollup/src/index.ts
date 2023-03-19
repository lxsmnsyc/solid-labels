import solidLabelsBabel from 'babel-plugin-solid-labels';
import { Plugin } from 'rollup';
import { createFilter, FilterPattern } from '@rollup/pluginutils';
import * as babel from '@babel/core';
import path from 'path';

export interface SolidLabelsPluginFilter {
  include?: FilterPattern;
  exclude?: FilterPattern;
}

export interface SolidLabelsPluginOptions {
  dev?: boolean;
  disabled?: {
    labels?: Record<string, boolean>;
    pragma?: Record<string, boolean>;
    ctf?: Record<string, boolean>;
  };
  filter?: SolidLabelsPluginFilter;
  babel?: babel.TransformOptions;
}

export default function solidLabelsPlugin(
  options: SolidLabelsPluginOptions = {},
): Plugin {
  const filter = createFilter(
    options.filter?.include,
    options.filter?.exclude,
  );
  return {
    name: 'solid-labels',
    async transform(code, id) {
      if (filter(id)) {
        const pluginOption = [solidLabelsBabel, {
          disabled: options.disabled,
          dev: options.dev,
        }];
        const plugins: NonNullable<NonNullable<babel.TransformOptions['parserOpts']>['plugins']> = ['jsx'];
        if (/\.[mc]?tsx?$/i.test(id)) {
          plugins.push('typescript');
        }
        const result = await babel.transformAsync(code, {
          ...options.babel,
          plugins: [
            pluginOption,
            ...(options.babel?.plugins || []),
          ],
          parserOpts: {
            ...(options.babel?.parserOpts || {}),
            plugins: [
              ...(options.babel?.parserOpts?.plugins || []),
              ...plugins,
            ],
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
      }
      return undefined;
    },
  };
}