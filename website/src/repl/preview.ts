import runtime from 'virtual:repl-runtime';

export interface PreviewMessage {
  source: string;
  type: 'ready' | 'error' | 'beat';
  message?: string;
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

// Both package names map to one data URL, so Solid's core exists once in the frame.
let runtimeUrl: string | undefined;

function getRuntimeUrl(): string {
  runtimeUrl ??= `data:text/javascript;base64,${toBase64(runtime)}`;
  return runtimeUrl;
}

// A `<` inside the JSON could close the script tag early.
function embed(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

// The frame may run scripts, and nothing else. It cannot fetch, load a frame or
// submit a form, so code in the preview has nowhere to send data.
const POLICY = [
  "default-src 'none'",
  "script-src 'unsafe-inline' data: blob:",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  'media-src data: blob:',
  "connect-src 'none'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

/** The document for the preview iframe. It runs `code` as a module with Solid 2.0. */
export function createPreviewDocument(code: string, dark: boolean): string {
  const url = getRuntimeUrl();
  const imports = { 'solid-js': url, '@solidjs/web': url };

  return `<!doctype html>
<html${dark ? ' data-dark' : ''}>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${POLICY}">
<style>
  :root { color-scheme: light; }
  :root[data-dark] { color-scheme: dark; }
  body { margin: 0; padding: 1rem; font: 16px/1.5 system-ui, sans-serif; background: #fbf8f0; color: #1a1712; }
  :root[data-dark] body { background: #1b1814; color: #efe9dc; }
  button { font: inherit; padding: 0.4rem 0.9rem; }
</style>
<script type="importmap">${embed({ imports })}</script>
</head>
<body>
<div id="app"></div>
<script type="module">
  const send = (type, message) => parent.postMessage({ source: 'repl-preview', type, message }, '*');
  // The page watches these beats. A frame that stops sending them is replaced.
  setInterval(() => send('beat'), 500);
  send('beat');
  addEventListener('message', (event) => {
    if (event.source === parent && event.data && event.data.source === 'repl') {
      document.documentElement.toggleAttribute('data-dark', event.data.dark === true);
    }
  });
  addEventListener('error', (event) => send('error', event.message));
  addEventListener('unhandledrejection', (event) => send('error', String(event.reason)));
  const url = URL.createObjectURL(new Blob([${embed(code)}], { type: 'text/javascript' }));
  try {
    await import(url);
    send('ready');
  } catch (error) {
    send('error', String(error));
  }
</script>
</body>
</html>`;
}
