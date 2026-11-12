import type { JSX } from '@solidjs/web';
import { compile } from 'solid-labels/compiler';
import { renderDocument } from '../content/render';
import { DEFAULT_EXAMPLE, HERO_EXAMPLE } from '../lib/examples';
import { highlight } from '../lib/highlight';
import { encodeState } from '../lib/share';

const FEATURES = [
  {
    title: 'Plain syntax',
    body: 'Reactive variables read and write like any other variable. There are no accessor calls to remember.',
  },
  {
    title: 'Gone at build time',
    body: 'Nothing from solid-labels ships to the browser. The output is the Solid code you would have written by hand.',
  },
  {
    title: 'No imports',
    body: 'The Solid APIs that the output needs are imported for you, and the compile-time functions are typed globally.',
  },
  {
    title: 'Oxc parser',
    body: 'Parsing runs at native speed. Your formatting survives, and source maps map every character.',
  },
];

function compileHero(): { source: string; output: string } {
  const output = compile('hero.tsx', HERO_EXAMPLE);
  if (output === null) {
    throw new Error('The hero example compiles to nothing.');
  }

  // The compiler adds import lines. The beam shows the lines that match the
  // source row by row, so the imports are left out here.
  const lines: string[] = [];
  for (const line of output.code.split('\n')) {
    if (!line.startsWith('import ')) {
      lines.push(line);
    }
  }
  if (lines.length !== HERO_EXAMPLE.split('\n').length) {
    throw new Error('The hero example needs the same line count before and after compiling.');
  }
  return { source: HERO_EXAMPLE, output: lines.join('\n') };
}

export default function Home(): JSX.Element {
  const hero = compileHero();
  const doc = renderDocument('home');
  const replHref = `/repl#${encodeState({ code: DEFAULT_EXAMPLE, dev: false })}`;

  return (
    <>
      <section class="hero">
        <div class="hero-glyph" aria-hidden="true">
          $
        </div>
        <p class="eyebrow">Compile-time functions for Solid 2.0</p>
        <h1>
          Plain code in.
          <br />
          <span class="h1-accent">Solid</span> out.
        </h1>
        <p class="lead">
          solid-labels adds compile-time functions to Solid. Write <code>$signal</code>,{' '}
          <code>$memo</code> and <code>$effect</code> as ordinary variables and calls. The compiler
          replaces them with Solid primitives before your bundler runs.
        </p>
        <p class="actions">
          <a class="button primary" href="/docs/getting-started">
            Get started
          </a>
          <a class="button" href={replHref}>
            Open the REPL
          </a>
        </p>

        <div class="beam" data-beam>
          <div
            class="beam-stage"
            role="slider"
            tabindex="0"
            aria-label="Compile progress"
            aria-orientation="vertical"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="50"
            aria-valuetext="Showing the source and the compiled output"
          >
            <div class="beam-code">
              <pre class="beam-layer beam-src">
                <code innerHTML={highlight(hero.source)} />
              </pre>
              <pre class="beam-layer beam-out" aria-hidden="true">
                <code innerHTML={highlight(hero.output)} />
              </pre>
              <div class="beam-line" aria-hidden="true" />
            </div>
          </div>
          <button type="button" class="beam-toggle" data-beam-toggle aria-label="Pause animation">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="icon-pause">
              <path
                d="M8 5v14M16 5v14"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
              />
            </svg>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="icon-play">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </button>
          <p class="sr-only">Compiled output: {hero.output}</p>
        </div>
      </section>

      <section class="features">
        <solid:for each={FEATURES}>
          {(feature: (typeof FEATURES)[number]) => (
            <div class="feature">
              <h2>{feature.title}</h2>
              <p>{feature.body}</p>
            </div>
          )}
        </solid:for>
      </section>

      <section class="showcase">
        <div class="prose" innerHTML={doc.html} />
      </section>

      <section class="closing">
        <h2>Try your own code</h2>
        <p class="actions">
          <a class="button primary" href={replHref}>
            Open the REPL
          </a>
          <a class="button" href="/docs/ctf">
            Read the reference
          </a>
        </p>
      </section>
    </>
  );
}
