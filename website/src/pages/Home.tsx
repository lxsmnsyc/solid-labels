import type { JSX } from '@solidjs/web';
import { compile } from 'solid-labels/compiler';
import site from '../../package.json';
import { COPY_ICON, renderInstall } from '../content/render';
import { COMPARE_HAND, COMPARE_LABELS, DEFAULT_EXAMPLE, DEMOS } from '../lib/examples';
import type { Demo } from '../lib/examples';
import { highlight } from '../lib/highlight';
import { encodeState } from '../lib/share';
import { DOCS_HOME } from '../site';

const INSTALL_ARGS = '-D solid-labels unplugin-solid-labels';
const SOLID_VERSION = site.dependencies['solid-js'];

interface CompiledDemo extends Demo {
  output: string;
  replHref: string;
}

function compileDemo(demo: Demo): CompiledDemo {
  const output = compile(`${demo.id}.tsx`, demo.source);
  if (output === null) {
    throw new Error(`The ${demo.id} demo compiles to nothing.`);
  }
  return {
    ...demo,
    output: output.code,
    replHref: `/repl#${encodeState({ code: demo.source, dev: false })}`,
  };
}

/** Counts what a reader has to type: characters other than whitespace, and lines with code. */
function measure(source: string): { chars: number; lines: number } {
  let lines = 0;
  for (const line of source.split('\n')) {
    if (line.trim() !== '') {
      lines += 1;
    }
  }
  return { chars: source.replace(/\s/g, '').length, lines };
}

function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

function CodeBlock(props: { code: string; class?: string }): JSX.Element {
  return (
    <div class={props.class === undefined ? 'code' : `code ${props.class}`}>
      <pre tabindex="0">
        <code innerHTML={highlight(props.code)} />
      </pre>
      <button type="button" class="copy" data-copy aria-label="Copy code" innerHTML={COPY_ICON} />
    </div>
  );
}

function Install(): JSX.Element {
  // `display: contents` on the wrapper, so the group lays out as a flex child.
  return <div class="install-slot" innerHTML={renderInstall(INSTALL_ARGS)} />;
}

function ArrowIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" class="button-icon">
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

function ChevronIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" class="faq-icon">
      <path
        d="m6 9 6 6 6-6"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

function DemoPanel(props: { demo: CompiledDemo }): JSX.Element {
  return (
    <div class="demo-panel">
      <figure class="pair">
        <div class="pane pane-src" role="group" aria-label="Source">
          <div class="pane-head">
            <span class="pane-label">You write</span>
          </div>
          <CodeBlock code={props.demo.source} />
        </div>
        <div class="pane pane-out" role="group" aria-label="Compiled output">
          <div class="pane-head">
            <span class="pane-label">Solid gets</span>
            <a class="quiet-link" href={props.demo.replHref}>
              Edit in the REPL
            </a>
          </div>
          <CodeBlock code={props.demo.output} class="demo-out" />
        </div>
      </figure>
    </div>
  );
}

const FAQ: { question: string; answer: string }[] = [
  {
    question: 'Does solid-labels add code to my bundle?',
    answer:
      'No. The package has no runtime. The compiler runs inside your bundler, and the output imports only from <code>solid-js</code> and <code>@solidjs/web</code>.',
  },
  {
    question: 'Which Solid version does it support?',
    answer: `Solid 2.0 (tested with <code>solid-js@${SOLID_VERSION}</code>). For Solid 1.x, install <code>solid-labels@0.17</code>.`,
  },
  {
    question: 'Which bundlers work?',
    answer:
      'Vite, Rollup and Bun through <code>unplugin-solid-labels</code>. Anything else can call <code>compile()</code> from <code>solid-labels/compiler</code>.',
  },
  {
    question: 'Does TypeScript understand $signal?',
    answer:
      'Yes. One <code>/// &lt;reference types="solid-labels" /&gt;</code> line declares every compile-time function globally, with full types.',
  },
  {
    question: 'Can I debug the code I wrote?',
    answer:
      'The compiler edits only the spans it rewrites, so the rest of your file keeps its formatting. Source maps cover every character.',
  },
  {
    question: 'Do I have to convert a whole project?',
    answer:
      'No. Files without compile-time functions pass through unchanged, so you can start with one component.',
  },
  {
    question: 'What does it cost?',
    answer: 'Nothing. solid-labels is MIT licensed.',
  },
];

