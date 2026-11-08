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

// The hero beam. It sweeps on its own. A horizontal drag or the arrow keys take
// over, and the button pauses it or starts it again (WCAG 2.2.2).
function setupBeam(): void {
  const beam = document.querySelector<HTMLElement>('[data-beam]');
  const stage = beam?.querySelector<HTMLElement>('.beam-stage');
  const toggle = beam?.querySelector<HTMLButtonElement>('[data-beam-toggle]');
  if (!beam || !stage || !toggle) {
    return;
  }

  function describeToggle(): void {
    const running = !beam?.hasAttribute('data-manual');
    toggle?.setAttribute('aria-label', running ? 'Pause animation' : 'Play animation');
    toggle?.toggleAttribute('data-paused', !running);
  }

  function setBeam(percent: number): void {
    const value = Math.min(100, Math.max(0, percent));
    beam?.setAttribute('data-manual', '');
    stage?.style.setProperty('--beam', `${value}%`);
    stage?.setAttribute('aria-valuenow', String(Math.round(value)));
    describeToggle();
  }

  // The stage scrolls the page vertically, so only the horizontal position of
  // the pointer moves the beam.
  function fromPointer(event: PointerEvent): void {
    const box = stage?.getBoundingClientRect();
    if (box !== undefined) {
      setBeam(((event.clientX - box.left) / box.width) * 100);
    }
  }

  // A mouse takes over at once. A touch only takes over on a horizontal move,
  // so a vertical swipe on the stage still scrolls the page.
  let dragging = false;
  let startX = 0;
  let startY = 0;
  stage.addEventListener('pointerdown', (event) => {
    startX = event.clientX;
    startY = event.clientY;
    if (event.pointerType !== 'touch') {
      dragging = true;
      stage.setPointerCapture(event.pointerId);
      fromPointer(event);
    }
  });
  stage.addEventListener('pointermove', (event) => {
    if (!dragging && event.pointerType === 'touch' && event.buttons === 1) {
      const dx = Math.abs(event.clientX - startX);
      const dy = Math.abs(event.clientY - startY);
      if (dx > 8 && dx > dy) {
        dragging = true;
        stage.setPointerCapture(event.pointerId);
      }
    }
    if (dragging) {
      fromPointer(event);
    }
  });
  function stopDrag(): void {
    dragging = false;
  }
  stage.addEventListener('pointerup', stopDrag);
  stage.addEventListener('pointercancel', stopDrag);
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

  toggle.addEventListener('click', () => {
    if (beam.hasAttribute('data-manual')) {
      // Back to the sweep.
      beam.removeAttribute('data-manual');
      stage.style.removeProperty('--beam');
    } else {
      // Freeze where the line is now.
      const current = Number.parseFloat(getComputedStyle(stage).getPropertyValue('--beam'));
      setBeam(Number.isNaN(current) ? 50 : current);
    }
    describeToggle();
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
  setupTheme();
  setupCopy();
  setupBeam();
  setupContents();
  setupSearch();

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
