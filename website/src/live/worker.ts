// Runs in a Web Worker. Compiles the examples you edit on docs pages with the
// real compiler. It loads solid-labels only, not the Solid JSX compiler, so the
// page needs no cross-origin isolation.
import { CompileError, compile } from 'solid-labels/compiler';
import { highlight } from '../lib/highlight';

export interface LiveRequest {
  id: number;
  file: string;
  code: string;
}

export type LiveReply =
  | { type: 'ready' }
  | { type: 'done'; id: number; prodHtml: string; devHtml: string }
  | { type: 'error'; id: number; message: string };

function reply(message: LiveReply): void {
  postMessage(message);
}

function compileTo(file: string, code: string, dev: boolean): string {
  // `null` means the code has nothing to compile, so the output is the input.
  return compile(file, code, { dev })?.code ?? code;
}

addEventListener('message', (event: MessageEvent<LiveRequest>) => {
  const { id, file, code } = event.data;
  try {
    reply({
      type: 'done',
      id,
      prodHtml: highlight(compileTo(file, code, false)),
      devHtml: highlight(compileTo(file, code, true)),
    });
  } catch (error) {
    let message = error instanceof Error ? error.message : String(error);
    if (error instanceof CompileError) {
      message = `Line ${error.line}, column ${error.column}: ${message.replace(/ \(\d+:\d+\)$/, '')}`;
    }
    reply({ type: 'error', id, message });
  }
});

reply({ type: 'ready' });
