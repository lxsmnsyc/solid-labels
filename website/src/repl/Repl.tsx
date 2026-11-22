import type { JSX } from '@solidjs/web';
import { DEFAULT_EXAMPLE, REPL_EXAMPLES } from '../lib/examples';
import { escapeHtml, highlight } from '../lib/highlight';
import { decodeState, encodeState } from '../lib/share';
import { compileInWorker } from './compiler-client';
import type { Compiled, Problem } from './compilers';
import { createPreviewDocument } from './preview';
import type { PreviewMessage } from './preview';

type Tab = 'source' | 'labels' | 'solid' | 'preview';
type Output = 'labels' | 'solid';

const OUTPUTS: { id: Output; label: string }[] = [
  { id: 'labels', label: 'solid-labels' },
  { id: 'solid', label: 'Solid' },
];

const TABS: { id: Tab; label: string }[] = [
  { id: 'source', label: 'Source' },
  { id: 'labels', label: 'solid-labels' },
  { id: 'solid', label: 'Solid' },
  { id: 'preview', label: 'Preview' },
];

// Past this size the editor highlights in the worker, so typing stays fast.
const LARGE_INPUT = 20_000;
// A preview frame that sends no beat for this long is replaced.
const BEAT_TIMEOUT_MS = 3000;

function formatProblem(problem: Problem): string {
  const where =
    problem.line === undefined ? '' : `line ${problem.line}, column ${problem.column}: `;
  return `${where}${problem.message}`;
}

function isDark(): boolean {
  const theme = document.documentElement.dataset.theme;
  return theme === undefined
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : theme === 'dark';
}

