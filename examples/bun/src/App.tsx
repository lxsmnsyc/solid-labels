import type { JSX } from '@solidjs/web';

export default function App(): JSX.Element {
  const items = ['apple', 'banana', 'cherry'];

  let count = $signal(0);
  const doubled = $memo(count * 2);

  $effect(() => {
    console.log('count is', count, 'doubled is', doubled);
  });

  function increment(): void {
    count += 1;
  }

  return (
    <main>
      <button type="button" onClick={increment}>
        Count: {count} (x2: {doubled})
      </button>
      <Show when={count % 2 === 0} fallback={<p>Odd</p>}>
        <p>Even</p>
      </Show>
      <ul>
        <solid:for each={items}>{(item) => <li>{item()}</li>}</solid:for>
      </ul>
    </main>
  );
}
