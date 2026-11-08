import type { JSX } from '@solidjs/web';
import type { Component } from 'solid-js';
import { Layout } from './components/Layout';
import { getCurrentPath } from './lib/location';
import { NOT_FOUND, findRoute } from './site';
import type { Route } from './site';

interface PageProps {
  route: Route;
}

type Pages = Record<'home' | 'docs' | 'repl' | 'missing', Component<PageProps>>;

// Pages render at build time only. The browser never runs them, so their code
// (the Markdown pipeline, the compiler) must not reach the client bundle.
// `import.meta.env.SSR` is a constant, and the bundler drops the dead branch.
async function loadPages(): Promise<Pages> {
  const [home, docs, repl, missing] = await Promise.all([
    import('./pages/Home'),
    import('./pages/Docs'),
    import('./pages/Repl'),
    import('./pages/NotFound'),
  ]);
  return { home: home.default, docs: docs.default, repl: repl.default, missing: missing.default };
}

const pages: Pages | undefined = import.meta.env.SSR ? await loadPages() : undefined;

function pickPage(route: Route | undefined): keyof Pages {
  if (route === undefined) {
    return 'missing';
  }
  if (route.path === '/') {
    return 'home';
  }
  return route.path === '/repl' ? 'repl' : 'docs';
}

export default function App(): JSX.Element {
  const route = findRoute(getCurrentPath());
  const Page = pages?.[pickPage(route)];

  return (
    <solid:no-hydration>
      <Layout route={route ?? NOT_FOUND}>
        {Page === undefined ? null : <Page route={route ?? NOT_FOUND} />}
      </Layout>
    </solid:no-hydration>
  );
}
