/** The example the REPL opens with, and the one the home page links to. */
export const DEFAULT_EXAMPLE = `import { render } from '@solidjs/web';

function Counter() {
  let count = $signal(0);
  const double = $memo(count * 2);

  $effect(() => {
    document.title = \`Count: \${count}\`;
  });

  return (
    <button onClick={() => (count += 1)}>
      {count} doubled is {double}
    </button>
  );
}

render(() => <Counter />, document.getElementById('app')!);
`;

export interface Demo {
  id: string;
  label: string;
  source: string;
}

/** The examples the home page demo switches between. Each compiles at build time. */
export const DEMOS: Demo[] = [
  {
    id: 'signals',
    label: 'Signals',
    source: `let count = $signal(0);
const double = $memo(count * 2);

function increment() {
  count += 1;
}`,
  },
  {
    id: 'effects',
    label: 'Effects',
    source: `let query = $signal('');
let page = $signal(1);

$effect(() => {
  console.log(\`Searching \${query}, page \${page}\`);
});`,
  },
  {
    id: 'props',
    label: 'Props',
    source: `const Greeting = $component(({ name, excited = false }) => (
  <p>
    Hello, {name}
    {excited ? '!' : '.'}
  </p>
));`,
  },
];

/**
 * The same counter and effect twice: once with solid-labels, once written by
 * hand with the Solid 2.0 API. The home page counts both.
 */
export const COMPARE_LABELS = `let count = $signal(0);
const double = $memo(count * 2);

$effect(() => {
  document.title = \`\${count} doubled is \${double}\`;
});

function increment() {
  count += 1;
}`;

export const COMPARE_HAND = `import { createSignal, createMemo, createEffect } from 'solid-js';

const [count, setCount] = createSignal(0);
const double = createMemo(() => count() * 2);

createEffect(
  () => [count(), double()],
  ([count, double]) => {
    document.title = \`\${count} doubled is \${double}\`;
  },
);

function increment() {
  setCount((current) => current + 1);
}`;
