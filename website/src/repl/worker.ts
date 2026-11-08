// Runs in a Web Worker. Compiling and highlighting a large paste happens here, so
// the page keeps answering the keyboard while it works.
import { highlight } from '../lib/highlight';
import { run } from './compilers';
import type { Outcome } from './compilers';

export interface WorkerRequest {
  id: number;
  code: string;
  dev: boolean;
  /** Also highlight the input. The page does that itself for small input. */
  highlightInput: boolean;
}

export type WorkerReply =
  | { type: 'ready' }
  | {
      type: 'done';
      id: number;
      outcome: Outcome;
      labelsHtml: string;
      solidHtml: string;
      inputHtml: string | undefined;
    };

function reply(message: WorkerReply): void {
  postMessage(message);
}

addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const { id, code, dev, highlightInput } = event.data;
  const outcome = run(code, dev);
  reply({
    type: 'done',
    id,
    outcome,
    labelsHtml: outcome.ok ? highlight(outcome.value.labels) : '',
    solidHtml: outcome.ok ? highlight(outcome.value.solid) : '',
    inputHtml: highlightInput ? highlight(code) : undefined,
  });
});

// The compilers loaded with this module. The page may send code now.
reply({ type: 'ready' });
