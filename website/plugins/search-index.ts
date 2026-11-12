import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Lexer } from 'marked';
import type { Token, Tokens } from 'marked';
import type { Plugin } from 'vite';
import routes from '../src/routes.json' with { type: 'json' };
import { createSlugger, plainHeading } from '../src/lib/slug.ts';

const VIRTUAL_ID = 'virtual:search-index';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export interface SearchEntry {
  id: string;
  href: string;
  page: string;
  heading: string;
  text: string;
}

/** Text without Markdown marks, as a reader sees it. */
function toPlain(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// The text a token adds to its section. Code counts too, so a search for
// `$signal(0)` finds the examples.
function readTokenText(token: Token): string {
  switch (token.type) {
    case 'paragraph':
    case 'text':
    case 'blockquote':
      return toPlain(token.text);
    case 'code':
      return token.text.replace(/\s+/g, ' ').trim();
    case 'list': {
      let text = '';
      for (const item of (token as Tokens.List).items) {
        text += ` ${toPlain(item.text)}`;
      }
      return text;
    }
    case 'table': {
      let text = '';
      for (const row of (token as Tokens.Table).rows) {
        for (const cell of row) {
          text += ` ${toPlain(cell.text)}`;
        }
      }
      return text;
    }
    default:
      return '';
  }
}

/** One entry for the page, and one for each `##` and `###` section. */
function createEntries(markdown: string, path: string, description: string): SearchEntry[] {
  const slug = createSlugger();
  const entries: SearchEntry[] = [];
  let current: SearchEntry | undefined;
  let title = path;

  for (const token of new Lexer({ gfm: true }).lex(markdown)) {
    if (token.type === 'heading') {
      const heading = token as Tokens.Heading;
      const text = plainHeading(heading.text);
      const id = slug(text);
      if (heading.depth === 1) {
        title = text;
        current = { id: path, href: path, page: title, heading: title, text: description };
        entries.push(current);
      } else if (heading.depth <= 3) {
        current = {
          id: `${path}#${id}`,
          href: `${path}#${id}`,
          page: title,
          heading: text,
          text: '',
        };
        entries.push(current);
      }
    } else if (current !== undefined) {
      current.text += ` ${readTokenText(token)}`;
    }
  }

  for (const entry of entries) {
    entry.text = entry.text.trim();
  }
  return entries;
}

/** Serves `virtual:search-index`, built from `website/content/*.md` and `routes.json`. */
export function searchIndex(): Plugin {
  let root = process.cwd();

  async function build(): Promise<SearchEntry[]> {
    const entries: SearchEntry[] = [];
    for (const route of routes) {
      if ('doc' in route && typeof route.doc === 'string') {
        const markdown = await readFile(join(root, 'content', `${route.doc}.md`), 'utf8');
        entries.push(...createEntries(markdown, route.path, route.description));
      }
    }
    return entries;
  }

  return {
    name: 'search-index',
    configResolved(config): void {
      root = config.root;
    },
    resolveId(id): string | null {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    async load(id): Promise<string | null> {
      if (id !== RESOLVED_ID) {
        return null;
      }
      return `export default ${JSON.stringify(await build())};`;
    },
  };
}
