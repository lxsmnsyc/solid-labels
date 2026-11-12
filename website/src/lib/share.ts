export interface ReplState {
  code: string;
  dev: boolean;
}

// The URL hash holds the editor state as base64url of UTF-8 JSON.
// It works in the browser and in Node, so the site can build REPL links at build time.

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/** Returns the hash value (without `#`) that restores `state`. */
export function encodeState(state: ReplState): string {
  return toBase64Url(JSON.stringify({ c: state.code, d: state.dev ? 1 : 0 }));
}

/** Reads a hash value. Returns `undefined` when it is empty or damaged. */
export function decodeState(hash: string): ReplState | undefined {
  const value = hash.startsWith('#') ? hash.slice(1) : hash;
  if (value === '') {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(value));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'c' in parsed &&
      typeof parsed.c === 'string'
    ) {
      return { code: parsed.c, dev: 'd' in parsed && parsed.d === 1 };
    }
  } catch {
    // A damaged link falls back to the default example.
  }
  return undefined;
}
