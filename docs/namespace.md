# Namespace

## `<solid:for>`

Alias for [`<For>`](https://www.solidjs.com/docs/latest#%3Cfor%3E)

```jsx
<solid:for each={state.list} fallback={<div>Loading...</div>}>
  {(item) => <div>{item}</div>}
</solid:for>
```

```jsx
import { For as _For } from 'solid-js';
<_For each={state.list} fallback={<div>Loading...</div>}>
  {(item) => <div>{item}</div>}
</_For>;
```

## `<solid:repeat>`

Alias for `<Repeat>`, which renders a callback `count` times.

> `<Index>` is gone in Solid 2.0. For non-keyed list rendering, use `<solid:for keyed={false}>`.

```jsx
<solid:repeat count={state.list.length} fallback={<div>Empty</div>}>
  {(index) => <div>{state.list[index]}</div>}
</solid:repeat>
```

```jsx
import { Repeat as _Repeat } from 'solid-js';
<_Repeat count={state.list.length} fallback={<div>Empty</div>}>
  {(index) => <div>{state.list[index]}</div>}
</_Repeat>;
```

## `<solid:switch>` and `<solid:match>`

Alias for [`<Switch>` and `<Match>`](https://www.solidjs.com/docs/latest#%3Cswitch%3E%2F%3Cmatch%3E)

```jsx
<solid:switch fallback={<div>Not Found</div>}>
  <solid:match when={state.route === 'home'}>
    <Home />
  </solid:match>
  <solid:match when={state.route === 'settings'}>
    <Settings />
  </solid:match>
</solid:switch>
```

```jsx
import { Match as _Match } from 'solid-js';
import { Switch as _Switch } from 'solid-js';
<_Switch fallback={<div>Not Found</div>}>
  <_Match when={state.route === 'home'}>
    <Home />
  </_Match>
  <_Match when={state.route === 'settings'}>
    <Settings />
  </_Match>
</_Switch>;
```

## `<solid:show>`

Alias for [`<Show>`](https://www.solidjs.com/docs/latest#%3Cshow%3E)

```jsx
<solid:show when={state.user} fallback={<div>Loading...</div>}>
  {(user) => <div>{user.firstName}</div>}
</solid:show>
```

```jsx
import { Show as _Show } from 'solid-js';
<_Show when={state.user} fallback={<div>Loading...</div>}>
  {(user) => <div>{user.firstName}</div>}
</_Show>;
```

## `<solid:errored>`

Alias for `<Errored>`, which replaces `<ErrorBoundary>`.

```jsx
<solid:errored fallback={(err, reset) => <div onClick={reset}>Error: {String(err())}</div>}>
  <MyComp />
</solid:errored>
```

```jsx
import { Errored as _Errored } from 'solid-js';
<_Errored fallback={(err, reset) => <div onClick={reset}>Error: {String(err())}</div>}>
  <MyComp />
</_Errored>;
```

## `<solid:loading>`

Alias for `<Loading>`, which replaces `<Suspense>`.

```jsx
<solid:loading fallback={<div>Loading...</div>}>
  <AsyncComponent />
</solid:loading>
```

```jsx
import { Loading as _Loading } from 'solid-js';
<_Loading fallback={<div>Loading...</div>}>
  <AsyncComponent />
</_Loading>;
```

## `<solid:reveal>`

Alias for `<Reveal>`, which replaces `<SuspenseList>`.

```jsx
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

```jsx
import { Loading as _Loading } from 'solid-js';
import { Reveal as _Reveal } from 'solid-js';
<_Reveal collapsed>
  <ProfileDetails user={user()} />
  <_Loading fallback={<h2>Loading posts...</h2>}>
    <ProfileTimeline posts={posts()} />
  </_Loading>
  <_Loading fallback={<h2>Loading fun facts...</h2>}>
    <ProfileTrivia trivia={trivia()} />
  </_Loading>
</_Reveal>;
```

## `<solid:dynamic>`

Alias for [`<Dynamic>`](https://www.solidjs.com/docs/latest#%3Cdynamic%3E)

```jsx
<solid:dynamic component={state.component} someProp={state.something} />
```

```jsx
import { Dynamic as _Dynamic } from '@solidjs/web';
<_Dynamic component={state.component} someProp={state.something} />;
```

## `<solid:portal>`

Alias for [`<Portal>`](https://www.solidjs.com/docs/latest#%3Cportal%3E)

```jsx
<solid:portal mount={document.getElementById('modal')}>
  <div>My Content</div>
</solid:portal>
```

```jsx
import { Portal as _Portal } from '@solidjs/web';
<_Portal mount={document.getElementById('modal')}>
  <div>My Content</div>
</_Portal>;
```

## `<solid:hydration-script>`

Alias for `<HydrationScript>`

```jsx
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

```jsx
import { HydrationScript as _HydrationScript } from '@solidjs/web';

const App = () => {
  return (
    <html lang="en">
      <head>
        <title>🔥 Solid SSR 🔥</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/styles.css" />
        <_HydrationScript />
      </head>
      <body>{/*... rest of App*/}</body>
    </html>
  );
};
```

## `<solid:no-hydration>`

Alias for `<NoHydration>`

```jsx
<solid:no-hydration>
  <ImNotHydrated />
</solid:no-hydration>
```

```jsx
import { NoHydration as _NoHydration } from '@solidjs/web';
<_NoHydration>
  <ImNotHydrated />
</_NoHydration>;
```

## `<solid:hydration>`

Alias for `<Hydration>`, which re-enters hydration inside a `<solid:no-hydration>` subtree.

```jsx
<solid:no-hydration>
  <Shell>
    <solid:hydration>
      <Interactive />
    </solid:hydration>
  </Shell>
</solid:no-hydration>
```

```jsx
import { Hydration as _Hydration } from '@solidjs/web';
import { NoHydration as _NoHydration } from '@solidjs/web';
<_NoHydration>
  <Shell>
    <_Hydration>
      <Interactive />
    </_Hydration>
  </Shell>
</_NoHydration>;
```
