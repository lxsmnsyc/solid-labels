import type { JSX } from '@solidjs/web';
import { REPO_URL, navRoutes } from '../site';
import type { Route } from '../site';

function Mark(): JSX.Element {
  return (
    <svg class="mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" class="mark-bg" />
      <text x="16" y="24" text-anchor="middle" class="mark-glyph">
        $
      </text>
    </svg>
  );
}

function ThemeButton(): JSX.Element {
  return (
    <button type="button" class="icon-button" data-theme-toggle aria-label="Toggle color theme">
      <svg viewBox="0 0 24 24" aria-hidden="true" class="theme-icon">
        <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path
          class="rays"
          d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
    </button>
  );
}

export function Layout(props: { route: Route; children: JSX.Element }): JSX.Element {
  return (
    <>
      <a class="skip" href="#main">
        Skip to content
      </a>
      <header class="site-header">
        <a class="brand" href="/" aria-label="solid-labels home">
          <Mark />
          <span class="brand-name">solid-labels</span>
        </a>
        <nav class="site-nav" aria-label="Main">
          <solid:for each={navRoutes}>
            {(route: Route) => (
              <a
                href={route.path}
                aria-current={route.path === props.route.path ? 'page' : undefined}
              >
                {route.nav}
              </a>
            )}
          </solid:for>
        </nav>
        <div class="header-tools">
          <a class="icon-button" href={REPO_URL} aria-label="solid-labels on GitHub">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.9.83.09-.64.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
              />
            </svg>
          </a>
          <ThemeButton />
        </div>
      </header>
      <main id="main">{props.children}</main>
      <footer class="site-footer">
        <p>MIT © lxsmnsyc</p>
        <p>
          <a href={REPO_URL}>GitHub</a>
          <a href="https://www.npmjs.com/package/solid-labels">npm</a>
        </p>
      </footer>
    </>
  );
}
