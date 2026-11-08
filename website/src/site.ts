import routes from './routes.json';

export interface Route {
  path: string;
  title: string;
  description: string;
  nav?: string;
  doc?: string;
}

export const routeList: Route[] = routes;

/** The routes that appear in the main navigation. */
export const navRoutes: Route[] = [];
for (const route of routeList) {
  if (route.nav !== undefined) {
    navRoutes.push(route);
  }
}

export const REPO_URL = 'https://github.com/lxsmnsyc/solid-labels';

// TODO: set SITE_URL once the domain is known. Vercel's production URL is the
// fallback. With neither, canonical and Open Graph URLs stay relative.
export function getOrigin(): string {
  const fromEnv =
    typeof process === 'undefined'
      ? undefined
      : (process.env.SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (fromEnv === undefined || fromEnv === '') {
    return '';
  }
  return fromEnv.startsWith('http') ? fromEnv : `https://${fromEnv}`;
}

export function findRoute(pathname: string): Route | undefined {
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  for (const route of routeList) {
    if (route.path === clean) {
      return route;
    }
  }
  return undefined;
}

export const NOT_FOUND: Route = {
  path: '/404',
  title: 'Not found',
  description: 'This page does not exist.',
};
