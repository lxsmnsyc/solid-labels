import type { FilterPattern } from '@rollup/pluginutils';
import { createFilter } from '@rollup/pluginutils';

export interface SolidLabelsPluginFilter {
  include?: FilterPattern;
  exclude?: FilterPattern;
}

const DEFAULT_INCLUDE = 'src/**/*.{jsx,tsx,ts,js,mjs,cjs}';
const DEFAULT_EXCLUDE = 'node_modules/**/*.{jsx,tsx,ts,js,mjs,cjs}';

function removeQuery(id: string): string {
  const index = id.indexOf('?');
  return index === -1 ? id : id.slice(0, index);
}

export function createIdFilter(options?: SolidLabelsPluginFilter): (id: string) => boolean {
  const filter = createFilter(
    options?.include ?? DEFAULT_INCLUDE,
    options?.exclude ?? DEFAULT_EXCLUDE,
  );
  return (id) =>
    // Bundlers can add a query to a module id, as SolidStart does with
    // `?pick=` for route files. Match the file path without it.
    filter(removeQuery(id));
}
