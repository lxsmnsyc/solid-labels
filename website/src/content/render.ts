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
import { ADD_COMMANDS, PACKAGE_MANAGERS, parseNpmInstall } from '../lib/package-manager';
import { createSlugger, plainHeading } from '../lib/slug';

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

// Two icons in one button. The check shows for a moment after a copy.
export const COPY_ICON =
  '<svg class="icon-copy" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 2.5h7v9h-7zM3.5 5v8.5h7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>' +
  '<svg class="icon-done" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function renderCode(code: string, extraClass = '', plain = false): string {
  const trimmed = code.replace(/\n$/, '');
  const body = plain ? escapeHtml(trimmed) : highlight(trimmed);
  return (
    `<div class="code ${extraClass}"><pre tabindex="0"><code>${body}</code></pre>` +
    `<button type="button" class="copy" data-copy aria-label="Copy code">${COPY_ICON}</button></div>`
  );
}

/**
 * An install command with a package manager picker above it. One command per
 * manager is rendered, and the stylesheet shows the chosen one. Prerendered
 * buttons mark npm. The boot script and the client fix that before paint.
 */
export function renderInstall(args: string): string {
  let picker = '<div class="pm-picker" role="group" aria-label="Package manager">';
  let commands = '';
  for (const manager of PACKAGE_MANAGERS) {
    const command = escapeHtml(`${ADD_COMMANDS[manager]} ${args}`);
    picker +=
      `<button type="button" class="pm-option" data-pm-option="${manager}" ` +
      `aria-pressed="${manager === 'npm'}">${manager}</button>`;
    commands +=
      `<div class="code install" data-pm-command="${manager}"><pre tabindex="0"><code>` +
      `<span class="install-prompt" aria-hidden="true">$ </span>${command}</code></pre>` +
      `<button type="button" class="copy" data-copy data-copy-text="${command}" ` +
      `aria-label="Copy install command">${COPY_ICON}</button></div>`;
  }
  return `<div class="install-group">${picker}</div>${commands}</div>`;
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

const CTF_FENCE = /^```ctf [a-z]+\n([\s\S]*?)^```/gm;

/** The source of every compiled example in a Markdown file. */
function readExamples(markdown: string): string {
  let examples = '';
  for (const match of markdown.matchAll(CTF_FENCE)) {
    examples += `${match[1]}\n`;
  }
  return examples;
}

let coverageChecked = false;

/**
 * Fails the build when the compiler knows a compile-time function, component
 * or `solid:` element that has no compiled example. A mention in prose does
 * not count, only a `ctf` fence does.
 */
function assertCoverage(): void {
  if (coverageChecked) {
    return;
  }
  coverageChecked = true;

  const reference = readExamples(sources['../../content/ctf.md'] ?? '');
  const namespace = readExamples(sources['../../content/namespace.md'] ?? '');
  const missing: string[] = [];

  const names = [
    ...CORE_CTF,
    ...Object.keys(AUTO_ALIAS),
    ...Object.keys(ARROW_CTF),
    ...Object.keys(ACCESSOR_CTF),
  ];
  for (const name of names) {
    // A name counts when it is a whole identifier, so `$` does not match `$signal`.
    const pattern = new RegExp(`(?<![\\w$])${name.replace(/\$/g, '\\$')}(?![\\w$])`);
    if (!pattern.test(reference)) {
      missing.push(name);
    }
  }
  // A component counts as a JSX tag or as a call or reference in code.
  for (const name of Object.keys(COMPONENTS)) {
    if (!new RegExp(`<${name}[\\s/>]`).test(reference)) {
      missing.push(name);
    }
  }
  for (const name of Object.keys(NAMESPACE_COMPONENTS)) {
    if (!namespace.includes(`<solid:${name}`)) {
      missing.push(`solid:${name}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`The docs have no compiled example for: ${missing.join(', ')}`);
  }
}

let pairCount = 0;

const RESET_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8a5 5 0 1 0 1.5-3.5M3 2.5v2.5h2.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const EDIT_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5l3 3-8 8H2.5v-3z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

/**
 * The source of a pair, editable in place. A transparent textarea lies over
 * the highlighted code, and `src/islands/live.ts` recompiles the output beside
 * it as you type. Without scripts the textarea is hidden.
 */
function renderLiveSource(source: string): string {
  const trimmed = source.replace(/\n$/, '');
  return (
    `<div class="code live"><pre><code>${highlight(trimmed)}\n</code></pre>` +
    `<textarea data-live-input spellcheck="false" autocapitalize="off" autocomplete="off" ` +
    `aria-label="Example source, editable">${escapeHtml(trimmed)}</textarea>` +
    `<button type="button" class="copy" data-copy aria-label="Copy code">${COPY_ICON}</button></div>`
  );
}

/**
 * A source and its compiled output side by side. When the dev build differs,
 * a radio switch picks the build. The switch works without scripts, and the
 * source is editable when scripts run.
 */
export function renderPair(source: string, lang: string): string {
  pairCount += 1;
  const file = lang === 'jsx' ? 'example.jsx' : 'example.tsx';
  const prod = compileSnippet(source, file, false);
  const dev = compileSnippet(source, file, true);
  const differs = prod !== dev;
  const name = `build-${pairCount}`;

  let head = '<span class="pane-label">Solid gets</span>';
  if (differs) {
    head +=
      `<span class="builds" role="radiogroup" aria-label="Build">` +
      `<input type="radio" name="${name}" id="${name}-prod" value="prod" checked>` +
      `<label for="${name}-prod">prod</label>` +
      `<input type="radio" name="${name}" id="${name}-dev" value="dev">` +
      `<label for="${name}-dev">dev</label></span>`;
  }
  let out = renderCode(prod, 'out-prod');
  if (differs) {
    out += renderCode(dev, 'out-dev');
  }
  out += '<p class="live-problem" role="alert" hidden></p>';

  // Both panes have a head row of the same height, so the code blocks line up.
  return (
    `<figure class="pair" data-live="${file}">` +
    `<div class="pane pane-src" role="group" aria-label="Source">` +
    `<div class="pane-head"><span class="pane-label">You write</span>` +
    `<span class="live-hint">${EDIT_ICON}Editable</span>` +
    `<button type="button" class="pane-action" data-live-reset hidden>${RESET_ICON}Reset</button>` +
    `</div>${renderLiveSource(source)}</div>` +
    `<div class="pane pane-out" role="group" aria-label="Compiled output">` +
    `<div class="pane-head">${head}</div>${out}</div>` +
    `</figure>`
  );
}

function createMarked(headings: Heading[]): Marked {
  const slug = createSlugger();
  return new Marked({
    gfm: true,
    renderer: {
      heading(token: Tokens.Heading): string {
        const text = plainHeading(token.text);
        const id = slug(text);
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
          const args = parseNpmInstall(token.text);
          if (args !== undefined) {
            return renderInstall(args);
          }
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

const rendered = new Map<string, Document>();

/** Renders `website/content/<name>.md`. The result is cached for the build. */
export function renderDocument(name: string): Document {
  const cached = rendered.get(name);
  if (cached !== undefined) {
    return cached;
  }

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
  const document = { title: titleMatch?.[1].replace(/`/g, '') ?? name, html, headings };
  rendered.set(name, document);
  return document;
}
