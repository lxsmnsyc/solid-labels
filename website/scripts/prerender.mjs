// Renders every route with the built server bundle and writes static files.
// Run after `vite build`.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { configureServerErrors } from '@solidjs/web';

// Solid hides error details in the HTML. A build needs them in the log.
configureServerErrors({
  onError(error) {
    console.error(error);
  },
});

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = join(root, 'dist/client');
const routes = JSON.parse(await readFile(join(root, 'src/routes.json'), 'utf8'));
const redirects = JSON.parse(await readFile(join(root, 'src/redirects.json'), 'utf8'));
const { handleRequest } = await import(pathToFileURL(join(root, 'dist/server/server.js')).href);

async function render(path, file) {
  const response = await handleRequest(new Request(`http://localhost${path}`));
  const html = await response.text();
  // The 404 page is rendered on purpose, so its status is not checked.
  if (!response.ok && path !== '/404') {
    throw new Error(`Prerender of ${path} failed with status ${response.status}`);
  }
  const target = join(clientDir, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
  console.log(`prerendered ${path} -> ${file} (${(html.length / 1024).toFixed(1)} kB)`);
}

for (const route of routes) {
  await render(route.path, route.path === '/' ? 'index.html' : `${route.path.slice(1)}/index.html`);
}
await render('/404', '404.html');

// Old paths keep a small page that sends readers to the new one. Vercel also
// answers them with a permanent redirect (see vercel.json).
for (const [from, to] of Object.entries(redirects)) {
  const target = join(clientDir, from.slice(1), 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(
    target,
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Moved</title><meta name="robots" content="noindex"><link rel="canonical" href="${to}"><meta http-equiv="refresh" content="0; url=${to}"></head><body><p>This page moved to <a href="${to}">${to}</a>.</p></body></html>`,
  );
  console.log(`redirect stub ${from} -> ${to}`);
}
