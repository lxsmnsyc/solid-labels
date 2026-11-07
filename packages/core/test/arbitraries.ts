import fc from 'fast-check';

export interface GeneratedProgram {
  /** Module source, valid before compiling. */
  source: string;
  /** File id to pass to compile(); its extension sets the language. */
  id: 'gen.tsx' | 'gen.jsx';
}

export interface StraightLineProgram {
  /** Uses $signal/$memo; imports `flush` from 'solid-js'; exports `observe`. */
  source: string;
  /** The same statements as plain JS; exports `observe`. */
  plain: string;
  id: 'gen.js';
}

/** Largest share of samples that `compile()` may reject with `CompileError`. */
export const COMPILE_ERROR_BOUND = 0.3;

// ---------------------------------------------------------------------------
// Scope model
// ---------------------------------------------------------------------------

interface Scope {
  /** `$signal` variables in view. */
  signals: string[];
  /** `$memo` variables in view. */
  memos: string[];
  /** `$(expr)` derived variables in view. */
  derived: string[];
  /** Names bound by `$destructure` or a `$component` parameter pattern. */
  destructured: string[];
  /** Plain variables; they may be written. */
  plains: string[];
  /** Compile-time function or component names rebound to plain values. */
  shadowed: string[];
  /** `props` is in view. */
  props: boolean;
  jsx: boolean;
  ts: boolean;
  /** Writes to signals are allowed (not inside `$memo` and `$(expr)` values). */
  write: boolean;
  /** Inside an effect callback; ref functions on captured variables are CompileErrors there. */
  inEffect: boolean;
  /** Counter for fresh local names. */
  next: number;
}

type DeclKind = 'signal' | 'memo' | 'derived' | 'destructured' | 'plain';

interface Decl {
  kind: DeclKind;
  name: string;
}

interface Stmt {
  code: string;
  decls: Decl[];
}

function scopeKey(scope: Scope): string {
  return JSON.stringify(scope);
}

/** Expressions never read the name counter, so it stays out of their cache key. */
function exprKey(scope: Scope): string {
  return JSON.stringify({ ...scope, next: 0 });
}

function fresh(scope: Scope, prefix: string): string {
  return `${prefix}${scope.next}`;
}

function bump(scope: Scope): Scope {
  return { ...scope, next: scope.next + 1 };
}

function without(names: string[], name: string): string[] {
  const out: string[] = [];
  for (const item of names) {
    if (item !== name) {
      out.push(item);
    }
  }
  return out;
}

function withPlain(scope: Scope, ...names: string[]): Scope {
  return { ...scope, plains: [...scope.plains, ...names] };
}

/** Rebinds a name to a plain value for a nested scope. */
function shadowReactive(scope: Scope, name: string): Scope {
  return {
    ...scope,
    signals: without(scope.signals, name),
    memos: without(scope.memos, name),
    derived: without(scope.derived, name),
    destructured: without(scope.destructured, name),
    plains: [...without(scope.plains, name), name],
  };
}

function extend(scope: Scope, decls: Decl[]): Scope {
  let out: Scope = bump(scope);
  for (const decl of decls) {
    // A fresh declaration is a nested binding of the same name; drop older kinds.
    out = shadowReactive(out, decl.name);
    out.plains = without(out.plains, decl.name);
    switch (decl.kind) {
      case 'signal':
        out.signals = [...out.signals, decl.name];
        break;
      case 'memo':
        out.memos = [...out.memos, decl.name];
        break;
      case 'derived':
        out.derived = [...out.derived, decl.name];
        break;
      case 'destructured':
        out.destructured = [...out.destructured, decl.name];
        break;
      default:
        out.plains = [...out.plains, decl.name];
        break;
    }
  }
  return out;
}

function readable(scope: Scope): string[] {
  return [
    ...scope.signals,
    ...scope.memos,
    ...scope.derived,
    ...scope.destructured,
    ...scope.plains,
  ];
}

function writable(scope: Scope): string[] {
  return scope.write ? [...scope.signals, ...scope.plains] : [...scope.plains];
}

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

const intLit = fc.integer({ min: 0, max: 9 }).map(String);
const strLit = fc.constantFrom('"s"', "'t'", '`u`');
const binaryOp = fc.constantFrom('+', '-', '*', '&&', '||', '??', '===', '<');
const compoundOp = fc.constantFrom('+=', '-=', '*=');
const keyName = fc.constantFrom('k', 'v', 'key', 'value');

const CACHE_LIMIT = 3000;

/** Stores a built arbitrary; a full cache is dropped so memory stays bounded across test files. */
function remember<T>(cache: Map<string, T>, key: string, value: T): void {
  if (cache.size >= CACHE_LIMIT) {
    cache.clear();
  }
  cache.set(key, value);
}

const exprCache = new Map<string, fc.Arbitrary<string>>();

