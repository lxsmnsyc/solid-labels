import solidLabelsBabel from 'babel-plugin-solid-labels';
import { Plugin } from 'rollup';
import { createFilter, FilterPattern } from '@rollup/pluginutils';
import * as babel from '@babel/core';
import path from 'path';
import ts from '@babel/preset-typescript';

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
        const result = await babel.transformAsync(code, {
          ...options.babel,
          presets: [
            [ts],
            ...(options.babel?.presets ?? []),
          ],
          plugins: [
            [solidLabelsBabel, {
              dev: options.dev,
              disabled: options.disabled,
            }],
            ...(options.babel?.plugins ?? []),
          ],
          filename: path.basename(id),
        });

        if (result) {
          return {
            code: result.code ?? '',
            map: result.map,
          };
        }
      }
      return undefined;
    },
  };
}