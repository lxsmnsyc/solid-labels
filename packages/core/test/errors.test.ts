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
  it('rejects unknown solid: element names', () => {
    expect(() => transform('const view = <solid:unknown>x</solid:unknown>;')).toThrow(
      'Unknown namespace component <solid:unknown>',
    );
    expect(() => transform('const view = <solid:unknown>x</solid:unknown>;')).toThrow('(1:15)');
    expect(() => transform('const view = <solid:constructor />;')).toThrow(
      'Unknown namespace component <solid:constructor>',
    );
  });
  it('points <solid:dynamic> at dynamic()', () => {
    expect(() => transform('const view = <solid:dynamic component={C} />;')).toThrow(
      'Use `dynamic()` from `@solidjs/web`',
    );
    expect(() => transform('\n  const view = <solid:dynamic component={C} />;')).toThrow('(2:');
  });
});
