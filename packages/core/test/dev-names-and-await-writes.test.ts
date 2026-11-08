import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vitest';
import { compile } from '../compiler';

/** Compiles a TypeScript source and returns the code without the import header. */
function compileBody(source: string, dev: boolean): string {
  const result = compile('test.ts', source, { dev });
  expect(result).not.toBeNull();
  const code = result?.code ?? '';

  // Every output must be valid code.
  const parsed = parseSync('test.ts', code, { lang: 'ts', sourceType: 'module' });
  expect(parsed.errors).toEqual([]);

  return code.replace(/^import .*\n/gm, '');
}

interface Case {
  title: string;
  source: string;
  output: string;
  devOutput: string;
}

const SIGNAL = 'let c = $signal(0); ';
const SIGNAL_OUT = 'let [c, setc_1] = _createSignal(0); ';
const SIGNAL_DEV_OUT = 'let [c, setc_1] = _createSignal(0, { name: "c" }); ';

const DEV_NAME_CASES: Case[] = [
  {
    title: 'memo of a bare signal read',
    source: `${SIGNAL}const m = $memo(c);`,
    output: `${SIGNAL_OUT}const m = _createMemo(() => c());`,
    devOutput: `${SIGNAL_DEV_OUT}const m = _createMemo(() => c(), { name: "m" });`,
  },
  {
    title: 'memo of a parenthesized expression',
    source: `${SIGNAL}const m = $memo((c + 1));`,
    output: `${SIGNAL_OUT}const m = _createMemo((() => c() + 1));`,
    devOutput: `${SIGNAL_DEV_OUT}const m = _createMemo((() => c() + 1), { name: "m" });`,
  },
  {
    title: 'memo of a doubly parenthesized signal read',
    source: `${SIGNAL}const m = $memo(((c)));`,
    output: `${SIGNAL_OUT}const m = _createMemo(((() => c())));`,
    devOutput: `${SIGNAL_DEV_OUT}const m = _createMemo(((() => c())), { name: "m" });`,
  },
  {
    title: 'memo of a compound write',
    source: `${SIGNAL}const m = $memo(c += 2);`,
    output: `${SIGNAL_OUT}const m = _createMemo(() => setc_1(current_1 => current_1 += 2));`,
    devOutput: `${SIGNAL_DEV_OUT}const m = _createMemo(() => setc_1(current_1 => current_1 += 2), { name: "m" });`,
  },
  {
    title: 'memo of a plain write through a wrapper',
    source: `${SIGNAL}const m = $memo((c as any) = 3);`,
    output: `${SIGNAL_OUT}const m = _createMemo(() => setc_1(() => 3));`,
    devOutput: `${SIGNAL_DEV_OUT}const m = _createMemo(() => setc_1(() => 3), { name: "m" });`,
  },
  {
    title: 'memo of a compound write through a non-null wrapper',
    source: `${SIGNAL}const m = $memo(c! += 2);`,
    output: `${SIGNAL_OUT}const m = _createMemo(() => setc_1(current_1 => current_1 += 2));`,
    devOutput: `${SIGNAL_DEV_OUT}const m = _createMemo(() => setc_1(current_1 => current_1 += 2), { name: "m" });`,
  },
  {
    title: 'memo with a trailing comma',
    source: `${SIGNAL}const m = $memo(c,);`,
    output: `${SIGNAL_OUT}const m = _createMemo(() => c(),);`,
    devOutput: `${SIGNAL_DEV_OUT}const m = _createMemo(() => c(), { name: "m" },);`,
  },
  {
    title: 'memo with an options object',
    source: `${SIGNAL}const m = $memo(c, { equals: false });`,
    output: `${SIGNAL_OUT}const m = _createMemo(() => c(), { equals: false });`,
    devOutput: `${SIGNAL_DEV_OUT}const m = _createMemo(() => c(), Object.assign({ name: "m" }, { equals: false }));`,
  },
  {
    title: 'memo with parenthesized options',
    source: `${SIGNAL}const m = $memo(c, ({ equals: false }));`,
    output: `${SIGNAL_OUT}const m = _createMemo(() => c(), ({ equals: false }));`,
    devOutput: `${SIGNAL_DEV_OUT}const m = _createMemo(() => c(), Object.assign({ name: "m" }, ({ equals: false })));`,
  },
  {
    title: 'memo whose options are a signal read',
    source: `${SIGNAL}let o = $signal({}); const m = $memo(c, o);`,
    output: `${SIGNAL_OUT}let [o, seto_1] = _createSignal({}); const m = _createMemo(() => c(), o());`,
    devOutput: `${SIGNAL_DEV_OUT}let [o, seto_1] = _createSignal({}, { name: "o" }); const m = _createMemo(() => c(), Object.assign({ name: "m" }, o()));`,
  },
  {
    title: 'signal without arguments',
    source: 'let s = $signal();',
    output: 'let [s, sets_1] = _createSignal();',
    devOutput: 'let [s, sets_1] = _createSignal(void 0, { name: "s" });',
  },
  {
    title: 'signal of a parenthesized expression',
    source: `${SIGNAL}let s = $signal((c + 1));`,
    output: `${SIGNAL_OUT}let [s, sets_1] = _createSignal((() => c() + 1));`,
    devOutput: `${SIGNAL_DEV_OUT}let [s, sets_1] = _createSignal((() => c() + 1), { name: "s" });`,
  },
  {
    title: 'signal of a bare signal read',
    source: `${SIGNAL}let s = $signal(c);`,
    output: `${SIGNAL_OUT}let [s, sets_1] = _createSignal(() => c());`,
    devOutput: `${SIGNAL_DEV_OUT}let [s, sets_1] = _createSignal(() => c(), { name: "s" });`,
  },
  {
    title: 'signal with a trailing comma',
    source: 'let s = $signal(0,);',
    output: 'let [s, sets_1] = _createSignal(0,);',
    devOutput: 'let [s, sets_1] = _createSignal(0, { name: "s" },);',
  },
  {
    title: 'signal with an options object',
    source: 'let s = $signal(0, { equals: false });',
    output: 'let [s, sets_1] = _createSignal(0, { equals: false });',
    devOutput:
      'let [s, sets_1] = _createSignal(0, Object.assign({ name: "s" }, { equals: false }));',
  },
];

