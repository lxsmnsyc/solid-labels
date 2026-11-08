import type { JSX } from '@solidjs/web';
import { renderDocument } from '../content/render';
import type { Heading } from '../content/render';
import { navRoutes } from '../site';
import type { Route } from '../site';

function findNext(route: Route): Route | undefined {
  for (let i = 0; i < navRoutes.length - 1; i++) {
    if (navRoutes[i].path === route.path) {
      return navRoutes[i + 1];
    }
  }
  return undefined;
}

function Links(props: { headings: Heading[] }): JSX.Element {
  return (
    <ul>
      <solid:for each={props.headings}>
        {(heading: Heading) => (
          <li class={heading.depth === 3 ? 'sub' : undefined}>
            <a href={`#${heading.id}`}>{heading.text}</a>
          </li>
        )}
      </solid:for>
    </ul>
  );
}

export default function Docs(props: { route: Route }): JSX.Element {
  const doc = renderDocument(props.route.doc ?? '');
  const next = findNext(props.route);

  return (
    <div class="doc">
      <nav class="toc" aria-label="On this page" data-toc>
        <Links headings={doc.headings} />
      </nav>
      <article class="prose">
        <details class="toc-inline">
          <summary>On this page</summary>
          <nav aria-label="On this page">
            <Links headings={doc.headings} />
          </nav>
        </details>
        <div innerHTML={doc.html} />
        <Show when={next}>
          {(target) => (
            <p class="next">
              <a href={target().path}>
                <span>Next</span>
                {target().nav}
              </a>
            </p>
          )}
        </Show>
      </article>
    </div>
  );
}
