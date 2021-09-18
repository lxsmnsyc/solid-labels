function useCounter(): [Getter<number>, Setter<number>] {
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
    <button type="button" onClick={increment}>
      {message}
    </button>
  );
}
