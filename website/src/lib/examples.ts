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

/** The four lines the home page compiles. Source and output keep one line each. */
export const HERO_EXAMPLE = `let count = $signal(0);
const double = $memo(count * 2);
count += 1;
console.log(double);`;
