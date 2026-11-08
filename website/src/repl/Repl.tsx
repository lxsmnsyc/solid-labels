import type { JSX } from '@solidjs/web';
import { DEFAULT_EXAMPLE } from '../lib/examples';
import { highlight } from '../lib/highlight';
import { decodeState, encodeState } from '../lib/share';
import { run } from './compilers';
import type { Compiled, Problem } from './compilers';
import { createPreviewDocument } from './preview';
import type { PreviewMessage } from './preview';

function formatProblem(problem: Problem): string {
  const where =
    problem.line === undefined ? '' : `line ${problem.line}, column ${problem.column}: `;
  return `${where}${problem.message}`;
}

function Output(props: { code: string; stale: boolean }): JSX.Element {
  return (
    <pre data-stale={props.stale ? '' : undefined}>
      <code innerHTML={highlight(props.code)} />
    </pre>
  );
}

export function Repl(): JSX.Element {
  const saved = decodeState(window.location.hash);
  let code = $signal(saved?.code ?? DEFAULT_EXAMPLE);
  let dev = $signal<boolean>(saved?.dev ?? false);
  let copied = $signal<boolean>(false);

  // The last good result stays on screen while the code has an error.
  let result = $signal<Compiled | undefined>();
  let problem = $signal<Problem | undefined>();
  let previewError = $signal<string | undefined>();
  let ready = $signal<boolean>(false);

  // Effects capture plain variables as values when they first run, and refs are
  // set after that. A const object keeps the refs readable at any time.
  const refs: {
    textarea?: HTMLTextAreaElement;
    highlighted?: HTMLPreElement;
    frame?: HTMLIFrameElement;
  } = {};

  // Compile after a pause in typing. The cleanup cancels a run the next key replaces.
  $effect(() => {
    const source = code;
    const isDev = dev;
    const timer = setTimeout(() => {
      const outcome = run(source, isDev);
      ready = true;
      if (outcome.ok) {
        result = outcome.value;
        problem = undefined;
      } else {
        problem = outcome.problem;
      }
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
    const output = result?.runnable;
    if (output === undefined) {
      return undefined;
    }
    const timer = setTimeout(() => {
      previewError = undefined;
      if (refs.frame !== undefined) {
        refs.frame.srcdoc = createPreviewDocument(output);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
    };
  });

  // Errors and readiness come from the sandboxed frame as messages.
  $effect(() => {
    function onMessage(event: MessageEvent<PreviewMessage>): void {
      if (event.source !== refs.frame?.contentWindow || event.data.source !== 'repl-preview') {
        return;
      }
      previewError = event.data.type === 'error' ? event.data.message : undefined;
    }
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
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
  }

  // Tab indents by two spaces. Escape then Tab moves focus on, as in other editors.
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || event.shiftKey) {
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

  function getStatus(): 'loading' | 'error' | 'ready' {
    if (problem !== undefined) {
      return 'error';
    }
    return ready ? 'ready' : 'loading';
  }
  const status = $memo(getStatus());

  return (
    <div class="repl">
      <div class="repl-bar">
        <span class="repl-status" data-state={status} role="status">
          <solid:switch>
            <solid:match when={status === 'loading'}>Loading compilers</solid:match>
            <solid:match when={status === 'error'}>Error in {problem?.stage}</solid:match>
            <solid:match when={status === 'ready'}>
              Compiled in {result?.ms.toFixed(1)} ms
            </solid:match>
          </solid:switch>
        </span>
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

      <div class="repl-editor" style={{ '--err-line': problem?.line ?? 0 }}>
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
          <code innerHTML={`${highlight(code)}\n`} />
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
          aria-describedby="repl-problem"
        />
      </div>

      <div class="repl-side">
        <section class="panel" data-kind="labels">
          <h2 class="panel-title">solid-labels</h2>
          <Show when={problem} fallback={<Output code={result?.labels ?? ''} stale={false} />}>
            {(current) => (
              <p class="problem" id="repl-problem" role="alert">
                {formatProblem(current())}
              </p>
            )}
          </Show>
        </section>
        <section class="panel" data-kind="solid">
          <h2 class="panel-title">Solid</h2>
          <Output code={result?.solid ?? ''} stale={problem !== undefined} />
        </section>
        <section class="panel" data-kind="preview">
          <h2 class="panel-title">Preview</h2>
          <iframe
            ref={(element: HTMLIFrameElement) => {
              refs.frame = element;
            }}
            title="Preview"
            sandbox="allow-scripts"
          />
          <Show when={previewError}>{(message) => <p class="problem">{message()}</p>}</Show>
        </section>
      </div>
    </div>
  );
}
