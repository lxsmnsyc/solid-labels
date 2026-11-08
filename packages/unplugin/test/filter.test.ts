import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createIdFilter } from '../src/filter';

describe('createIdFilter', () => {
  const includes = createIdFilter();
  const route = resolve('src/routes/index.tsx');
  const dependency = resolve('node_modules/pkg/index.js');

  it('includes a source file', () => {
    expect(includes(route)).toBe(true);
  });

  it('includes a source file with a query, as SolidStart loads routes', () => {
    expect(includes(`${route}?pick=default&pick=$css`)).toBe(true);
    expect(includes(`${route}?tsr-split`)).toBe(true);
  });

  it('excludes node_modules with or without a query', () => {
    expect(includes(dependency)).toBe(false);
    expect(includes(`${dependency}?v=123`)).toBe(false);
  });

  it('applies custom patterns to the path without the query', () => {
    const custom = createIdFilter({ include: 'app/**/*.tsx' });
    expect(custom(`${resolve('app/page.tsx')}?pick=default`)).toBe(true);
    expect(custom(`${route}?pick=default`)).toBe(false);
  });
});
