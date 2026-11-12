// A small scanner for the code this site shows: TS, TSX and the output of
// solid-labels. It also marks what the compiler cares about. Compile-time
// functions (`$signal`) get one class, and identifiers the compiler generated
// (`_createSignal`, `setcount_1`) get another, so the two sides of a pair read
// as source and result.

const KEYWORDS = new Set([
  'as',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'of',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'yield',
]);

const TOKEN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^`\\])*`|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")|(\b\d[\d_]*(?:\.\d+)?\b)|((?<![\w$)\]])<\/?)([A-Za-z_$][\w$:.-]*)|([A-Za-z_$][\w$]*)/y;

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

/** Escapes text for use in HTML content and attribute values. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (char) => ESCAPES[char]);
}

function classifyIdentifier(name: string): string {
  if (name.startsWith('$')) {
    return 'ctf';
  }
  if (/^_[a-z]/.test(name) || /_\d+$/.test(name)) {
    return 'gen';
  }
  if (KEYWORDS.has(name)) {
    return 'kw';
  }
  return '';
}

function wrap(className: string, text: string): string {
  const escaped = escapeHtml(text);
  return className === '' ? escaped : `<span class="t-${className}">${escaped}</span>`;
}

/** Turns source text into HTML with `t-*` token classes. */
export function highlight(source: string): string {
  let html = '';
  let plainFrom = 0;

  // The sticky scanner only matches at lastIndex. On a miss, the character is
  // plain text and the scan moves one step.
  let index = 0;
  while (index < source.length) {
    TOKEN.lastIndex = index;
    const match = TOKEN.exec(source);
    if (match === null) {
      index += 1;
      continue;
    }

    // Flush plain text before the token.
    html += escapeHtml(source.slice(plainFrom, index));
    plainFrom = index + match[0].length;
    index = plainFrom;

    // Groups that did not take part in the match are undefined.
    const comment = match.at(1);
    const string = match.at(2);
    const number = match.at(3);
    const tagOpen = match.at(4);
    const tagName = match.at(5);
    const identifier = match.at(6);
    if (comment !== undefined) {
      html += wrap('comment', comment);
    } else if (string !== undefined) {
      html += wrap('string', string);
    } else if (number !== undefined) {
      html += wrap('number', number);
    } else if (tagName === undefined) {
      html += wrap(classifyIdentifier(identifier ?? ''), identifier ?? '');
    } else {
      // A JSX tag. `solid:for` style names are compile-time too.
      let tagClass = 'tag';
      if (tagName.startsWith('solid:')) {
        tagClass = 'ctf';
      } else if (tagName.startsWith('_')) {
        tagClass = 'gen';
      }
      html += escapeHtml(tagOpen ?? '');
      html += wrap(tagClass, tagName);
    }
  }
  html += escapeHtml(source.slice(plainFrom));
  return html;
}
