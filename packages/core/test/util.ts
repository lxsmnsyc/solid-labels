import { compile } from '../compiler';
import type { Options } from '../compiler';

export default function transform(code: string, options?: Options, id = 'test.tsx'): string {
  const result = compile(id, code, options);
  return result.code;
}
