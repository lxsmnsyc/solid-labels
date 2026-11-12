import { describe, expect, it } from 'vitest';
import transform from './util';

describe('class expression names', () => {
  it('keeps the inner name of a class expression local', () => {
    const code = 'const o = class $signal { m(){ return $signal; } };';
    expect(transform(code)).toBe(code);
  });
  it('does not compile a call to a class expression named like a macro', () => {
    const code = 'const o = class $effect { m(){ return $effect(() => 1); } };';
    expect(transform(code)).toBe(code);
  });
  it('uses the class for a JSX name instead of importing', () => {
    const out = transform('const o = class Show { m(){ return <Show />; } };');
    expect(out).not.toContain('_Show');
    expect(out).not.toContain('solid-js');
  });
});

describe('parameter defaults', () => {
  it('treats $signal in a default as the macro despite a body var of that name', () => {
    expect(() => transform('function f(x = $signal(1)) { var $signal = 1; }')).toThrow(
      '$signal must initialize a variable declaration',
    );
  });
  it('imports Show for a default despite a body var of that name', () => {
    const out = transform('function f(x = <Show when={a}>hi</Show>) { var Show = 1; }');
    expect(out).toMatch(/import .*Show/);
  });
  it('still lets the body see its own var', () => {
    const code = 'function f(x = 1) { var $signal = 1; return $signal; }';
    expect(transform(code)).toBe(code);
  });
});

describe('function expression names', () => {
  it('binds the inner name to a same-named parameter', () => {
    const code = '(function $signal($signal) { return $signal; });';
    expect(transform(code)).toBe(code);
  });
});
