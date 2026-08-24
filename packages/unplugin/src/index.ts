import type { FilterPattern } from '@rollup/pluginutils';
import { createFilter } from '@rollup/pluginutils';
import type { Options } from 'solid-labels/compiler';
import { compile } from 'solid-labels/compiler';
import type { TransformResult } from 'unplugin';
import { createUnplugin } from 'unplugin';
import type { Plugin } from 'vite';

export interface SolidLabelsPluginFilter {
  include?: FilterPattern;
  exclude?: FilterPattern;
}

export interface SolidLabelsPluginOptions extends Options {
  filter?: SolidLabelsPluginFilter;
}

// From: https://github.com/bluwy/whyframe/blob/master/packages/jsx/src/index.js#L27-L37
function repushPlugin(
  plugins: Plugin[],
  pluginName: string,
  pluginNames: string[],
): void {
  const namesSet = new Set(pluginNames);

  let baseIndex = -1;
  let targetIndex = -1;
  let targetPlugin: Plugin | undefined;
  for (let i = 0, len = plugins.length; i < len; i += 1) {
    const current = plugins[i];
    if (namesSet.has(current.name) && baseIndex === -1) {
      baseIndex = i;
    }
    if (current.name === pluginName) {
      targetIndex = i;
      targetPlugin = current;
    }
  }
  if (
    targetPlugin &&
    baseIndex !== -1 &&
    targetIndex !== -1 &&
    baseIndex < targetIndex
  ) {
    plugins.splice(targetIndex, 1);
    plugins.splice(baseIndex, 0, targetPlugin);
  }
}

const DEFAULT_INCLUDE = 'src/**/*.{jsx,tsx,ts,js,mjs,cjs}';
const DEFAULT_EXCLUDE = 'node_modules/**/*.{jsx,tsx,ts,js,mjs,cjs}';

const solidLabelsPlugin = createUnplugin(
  (options: SolidLabelsPluginOptions = {}) => {
    const filter = createFilter(
      options.filter?.include || DEFAULT_INCLUDE,
      options.filter?.exclude || DEFAULT_EXCLUDE,
    );

    let env: string;

    return {
      name: 'solid-labels',
      transformInclude(id): boolean {
        return filter(id);
      },
      async transform(code, id): Promise<TransformResult> {
        const result = await compile(id, code, {
          disabled: options.disabled,
          dev: env === 'development' || options.dev,
        });

        return {
          code: result.code,
          map: result.map,
        };
      },
      vite: {
        enforce: 'pre',
        configResolved(config): void {
          env = config.mode !== 'production' ? 'development' : 'production';

          // run our plugin before the following plugins:
          repushPlugin(config.plugins as Plugin[], 'solid-labels', [
            // https://github.com/withastro/astro/blob/main/packages/astro/src/vite-plugin-jsx/index.ts#L173
            'astro:jsx',
            // https://github.com/solidjs/vite-plugin-solid/blob/master/src/index.ts#L305
            'solid',
            // https://github.com/solidjs/solid-start/blob/main/packages/start/vite/plugin.js#L118
            'solid-start-file-system-router',
          ]);
        },
      },
    };
  },
);

export default solidLabelsPlugin;
