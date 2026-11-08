import type { JSX } from '@solidjs/web';
import { renderDocument } from '../content/render';
import { docRoutes, navRoutes } from '../site';
import type { Route } from '../site';

function findNext(route: Route): Route | undefined {
  for (let i = 0; i < docRoutes.length - 1; i++) {
    if (docRoutes[i].path === route.path) {
      return docRoutes[i + 1];
    }
  }
  return undefined;
}

// Every docs page with its sections, and the REPL. The page being read is open
// and also lists its sub-sections.
function Sidebar(props: { current: Route }): JSX.Element {
  return (
    <>
      <solid:for each={navRoutes}>
        {(item: Route) => (
          <solid:show
            when={item.doc !== undefined}
            fallback={
              <a
                class="side-link side-tool"
                href={item.path}
                aria-current={item.path === props.current.path ? 'page' : undefined}
              >
                {item.nav}
              </a>
            }
          >
            <details class="side-page" open={item.path === props.current.path}>
              <summary>
                <a
                  class="side-link"
                  href={item.path}
                  aria-current={item.path === props.current.path ? 'page' : undefined}
                >
                  {item.nav}
                </a>
              </summary>
              <ul>
                <solid:for each={renderDocument(item.doc ?? '').headings}>
                  {(heading: { depth: number; id: string; text: string }) => (
                    <solid:show when={heading.depth === 2 || item.path === props.current.path}>
                      <li class={heading.depth === 3 ? 'sub' : undefined}>
                        <a href={`${item.path}#${heading.id}`}>{heading.text}</a>
                      </li>
                    </solid:show>
                  )}
                </solid:for>
              </ul>
            </details>
          </solid:show>
        )}
      </solid:for>
    </>
  );
}

export default function Docs(props: { route: Route }): JSX.Element {
  const doc = renderDocument(props.route.doc ?? '');
  const next = findNext(props.route);

  return (
    <div class="doc">
      <nav class="sidebar" aria-label="Docs" data-toc>
        <Sidebar current={props.route} />
      </nav>
      <article class="prose">
        <details class="sidebar-inline">
          <summary>Docs menu</summary>
          <nav aria-label="Docs">
            <Sidebar current={props.route} />
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
