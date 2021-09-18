export default function App(): JSX.Element {
  let count = $signal(0);
  const message = $memo(`Count: ${count}`);

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
