// Runs in the browser before hydration. Pages are static HTML, so the work
// here is small: a few behaviors that attach to markup the server rendered.
export {};

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
    const code = button?.parentElement?.querySelector('pre');
    if (!button || !code) {
      return;
    }
    navigator.clipboard.writeText(code.textContent).then(
      () => {
        button.dataset.done = '';
        button.setAttribute('aria-label', 'Copied');
        setTimeout(() => {
          delete button.dataset.done;
          button.setAttribute('aria-label', 'Copy code');
        }, 1600);
      },
      () => {
        button.setAttribute('aria-label', 'Copy failed');
      },
    );
  });
}

// The hero beam: pointer drag or arrow keys move the line from top to bottom.
function setupBeam(): void {
  const beam = document.querySelector<HTMLElement>('[data-beam]');
  const stage = beam?.querySelector<HTMLElement>('.beam-stage');
  if (!beam || !stage) {
    return;
  }

  function setBeam(percent: number): void {
    const value = Math.min(100, Math.max(0, percent));
    beam?.setAttribute('data-manual', '');
    stage?.style.setProperty('--beam', `${value}%`);
    stage?.setAttribute('aria-valuenow', String(Math.round(value)));
  }

  function fromPointer(event: PointerEvent): void {
    const box = stage?.getBoundingClientRect();
    if (box !== undefined) {
      setBeam(((event.clientY - box.top) / box.height) * 100);
    }
  }

  let dragging = false;
  stage.addEventListener('pointerdown', (event) => {
    dragging = true;
    stage.setPointerCapture(event.pointerId);
    fromPointer(event);
  });
  stage.addEventListener('pointermove', (event) => {
    if (dragging) {
      fromPointer(event);
    }
  });
  stage.addEventListener('pointerup', () => {
    dragging = false;
  });
  stage.addEventListener('keydown', (event) => {
    const now = Number(stage.getAttribute('aria-valuenow'));
    const steps: Record<string, number> = {
      ArrowDown: 10,
      ArrowRight: 10,
      ArrowUp: -10,
      ArrowLeft: -10,
    };
    if (event.key in steps) {
      event.preventDefault();
      setBeam(now + steps[event.key]);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setBeam(event.key === 'Home' ? 0 : 100);
    }
  });
}

// Marks the table of contents entry of the section being read.
function setupContents(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>('[data-toc] a');
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

function start(): void {
  setupTheme();
  setupCopy();
  setupBeam();
  setupContents();

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
