// Runs in the browser before hydration. Pages are static HTML, so the work
// here is small: a few behaviors that attach to markup the server rendered.
import { onPackageManagerClick, syncPackageManagerButtons } from './lib/package-manager';

function setupTheme(): void {
  const button = document.querySelector('[data-theme-toggle]');
  if (button === null) {
    return;
  }
  button.addEventListener('click', () => {
    const root = document.documentElement;
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = root.dataset.theme ?? (dark ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Storage can be blocked. The theme then lasts for this visit.
    }
  });
}

function setupCopy(): void {
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const button = event.target.closest<HTMLButtonElement>('[data-copy]');
    // A button can name its text, such as an install command without the prompt.
    // An editable source copies what the reader typed.
    const text =
      button?.dataset.copyText ??
      button?.parentElement?.querySelector('textarea')?.value ??
      button?.parentElement?.querySelector('pre')?.textContent;
    if (!button || text === undefined) {
      return;
    }
    // Keep the first label, so a second click during the check does not save 'Copied'.
    button.dataset.label ??= button.getAttribute('aria-label') ?? 'Copy code';
    const label = button.dataset.label;
    navigator.clipboard.writeText(text).then(
      () => {
        button.dataset.done = '';
        button.setAttribute('aria-label', 'Copied');
        setTimeout(() => {
          delete button.dataset.done;
          button.setAttribute('aria-label', label);
        }, 1600);
      },
      () => {
        button.setAttribute('aria-label', 'Copy failed');
      },
    );
  });
}

// Marks the entry of the section being read in the docs sidebar. Only links to
// this page count. The sidebar also lists the sections of the other pages.
function setupContents(): void {
  const links: HTMLAnchorElement[] = [];
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-toc] a')) {
    if (link.hash !== '' && link.pathname === window.location.pathname) {
      links.push(link);
    }
  }
  if (links.length === 0) {
    return;
  }
  const byId = new Map<string, HTMLAnchorElement>();
  for (const link of links) {
    byId.set(link.hash.slice(1), link);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }
        for (const link of links) {
          link.removeAttribute('aria-current');
        }
        byId.get(entry.target.id)?.setAttribute('aria-current', 'true');
      }
    },
    { rootMargin: '-15% 0px -75% 0px' },
  );
  for (const id of byId.keys()) {
    const heading = document.getElementById(id);
    if (heading !== null) {
      observer.observe(heading);
    }
  }
}

// Search opens from the header button, Cmd or Ctrl and K, and the slash key.
// The dialog, minisearch and the index load the first time it opens.
function setupSearch(): void {
  let loading: Promise<{ openSearch: () => void }> | undefined;

  function open(): void {
    loading ??= import('./islands/search');
    loading.then((module) => {
      module.openSearch();
    }, reportError);
  }

  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  for (const key of document.querySelectorAll('[data-search-key]')) {
    key.textContent = mac ? '⌘K' : 'Ctrl K';
  }
  for (const trigger of document.querySelectorAll('[data-search]')) {
    trigger.addEventListener('click', open);
  }

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) {
      return;
    }
    const target = event.target;
    const typing =
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      open();
    } else if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      open();
    }
  });
}

function start(): void {
  syncPackageManagerButtons();
  document.addEventListener('click', onPackageManagerClick);
  setupTheme();
  setupCopy();
  setupContents();
  setupSearch();

  // Editable examples load their script and compiler on the first focus.
  if (document.querySelector('[data-live]') !== null) {
    // The textarea carries the source now, so screen readers skip the highlighted copy.
    for (const pre of document.querySelectorAll('.code.live pre')) {
      pre.setAttribute('aria-hidden', 'true');
    }
    let live: Promise<unknown> | undefined;
    document.addEventListener('focusin', (event) => {
      if (
        event.target instanceof HTMLTextAreaElement &&
        event.target.matches('[data-live-input]')
      ) {
        live ??= import('./islands/live').catch(reportError);
      }
    });
  }

  // The REPL loads its compilers only on its own page.
  if (document.querySelector('[data-island="repl"]') !== null) {
    import('./islands/repl').catch(reportError);
  }
}

// The entry script is async, so the page may still be parsing.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
