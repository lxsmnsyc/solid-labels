export default function App(): JSX.Element {
  signal: var count = 0;
  memo: var message = `Count: ${count}`;

  effect: {
    console.log(message);
  }

  function increment() {
    count += 1;
  }

  return (
    <button type="button" onClick={increment}>
      {message}
    </button>
  );
}
