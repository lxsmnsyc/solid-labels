/* eslint-disable no-console, typescript/no-unsafe-argument, typescript/no-unsafe-assignment, typescript/no-unsafe-call, typescript/no-unsafe-member-access, typescript/no-unsafe-return */
// The compiler and parser come from dynamic imports, so they are untyped here.
// Compile benchmark. Run `pnpm -C packages/core build` first, then:
//   node benchmarks/compile/bench.mjs [--runs 15] [--sizes 10,50,200,800]
// Keep the machine quiet while it runs.
import { createRequire } from 'node:module';
import { cpus, platform, release } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const { compile } = await import(pathToFileURL(`${root}packages/core/dist/compiler.js`).href);

// oxc-parser is a dependency of packages/core, so resolve it from there.
const coreRequire = createRequire(`${root}packages/core/package.json`);
const { parseSync } = await import(pathToFileURL(coreRequire.resolve('oxc-parser')).href);

function argument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}
const RUNS = Number(argument('runs', '15'));
const SIZES = argument('sizes', '10,50,200,800').split(',').map(Number);
const WARMUP = 3;

function labeled(i) {
  return `
export function App${i}(props) {
  let count${i} = $signal(0);
  let name${i} = $signal('x');
  const doubled${i} = $memo(count${i} * 2);
  const label${i} = $(\`\${name${i}}: \${doubled${i}}\`);
  const { a, b = 1, ...rest } = $destructure(props);
  $effect(() => { console.log(count${i}, label${i}, a, b); });
  $effect(() => { if (count${i} < 10) count${i}++; });
  $(console.log($untrack(name${i})));
  function inc() { count${i} += 1; name${i} = 'y' + count${i}; }
  return <Show when={count${i} > 0}><div onClick={inc}>{label${i}} {doubled${i}} {rest.x}</div></Show>;
}`;
}

function plain(i) {
  return `export function P${i}(props) { const x = props.a + ${i}; const arr = [1,2,3].map((v) => v * x); return <div>{arr.join(',')}{x}</div>; }`;
}

function plainShow(i) {
  return `export function S${i}(props) { const x = props.a + ${i}; const arr = [1,2,3].map((v) => v * x); return <Show when={x > 0}><div>{arr.join(',')}{x}</div></Show>; }`;
}

const CASES = [
  ['ctf', labeled],
  ['plain', plain],
  ['plain-show', plainShow],
];

function now() {
  return Number(process.hrtime.bigint()) / 1e6;
}

function time(fn) {
  const start = now();
  fn();
  return now() - start;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function measure(fn) {
  for (let i = 0; i < WARMUP; i++) {
    fn();
  }
  const samples = [];
  for (let i = 0; i < RUNS; i++) {
    samples.push(time(fn));
  }
  return { median: median(samples), min: Math.min(...samples), max: Math.max(...samples) };
}

function fmt(value) {
  return value.toFixed(2).padStart(8);
}

console.log(
  `node ${process.version} | ${cpus()[0].model} x${cpus().length} | ${platform()} ${release()}`,
);
console.log(`runs=${RUNS} warmup=${WARMUP}, times in ms (median, min, max)\n`);
console.log(
  `${'case'.padEnd(11)}${'n'.padStart(5)}${'KB'.padStart(7)}${'compile'.padStart(9)}${'min'.padStart(9)}${'max'.padStart(9)}${'parse'.padStart(9)}${'ratio'.padStart(8)}`,
);

for (const [name, generate] of CASES) {
  for (const n of SIZES) {
    let code = '';
    for (let i = 0; i < n; i++) {
      code += generate(i);
    }
    const compiled = measure(() => compile('a.tsx', code));
    const parsed = measure(() => parseSync('a.tsx', code, { lang: 'tsx', sourceType: 'module' }));
    const ratio = (compiled.median / parsed.median).toFixed(1).padStart(7);
    console.log(
      `${name.padEnd(11)}${String(n).padStart(5)}${(code.length / 1024).toFixed(0).padStart(7)}${fmt(compiled.median)} ${fmt(compiled.min)} ${fmt(compiled.max)} ${fmt(parsed.median)}${ratio}x`,
    );
  }
}
