import { JSX } from 'solid-js';

// @refresh granular
function useCounter(): [Accessor<number>, Setter<number>] {
  const count = $signal(0);

  effect: {
    console.log('Current count:', count);
  }

  return $refSignal(count);
}

export default function App(): JSX.Element {
  let count = $derefSignal(useCounter());

  const message = $memo(`Count: ${count}`);

  effect: {
    console.log(message);
  }

  function increment() {
    count += 1;
  }

  return (
    <>
      <button type="button" onClick={increment}>
        {message}
      </button>
      <Show when={count % 2 === 0} fallback={<h1>Odd</h1>}>
        <h1>Even</h1>
      </Show>
    </>
  );
}