function exprArb(scope: Scope, depth: number): fc.Arbitrary<string> {
  const key = `${exprKey(scope)}|${depth}`;
  let found = exprCache.get(key);
  if (!found) {
    found = buildExpr(scope, depth);
    remember(exprCache, key, found);
  }
  return found;
}

function leafArb(scope: Scope): fc.Arbitrary<string> {
  const options: fc.Arbitrary<string>[] = [intLit, strLit];
  if (scope.props) {
    options.push(fc.constant('props.x'));
  }
  const names = readable(scope);
  if (names.length > 0) {
    options.push(fc.constantFrom(...names), fc.constantFrom(...names));
  }
  return fc.oneof({ withCrossShrink: true }, ...options);
}

function buildExpr(scope: Scope, depth: number): fc.Arbitrary<string> {
  if (depth <= 0) {
    return leafArb(scope);
  }
  const sub = exprArb(scope, depth - 1);
  const noWrite: Scope = { ...scope, write: false };
  const options: fc.Arbitrary<string>[] = [leafArb(scope), leafArb(scope)];

  options.push(
    fc.tuple(sub, binaryOp, sub).map(([l, op, r]) => `(${l} ${op} ${r})`),
    sub.map((e) => `f(${e})`),
    sub.map((e) => `f(${e}, ...[${e}])`),
    fc.tuple(keyName, sub).map(([k, e]) => `{ ${k}: ${e} }`),
    fc.tuple(keyName, sub).map(([k, e]) => `{ [${k}]: ${e}, ...{ z: 1 } }`),
    sub.map((e) => `[${e}, ${e}]`),
    sub.map((e) => `(() => (${e}))()`),
    sub.map((e) => `\`v\${${e}}\``),
    fc.tuple(sub, sub, sub).map(([c, a, b]) => `${c} ? ${a} : ${b}`),
    sub.map((e) => `g?.(${e})`),
    sub.map((e) => `(${e}).length`),
  );

  // Shorthand properties and ref functions need a reactive name.
  const reactive = [...scope.signals, ...scope.memos, ...scope.derived, ...scope.destructured];
  if (reactive.length > 0) {
    const name = fc.constantFrom(...reactive);
    options.push(
      name.map((n) => `{ ${n} }`),
      name.map((n) => `{ ${n}, k: 1 }`),
    );
  }

  // Updates and writes.
  const targets = writable(scope);
  if (targets.length > 0) {
    const target = fc.constantFrom(...targets);
    options.push(
      target.map((n) => `${n}++`),
      target.map((n) => `${n}--`),
      target.map((n) => `++${n}`),
      target.map((n) => `--${n}`),
      fc.tuple(target, sub).map(([n, e]) => `(${n} = ${e})`),
      fc.tuple(target, sub).map(([n, e]) => `(${n} = (${e}))`),
      fc.tuple(target, compoundOp, sub).map(([n, op, e]) => `(${n} ${op} ${e})`),
      fc.tuple(target, sub).map(([n, e]) => `log(${n} = ${e})`),
    );
  }

  // $untrack and the ref functions, unless the name is rebound here.
  options.push(sub.map((e) => `$untrack(${e})`));
  if (scope.shadowed.includes('$untrack')) {
    // A plain call of the rebound function.
    options.push(fc.tuple(sub, sub).map(([a, b]) => `$untrack(${a}, ${b})`));
  } else {
    options.push(fc.tuple(sub, sub).map(([a, b]) => `$untrack(${a} + ${b})`));
  }
  if (!scope.shadowed.includes('$get') && !scope.inEffect) {
    const readableReactive = [...scope.signals, ...scope.memos];
    if (readableReactive.length > 0) {
      const name = fc.constantFrom(...readableReactive);
      options.push(name.map((n) => `$get(${n})`));
    }
    if (scope.memos.length > 0) {
      options.push(fc.constantFrom(...scope.memos).map((n) => `$refMemo(${n})`));
    }
    if (scope.signals.length > 0) {
      const sig = fc.constantFrom(...scope.signals);
      options.push(
        fc.tuple(sig, sub).map(([n, e]) => `$set(${n})(${e})`),
        fc.tuple(sig, sub).map(([n, e]) => `$set(${n})((prev) => prev + ${e})`),
        sig.map((n) => `$refSignal(${n})`),
        sig.map((n) => `$refSignal(${n})[0]()`),
      );
    }
  }

  // Object literals with ref-function properties.
  if (!scope.shadowed.includes('$get') && !scope.inEffect) {
    const props: fc.Arbitrary<string>[] = [];
    if (scope.signals.length > 0) {
      const sig = fc.constantFrom(...scope.signals);
      props.push(
        sig.map((n) => `a: $getter(${n})`),
        sig.map((n) => `b: $setter(${n})`),
        sig.map((n) => `c: $property(${n})`),
        sig.map((n) => `['d']: $property(${n})`),
      );
    }
    if (scope.memos.length > 0) {
      const memo = fc.constantFrom(...scope.memos);
      props.push(
        memo.map((n) => `a: $getter(${n})`),
        memo.map((n) => `c: $property(${n})`),
      );
    }
    if (props.length > 0) {
      options.push(fc.oneof(...props).map((p) => `{ ${p} }`));
    }
  }

  // TypeScript wrappers.
  if (scope.ts) {
    options.push(
      sub.map((e) => `(${e} as number)`),
      sub.map((e) => `(${e}) as any`),
      sub.map((e) => `(${e})!`),
      sub.map((e) => `(${e} satisfies unknown)`),
    );
  }

  // JSX elements.
  if (scope.jsx && depth >= 1) {
    options.push(
      jsxArb(scope, depth - 1).map((j) => `(${j})`),
      jsxArb(noWrite, depth - 1).map((j) => `(${j})`),
    );
  }

  return fc.oneof({ withCrossShrink: true }, ...options);
}

