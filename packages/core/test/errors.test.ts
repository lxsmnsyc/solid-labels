import { describe, expect, it } from 'vitest';
import { transform } from './util';

describe('compile errors', () => {
  it('rejects $signal outside declarations', async () => {
    await expect(transform('foo($signal(0));')).rejects.toThrow(
      '$signal must initialize a variable declaration',
    );
  });
  it('rejects $get on plain variables', async () => {
    await expect(transform('const x = 1; const y = $get(x);')).rejects.toThrow(
      '$get must be used on a reactive variable',
    );
  });
  it('rejects exports of reactive variables', async () => {
    await expect(
      transform('let count = $signal(0); export { count };'),
    ).rejects.toThrow('Cannot export reactive variable');
  });
  it('rejects $set on memos', async () => {
    await expect(
      transform('const m = $memo(compute()); const s = $set(m);'),
    ).rejects.toThrow('$set must be used on a signal variable');
  });
});
