// Server only. Turns the Markdown files in `website/content` into HTML while the
// site is prerendered. A fence tagged `ctf` is compiled with the real compiler,
// so the output beside each example cannot drift from what solid-labels emits.
import { compile } from 'solid-labels/compiler';
import { Marked } from 'marked';
import type { Tokens } from 'marked';
import {
  ACCESSOR_CTF,
  ARROW_CTF,
  AUTO_ALIAS,
  COMPONENTS,
  NAMESPACE_COMPONENTS,
} from '../../../packages/core/compiler/registry';
import { escapeHtml, highlight } from '../lib/highlight';

const sources: Record<string, string | undefined> = import.meta.glob<string>('../../content/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export interface Heading {
  depth: number;
  id: string;
  text: string;
}

export interface Document {
  title: string;
  html: string;
  headings: Heading[];
}

const COPY_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 2.5h7v9h-7zM3.5 5v8.5h7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function renderCode(code: string, extraClass = '', plain = false): string {
  const trimmed = code.replace(/\n$/, '');
  const body = plain ? escapeHtml(trimmed) : highlight(trimmed);
  return (
    `<div class="code ${extraClass}"><pre tabindex="0"><code>${body}</code></pre>` +
    `<button type="button" class="copy" data-copy aria-label="Copy code">${COPY_ICON}</button></div>`
  );
}

function compileSnippet(source: string, file: string, dev: boolean): string {
  const output = compile(file, source, { dev });
  if (output === null) {
    throw new Error(`The ctf example compiles to nothing:\n${source}`);
  }
  return output.code;
}

// Compile-time functions with their own transform, not listed in the registry.
const CORE_CTF = [
  '$signal',
  '$memo',
  '$',
  '$effect',
  '$destructure',
  '$component',
  '$getter',
  '$setter',
  '$property',
  '$refSignal',
  '$refMemo',
  '$derefSignal',
  '$derefMemo',
  '$get',
  '$set',
];

/**
 * Fails the build when the compiler knows a compile-time function, component
 * or `solid:` element that the reference pages never mention.
 */
function assertCoverage(): void {
  const reference = sources['../../content/ctf.md'] ?? '';
  const namespace = sources['../../content/namespace.md'] ?? '';
  const missing: string[] = [];

  const names = [
    ...CORE_CTF,
    ...Object.keys(AUTO_ALIAS),
    ...Object.keys(ARROW_CTF),
    ...Object.keys(ACCESSOR_CTF),
  ];
  for (const name of names) {
    // A name counts when it appears as a whole word, so `$` does not match `$signal`.
    const pattern = new RegExp(`(?<![\\w$])${name.replace(/\$/g, '\\$')}(?![\\w$])`);
    if (!pattern.test(reference)) {
      missing.push(name);
    }
  }
  for (const name of Object.keys(COMPONENTS)) {
    if (!new RegExp(`\\b${name}\\b`).test(reference)) {
      missing.push(name);
    }
  }
  for (const name of Object.keys(NAMESPACE_COMPONENTS)) {
    if (!namespace.includes(`<solid:${name}`)) {
      missing.push(`solid:${name}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`The docs do not cover: ${missing.join(', ')}`);
  }
}

let pairCount = 0;

// A source and its compiled output side by side. When the dev build differs,
// a radio switch picks the build. It works without scripts.
function renderPair(source: string, lang: string): string {
  pairCount += 1;
  const file = lang === 'jsx' ? 'example.jsx' : 'example.tsx';
  const prod = compileSnippet(source, file, false);
  const dev = compileSnippet(source, file, true);
  const differs = prod !== dev;
  const name = `build-${pairCount}`;

  let out = '';
  if (differs) {
    out +=
      `<div class="builds" role="radiogroup" aria-label="Build">` +
      `<input type="radio" name="${name}" id="${name}-prod" value="prod" checked>` +
      `<label for="${name}-prod">prod</label>` +
      `<input type="radio" name="${name}" id="${name}-dev" value="dev">` +
      `<label for="${name}-dev">dev</label></div>`;
  }
  out += renderCode(prod, 'out-prod');
  if (differs) {
    out += renderCode(dev, 'out-dev');
  }

  return (
    `<figure class="pair${differs ? ' has-builds' : ''}">` +
    `<div class="pair-src" role="group" aria-label="Source">${renderCode(source)}</div>` +
    `<div class="pair-out" role="group" aria-label="Compiled output">${out}</div>` +
    `</figure>`
  );
}

function createMarked(headings: Heading[]): Marked {
  return new Marked({
    gfm: true,
    renderer: {
      heading(token: Tokens.Heading): string {
        const text = token.text.replace(/[`*_]/g, '');
        const id = slugify(text);
        if (token.depth === 2 || token.depth === 3) {
          headings.push({ depth: token.depth, id, text });
        }
        const inner = this.parser.parseInline(token.tokens);
        const anchor =
          token.depth === 1
            ? ''
            : `<a class="anchor" href="#${id}" aria-label="Link to this section">#</a>`;
        return `<h${token.depth} id="${id}">${anchor}${inner}</h${token.depth}>\n`;
      },
      code(token: Tokens.Code): string {
        const [kind, lang = 'tsx'] = (token.lang ?? '').split(/\s+/);
        if (kind === 'ctf') {
          return renderPair(token.text, lang);
        }
        if (kind === 'sh' || kind === 'bash') {
          return renderCode(token.text, 'shell', true);
        }
        return renderCode(token.text);
      },
      codespan(token: Tokens.Codespan): string {
        return `<code>${highlight(token.text)}</code>`;
      },
      link(token: Tokens.Link): string {
        const inner = this.parser.parseInline(token.tokens);
        const external = /^https?:/.test(token.href);
        const attrs = external ? ' rel="noreferrer"' : '';
        return `<a href="${escapeHtml(token.href)}"${attrs}>${inner}</a>`;
      },
    },
  });
}

/** Renders `website/content/<name>.md`. */
export function renderDocument(name: string): Document {
  const source = sources[`../../content/${name}.md`];
  if (source === undefined) {
    throw new Error(`Missing content file: ${name}.md`);
  }

  assertCoverage();

  const headings: Heading[] = [];
  const marked = createMarked(headings);
  const html = marked.parse(source, { async: false });

  // The first `# Heading` is the page title and is not part of the table of contents.
  const titleMatch = /^#\s+(.+)$/m.exec(source);
  return { title: titleMatch?.[1].replace(/`/g, '') ?? name, html, headings };
}