export default function Home(): JSX.Element {
  const demos: CompiledDemo[] = [];
  for (const demo of DEMOS) {
    demos.push(compileDemo(demo));
  }
  const labels = measure(COMPARE_LABELS);
  const hand = measure(COMPARE_HAND);
  const saved = Math.round((1 - labels.chars / hand.chars) * 100);
  const replHref = `/repl#${encodeState({ code: DEFAULT_EXAMPLE, dev: false })}`;

  return (
    <>
      <section class="hero">
        <div class="hero-copy">
          <h1>
            Write Solid signals as <em>plain variables</em>.
          </h1>
          <p class="lead">
            solid-labels is a compiler for Solid 2.0. You read and assign <code>$signal</code>{' '}
            variables like any other. Your bundler receives the accessor and setter calls you would
            have typed by hand.
          </p>
          <div class="hero-actions">
            <a class="button primary" href={DOCS_HOME}>
              Get started
              <ArrowIcon />
            </a>
            <Install />
          </div>
        </div>

        <div class="demo">
          <div class="demo-tabs" role="radiogroup" aria-label="Example">
            <solid:for each={demos}>
              {(demo: CompiledDemo, index: () => number) => (
                <>
                  <input
                    type="radio"
                    name="demo"
                    id={`demo-${demo.id}`}
                    value={demo.id}
                    checked={index() === 0}
                  />
                  <label for={`demo-${demo.id}`}>{demo.label}</label>
                </>
              )}
            </solid:for>
          </div>
          <div class="demo-panels">
            <solid:for each={demos}>{(demo: CompiledDemo) => <DemoPanel demo={demo} />}</solid:for>
          </div>
        </div>
      </section>

      <section class="benefits">
        <article class="benefit">
          <h2>Type {saved}% less for the same component</h2>
          <p class="benefit-proof">
            The counter below takes {formatCount(labels.chars)} characters with solid-labels and{' '}
            {formatCount(hand.chars)} by hand, not counting whitespace.
          </p>
          <p>
            Reads drop the <code>()</code>. Writes use <code>=</code>, <code>+=</code> and{' '}
            <code>++</code>. The compiler adds the imports.
          </p>
        </article>
        <article class="benefit">
          <h2>Effects list their own dependencies</h2>
          <p class="benefit-proof">
            Solid 2.0 splits an effect into a tracked step and a callback. <code>$effect</code>{' '}
            writes both from one function.
          </p>
          <p>
            The compiler finds every signal the callback reads and passes the values to it, as the
            Effects example above shows.
          </p>
        </article>
        <article class="benefit">
          <h2>Destructure props and keep them reactive</h2>
          <p class="benefit-proof">
            <code>$component</code> turns <code>{'({ name, excited = false })'}</code> into live
            reads of <code>props</code>, defaults included.
          </p>
          <p>Write components with the parameter style the rest of JavaScript uses.</p>
        </article>
        <article class="benefit">
          <h2>Ship exactly what Solid ships</h2>
          <p class="benefit-proof">
            The package has no runtime. Every compile-time function is gone before your code reaches
            the browser.
          </p>
          <p>
            The output is plain Solid, so Solid's own docs, devtools and error messages apply to it.
          </p>
        </article>
      </section>

      <section class="compare">
        <h2>The same counter, both ways</h2>
        <div class="compare-grid">
          <div class="pane">
            <div class="pane-head">
              <span class="pane-label compare-label-labels">With solid-labels</span>
              <span class="compare-count">
                {labels.lines} lines, {formatCount(labels.chars)} characters
              </span>
            </div>
            <CodeBlock code={COMPARE_LABELS} />
          </div>
          <div class="pane">
            <div class="pane-head">
              <span class="pane-label compare-label-hand">By hand</span>
              <span class="compare-count">
                {hand.lines} lines, {formatCount(hand.chars)} characters
              </span>
            </div>
            <CodeBlock code={COMPARE_HAND} />
          </div>
        </div>

        <div class="table-scroll">
          <table class="compare-table">
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col">solid-labels</th>
                <th scope="col">Solid by hand</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Read a signal</th>
                <td>
                  <code>count</code>
                </td>
                <td>
                  <code>count()</code>
                </td>
              </tr>
              <tr>
                <th scope="row">Write a signal</th>
                <td>
                  <code>count += 1</code>
                </td>
                <td>
                  <code>{'setCount((c) => c + 1)'}</code>
                </td>
              </tr>
              <tr>
                <th scope="row">Effect dependencies</th>
                <td>Found by the compiler</td>
                <td>Listed in a separate function</td>
              </tr>
              <tr>
                <th scope="row">Imports</th>
                <td>Added by the compiler</td>
                <td>Written by you</td>
              </tr>
              <tr>
                <th scope="row">Runtime size</th>
                <td>Same as Solid</td>
                <td>Same as Solid</td>
              </tr>
              <tr>
                <th scope="row">Build step</th>
                <td>Needs a bundler plugin</td>
                <td>Works with Solid's plugin alone</td>
              </tr>
              <tr>
                <th scope="row">Reactive reads in the source</th>
                <td>Look like plain reads</td>
                <td>Visible as calls</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="compare-note">
          Compared on <code>solid-js@{SOLID_VERSION}</code>. Characters exclude whitespace.
        </p>
      </section>

      <section class="faq">
        <h2>Questions</h2>
        <div class="faq-list">
          <solid:for each={FAQ}>
            {(item: (typeof FAQ)[number]) => (
              <details>
                <summary>
                  {item.question}
                  <ChevronIcon />
                </summary>
                <p innerHTML={item.answer} />
              </details>
            )}
          </solid:for>
        </div>
      </section>

      <section class="closing">
        <h2>Three steps to your first signal</h2>
        <p class="closing-lead">
          Install the packages, add the plugin to your bundler, and declare a <code>$signal</code>.
        </p>
        <div class="hero-actions">
          <a class="button primary" href={DOCS_HOME}>
            Get started
            <ArrowIcon />
          </a>
          <Install />
        </div>
        <p class="closing-links">
          <a class="quiet-link" href={replHref}>
            Try it in the REPL
          </a>
          <a class="quiet-link" href="/docs/ctf">
            Read the reference
          </a>
        </p>
      </section>
    </>
  );
}
