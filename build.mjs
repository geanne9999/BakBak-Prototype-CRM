// Bundles the prototype into one HTML page for the Artifact (React from cdnjs, everything else inline).
import * as esbuild from 'esbuild';
import fs from 'fs';

const DARK = `
  --bg: #0b0b0d; --surface: #1c1c1f; --surface-2: #232327; --surface-3: #2e2e33; --line: #2f2f35; --line-2: #3d3d44;
  --text: #f5f5f7; --text-2: #a1a1a8; --text-3: #7c7c84;
  --accent: #3d8bff; --accent-2: #6aa6ff; --accent-soft: #15284a; --on-accent: #ffffff; --knob: #f5f5f7;
  --ok: #3fc26b; --ok-soft: #10301c; --warn: #ffab40; --warn-soft: #3a2a10; --bad: #ff6b60; --bad-soft: #3d1715;
  --violet: #8e8cff; --violet-soft: #23224a; --teal: #3cc8d8; --teal-soft: #0f2f33;
  --msgr: #2f8bff; --bubble: #2c2c30;
  --ch-msgr: #b48cff; --ch-msgr-soft: #2a1f45; --ch-walk: #6aa6ff; --ch-walk-soft: #15284a; --ch-fp: #ff6fa8; --ch-fp-soft: #3d1428;
  --ch-grab: #3fd27f; --ch-grab-soft: #0f3020; --ch-fb: #6aa6ff; --ch-fb-soft: #13274a;
  --heat-0: #17233a; --heat-1: #1d3561; --heat-2: #24508f; --heat-3: #2f6fd0; --heat-4: #4d8fff;
  --note: #3a3315; --note-line: #5c5020;
  --shadow-1: 0 1px 2px rgb(0 0 0 / 0.5); --shadow-2: 0 16px 48px rgb(0 0 0 / 0.6), 0 2px 8px rgb(0 0 0 / 0.4);
  --scrim: rgb(0 0 0 / 0.55); --bezel: #000000;
  color-scheme: dark;
`;

const res = await esbuild.build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2019',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  loader: { '.js': 'jsx', '.jsx': 'jsx' },
  logLevel: 'warning',
});
let js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
let css = fs.readFileSync('src/styles.css', 'utf8').replace('/*DARK_BLOCKS*/', `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {${DARK}  }\n}\n:root[data-theme="dark"] {${DARK}}`);
const html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>BakBak CRM Demo</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>
${js}
</script>
</body>
</html>
`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/bakbak-demo.html', html);
console.log('built dist/bakbak-demo.html', (html.length / 1024).toFixed(1) + ' KB');
