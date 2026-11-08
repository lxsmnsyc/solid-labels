import runtime from 'virtual:repl-runtime';

export interface PreviewMessage {
  source: string;
  type: 'ready' | 'error';
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
// The frame has no network access to a CDN and no access to this page.
let runtimeUrl: string | undefined;

function getRuntimeUrl(): string {
  runtimeUrl ??= `data:text/javascript;base64,${toBase64(runtime)}`;
  return runtimeUrl;
}

// A `<` inside the JSON could close the script tag early.
function embed(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** The document for the preview iframe. It runs `code` as a module with Solid 2.0. */
export function createPreviewDocument(code: string): string {
  const url = getRuntimeUrl();
  const imports = { 'solid-js': url, '@solidjs/web': url };

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light">
<style>
  body { margin: 0; padding: 1rem; font: 16px/1.5 system-ui, sans-serif; }
  button { font: inherit; padding: 0.4rem 0.9rem; }
</style>
<script type="importmap">${embed({ imports })}</script>
</head>
<body>
<div id="app"></div>
<script type="module">
  const send = (type, message) => parent.postMessage({ source: 'repl-preview', type, message }, '*');
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
