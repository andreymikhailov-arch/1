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
// шрифты встраиваем, чтобы вид не зависел от доступа к Google Fonts
const fonts = JSON.parse(readFileSync('assets/fonts/fonts.json', 'utf8'))
  .map((f) => `@font-face{font-family:'${f.family}';font-style:normal;font-weight:400 600;font-display:swap;src:url(data:font/woff2;base64,${readFileSync('assets/fonts/' + f.file).toString('base64')}) format('woff2');unicode-range:${f.range}}`)
  .join('');
const css = fonts + readFileSync('src/styles.css', 'utf8');
const html = readFileSync('src/index.html', 'utf8')
  .replace('/*CSS*/', () => css)
  .replace('/*JS*/', () => js);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/idodom-prototype.html', html);
console.log('dist/idodom-prototype.html', (html.length / 1024 / 1024).toFixed(2), 'MB');
