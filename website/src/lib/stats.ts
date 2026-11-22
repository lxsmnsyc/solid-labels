// Server only. Reads public usage numbers while the site is prerendered, so
// the home page shows real counts and never a number typed into the page.
// A failed request drops that number from the page instead of guessing it.

export interface Stats {
  stars?: number;
  downloads?: number;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'solid-labels-website' },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
  return response.json();
}

function readNumber(data: unknown, key: string): number | undefined {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }
  const value: unknown = Reflect.get(data, key);
  return typeof value === 'number' ? value : undefined;
}

export async function loadStats(): Promise<Stats> {
  const [repo, npm] = await Promise.allSettled([
    fetchJson('https://api.github.com/repos/lxsmnsyc/solid-labels'),
    fetchJson('https://api.npmjs.org/downloads/point/last-week/solid-labels'),
  ]);
  return {
    stars: repo.status === 'fulfilled' ? readNumber(repo.value, 'stargazers_count') : undefined,
    downloads: npm.status === 'fulfilled' ? readNumber(npm.value, 'downloads') : undefined,
  };
}
