import type { SolidLabelsPluginOptions } from 'unplugin-solid-labels';
import solidLabelsUnplugin from 'unplugin-solid-labels';
import type { Plugin } from 'vite';

export type { SolidLabelsPluginFilter, SolidLabelsPluginOptions } from 'unplugin-solid-labels';

const solidLabelsPlugin: (options: SolidLabelsPluginOptions) => Plugin | Plugin[] =
  solidLabelsUnplugin.vite;

export default solidLabelsPlugin;
