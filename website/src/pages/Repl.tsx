import type { JSX } from '@solidjs/web';
import { DEFAULT_EXAMPLE } from '../lib/examples';
import { highlight } from '../lib/highlight';

// The REPL mounts in the browser, in `src/islands/repl.ts`. The server renders
// the starting example, so the page shows code before the compilers load.
export default function Repl(): JSX.Element {
  return (
    <div class="repl-page">
      <div id="repl-root" data-island="repl">
        <pre class="repl-boot">
          <code innerHTML={highlight(DEFAULT_EXAMPLE)} />
        </pre>
        <noscript>
          <p class="repl-note">The REPL needs scripts. It compiles your code in the browser.</p>
        </noscript>
      </div>
    </div>
  );
}
