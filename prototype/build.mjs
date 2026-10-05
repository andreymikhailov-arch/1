// Сборка в один HTML-файл: JS, CSS и картинки внутри. Открывается двойным кликом, можно переслать клиенту.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const res = await build({
  entryPoints: ['src/app.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2020',
  loader: { '.jpg': 'dataurl' },
  legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/styles.css', 'utf8');
const html = readFileSync('src/index.html', 'utf8')
  .replace('/*CSS*/', () => css)
  .replace('/*JS*/', () => js);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/idodom-prototype.html', html);
console.log('dist/idodom-prototype.html', (html.length / 1024 / 1024).toFixed(2), 'MB');
