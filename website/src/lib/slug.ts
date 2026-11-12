function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  // A heading such as `$` has no letters. It still needs an anchor.
  return slug === '' ? 'dollar' : slug;
}

/**
 * Returns a function that turns heading text into a unique anchor id. The
 * renderer and the search index each make one, and read the headings in the
 * same order, so both produce the same ids.
 */
export function createSlugger(): (text: string) => string {
  const used = new Map<string, number>();
  return (text) => {
    const base = slugify(text);
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

/** Removes Markdown emphasis and code marks from heading text. */
export function plainHeading(text: string): string {
  return text.replace(/[`*_]/g, '');
}
