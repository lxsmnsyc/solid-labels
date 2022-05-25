# Namespace

## `<solid:for>`

Alias for [`<For>`](https://www.solidjs.com/docs/latest#%3Cfor%3E)

```jsx
<solid:for each={state.list} fallback={<div>Loading...</div>}>
  {(item) => <div>{item}</div>}
</solid:for>
```

```jsx
import { For as _For } from "solid-js";
<_For each={state.list} fallback={<div>Loading...</div>}>
  {item => <div>{item}</div>}
</_For>;
```

## `<solid:index>`

Alias for [`<Index>`](https://www.solidjs.com/docs/latest#%3Cindex%3E)

```jsx
<solid:index each={state.list} fallback={<div>Loading...</div>}>
  {(item) => <div>{item()}</div>}
</solid:index>
```

```jsx
import { Index as _Index } from "solid-js";
<_Index each={state.list} fallback={<div>Loading...</div>}>
  {item => <div>{item()}</div>}
</_Index>;
```

## `<solid:switch>` and `<solid:match>`

Alias for [`<Switch>` and `<Match>`](https://www.solidjs.com/docs/latest#%3Cswitch%3E%2F%3Cmatch%3E)

```jsx
<solid:switch fallback={<div>Not Found</div>}>
  <solid:match when={state.route === "home"}>
    <Home />
  </solid:match>
  <solid:match when={state.route === "settings"}>
    <Settings />
  </solid:match>
</solid:switch>
```

```jsx
import { Match as _Match } from "solid-js";
import { Switch as _Switch } from "solid-js";
<_Switch fallback={<div>Not Found</div>}>
  <_Match when={state.route === "home"}>
    <Home />
  </_Match>
  <_Match when={state.route === "settings"}>
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
import { Show as _Show } from "solid-js";
<_Show when={state.user} fallback={<div>Loading...</div>}>
  {user => <div>{user.firstName}</div>}
</_Show>;
```

## `<solid:error-boundary>`

Alias for [`<ErrorBoundary>`](https://www.solidjs.com/docs/latest#%3Cerrorboundary%3E)

```jsx
<solid:error-boundary
  fallback={(err, reset) => <div onClick={reset}>Error: {err.toString()}</div>}
>
  <MyComp />
</solid:error-boundary>
```

```jsx
import { ErrorBoundary as _ErrorBoundary } from "solid-js";
<_ErrorBoundary fallback={(err, reset) => <div onClick={reset}>Error: {err.toString()}</div>}>
  <MyComp />
</_ErrorBoundary>;
```

## `<solid:suspense>`

Alias for [`<Suspense>`](https://www.solidjs.com/docs/latest#%3Csuspense%3E)

```jsx
<solid:suspense fallback={<div>Loading...</div>}>
  <AsyncComponent />
</solid:suspense>
```

```jsx
import { Suspense as _Suspense } from "solid-js";
<_Suspense fallback={<div>Loading...</div>}>
  <AsyncComponent />
</_Suspense>;
```

## `<solid:suspense-list>`

Alias for [`<SuspenseList>`](https://www.solidjs.com/docs/latest#%3Csuspenselist%3E-(experimental))

```jsx
<solid:suspense-list revealOrder="forwards" tail="collapsed">
  <ProfileDetails user={resource.user} />
  <solid:suspense fallback={<h2>Loading posts...</h2>}>
    <ProfileTimeline posts={resource.posts} />
  </solid:suspense>
  <solid:suspense fallback={<h2>Loading fun facts...</h2>}>
    <ProfileTrivia trivia={resource.trivia} />
  </solid:suspense>
</solid:suspense-list>
```

```jsx
import { Suspense as _Suspense } from "solid-js";
import { SuspenseList as _SuspenseList } from "solid-js";
<_SuspenseList revealOrder="forwards" tail="collapsed">
  <ProfileDetails user={resource.user} />
  <_Suspense fallback={<h2>Loading posts...</h2>}>
    <ProfileTimeline posts={resource.posts} />
  </_Suspense>
  <_Suspense fallback={<h2>Loading fun facts...</h2>}>
    <ProfileTrivia trivia={resource.trivia} />
  </_Suspense>
</_SuspenseList>;
```

## `<solid:dynamic>`

Alias for [`<Dynamic>`](https://www.solidjs.com/docs/latest#%3Cdynamic%3E)

```jsx
<solid:dynamic component={state.component} someProp={state.something} />
```

```jsx
import { Dynamic as _Dynamic } from "solid-js/web";
<_Dynamic component={state.component} someProp={state.something} />;
```

## `<solid:portal>`

Alias for [`<Portal>`](https://www.solidjs.com/docs/latest#%3Cportal%3E)

```jsx
<solid:portal mount={document.getElementById("modal")}>
  <div>My Content</div>
</solid:portal>
```

```jsx
import { Portal as _Portal } from "solid-js/web";
<_Portal mount={document.getElementById("modal")}>
  <div>My Content</div>
</_Portal>;
```

## `<solid:assets>`

Alias for `<Assets>`

```jsx
<solid:assets>
  <link rel="stylesheet" href="/styles.css" />
</solid:assets>
```

```jsx
import { Assets as _Assets } from "solid-js/web";
<_Assets>
  <link rel="stylesheet" href="/styles.css" />
</_Assets>;
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
}
```

```jsx
import { HydrationScript as _HydrationScript } from "solid-js/web";

const App = () => {
  return <html lang="en">
      <head>
        <title>🔥 Solid SSR 🔥</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/styles.css" />
        <_HydrationScript />
      </head>
      <body>{
        /*... rest of App*/
      }</body>
    </html>;
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
import { NoHydration as _NoHydration } from "solid-js/web";
<_NoHydration>
  <ImNotHydrated />
</_NoHydration>;
```
