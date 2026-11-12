// The docs search. The shell script loads this module the first time search
// opens, so no page pays for terracotta, minisearch or the index before then.
import { render } from '@solidjs/web';
import type { JSX } from '@solidjs/web';
import type MiniSearch from 'minisearch';
import { Command, CommandInput, CommandOption, CommandOptions } from 'terracotta/command';
import {
  CommandBar,
  CommandBarDescription,
  CommandBarOverlay,
  CommandBarPanel,
  CommandBarTitle,
} from 'terracotta/command-bar';

interface Result {
  id: string;
  href: string;
  page: string;
  heading: string;
  text: string;
}

const MAX_RESULTS = 12;
const SNIPPET_LENGTH = 110;
// `$signal` must match a search for "signal", so `$` splits words.
const NON_WORD = /[^\p{L}\p{N}_]+/u;

let loading: Promise<MiniSearch<Result>> | undefined;

// The index and the search library load the first time search opens.
async function loadIndex(): Promise<MiniSearch<Result>> {
  loading ??= Promise.all([import('minisearch'), import('virtual:search-index')]).then(
    ([{ default: MiniSearchClass }, { default: entries }]) => {
      const search = new MiniSearchClass<Result>({
        idField: 'id',
        fields: ['heading', 'page', 'text'],
        storeFields: ['href', 'page', 'heading', 'text'],
        tokenize: (text) => text.split(NON_WORD),
        searchOptions: {
          boost: { heading: 4, page: 2 },
          prefix: true,
          fuzzy: 0.2,
          tokenize: (text) => text.split(NON_WORD),
        },
      });
      search.addAll(entries);
      return search;
    },
  );
  return loading;
}

function makeSnippet(text: string, query: string): string {
  const words = query.trim().split(NON_WORD);
  const term = (words.find((word) => word !== '') ?? '').toLowerCase();
  const at = term === '' ? -1 : text.toLowerCase().indexOf(term);
  const start = Math.max(0, at - 30);
  const end = start + SNIPPET_LENGTH;
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

function isSection(result: Result): boolean {
  return result.id.includes('#');
}

function PageIcon(): JSX.Element {
  return (
    <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
      />
    </svg>
  );
}

function SectionIcon(): JSX.Element {
  return (
    <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
    </svg>
  );
}

let isOpen = $signal<boolean>(false);

/** Opens the search dialog. */
export function openSearch(): void {
  isOpen = true;
}

function Search(): JSX.Element {
  let index = $signal<MiniSearch<Result> | undefined>();
  let query = $signal<string>('');

  // The index loads the first time the dialog opens.
  $effect(() => {
    if (isOpen) {
      loadIndex().then((search) => {
        index = search;
      }, reportError);
    }
  });

  const results = $memo(findResults());

  function findResults(): Result[] {
    const trimmed = query.trim();
    if (index === undefined || trimmed === '') {
      return [];
    }
    // MiniSearch types the stored fields as any. They match Result.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return (index.search(trimmed) as unknown as Result[]).slice(0, MAX_RESULTS);
  }

  function go(result: Result | undefined): void {
    if (result !== undefined) {
      isOpen = false;
      query = '';
      window.location.assign(result.href);
    }
  }

  return (
    <CommandBar
      class="search"
      isOpen={isOpen}
      onOpen={openSearch}
      onClose={() => {
        isOpen = false;
      }}
    >
      <CommandBarOverlay class="search-overlay" />
      <CommandBarPanel class="search-panel">
        <CommandBarTitle class="sr-only">Search the docs</CommandBarTitle>
        <CommandBarDescription class="sr-only">
          Type to search. Use the arrow keys to move and Enter to open a result.
        </CommandBarDescription>
        <Command<Result>
          class="search-command"
          defaultValue={undefined}
          by={(a, b) => a.id === b.id}
          // The index returns only matches, so nothing filters them again.
          matchBy={() => true}
          onChange={go}
        >
          <div class="search-input-row">
            <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.8" />
              <path
                d="m20 20-3.5-3.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
            <CommandInput
              class="search-input"
              placeholder="Search the docs"
              onInput={(event) => {
                query = event.currentTarget.value;
              }}
              onKeyDown={(event) => {
                // Results arrive after the query changes, so none may be active
                // yet. Enter then opens the first one.
                if (
                  event.key === 'Enter' &&
                  event.currentTarget.getAttribute('aria-activedescendant') === null
                ) {
                  go(results[0]);
                }
              }}
            />
            <kbd>Esc</kbd>
          </div>
          <CommandOptions class="search-results">
            {() => (
              <>
                <solid:for each={results}>
                  {(result: Result) => (
                    <CommandOption class="search-result" value={result}>
                      {isSection(result) ? <SectionIcon /> : <PageIcon />}
                      <span class="search-result-body">
                        <span class="search-result-title">
                          {result.heading}
                          <solid:show when={isSection(result)}>
                            <span class="search-result-page">{result.page}</span>
                          </solid:show>
                        </span>
                        <span class="search-result-text">{makeSnippet(result.text, query)}</span>
                      </span>
                    </CommandOption>
                  )}
                </solid:for>
                <solid:show when={results.length === 0}>
                  <li class="search-empty" role="presentation">
                    {query.trim() === '' ? 'Search the docs.' : `No results for “${query}”`}
                  </li>
                </solid:show>
              </>
            )}
          </CommandOptions>
        </Command>
      </CommandBarPanel>
    </CommandBar>
  );
}

const host = document.createElement('div');
document.body.append(host);
render(() => <Search />, host);
