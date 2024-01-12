import type { SolidLabelsPluginOptions } from 'unplugin-solid-labels';
import solidLabelsUnplugin from 'unplugin-solid-labels';
import type { Plugin } from 'rollup';

export type {
  SolidLabelsPluginFilter,
  SolidLabelsPluginOptions,
} from 'unplugin-solid-labels';

const solidLabelsPlugin = solidLabelsUnplugin.rollup as (
  options: SolidLabelsPluginOptions,
) => Plugin;

export default solidLabelsPlugin;
