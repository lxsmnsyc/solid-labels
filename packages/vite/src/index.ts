import solidLabelsBabel from 'babel-plugin-solid-labels';
import { Plugin } from 'vite';
import { createFilter, FilterPattern } from '@rollup/pluginutils';
import * as babel from '@babel/core';
import path from 'path';
import ts from '@babel/preset-typescript';

export interface SolidLabelsPluginFilter {
  include?: FilterPattern;
  exclude?: FilterPattern;
}

export interface SolidLabelsPluginOptions {
  disabled?: {
    labels?: Record<string, boolean>;
    pragma?: Record<string, boolean>;
    ctf?: Record<string, boolean>;
  };
  filter?: SolidLabelsPluginFilter;
  babel?: babel.TransformOptions;
}

// From: https://github.com/bluwy/whyframe/blob/master/packages/jsx/src/index.js#L27-L37
function repushPlugin(plugins: Plugin[], plugin: Plugin, pluginNames: string[]) {
  const namesSet = new Set(pluginNames);

  let baseIndex = -1;
  let solidLabelsIndex = -1;
  for (let i = 0, len = plugins.length; i < len; i += 1) {
    const current = plugins[i];
    if (namesSet.has(current.name) && baseIndex === -1) {
      baseIndex = i;
    }
    if (current.name === 'solid-labels') {
      solidLabelsIndex = i;
    }
  }
  if (baseIndex !== -1 && solidLabelsIndex !== -1) {
    plugins.splice(solidLabelsIndex, 1);
    plugins.splice(baseIndex, 0, plugin);
  }
}

export default function solidLabelsPlugin(
  options: SolidLabelsPluginOptions = {},
): Plugin {
  const filter = createFilter(
    options.filter?.include,
    options.filter?.exclude,
  );
  let isDev = false;
  const plugin: Plugin = {
    name: 'solid-labels',
    enforce: 'pre',
    configResolved(config) {
      isDev = config.mode !== 'production';

      // run our plugin before the following plugins:
      repushPlugin(config.plugins as Plugin[], plugin, [
        // https://github.com/withastro/astro/blob/main/packages/astro/src/vite-plugin-jsx/index.ts#L173
        'astro:jsx',
        // https://github.com/solidjs/vite-plugin-solid/blob/master/src/index.ts#L305
        'solid',
      ]);
    },
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
              disabled: options.disabled,
              dev: isDev,
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

  return plugin;
}