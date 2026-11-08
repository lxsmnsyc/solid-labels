import type { WorkerReply, WorkerRequest } from './worker';

type Done = Extract<WorkerReply, { type: 'done' }>;

/** How long one compile may take before the worker is replaced. */
const TIMEOUT_MS = 15_000;

interface Connection {
  worker: Worker;
  /** Resolves when the worker has loaded its compilers and listens for code. */
  ready: Promise<void>;
}

let connection: Connection | undefined;
let nextId = 0;
let latest: { id: number; resolve: (reply: Done | undefined) => void; timer: number } | undefined;

function connect(): Connection {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  // The worker loads wasm before it listens, so a message sent earlier is lost.
  // It announces itself first.
  const ready = new Promise<void>((resolve) => {
    worker.addEventListener('message', (event: MessageEvent<WorkerReply>) => {
      const message = event.data;
      if (message.type === 'ready') {
        resolve();
      } else if (latest?.id === message.id) {
        clearTimeout(latest.timer);
        latest.resolve(message);
        latest = undefined;
      }
    });
  });
  return { worker, ready };
}

function restart(): void {
  connection?.worker.terminate();
  connection = undefined;
}

/**
 * Compiles in the worker. A new call replaces the one before it, which then
 * resolves with `undefined`. A worker that does not answer in time is replaced,
 * and the call rejects.
 */
export async function compileInWorker(
  code: string,
  dev: boolean,
  highlightInput: boolean,
): Promise<Done | undefined> {
  connection ??= connect();
  const current = connection;
  latest?.resolve(undefined);
  nextId += 1;
  const id = nextId;
  // A newer call replaced this one while the worker was loading.
  const request: WorkerRequest = { id, code, dev, highlightInput };

  await current.ready;
  if (id !== nextId) {
    return undefined;
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      latest = undefined;
      restart();
      reject(new Error('The compiler stopped responding. Edit the code to try again.'));
    }, TIMEOUT_MS);
    latest = { id, resolve, timer };
    current.worker.postMessage(request);
  });
}