// $deferred takes a dev name like $memo. $children, $mapArray and $repeat take none, so both modes match.
const ACCESSOR_CASES: Case[] = [
  {
    title: '$deferred of a bare signal read',
    source: `${SIGNAL}const d = $deferred(c);`,
    output: `${SIGNAL_OUT}const d = _createDeferred(() => c());`,
    devOutput: `${SIGNAL_DEV_OUT}const d = _createDeferred(() => c(), { name: "d" });`,
  },
  {
    title: '$deferred of a parenthesized expression',
    source: `${SIGNAL}const d = $deferred((c + 1));`,
    output: `${SIGNAL_OUT}const d = _createDeferred((() => c() + 1));`,
    devOutput: `${SIGNAL_DEV_OUT}const d = _createDeferred((() => c() + 1), { name: "d" });`,
  },
  {
    title: '$deferred of a compound write',
    source: `${SIGNAL}const d = $deferred(c += 2);`,
    output: `${SIGNAL_OUT}const d = _createDeferred(() => setc_1(current_1 => current_1 += 2));`,
    devOutput: `${SIGNAL_DEV_OUT}const d = _createDeferred(() => setc_1(current_1 => current_1 += 2), { name: "d" });`,
  },
  {
    title: '$deferred with options',
    source: `${SIGNAL}const d = $deferred(c, { timeoutMs: 100 });`,
    output: `${SIGNAL_OUT}const d = _createDeferred(() => c(), { timeoutMs: 100 });`,
    devOutput: `${SIGNAL_DEV_OUT}const d = _createDeferred(() => c(), Object.assign({ name: "d" }, { timeoutMs: 100 }));`,
  },
  {
    title: '$children of a bare signal read',
    source: `${SIGNAL}const d = $children(c);`,
    output: `${SIGNAL_OUT}const d = _children(() => c());`,
    devOutput: `${SIGNAL_DEV_OUT}const d = _children(() => c());`,
  },
  {
    title: '$mapArray of a parenthesized signal read',
    source: `${SIGNAL}const d = $mapArray((c), (v) => v);`,
    output: `${SIGNAL_OUT}const d = _mapArray((() => c()), (v) => v);`,
    devOutput: `${SIGNAL_DEV_OUT}const d = _mapArray((() => c()), (v) => v);`,
  },
  {
    title: '$repeat of a bare signal read',
    source: `${SIGNAL}const d = $repeat(c, 3);`,
    output: `${SIGNAL_OUT}const d = _repeat(() => c(), 3);`,
    devOutput: `${SIGNAL_DEV_OUT}const d = _repeat(() => c(), 3);`,
  },
];

