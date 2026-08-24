import type MagicString from 'magic-string';

export interface Options {
  /** Adds debug names to signals and memos. */
  dev?: boolean;
  /** Disable individual compile-time functions by name (e.g. `{ $signal: true }`). */
  disabled?: {
    ctf?: Record<string, boolean>;
  };
}

export interface CompileOutput {
  code: string;
  map: ReturnType<MagicString['generateMap']>;
}
