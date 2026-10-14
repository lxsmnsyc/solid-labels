import type { Node } from './ast';

/** Compilation failure carrying a 1-based line/column derived from the source offset. */
export class CompileError extends Error {
  line: number;
  column: number;

  constructor(message: string, code: string, start: number) {
    let line = 1;
    let lineStart = 0;
    for (let i = 0; i < start && i < code.length; i++) {
      if (code[i] === '\n') {
        line++;
        lineStart = i + 1;
      }
    }
    const column = start - lineStart + 1;
    super(`${message} (${line}:${column})`);
    this.name = 'CompileError';
    this.line = line;
    this.column = column;
  }
}

/** Throws a `CompileError` positioned at the node's start offset. */
export function compileError(code: string, node: Node, message: string): never {
  throw new CompileError(message, code, node.start);
}