export function Repl(): JSX.Element {
  const saved = decodeState(window.location.hash);
  let code = $signal<string>(saved?.code ?? DEFAULT_EXAMPLE);
  let dev = $signal<boolean>(saved?.dev ?? false);
  let copied = $signal<boolean>(false);
  // Phones show one panel at a time. Wide screens show the editor, one
  // output and the preview together.
  let tab = $signal<Tab>('source');
  let output = $signal<Output>('labels');
  // The code an example replaced, so loading one by mistake can be undone.
  let undo = $signal<string | undefined>();
  let dark = $signal<boolean>(isDark());

  // The last good result stays on screen while the code has an error.
  let result = $signal<Compiled | undefined>();
  let labelsHtml = $signal<string>('');
  let solidHtml = $signal<string>('');
  // Highlighted input from the worker, used for large input only.
  let workerInput = $signal<{ code: string; html: string } | undefined>();
  let problem = $signal<Problem | undefined>();
  let ready = $signal<boolean>(false);

  let previewError = $signal<string | undefined>();
  let previewStopped = $signal<boolean>(false);

  // Effects capture plain variables as values when they first run, and refs are
  // set after that. A const object keeps the refs readable at any time.
  const refs: {
    highlighted?: HTMLPreElement;
    slot?: HTMLDivElement;
    frame?: HTMLIFrameElement;
    document?: string;
    lastBeat: number;
  } = { lastBeat: Date.now() };

  function mountFrame(): void {
    if (refs.slot === undefined || refs.document === undefined) {
      return;
    }
    // A new frame each time drops timers and listeners the old code left running.
    refs.frame?.remove();
    const frame = document.createElement('iframe');
    frame.title = 'Preview';
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.srcdoc = refs.document;
    refs.slot.append(frame);
    refs.frame = frame;
    refs.lastBeat = Date.now();
    previewStopped = false;
    previewError = undefined;
  }

  function restartPreview(): void {
    mountFrame();
  }

  // Compile after a pause in typing, in the worker. The cleanup cancels a run
  // that the next key replaces.
  $effect(() => {
    const source = code;
    const isDev = dev;
    const timer = setTimeout(() => {
      compileInWorker(source, isDev, source.length >= LARGE_INPUT).then(
        (done) => {
          if (done === undefined) {
            return;
          }
          ready = true;
          if (done.inputHtml !== undefined) {
            workerInput = { code: source, html: done.inputHtml };
          }
          if (done.outcome.ok) {
            result = done.outcome.value;
            labelsHtml = done.labelsHtml;
            solidHtml = done.solidHtml;
            problem = undefined;
          } else {
            problem = done.outcome.problem;
          }
        },
        (error: unknown) => {
          ready = true;
          problem = {
            stage: 'solid-labels',
            message: error instanceof Error ? error.message : String(error),
          };
        },
      );
    }, 120);
    return () => {
      clearTimeout(timer);
    };
  });

  // Keep the editor state in the URL hash, so the address is the share link.
  $effect(() => {
    const hash = encodeState({ code, dev });
    const timer = setTimeout(() => {
      window.history.replaceState(null, '', `#${hash}`);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  });

  // Rebuild the preview when the runnable output changes.
  $effect(() => {
    const runnable = result?.runnable;
    if (runnable === undefined) {
      return undefined;
    }
    const timer = setTimeout(() => {
      refs.document = createPreviewDocument(runnable, isDark());
      mountFrame();
    }, 200);
    return () => {
      clearTimeout(timer);
    };
  });

  // Messages from the sandboxed frame: errors, readiness and heartbeats.
  $effect(() => {
    function onMessage(event: MessageEvent<PreviewMessage>): void {
      if (event.source !== refs.frame?.contentWindow || event.data.source !== 'repl-preview') {
        return;
      }
      if (event.data.type === 'beat') {
        refs.lastBeat = Date.now();
      } else {
        previewError = event.data.type === 'error' ? event.data.message : undefined;
      }
    }
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  });

  // The watchdog. Code such as `while (true) {}` blocks the frame, which then
  // sends no beats. The frame is removed, and the page offers a restart.
  $effect(() => {
    // A hidden tab throttles the frame's timers, so beats stop arriving
    // without the code being stuck. The watchdog waits while the tab is
    // hidden, and starts counting again when it shows.
    function onVisibility(): void {
      refs.lastBeat = Date.now();
    }
    document.addEventListener('visibilitychange', onVisibility);
    const timer = setInterval(() => {
      if (document.hidden) {
        return;
      }
      if (refs.frame !== undefined && Date.now() - refs.lastBeat > BEAT_TIMEOUT_MS) {
        refs.frame.remove();
        refs.frame = undefined;
        previewStopped = true;
      }
    }, 500);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });

  // The preview follows the site theme.
  $effect(() => {
    function sync(): void {
      dark = isDark();
      refs.frame?.contentWindow?.postMessage({ source: 'repl', dark: isDark() }, '*');
    }
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    query.addEventListener('change', sync);
    return () => {
      observer.disconnect();
      query.removeEventListener('change', sync);
    };
  });

  // Opening a shared link in the same tab replaces the code.
  $effect(() => {
    function onHashChange(): void {
      const next = decodeState(window.location.hash);
      if (next !== undefined) {
        code = next.code;
        dev = next.dev;
      }
    }
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  });

  function onInput(event: InputEvent & { currentTarget: HTMLTextAreaElement }): void {
    code = event.currentTarget.value;
    undo = undefined;
  }

  function loadExample(event: Event & { currentTarget: HTMLSelectElement }): void {
    const picked = REPL_EXAMPLES.find((example) => example.id === event.currentTarget.value);
    // The menu goes back to its label, so the same example can be picked again.
    event.currentTarget.value = '';
    if (picked === undefined || picked.code === code) {
      return;
    }
    undo = code;
    code = picked.code;
  }

  function undoExample(): void {
    if (undo !== undefined) {
      code = undo;
      undo = undefined;
    }
  }

  // Tab indents by two spaces. Escape then Tab moves focus on, as in other editors.
  let tabReleased = false;
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      tabReleased = true;
      return;
    }
    const released = tabReleased;
    tabReleased = false;
    if (event.key !== 'Tab' || event.shiftKey || released) {
      return;
    }
    event.preventDefault();
    const field = event.target;
    if (!(field instanceof HTMLTextAreaElement)) {
      return;
    }
    field.setRangeText('  ', field.selectionStart, field.selectionEnd, 'end');
    code = field.value;
  }

  function syncScroll(event: Event & { currentTarget: HTMLTextAreaElement }): void {
    if (refs.highlighted !== undefined) {
      refs.highlighted.scrollTop = event.currentTarget.scrollTop;
      refs.highlighted.scrollLeft = event.currentTarget.scrollLeft;
    }
  }

  function copyLink(): void {
    navigator.clipboard.writeText(window.location.href).then(
      () => {
        copied = true;
        setTimeout(() => {
          copied = false;
        }, 1600);
      },
      () => {
        copied = false;
      },
    );
  }

  // Arrow keys move between the tabs, as in a tab list.
  function readStep(event: KeyboardEvent): number | undefined {
    const steps: Record<string, number | undefined> = { ArrowRight: 1, ArrowLeft: -1 };
    return steps[event.key];
  }

  function onTabKeyDown(event: KeyboardEvent): void {
    const step = readStep(event);
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const at = TABS.findIndex((item) => item.id === tab);
    const next = TABS[(at + step + TABS.length) % TABS.length];
    tab = next.id;
    document.getElementById(`repl-tab-${next.id}`)?.focus();
  }

  function onOutputKeyDown(event: KeyboardEvent): void {
    const step = readStep(event);
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const at = OUTPUTS.findIndex((item) => item.id === output);
    const next = OUTPUTS[(at + step + OUTPUTS.length) % OUTPUTS.length];
    output = next.id;
    document.getElementById(`repl-output-${next.id}`)?.focus();
  }

  function getEditorHtml(): string {
    if (code.length < LARGE_INPUT) {
      return highlight(code);
    }
    return workerInput?.code === code ? workerInput.html : escapeHtml(code);
  }

  function getStatus(): 'loading' | 'error' | 'warning' | 'ready' {
    if (problem !== undefined) {
      return 'error';
    }
    if (!ready) {
      return 'loading';
    }
    return (result?.unknown.length ?? 0) > 0 ? 'warning' : 'ready';
  }
  const status = $memo(getStatus());
  const editorHtml = $memo(getEditorHtml());

  return (
    <div class="repl" data-tab={tab} data-output={output}>
      <div class="repl-bar">
        <span class="repl-status" data-state={status} role="status">
          <solid:switch>
            <solid:match when={status === 'loading'}>Loading compilers</solid:match>
            <solid:match when={status === 'error'}>Error in {problem?.stage}</solid:match>
            <solid:match when={status === 'warning'}>
              Compiled with a warning in {result?.ms.toFixed(1)} ms
            </solid:match>
            <solid:match when={status === 'ready'}>
              Compiled in {result?.ms.toFixed(1)} ms
            </solid:match>
          </solid:switch>
        </span>
        <solid:show when={undo !== undefined}>
          <button type="button" class="button quiet" onClick={undoExample}>
            Undo
          </button>
        </solid:show>
        <select class="repl-examples" aria-label="Load an example" onChange={loadExample}>
          <option value="" selected>
            Examples
          </option>
          <solid:for each={REPL_EXAMPLES}>
            {(example: (typeof REPL_EXAMPLES)[number]) => (
              <option value={example.id}>{example.label}</option>
            )}
          </solid:for>
        </select>
        <label class="switch">
          <input
            type="checkbox"
            checked={dev}
            onChange={(event) => {
              dev = event.currentTarget.checked;
            }}
          />
          dev
        </label>
        <button type="button" class="button" onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      </div>

      <Show when={result?.unknown}>
        {(names) => (
          <Show when={names().length > 0}>
            <p class="repl-note" role="status">
              {names().join(', ')} {names().length === 1 ? 'is' : 'are'} not{' '}
              {names().length === 1 ? 'a compile-time function' : 'compile-time functions'}. The
              call stays in the output as a plain call.
            </p>
          </Show>
        )}
      </Show>

      <div class="repl-tabs" role="tablist" aria-label="Panels" onKeyDown={onTabKeyDown}>
        <solid:for each={TABS}>
          {(item: { id: Tab; label: string }) => (
            <button
              type="button"
              role="tab"
              id={`repl-tab-${item.id}`}
              aria-selected={tab === item.id ? 'true' : 'false'}
              tabindex={tab === item.id ? 0 : -1}
              onClick={() => {
                tab = item.id;
              }}
            >
              {item.label}
            </button>
          )}
        </solid:for>
      </div>

      <div class="repl-editor" data-panel="source" style={{ '--err-line': problem?.line ?? 0 }}>
        <div
          class="err-bar"
          data-visible={problem?.line === undefined ? undefined : ''}
          aria-hidden="true"
        />
        <pre
          ref={(element: HTMLPreElement) => {
            refs.highlighted = element;
          }}
          aria-hidden="true"
        >
          <code innerHTML={`${editorHtml}\n`} />
        </pre>
        <textarea
          value={code}
          onInput={onInput}
          onKeyDown={onKeyDown}
          onScroll={syncScroll}
          spellcheck={false}
          autocapitalize="off"
          autocomplete="off"
          aria-label="Code"
          aria-describedby={problem === undefined ? undefined : 'repl-problem'}
        />
      </div>

      <div class="repl-side">
        <section class="panel panel-output">
          <div
            class="panel-tabs"
            role="tablist"
            aria-label="Compiled output"
            onKeyDown={onOutputKeyDown}
          >
            <solid:for each={OUTPUTS}>
              {(item: { id: Output; label: string }) => (
                <button
                  type="button"
                  role="tab"
                  id={`repl-output-${item.id}`}
                  aria-selected={output === item.id ? 'true' : 'false'}
                  tabindex={output === item.id ? 0 : -1}
                  onClick={() => {
                    output = item.id;
                  }}
                >
                  {item.label}
                </button>
              )}
            </solid:for>
          </div>
          <div class="panel-body" data-panel="labels" role="tabpanel" aria-label="solid-labels">
            <Show
              when={problem}
              fallback={
                <pre>
                  <code innerHTML={labelsHtml} />
                </pre>
              }
            >
              {(current) => (
                <p class="problem" id="repl-problem" role="alert">
                  {formatProblem(current())}
                </p>
              )}
            </Show>
          </div>
          <div class="panel-body" data-panel="solid" role="tabpanel" aria-label="Solid">
            <pre data-stale={problem === undefined ? undefined : ''}>
              <code innerHTML={solidHtml} />
            </pre>
          </div>
        </section>
        <section class="panel" data-panel="preview" aria-labelledby="repl-title-preview">
          <h2 class="panel-title" id="repl-title-preview">
            Preview
          </h2>
          <div
            class="frame-slot"
            data-dark={dark ? '' : undefined}
            ref={(element: HTMLDivElement) => {
              refs.slot = element;
            }}
          />
          <Show when={previewStopped}>
            <div class="problem preview-stopped" role="alert">
              <p>The preview stopped. Its code did not give control back.</p>
              <button type="button" class="button" onClick={restartPreview}>
                Restart preview
              </button>
            </div>
          </Show>
          <Show when={previewError}>{(message) => <p class="problem">{message()}</p>}</Show>
        </section>
      </div>
    </div>
  );
}
