import type { JSX } from '@solidjs/web';
import { getCurrentPath } from './lib/location';
import { NOT_FOUND, findRoute, getOrigin } from './site';
import './styles/index.css';

// Runs before first paint. It restores the saved theme, and marks the page so
// the buttons that need scripts (copy, theme) show only when scripts run.
const BOOT = `(()=>{try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}document.documentElement.classList.add('js')})()`;

export default function Document(props: { children: JSX.Element }): JSX.Element {
  const path = getCurrentPath();
  const route = findRoute(path) ?? NOT_FOUND;
  const origin = getOrigin();
  const title =
    route.path === '/'
      ? 'solid-labels: compile-time functions for Solid'
      : `${route.title} · solid-labels`;
  const url = `${origin}${route.path}`;
  const image = `${origin}/og.png`;

  return (
    <html lang="en">
      <head>
        <solid:no-hydration>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title}</title>
          <meta name="description" content={route.description} />
          <meta name="color-scheme" content="light dark" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <solid:show when={origin !== ''}>
            <link rel="canonical" href={url} />
          </solid:show>
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="solid-labels" />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={route.description} />
          <meta property="og:url" content={url} />
          <meta property="og:image" content={image} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta name="twitter:card" content="summary_large_image" />
          <script innerHTML={BOOT} />
        </solid:no-hydration>
        <solid:hydration-script />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
