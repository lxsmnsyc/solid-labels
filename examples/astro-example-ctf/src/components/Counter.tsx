function useCounter(): [Accessor<number>, Setter<number>] {
  const count = $signal(0);

  effect: {
    console.log('Current count:', count);
  }

  return $refSignal(count);
}

/** */
export default function SolidCounter({ children }) {
  let count = $derefSignal(useCounter());

  return (
    <>
      <div class="counter">
        <button onClick={() => count -= 1}>-</button>
        <pre>{count}</pre>
        <button onClick={() => count += 1}>+</button>
      </div>
      <div class="children">{children}</div>
    </>
  );
}