const X_OUT = 'let [x, setx_1] = _createSignal(0); ';
const X_DEV_OUT = 'let [x, setx_1] = _createSignal(0, { name: "x" }); ';

const AWAIT_CASES: Case[] = [
  {
    title: 'unparenthesized concise async arrow',
    source: 'let x = $signal(0); const f = async () => x = await g();',
    output: `${X_OUT}const f = async () => { const tmp_1 = await g(); return setx_1(() => tmp_1); };`,
    devOutput: `${X_DEV_OUT}const f = async () => { const tmp_1 = await g(); return setx_1(() => tmp_1); };`,
  },
  {
    title: 'parenthesized concise async arrow',
    source: 'let x = $signal(0); const f = async () => (x = await g());',
    output: `${X_OUT}const f = async () => { const tmp_1 = await g(); return setx_1(() => tmp_1); };`,
    devOutput: `${X_DEV_OUT}const f = async () => { const tmp_1 = await g(); return setx_1(() => tmp_1); };`,
  },
  {
    title: 'concise async arrow with a wrapped target',
    source: 'let x = $signal(0); const f = async () => (x as any) = await g();',
    output: `${X_OUT}const f = async () => { const tmp_1 = await g(); return setx_1(() => tmp_1); };`,
    devOutput: `${X_DEV_OUT}const f = async () => { const tmp_1 = await g(); return setx_1(() => tmp_1); };`,
  },
  {
    title: 'concise async arrow with a parenthesized right side',
    source: 'let x = $signal(0); const f = async () => x = (await g());',
    output: `${X_OUT}const f = async () => { const tmp_1 = (await g()); return setx_1(() => tmp_1); };`,
    devOutput: `${X_DEV_OUT}const f = async () => { const tmp_1 = (await g()); return setx_1(() => tmp_1); };`,
  },
  {
    title: 'compound write with await in a statement',
    source: 'let x = $signal(0); async function f() { x += await g(); }',
    output: `${X_OUT}async function f() { const tmp_1 = x(); const tmp_2 = await g();\nsetx_1(() => tmp_1 + tmp_2); }`,
    devOutput: `${X_DEV_OUT}async function f() { const tmp_1 = x(); const tmp_2 = await g();\nsetx_1(() => tmp_1 + tmp_2); }`,
  },
  {
    title: 'compound write with await through a wrapper',
    source: 'let x = $signal(0); async function f() { (x as number) -= await g(); }',
    output: `${X_OUT}async function f() { const tmp_1 = x(); const tmp_2 = await g();\nsetx_1(() => tmp_1 - tmp_2); }`,
    devOutput: `${X_DEV_OUT}async function f() { const tmp_1 = x(); const tmp_2 = await g();\nsetx_1(() => tmp_1 - tmp_2); }`,
  },
  {
    title: 'compound write with await in a concise arrow',
    source: 'let x = $signal(0); const f = async () => x += await g();',
    output: `${X_OUT}const f = async () => { const tmp_1 = x(); const tmp_2 = await g(); return setx_1(() => tmp_1 + tmp_2); };`,
    devOutput: `${X_DEV_OUT}const f = async () => { const tmp_1 = x(); const tmp_2 = await g(); return setx_1(() => tmp_1 + tmp_2); };`,
  },
  {
    title: 'compound write with await in a parenthesized concise arrow',
    source: 'let x = $signal(0); const f = async () => (x *= await g());',
    output: `${X_OUT}const f = async () => { const tmp_1 = x(); const tmp_2 = await g(); return setx_1(() => tmp_1 * tmp_2); };`,
    devOutput: `${X_DEV_OUT}const f = async () => { const tmp_1 = x(); const tmp_2 = await g(); return setx_1(() => tmp_1 * tmp_2); };`,
  },
  {
    title: 'compound write with yield',
    source: 'let x = $signal(0); function* f() { x += yield 1; }',
    output: `${X_OUT}function* f() { const tmp_1 = x(); const tmp_2 = yield 1;\nsetx_1(() => tmp_1 + tmp_2); }`,
    devOutput: `${X_DEV_OUT}function* f() { const tmp_1 = x(); const tmp_2 = yield 1;\nsetx_1(() => tmp_1 + tmp_2); }`,
  },
  {
    title: 'logical write with await in a statement',
    source: 'let x = $signal(0); async function f() { x ||= await g(); }',
    output: `${X_OUT}async function f() { const tmp_1 = x(); if (!tmp_1) { const tmp_2 = await g();\nsetx_1(() => tmp_2); }; }`,
    devOutput: `${X_DEV_OUT}async function f() { const tmp_1 = x(); if (!tmp_1) { const tmp_2 = await g();\nsetx_1(() => tmp_2); }; }`,
  },
  {
    title: 'logical and write with yield in a statement',
    source: 'let x = $signal(0); function* f() { x &&= yield 1; }',
    output: `${X_OUT}function* f() { const tmp_1 = x(); if (tmp_1) { const tmp_2 = yield 1;\nsetx_1(() => tmp_2); }; }`,
    devOutput: `${X_DEV_OUT}function* f() { const tmp_1 = x(); if (tmp_1) { const tmp_2 = yield 1;\nsetx_1(() => tmp_2); }; }`,
  },
  {
    title: 'nullish write with await in a concise arrow',
    source: 'let x = $signal(0); const f = async () => x ??= await g();',
    output: `${X_OUT}const f = async () => { const tmp_1 = x(); if (tmp_1 == null) { const tmp_2 = await g(); return setx_1(() => tmp_2); } return tmp_1; };`,
    devOutput: `${X_DEV_OUT}const f = async () => { const tmp_1 = x(); if (tmp_1 == null) { const tmp_2 = await g(); return setx_1(() => tmp_2); } return tmp_1; };`,
  },
  {
    title: 'plain write with yield',
    source: 'let x = $signal(0); function* f() { x = yield 1; }',
    output: `${X_OUT}function* f() { const tmp_1 = yield 1;\nsetx_1(() => tmp_1); }`,
    devOutput: `${X_DEV_OUT}function* f() { const tmp_1 = yield 1;\nsetx_1(() => tmp_1); }`,
  },
];

function defineCases(cases: Case[]): void {
  for (const item of cases) {
    it(`${item.title} (default)`, () => {
      expect(compileBody(item.source, false)).toBe(item.output);
    });
    it(`${item.title} (dev)`, () => {
      expect(compileBody(item.source, true)).toBe(item.devOutput);
    });
  }
}

describe('dev name options', () => {
  defineCases(DEV_NAME_CASES);
});

describe('accessor CTFs', () => {
  defineCases(ACCESSOR_CASES);
});

describe('writes with await or yield', () => {
  defineCases(AWAIT_CASES);
});
