import { compile } from '../compiler';
import type { Options } from '../compiler';

export async function transform(
  code: string,
  options?: Options,
  id = 'test.tsx',
): Promise<string> {
  const result = await compile(id, code, options);
  return result.code;
}
