// Serves dist/client the way Vercel does: clean URLs, the /repl isolation
// headers and a 404 page. Used to check the build locally.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../dist/client');
const port = Number(process.env.PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
};

async function findFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  for (const candidate of [clean, join(clean, 'index.html')]) {
    const file = join(root, candidate);
    if (!file.startsWith(root)) {
      continue;
    }
    try {
      if ((await stat(file)).isFile()) {
        return file;
      }
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const file = await findFile(url.pathname);
  const headers = {};
  if (url.pathname === '/repl' || url.pathname === '/repl/') {
    headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
  }
  // Workers must carry the embedder policy of the page that starts them.
  if (url.pathname.startsWith('/assets/')) {
    headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
  }
  if (file === undefined) {
    response.writeHead(404, { ...headers, 'Content-Type': TYPES['.html'] });
    createReadStream(join(root, '404.html')).pipe(response);
    return;
  }
  response.writeHead(200, {
    ...headers,
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
  });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`http://localhost:${port}`);
});
