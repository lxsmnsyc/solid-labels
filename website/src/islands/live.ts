// Makes the source of every pair on the page editable in place. The output
// beside it recompiles as you type, so trying an example does not take you
// away from the page. Loaded the first time a source gets focus.
import { highlight } from '../lib/highlight';
import type { LiveReply, LiveRequest } from '../live/worker';

interface LivePair {
  file: string;
  figure: HTMLElement;
  input: HTMLTextAreaElement;
  highlighted: HTMLElement;
  reset: HTMLButtonElement | null;
  hint: HTMLElement | null;
  problem: HTMLElement | null;
  outputs: { code: HTMLElement; dev: boolean; original: string }[];
  original: string;
  latest: number;
  timer: number | undefined;
}

const pairs = new Map<number, LivePair>();
let nextId = 0;
let ready: Promise<Worker> | undefined;

async function connect(): Promise<Worker> {
  ready ??= new Promise((resolve, reject) => {
    const created = new Worker(new URL('../live/worker.ts', import.meta.url), { type: 'module' });
    // A worker that fails to load would leave every edit pending. Reject, and
    // let the next edit try again.
    created.addEventListener('error', () => {
      ready = undefined;
      created.terminate();
      reject(new Error('The compiler could not load.'));
    });
    created.addEventListener('message', (event: MessageEvent<LiveReply>) => {
      const message = event.data;
      if (message.type === 'ready') {
        resolve(created);
        return;
      }
      const pair = pairs.get(message.id);
      pairs.delete(message.id);
      // A newer edit already replaced this request.
      if (pair === undefined || pair.latest !== message.id) {
        return;
      }
      pair.figure.removeAttribute('data-pending');
      if (message.type === 'error') {
        showProblem(pair, message.message);
        return;
      }
      showProblem(pair, undefined);
      for (const output of pair.outputs) {
        output.code.innerHTML = output.dev ? message.devHtml : message.prodHtml;
      }
    });
  });
  return ready;
}

function showProblem(pair: LivePair, message: string | undefined): void {
  if (pair.problem !== null) {
    pair.problem.hidden = message === undefined;
    pair.problem.textContent = message ?? '';
  }
  for (const output of pair.outputs) {
    output.code.closest('.code')?.toggleAttribute('data-stale', message !== undefined);
  }
}

function setEdited(pair: LivePair, edited: boolean): void {
  if (pair.reset !== null) {
    pair.reset.hidden = !edited;
  }
  if (pair.hint !== null) {
    pair.hint.hidden = edited;
  }
}

function render(pair: LivePair): void {
  pair.highlighted.innerHTML = `${highlight(pair.input.value)}\n`;
}

// Compile after a short pause in typing. Only the last request of a pair counts.
function schedule(pair: LivePair): void {
  clearTimeout(pair.timer);
  pair.timer = window.setTimeout(() => {
    nextId += 1;
    const id = nextId;
    pair.latest = id;
    pairs.set(id, pair);
    pair.figure.setAttribute('data-pending', '');
    const request: LiveRequest = { id, file: pair.file, code: pair.input.value };
    connect().then(
      (connected) => {
        connected.postMessage(request);
      },
      () => {
        pair.figure.removeAttribute('data-pending');
        showProblem(pair, 'The compiler could not load.');
      },
    );
  }, 150);
}

function restore(pair: LivePair): void {
  clearTimeout(pair.timer);
  // A request still in flight must not overwrite the restored output.
  pair.latest = -1;
  pair.figure.removeAttribute('data-pending');
  pair.input.value = pair.original;
  render(pair);
  showProblem(pair, undefined);
  for (const output of pair.outputs) {
    output.code.innerHTML = output.original;
  }
  setEdited(pair, false);
  pair.input.focus();
}

function setup(figure: HTMLElement): void {
  const input = figure.querySelector<HTMLTextAreaElement>('[data-live-input]');
  const highlighted = figure.querySelector<HTMLElement>('.live pre code');
  if (input === null || highlighted === null) {
    return;
  }
  const outputs: LivePair['outputs'] = [];
  for (const code of figure.querySelectorAll<HTMLElement>('.pane-out .code code')) {
    const dev = code.closest('.out-dev') !== null;
    outputs.push({ code, dev, original: code.innerHTML });
  }
  const pair: LivePair = {
    file: figure.dataset.live ?? 'example.tsx',
    figure,
    input,
    highlighted,
    reset: figure.querySelector('[data-live-reset]'),
    hint: figure.querySelector('.live-hint'),
    problem: figure.querySelector('.live-problem'),
    outputs,
    original: input.defaultValue,
    latest: 0,
    timer: undefined,
  };

  input.addEventListener('input', () => {
    render(pair);
    setEdited(pair, input.value !== pair.original);
    schedule(pair);
  });
  // The highlighted copy follows the textarea when it scrolls.
  input.addEventListener('scroll', () => {
    const pre = highlighted.parentElement;
    if (pre !== null) {
      pre.scrollLeft = input.scrollLeft;
      pre.scrollTop = input.scrollTop;
    }
  });
  pair.reset?.addEventListener('click', () => {
    restore(pair);
  });

  // Text typed before this module loaded.
  if (input.value !== pair.original) {
    render(pair);
    setEdited(pair, true);
    schedule(pair);
  }
}

for (const figure of document.querySelectorAll<HTMLElement>('[data-live]')) {
  setup(figure);
}

// Start loading the compiler now. The first edit usually follows the focus.
connect().catch(reportError);
