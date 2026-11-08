## Signals read like variables

A `$signal` is a variable. Read it, assign to it, increment it. The compiler turns each use into the accessor and setter calls that Solid needs.

```ctf tsx
let count = $signal(0);
const label = $memo(`Clicked ${count} times`);

function onClick() {
  count += 1;
}
```

## Effects find their own dependencies

Solid 2.0 splits an effect into a tracked step and an untracked step. `$effect` writes both. It reads every signal the callback uses in the tracked step, and hands the values to the callback.

```ctf tsx
let count = $signal(0);

$effect(() => {
  document.title = `Count: ${count}`;
});
```

## Props stay live when you destructure them

`$component` accepts a destructured parameter and keeps every prop reactive.

```ctf tsx
const Greeting = $component(({ name, excited = false }) => (
  <p>
    Hello, {name}
    {excited ? '!' : '.'}
  </p>
));
```
