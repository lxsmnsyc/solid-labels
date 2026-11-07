import { compile, CompileError } from '../dist/compiler.js';
import { parseSync } from 'oxc-parser';
let seed = Number(process.argv[2] ?? 1);
const rnd = (n) => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed % n;
};
const pick = (a) => a[rnd(a.length)];
const vars = ['a', 'b', 'c'];
function expr(d = 0) {
  if (d > 2) return pick([...vars, '1', 'props.x', '"s"']);
  return pick([
    () => pick(vars),
    () => `${expr(d + 1)} + ${expr(d + 1)}`,
    () => `f(${expr(d + 1)})`,
    () => `{ k: ${expr(d + 1)} }`,
    () => `{ ${pick(vars)} }`,
    () => `[${expr(d + 1)}]`,
    () => `${pick(vars)}++`,
    () => `--${pick(vars)}`,
    () => `(${pick(vars)} = ${expr(d + 1)})`,
    () => `${pick(vars)} += ${expr(d + 1)}`,
    () => `$untrack(${expr(d + 1)})`,
    () => `$get(${pick(vars)})`,
    () => `(() => ${expr(d + 1)})()`,
    () => `\`\${${expr(d + 1)}}\``,
    () => `${expr(d + 1)} ? ${expr(d + 1)} : ${expr(d + 1)}`,
    () => `<div title={${expr(d + 1)}}>{${expr(d + 1)}}</div>`,
  ])();
}
function stmt(d = 0) {
  return pick([
    () => `log(${expr()});`,
    () => `$effect(() => { ${stmt(d + 1)} });`,
    () => `$(${expr()});`,
    () => `if (${expr()}) { ${stmt(d + 1)} }`,
    () => `${pick(vars)} = ${expr()};`,
    () => `${pick(vars)}++;`,
    () => `const ${pick(['m', 'n'])}${rnd(99)} = $memo(${expr()});`,
    () => `{ let ${pick(vars)} = 1; ${stmt(d + 1)} }`,
    () => `const o${rnd(99)} = { v: $property(${pick(vars)}) };`,
    () => `$renderEffect(() => ${expr()});`,
    () => `const { x${rnd(9)}, y${rnd(9)} = ${expr()}, ...r${rnd(99)} } = $destructure(props);`,
  ])();
}
const stats = { ok: 0, compileError: 0, crash: 0, badOutput: 0 };
const failures = [];
const N = Number(process.argv[3] ?? 3000);
for (let i = 0; i < N; i++) {
  let body = `let a = $signal(${expr(3)});\nlet b = $signal(0);\nconst c = $memo(a + b);\n`;
  for (let j = 0, k = 1 + rnd(5); j < k; j++) body += stmt() + '\n';
  const src = `function App(props) {\n${body}return <Show when={a}>{c}</Show>;\n}`;
  let out;
  try {
    out = compile('t.tsx', src).code;
  } catch (e) {
    if (e instanceof CompileError) {
      stats.compileError++;
      continue;
    }
    stats.crash++;
    failures.push(['crash', e.message.split('\n')[0], src]);
    continue;
  }
  const r = parseSync('o.tsx', out, { lang: 'tsx', sourceType: 'module' });
  if (r.errors.length) {
    stats.badOutput++;
    failures.push(['badOutput', r.errors[0].message, src, out]);
    continue;
  }
  stats.ok++;
}
console.log(stats);
const seen = new Set();
for (const f of failures) {
  if (seen.has(f[1])) continue;
  seen.add(f[1]);
  console.log('---', f[0], f[1]);
  console.log(f[2]);
  if (f[3]) console.log('>>>\n' + f[3]);
  if (seen.size > 5) break;
}
