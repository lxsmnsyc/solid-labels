import { Window } from 'happy-dom';

const root = import.meta.dir;

// Give the bundle a DOM to render into.
const window = new Window();
window.document.body.innerHTML = '<div id="app"></div>';
Object.assign(globalThis, {
  window,
  document: window.document,
  Node: window.Node,
  Element: window.Element,
  HTMLElement: window.HTMLElement,
});

// Importing the bundle runs `render()`, so a missing auto-import
// (such as `_Show is not defined`) throws here.
await import(`${root}/dist/main.js`);

function fail(message: string): never {
  console.error(`check failed: ${message}`);
  process.exit(1);
}

function getText(): string {
  return window.document.getElementById('app')?.textContent ?? '';
}

async function flush(): Promise<void> {
  await Bun.sleep(10);
}

// Initial render: signal, memo, <Show> and <solid:for>.
await flush();
const first = getText();
for (const expected of ['Count: 0', 'x2: 0', 'Even', 'apple', 'banana', 'cherry']) {
  if (!first.includes(expected)) {
    fail(`expected "${expected}" in "${first}"`);
  }
}

// Click once: the signal, the memo and the <Show> branch update.
window.document.querySelector('button')?.click();
await flush();
const second = getText();
for (const expected of ['Count: 1', 'x2: 2', 'Odd']) {
  if (!second.includes(expected)) {
    fail(`expected "${expected}" in "${second}"`);
  }
}

console.log('ok:', first, '->', second);
