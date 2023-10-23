import type { JSX } from 'solid-js/jsx-runtime';

export default function App(): JSX.Element {
  /* @signal */
  let count = 0;

  /* @memo */
  const message = `Count: ${count}`;

  /* @effect */ {
    console.log(message);
  }

  function increment(): void {
    count += 1;
  }

  return (
    <button type="button" onClick={increment}>
      {message}
    </button>
  );
}
