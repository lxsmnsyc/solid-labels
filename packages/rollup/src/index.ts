import type { SolidLabelsPluginOptions } from 'unplugin-solid-labels';
import solidLabelsUnplugin from 'unplugin-solid-labels';
import type { Plugin } from 'rollup';

export type { SolidLabelsPluginFilter, SolidLabelsPluginOptions } from 'unplugin-solid-labels';

const solidLabelsPlugin: (options: SolidLabelsPluginOptions) => Plugin | Plugin[] =
  solidLabelsUnplugin.rollup;

export default solidLabelsPlugin;
