import { describe, expect, it } from 'vitest';
import transform from './util';

describe('compile errors', () => {
  it('rejects $signal outside declarations', () => {
    expect(() => transform('foo($signal(0));')).toThrow(
      '$signal must initialize a variable declaration',
    );
  });
  it('rejects $get on plain variables', () => {
    expect(() => transform('const x = 1; const y = $get(x);')).toThrow(
      '$get must be used on a reactive variable',
    );
  });
  it('rejects exports of reactive variables', () => {
    expect(() => transform('let count = $signal(0); export { count };')).toThrow(
      'Cannot export reactive variable',
    );
  });
  it('rejects $set on memos', () => {
    expect(() => transform('const m = $memo(compute()); const s = $set(m);')).toThrow(
      '$set must be used on a signal variable',
    );
  });
});
