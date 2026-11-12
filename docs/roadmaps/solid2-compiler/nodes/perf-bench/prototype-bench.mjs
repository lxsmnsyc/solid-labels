import { pathToFileURL } from 'node:url';
const root = process.argv[2];
const { compile } = await import(pathToFileURL(root + '/packages/core/dist/compiler.js'));
const { parseSync } = await import(
  pathToFileURL(root + '/node_modules/.pnpm/node_modules/oxc-parser/src-js/index.js').href
).catch(
  async () =>
    import(pathToFileURL(root + '/packages/core/node_modules/oxc-parser/src-js/index.js')),
);
function component(i) {
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
const hrt = () => Number(process.hrtime.bigint()) / 1e6;
for (const n of [10, 50, 200, 800]) {
  for (const [label, gen] of [
    ['ctf', component],
    ['plain', plain],
  ]) {
    let code = '';
    for (let i = 0; i < n; i++) code += gen(i);
    for (let w = 0; w < 3; w++) compile('a.tsx', code);
    const runs = 10;
    let t = hrt();
    for (let r = 0; r < runs; r++) compile('a.tsx', code);
    const tc = (hrt() - t) / runs;
    t = hrt();
    for (let r = 0; r < runs; r++) parseSync('a.tsx', code, { lang: 'tsx', sourceType: 'module' });
    const tp = (hrt() - t) / runs;
    console.log(
      `${label} n=${n} bytes=${code.length} compile=${tc.toFixed(2)}ms parse=${tp.toFixed(2)}ms ratio=${(tc / tp).toFixed(1)}x`,
    );
  }
}
