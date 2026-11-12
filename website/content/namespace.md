# The `solid:` namespace

`solid:` elements cannot infer generic types (the `item` of `<solid:for>`, the `when` value of `<solid:show>` and `<solid:match>`). Use the bare `<For>`, `<Show>` or `<Match>` when you need typed callbacks.

## `<solid:for>`

Alias for [`<For>`](https://www.solidjs.com/docs/latest#%3Cfor%3E)

```ctf jsx
<solid:for each={state.list} fallback={<div>Loading...</div>}>
  {(item) => <div>{item}</div>}
</solid:for>
```

## `<solid:repeat>`

Alias for `<Repeat>`, which renders a callback `count` times.

> `<Index>` is gone in Solid 2.0. For non-keyed list rendering, use `<solid:for keyed={false}>`.

```ctf jsx
<solid:repeat count={state.list.length} fallback={<div>Empty</div>}>
  {(index) => <div>{state.list[index]}</div>}
</solid:repeat>
```

## `<solid:switch>` and `<solid:match>`

Alias for [`<Switch>` and `<Match>`](https://www.solidjs.com/docs/latest#%3Cswitch%3E%2F%3Cmatch%3E)

```ctf jsx
<solid:switch fallback={<div>Not Found</div>}>
  <solid:match when={state.route === 'home'}>
    <Home />
  </solid:match>
  <solid:match when={state.route === 'settings'}>
    <Settings />
  </solid:match>
</solid:switch>
```

## `<solid:show>`

Alias for [`<Show>`](https://www.solidjs.com/docs/latest#%3Cshow%3E)

```ctf jsx
<solid:show when={state.user} fallback={<div>Loading...</div>}>
  {(user) => <div>{user.firstName}</div>}
</solid:show>
```

## `<solid:errored>`

Alias for `<Errored>`, which replaces `<ErrorBoundary>`.

```ctf jsx
<solid:errored fallback={(err, reset) => <div onClick={reset}>Error: {String(err())}</div>}>
  <MyComp />
</solid:errored>
```

## `<solid:loading>`

Alias for `<Loading>`, which replaces `<Suspense>`.

```ctf jsx
<solid:loading fallback={<div>Loading...</div>}>
  <AsyncComponent />
</solid:loading>
```

## `<solid:reveal>`

Alias for `<Reveal>`, which replaces `<SuspenseList>`.

```ctf jsx
<solid:reveal collapsed>
  <ProfileDetails user={user()} />
  <solid:loading fallback={<h2>Loading posts...</h2>}>
    <ProfileTimeline posts={posts()} />
  </solid:loading>
  <solid:loading fallback={<h2>Loading fun facts...</h2>}>
    <ProfileTrivia trivia={trivia()} />
  </solid:loading>
</solid:reveal>
```

## `<solid:portal>`

Alias for [`<Portal>`](https://www.solidjs.com/docs/latest#%3Cportal%3E)

```ctf jsx
<solid:portal mount={document.getElementById('modal')}>
  <div>My Content</div>
</solid:portal>
```

## `<solid:hydration-script>`

Alias for `<HydrationScript>`

```ctf jsx
const App = () => {
  return (
    <html lang="en">
      <head>
        <title>🔥 Solid SSR 🔥</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/styles.css" />
        <solid:hydration-script />
      </head>
      <body>{/*... rest of App*/}</body>
    </html>
  );
};
```

## `<solid:no-hydration>`

Alias for `<NoHydration>`

```ctf jsx
<solid:no-hydration>
  <ImNotHydrated />
</solid:no-hydration>
```

## `<solid:hydration>`

Alias for `<Hydration>`, which re-enters hydration inside a `<solid:no-hydration>` subtree.

```ctf jsx
<solid:no-hydration>
  <Shell>
    <solid:hydration>
      <Interactive />
    </solid:hydration>
  </Shell>
</solid:no-hydration>
```

## Unknown names

Any `solid:` element name that is not listed here throws a compile error that
names the unknown element. `<solid:dynamic>` is one of them: use `dynamic()`
from `@solidjs/web`.
