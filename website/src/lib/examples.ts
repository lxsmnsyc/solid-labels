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

export interface ReplExample {
  id: string;
  label: string;
  code: string;
}

/** Whole programs for the REPL, each with a live preview. */
export const REPL_EXAMPLES: ReplExample[] = [
  { id: 'counter', label: 'Counter', code: DEFAULT_EXAMPLE },
  {
    id: 'todos',
    label: 'Todo list',
    code: `import { render } from '@solidjs/web';

function Todos() {
  let text = $signal('');
  let todos = $signal<string[]>([]);
  const remaining = $memo(todos.length);

  function add() {
    if (text.trim() !== '') {
      todos = [...todos, text.trim()];
      text = '';
    }
  }

  return (
    <>
      <input
        value={text}
        onInput={(event) => (text = event.currentTarget.value)}
        onKeyDown={(event) => event.key === 'Enter' && add()}
      />
      <button onClick={add}>Add</button>
      <p>{remaining} to do</p>
      <ul>
        <For each={todos}>{(todo) => <li>{todo}</li>}</For>
      </ul>
    </>
  );
}

render(() => <Todos />, document.getElementById('app')!);
`,
  },
  {
    id: 'props',
    label: 'Props',
    code: `import { render } from '@solidjs/web';

const Greeting = $component(
  ({ name, excited = false }: { name: string; excited?: boolean }) => (
    <p>
      Hello, {name}
      {excited ? '!' : '.'}
    </p>
  ),
);

function App() {
  let name = $signal('Solid');
  let excited = $signal(false);

  return (
    <>
      <input value={name} onInput={(event) => (name = event.currentTarget.value)} />
      <label>
        <input
          type="checkbox"
          checked={excited}
          onChange={(event) => (excited = event.currentTarget.checked)}
        />
        Excited
      </label>
      <Greeting name={name} excited={excited} />
    </>
  );
}

render(() => <App />, document.getElementById('app')!);
`,
  },
];
