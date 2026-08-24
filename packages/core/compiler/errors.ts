import type { Node } from './ast';

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

export function compileError(code: string, node: Node, message: string): never {
  throw new CompileError(message, code, node.start);
}
