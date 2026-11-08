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

export interface SolidLabelsBunOptions {
  /**
   * Runs on the solid-labels output inside the same Bun load, with the
   * result passed on as the file contents. Bun uses the first `onLoad`
   * that returns contents, so a separate Solid JSX plugin never receives
   * the solid-labels output. Compile the JSX here instead.
   */
  transform?: (code: string, id: string) => TransformResult | Promise<TransformResult>;
}

export interface SolidLabelsPluginOptions extends Options {
  filter?: SolidLabelsPluginFilter;
  /** Only read by `solidLabels.bun()`. */
  bun?: SolidLabelsBunOptions;
}

// From: https://github.com/bluwy/whyframe/blob/master/packages/jsx/src/index.js#L27-L37
function repushPlugin(plugins: Plugin[], pluginName: string, pluginNames: string[]): void {
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
  if (targetPlugin && baseIndex !== -1 && targetIndex !== -1 && baseIndex < targetIndex) {
    plugins.splice(targetIndex, 1);
    plugins.splice(baseIndex, 0, targetPlugin);
  }
}

const DEFAULT_INCLUDE = 'src/**/*.{jsx,tsx,ts,js,mjs,cjs}';
const DEFAULT_EXCLUDE = 'node_modules/**/*.{jsx,tsx,ts,js,mjs,cjs}';

const solidLabelsPlugin = createUnplugin(
  (rawOptions: SolidLabelsPluginOptions | undefined, meta) => {
    const options = rawOptions ?? {};
    const handoff = meta.framework === 'bun' ? options.bun?.transform : undefined;
    const filter = createFilter(
      options.filter?.include ?? DEFAULT_INCLUDE,
      options.filter?.exclude ?? DEFAULT_EXCLUDE,
    );

    let env: string;

    return {
      name: 'solid-labels',
      transformInclude(id): boolean {
        return filter(id);
      },
      async transform(code, id): Promise<TransformResult> {
        // Compile the solid-labels syntax first.
        const result = compile(id, code, {
          disabled: options.disabled,
          dev: env === 'development' || options.dev,
        });

        // Without a hand-off, nothing to compile keeps the original code and map.
        if (!handoff) {
          if (result === null) {
            return null;
          }
          return { code: result.code, map: result.map };
        }

        // Hand the output to the Solid JSX compiler within the same Bun load.
        const labelsCode = result === null ? code : result.code;
        const next = await handoff(labelsCode, id);
        if (next === null || next === undefined) {
          return result === null ? null : { code: result.code, map: result.map };
        }
        if (typeof next === 'string') {
          return next;
        }

        // The second map points at the solid-labels output, so it replaces the
        // first map only when the first step changed nothing.
        return { code: next.code, map: result === null ? next.map : undefined };
      },
      vite: {
        enforce: 'pre',
        configResolved(config): void {
          env = config.mode === 'production' ? 'production' : 'development';

          // run our plugin before the following plugins:
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
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