// ---------------------------------------------------------------------------
// JSX
// ---------------------------------------------------------------------------

const jsxCache = new Map<string, fc.Arbitrary<string>>();

function jsxArb(scope: Scope, depth: number): fc.Arbitrary<string> {
  const key = `${exprKey(scope)}|${depth}`;
  let found = jsxCache.get(key);
  if (!found) {
    found = buildJsx(scope, depth);
    remember(jsxCache, key, found);
  }
  return found;
}

function buildJsx(scope: Scope, depth: number): fc.Arbitrary<string> {
  const value = exprArb(scope, Math.max(0, depth - 1));
  const child: fc.Arbitrary<string> =
    depth > 0
      ? fc.oneof(
          value.map((e) => `{${e}}`),
          jsxArb(scope, depth - 1),
          fc.constant('text'),
        )
      : fc.oneof(
          value.map((e) => `{${e}}`),
          fc.constant('text'),
        );
  const item = `it${depth}`;
  const itemScope = withPlain(scope, item);
  const itemChild = exprArb(itemScope, Math.max(0, depth - 1));
  // Fixed counter: this arbitrary is cached without the counter, so its output must not depend on it.
  const handler = blockArb({ ...scope, next: 5000 + depth }, 1, 0);

  const options: fc.Arbitrary<string>[] = [
    fc.tuple(value, child).map(([e, c]) => `<div title={${e}}>${c}</div>`),
    fc.tuple(value, value).map(([a, b]) => `<input value={${a}} class={${b}} />`),
    value.map((e) => `<div {...{ title: ${e} }} />`),
    value.map((e) => `<div>{${e}}{${e}}</div>`),
    fc
      .tuple(value, child, value)
      .map(([w, c, f]) => `<Show when={${w}} fallback={${f}}>${c}</Show>`),
    fc.tuple(value, child).map(([w, c]) => `<solid:show when={${w}}>${c}</solid:show>`),
    fc
      .tuple(value, itemChild)
      .map(([e, c]) => `<For each={[${e}, 1]}>{(${item}) => <li>{${c}}</li>}</For>`),
    itemChild.map((c) => `<solid:for each={[1, 2]}>{(${item}) => <b>{${c}}</b>}</solid:for>`),
    fc
      .tuple(value, child)
      .map(
        ([w, c]) =>
          `<solid:switch><solid:match when={${w}}>${c}</solid:match><solid:match when={1}>x</solid:match></solid:switch>`,
      ),
    fc.tuple(value, child).map(([w, c]) => `<Switch><Match when={${w}}>${c}</Match></Switch>`),
    handler.map((b) => `<button onClick={() => ${b}}>go</button>`),
    child.map((c) => `<><span>${c}</span></>`),
  ];
  return fc.oneof({ withCrossShrink: true }, ...options);
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

const stmtCache = new Map<string, fc.Arbitrary<Stmt>>();
const blockCache = new Map<string, fc.Arbitrary<string>>();

function simple(code: string): Stmt {
  return { code, decls: [] };
}

function stmtArb(scope: Scope, depth: number): fc.Arbitrary<Stmt> {
  const key = `${scopeKey(scope)}|${depth}`;
  let found = stmtCache.get(key);
  if (!found) {
    found = buildStmt(scope, depth);
    remember(stmtCache, key, found);
  }
  return found;
}

/** A `{ ... }` block of 1..count statements; declarations extend the scope for later ones. */
function blockArb(scope: Scope, count: number, depth: number): fc.Arbitrary<string> {
  const key = `${scopeKey(scope)}|${count}|${depth}`;
  let found = blockCache.get(key);
  if (!found) {
    found = fc
      .integer({ min: 1, max: count })
      .chain((n) => statementsArb(scope, n, depth).map((body) => `{\n${body}}`));
    remember(blockCache, key, found);
  }
  return found;
}

/** `n` statements, each seeing the declarations before it. */
function statementsArb(scope: Scope, n: number, depth: number): fc.Arbitrary<string> {
  if (n <= 0) {
    return fc.constant('');
  }
  return stmtArb(scope, depth).chain((first) =>
    statementsArb(extend(scope, first.decls), n - 1, depth).map((rest) => `${first.code}\n${rest}`),
  );
}

function buildStmt(scope: Scope, depth: number): fc.Arbitrary<Stmt> {
  const e = exprArb(scope, 2);
  const eShallow = exprArb(scope, 1);
  const pureScope: Scope = { ...scope, write: false };
  const pure = exprArb(pureScope, 2);
  // Ref functions in a destructure default are CompileErrors, so defaults avoid them.
  const dflt = exprArb({ ...pureScope, inEffect: true }, 1);
  const n = fresh(scope, '');
  const inner = bump(scope);
  const options: fc.Arbitrary<Stmt>[] = [];

  // Plain statements.
  options.push(
    e.map((x) => simple(`log(${x});`)),
    e.map((x) => simple(`(${x});`)),
    eShallow.map((x) => simple(`void ${x};`)),
  );

  // Declarations.
  options.push(
    pure.map((x) => ({
      code: `const m${n} = $memo(${x});`,
      decls: [{ kind: 'memo' as const, name: `m${n}` }],
    })),
    pure.map((x) => ({
      code: `const d${n} = $(${x});`,
      decls: [{ kind: 'derived' as const, name: `d${n}` }],
    })),
    e.map((x) => ({
      code: `let s${n} = $signal(${x});`,
      decls: [{ kind: 'signal' as const, name: `s${n}` }],
    })),
    e.map((x) => ({
      code: `let p${n} = ${x};`,
      decls: [{ kind: 'plain' as const, name: `p${n}` }],
    })),
    pure.map((x) => simple(`$(${x});`)),
  );
  if (scope.ts) {
    options.push(
      pure.map((x) => ({
        code: `const m${n} = $memo<number>(${x});`,
        decls: [{ kind: 'memo' as const, name: `m${n}` }],
      })),
      eShallow.map((x) => ({
        code: `let s${n} = $signal<any>(${x});`,
        decls: [{ kind: 'signal' as const, name: `s${n}` }],
      })),
    );
  }

  // $destructure declarations with defaults, rest and nesting.
  const sources: string[] = ['{ a: 1, b: 2 }'];
  if (scope.props) {
    sources.push('props');
  }
  for (const name of scope.signals) {
    sources.push(name);
  }
  const source = fc.constantFrom(...sources);
  options.push(
    fc.tuple(source, dflt).map(([src, d]) => ({
      code: `const { x${n}, y${n} = ${d}, ...r${n} } = $destructure(${src});`,
      decls: [
        { kind: 'destructured' as const, name: `x${n}` },
        { kind: 'destructured' as const, name: `y${n}` },
        { kind: 'destructured' as const, name: `r${n}` },
      ],
    })),
    fc.tuple(source, dflt).map(([src, d]) => ({
      code: `let { o${n}: { q${n} = ${d}, w${n} }, [kk]: z${n} } = $destructure(${src});`,
      decls: [
        { kind: 'destructured' as const, name: `q${n}` },
        { kind: 'destructured' as const, name: `w${n}` },
        { kind: 'destructured' as const, name: `z${n}` },
      ],
    })),
    source.map((src) => ({
      code: `const [h${n}, i${n}] = $destructure(${src});`,
      decls: [
        { kind: 'destructured' as const, name: `h${n}` },
        { kind: 'destructured' as const, name: `i${n}` },
      ],
    })),
  );

  // Writes.
  const plains = scope.plains;
  if (plains.length > 0) {
    const target = fc.constantFrom(...plains);
    options.push(fc.tuple(target, e).map(([t, x]) => simple(`${t} = ${x};`)));
  }
  if (scope.write && scope.signals.length > 0) {
    const sig = fc.constantFrom(...scope.signals);
    options.push(
      fc.tuple(sig, e).map(([t, x]) => simple(`${t} = ${x};`)),
      fc.tuple(sig, e).map(([t, x]) => simple(`${t} = (${x});`)),
      fc.tuple(sig, e).map(([t, x]) => simple(`${t} = (${x}, 1);`)),
      fc.tuple(sig, e).map(([t, x]) => simple(`(${t} = ${x});`)),
      fc.tuple(sig, compoundOp, e).map(([t, op, x]) => simple(`${t} ${op} ${x};`)),
      fc.tuple(sig, e).map(([t, x]) => simple(`${t} ||= ${x};`)),
      sig.map((t) => simple(`${t}++;`)),
      sig.map((t) => simple(`${t}--;`)),
      sig.map((t) => simple(`++${t};`)),
      sig.map((t) => simple(`--${t};`)),
      sig.map((t) => simple(`log(${t}++, --${t});`)),
      fc.tuple(sig, sig).map(([a, b]) => simple(`${a} = ${b}++;`)),
      fc.tuple(sig, e).map(([t, x]) => simple(`const w${n} = ($set(${t}), ${x});`)),
    );
  }

  // Ref functions as declarations.
  if (scope.signals.length > 0 && !scope.inEffect) {
    const sig = fc.constantFrom(...scope.signals);
    options.push(
      sig.map((t) => simple(`const [rg${n}, rs${n}] = $refSignal(${t});`)),
      sig.map((t) =>
        simple(`const { a: ga${n}, b: gb${n} } = { a: $getter(${t}), b: $setter(${t}) };`),
      ),
      sig.map((t) => simple(`const o${n} = { v: $property(${t}) };`)),
    );
  }
  if (scope.memos.length > 0 && !scope.inEffect) {
    const memo = fc.constantFrom(...scope.memos);
    options.push(memo.map((t) => simple(`const rm${n} = $refMemo(${t});`)));
  }

  // Effects.
  const effScope: Scope = { ...inner, inEffect: true };
  const effE = exprArb({ ...scope, inEffect: true }, 2);
  const effShallow = exprArb({ ...scope, inEffect: true }, 1);
  const effectBody = (s: Scope, d: number): fc.Arbitrary<string> =>
    fc.oneof(
      blockArb(s, 3, d),
      exprArb(s, 2).map((x) => `(${x})`),
    );
  if (depth > 0) {
    options.push(
      effectBody(effScope, depth - 1).map((b) => simple(`$effect(() => ${b});`)),
      effectBody(effScope, depth - 1).map((b) => simple(`$renderEffect(() => ${b});`)),
      blockArb(effScope, 2, depth - 1).map((b) => simple(`$effect(() => ${b}, () => {});`)),
    );
  } else {
    options.push(
      effShallow.map((x) => simple(`$effect(() => (${x}));`)),
      effShallow.map((x) => simple(`$renderEffect(() => { log(${x}); });`)),
    );
  }
  // Effects that capture plain locals, write a plain outer variable, or use arguments/this.
  options.push(
    effE.map((x) => simple(`{ let loc${n} = ${x}; $effect(() => { log(loc${n}, ${x}); }); }`)),
    effE.map((x) =>
      simple(`{ let out${n} = 0; $effect(() => { out${n} = ${x}; }); log(out${n}); }`),
    ),
    effE.map((x) => simple(`$effect(() => { log(arguments.length, ${x}); });`)),
    effE.map((x) => simple(`$effect(function () { log(this, ${x}); });`)),
    effE.map((x) => simple(`$renderEffect(() => { log(arguments, ${x}); });`)),
  );

  // Control flow, nested functions and blocks.
  if (depth > 0) {
    const deeper = depth - 1;
    options.push(
      fc.tuple(e, blockArb(inner, 2, deeper)).map(([c, b]) => simple(`if (${c}) ${b}`)),
      fc
        .tuple(e, blockArb(inner, 2, deeper), blockArb(inner, 2, deeper))
        .map(([c, a, b]) => simple(`if (${c}) ${a} else ${b}`)),
      blockArb(withPlain(inner, `it${n}`), 2, deeper).map((b) =>
        simple(`for (const it${n} of [1, 2]) ${b}`),
      ),
      blockArb(inner, 3, deeper).map((b) => simple(`function fn${n}() ${b}`)),
      blockArb(inner, 3, deeper).map((b) => simple(`const fa${n} = () => ${b};`)),
      blockArb(inner, 2, deeper).map((b) => simple(`const fe${n} = async () => ${b};`)),
      blockArb(inner, 2, deeper).map((b) => simple(`try ${b} catch (err${n}) { log(err${n}); }`)),
      e.map((x) => simple(`const fx${n} = async () => { await ${x}; };`)),
    );

    // Shadowing reactive names in a nested block, parameter or function.
    const reactive = [...scope.signals, ...scope.memos, ...scope.derived, ...scope.destructured];
    if (reactive.length > 0) {
      const name = fc.constantFrom(...reactive);
      options.push(
        name.chain((r) =>
          blockArb(shadowReactive(inner, r), 2, deeper).map((b) =>
            simple(`{ let ${r} = 1; ${b} }`),
          ),
        ),
        name.chain((r) =>
          blockArb(shadowReactive(inner, r), 2, deeper).map((b) =>
            simple(`const fs${n} = (${r}) => ${b};`),
          ),
        ),
        name.chain((r) =>
          blockArb(shadowReactive(inner, r), 2, deeper).map((b) =>
            simple(`function fh${n}(${r}) ${b}`),
          ),
        ),
      );
    }

    // Shadowing compile-time function names.
    const ctfs = ['$untrack', '$get', '$effect', '$memo'];
    const ctf = fc.constantFrom(...ctfs);
    options.push(
      ctf.chain((c) =>
        blockArb({ ...inner, shadowed: [...inner.shadowed, c] }, 2, deeper).map((b) =>
          simple(`{ const ${c} = (x) => x; log(${c}(1)); ${b} }`),
        ),
      ),
      ctf.chain((c) =>
        blockArb({ ...inner, shadowed: [...inner.shadowed, c] }, 2, deeper).map((b) =>
          simple(`const fc${n} = (${c}) => { ${c}(() => 1); return () => ${b}; };`),
        ),
      ),
    );
    if (scope.jsx) {
      options.push(fc.constant(simple(`const fj${n} = (Show) => <Show when={1}>x</Show>;`)));
    }
  }

  return fc.oneof({ withCrossShrink: true }, ...options);
}

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------

export interface ProgramOptions {
  maxStatements?: number;
  jsx?: boolean;
}

function emptyScope(jsx: boolean): Scope {
  return {
    signals: [],
    memos: [],
    derived: [],
    destructured: [],
    plains: [],
    shadowed: [],
    props: false,
    jsx,
    ts: jsx,
    write: true,
    inEffect: false,
    next: 0,
  };
}

function returnArb(scope: Scope): fc.Arbitrary<string> {
  const value = exprArb({ ...scope, write: false }, 2);
  if (!scope.jsx) {
    return value.map((e) => `return ${e};`);
  }
  return fc.oneof(
    value.map((e) => `return <Show when={${e}}>{${e}}</Show>;`),
    jsxArb(scope, 2).map((e) => `return ${e};`),
    value.map((e) => `return ${e};`),
  );
}

interface FunctionShape {
  signals: number;
  memos: number;
  derived: number;
  plains: number;
  destructure: boolean;
  statements: number;
}

const shapeArb = (maxStatements: number): fc.Arbitrary<FunctionShape> =>
  fc.record({
    signals: fc.integer({ min: 1, max: 3 }),
    memos: fc.integer({ min: 0, max: 2 }),
    derived: fc.integer({ min: 0, max: 1 }),
    plains: fc.integer({ min: 0, max: 2 }),
    destructure: fc.boolean(),
    statements: fc.integer({ min: 1, max: Math.max(1, maxStatements) }),
  });

/** Function body: reactive declarations, then random statements, then a return. */
function functionBodyArb(
  outer: Scope,
  shape: FunctionShape,
  param: 'props' | 'none',
): fc.Arbitrary<string> {
  let scope: Scope = { ...outer, props: param === 'props', next: outer.next + 10 };
  const lines: string[] = [];
  const valueScope = (): Scope => ({ ...scope, write: false });

  // Declarations come first so every later statement sees them.
  const declArbs: fc.Arbitrary<string>[] = [];
  for (let i = 0; i < shape.signals; i++) {
    const name = `s${i}`;
    const init = exprArb(valueScope(), 1);
    declArbs.push(init.map((x) => `let ${name} = $signal(${x});`));
    scope = extend(scope, [{ kind: 'signal', name }]);
  }
  for (let i = 0; i < shape.plains; i++) {
    const name = `p${i}`;
    declArbs.push(exprArb(valueScope(), 1).map((x) => `let ${name} = ${x};`));
    scope = extend(scope, [{ kind: 'plain', name }]);
  }
  for (let i = 0; i < shape.memos; i++) {
    const name = `m${i}`;
    declArbs.push(exprArb(valueScope(), 2).map((x) => `const ${name} = $memo(${x});`));
    scope = extend(scope, [{ kind: 'memo', name }]);
  }
  for (let i = 0; i < shape.derived; i++) {
    const name = `d${i}`;
    declArbs.push(exprArb(valueScope(), 2).map((x) => `const ${name} = $(${x});`));
    scope = extend(scope, [{ kind: 'derived', name }]);
  }
  if (shape.destructure && param === 'props') {
    declArbs.push(
      exprArb({ ...valueScope(), inEffect: true }, 1).map(
        (x) => `const { a0, b0 = ${x}, ...rest0 } = $destructure(props);`,
      ),
    );
    scope = extend(scope, [
      { kind: 'destructured', name: 'a0' },
      { kind: 'destructured', name: 'b0' },
      { kind: 'destructured', name: 'rest0' },
    ]);
  }
  for (const line of lines) {
    declArbs.push(fc.constant(line));
  }
  const finalScope = scope;
  return fc
    .tuple(
      fc.tuple(...declArbs),
      statementsArb(finalScope, shape.statements, 2),
      returnArb(finalScope),
    )
    .map(([decls, body, ret]) => `${decls.join('\n')}\n${body}${ret}`);
}

/** Exported component built with `$component`, with a destructured parameter. */
function componentArb(outer: Scope): fc.Arbitrary<string> {
  const base: Scope = {
    ...outer,
    props: false,
    destructured: [...outer.destructured, 'name', 'count', 'rest'],
    next: outer.next + 100,
  };
  const withSignal = extend(base, [{ kind: 'signal', name: 'cs' }]);
  const body = statementsArb(withSignal, 2, 1);
  const ret = returnArb(withSignal);
  const dflt = exprArb({ ...outer, props: false, write: false, inEffect: true }, 1);
  return fc
    .tuple(dflt, body, ret)
    .map(
      ([d, b, r]) =>
        `export const Comp = $component(({ name, count = ${d}, ...rest }) => {\nlet cs = $signal(count);\n${b}${r}\n});`,
    );
}

export function programArb(options: ProgramOptions = {}): fc.Arbitrary<GeneratedProgram> {
  const maxStatements = options.maxStatements ?? 8;
  const jsx = options.jsx ?? true;
  const id = jsx ? 'gen.tsx' : 'gen.jsx';
  const base = emptyScope(jsx);

  // Module-level signals and effects, visible to the functions below.
  const moduleScope: Scope = {
    ...base,
    signals: ['g0', 'g1'],
    plains: ['mp0'],
    next: 1000,
  };
  const moduleStatements = statementsArb(moduleScope, 2, 1);

  return fc
    .tuple(shapeArb(maxStatements), fc.boolean(), fc.boolean(), fc.boolean())
    .chain(([shape, withModule, withComponent, withProps]) => {
      const param = withProps ? 'props' : 'none';
      const scope = withModule ? moduleScope : base;
      const body = functionBodyArb(scope, shape, param);
      const parts: fc.Arbitrary<string>[] = [];
      if (withModule) {
        parts.push(
          fc.constant('let g0 = $signal(0);\nlet g1 = $signal(1);\nlet mp0 = 0;'),
          moduleStatements,
        );
      }
      const header = param === 'props' ? 'function App(props)' : 'function App()';
      parts.push(body.map((b) => `export ${header} {\n${b}\n}`));
      if (withComponent) {
        parts.push(componentArb(scope));
      }
      return fc.tuple(...parts).map((all) => ({ source: `${all.join('\n')}\n`, id }));
    });
}

// ---------------------------------------------------------------------------
// Straight-line programs
// ---------------------------------------------------------------------------

type Expr =
  | { t: 'int'; v: number }
  | { t: 'sig'; i: number }
  | { t: 'memo'; i: number }
  | { t: 'bin'; op: '+' | '-'; l: Expr; r: Expr };

type Mode = 'source' | 'plain';

function renderExpr(expr: Expr, mode: Mode): string {
  switch (expr.t) {
    case 'int':
      return expr.v < 0 ? `(${expr.v})` : String(expr.v);
    case 'sig':
      return `s${expr.i}`;
    case 'memo':
      return mode === 'plain' ? `m${expr.i}()` : `m${expr.i}`;
    default:
      return `(${renderExpr(expr.l, mode)} ${expr.op} ${renderExpr(expr.r, mode)})`;
  }
}

function exprTree(signals: number, memos: number): fc.Arbitrary<Expr> {
  const leaves: fc.Arbitrary<Expr>[] = [
    fc.integer({ min: -9, max: 9 }).map((v) => ({ t: 'int', v })),
    fc.integer({ min: 0, max: signals - 1 }).map((i) => ({ t: 'sig', i })),
  ];
  if (memos > 0) {
    leaves.push(fc.integer({ min: 0, max: memos - 1 }).map((i) => ({ t: 'memo', i })));
  }
  const { tree } = fc.letrec<{ tree: Expr }>((tie) => ({
    tree: fc.oneof(
      { depthSize: 'small', maxDepth: 3 },
      ...leaves,
      fc
        .tuple(fc.constantFrom('+', '-'), tie('tree'), tie('tree'))
        .map(([op, l, r]) => ({ t: 'bin', op, l, r })),
    ),
  }));
  return tree;
}

type Write =
  | { k: 'assign'; i: number; e: Expr }
  | { k: 'add'; i: number; e: Expr }
  | { k: 'sub'; i: number; e: Expr }
  | { k: 'inc' | 'dec' | 'pinc' | 'pdec'; i: number }
  | { k: 'observe'; e: Expr };

function renderWrite(w: Write, mode: Mode): string[] {
  const out: string[] = [];
  switch (w.k) {
    case 'assign':
      out.push(`s${w.i} = ${renderExpr(w.e, mode)};`);
      break;
    case 'add':
      out.push(`s${w.i} += ${renderExpr(w.e, mode)};`);
      break;
    case 'sub':
      out.push(`s${w.i} -= ${renderExpr(w.e, mode)};`);
      break;
    case 'inc':
      out.push(`s${w.i}++;`);
      break;
    case 'dec':
      out.push(`s${w.i}--;`);
      break;
    case 'pinc':
      out.push(`++s${w.i};`);
      break;
    case 'pdec':
      out.push(`--s${w.i};`);
      break;
    default:
      out.push(`observe.push(${renderExpr(w.e, mode)});`);
      return out;
  }
  if (mode === 'source') {
    out.push('flush();');
  }
  return out;
}

/** A write whose value is used, such as `observe.push(s0++)`. */
type ValueWrite =
  | { k: 'vinc' | 'vdec' | 'vpinc' | 'vpdec'; i: number }
  | { k: 'vassign'; i: number; e: Expr };

function renderValueWrite(w: ValueWrite, mode: Mode): string[] {
  let text: string;
  switch (w.k) {
    case 'vinc':
      text = `s${w.i}++`;
      break;
    case 'vdec':
      text = `s${w.i}--`;
      break;
    case 'vpinc':
      text = `++s${w.i}`;
      break;
    case 'vpdec':
      text = `--s${w.i}`;
      break;
    default:
      text = `(s${w.i} = ${renderExpr(w.e, mode)})`;
      break;
  }
  const out = [`observe.push(${text});`];
  if (mode === 'source') {
    out.push('flush();');
  }
  return out;
}

type Step = { t: 'write'; w: Write } | { t: 'value'; w: ValueWrite };

export function straightLineArb(
  options: { maxStatements?: number } = {},
): fc.Arbitrary<StraightLineProgram> {
  const maxStatements = Math.max(1, options.maxStatements ?? 8);
  return fc
    .tuple(fc.integer({ min: 1, max: 3 }), fc.integer({ min: 0, max: 2 }))
    .chain(([signals, memos]) => {
      const signalIndex = fc.integer({ min: 0, max: signals - 1 });
      const signalExpr = exprTree(signals, 0);
      const anyExpr = exprTree(signals, memos);
      const write: fc.Arbitrary<Write> = fc.oneof(
        fc.tuple(signalIndex, anyExpr).map(([i, e]) => ({ k: 'assign', i, e })),
        fc.tuple(signalIndex, anyExpr).map(([i, e]) => ({ k: 'add', i, e })),
        fc.tuple(signalIndex, anyExpr).map(([i, e]) => ({ k: 'sub', i, e })),
        fc
          .tuple(fc.constantFrom('inc', 'dec', 'pinc', 'pdec'), signalIndex)
          .map(([k, i]) => ({ k, i })),
        anyExpr.map((e) => ({ k: 'observe', e })),
      );
      const valueWrite: fc.Arbitrary<ValueWrite> = fc.oneof(
        fc
          .tuple(fc.constantFrom('vinc', 'vdec', 'vpinc', 'vpdec'), signalIndex)
          .map(([k, i]) => ({ k, i })),
        fc.tuple(signalIndex, anyExpr).map(([i, e]) => ({ k: 'vassign', i, e })),
      );
      const step: fc.Arbitrary<Step> = fc.oneof(
        write.map((w) => ({ t: 'write', w })),
        valueWrite.map((w) => ({ t: 'value', w })),
      );
      return fc.tuple(
        fc.array(fc.integer({ min: -9, max: 9 }), { minLength: signals, maxLength: signals }),
        fc.array(signalExpr, { minLength: memos, maxLength: memos }),
        fc.array(step, { minLength: 1, maxLength: maxStatements }),
      );
    })
    .map(([inits, memoExprs, steps]) => {
      const source: string[] = ["import { flush } from 'solid-js';", 'const observe = [];'];
      const plain: string[] = ['const observe = [];'];

      // Declarations.
      for (let i = 0; i < inits.length; i++) {
        const lit = inits[i] < 0 ? `(${inits[i]})` : String(inits[i]);
        source.push(`let s${i} = $signal(${lit});`);
        plain.push(`let s${i} = ${lit};`);
      }
      for (let i = 0; i < memoExprs.length; i++) {
        source.push(`const m${i} = $memo(${renderExpr(memoExprs[i], 'source')});`);
        plain.push(`const m${i} = () => ${renderExpr(memoExprs[i], 'plain')};`);
      }

      // Statements.
      for (const s of steps) {
        const render = s.t === 'write' ? renderWrite : renderValueWrite;
        source.push(...render(s.w as never, 'source'));
        plain.push(...render(s.w as never, 'plain'));
      }

      source.push('export { observe };');
      plain.push('export { observe };');
      return {
        source: `${source.join('\n')}\n`,
        plain: `${plain.join('\n')}\n`,
        id: 'gen.js',
      };
    });
}
