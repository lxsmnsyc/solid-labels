import type { JSX } from '@solidjs/web';

export default function NotFound(): JSX.Element {
  return (
    <section class="hero not-found">
      <div class="hero-glyph" aria-hidden="true">
        ?
      </div>
      <h1>Page not found</h1>
      <p class="actions">
        <a class="button primary" href="/">
          Back to the start
        </a>
      </p>
    </section>
  );
}
