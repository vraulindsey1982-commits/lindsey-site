// Injecte style-v2.min.css (source de vérité) dans le <head> de index.html,
// entre les marqueurs <!-- CSS:START --> et <!-- CSS:END -->.
// À relancer après chaque modification du CSS : npm run build:css
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const START = '<!-- CSS:START -->';
const END = '<!-- CSS:END -->';

// Surcharges propres à l'accueil (la feuille est partagée par les autres pages).
const INDEX_OVERRIDES = '.eyebrow{color:#c47f79}.burger span{width:22px}@media(max-width:850px){h1{font-size:2.4rem}}';

const css = fs.readFileSync(path.join(root, 'style-v2.min.css'), 'utf8').trim();
const html = fs.readFileSync(htmlPath, 'utf8');
const i = html.indexOf(START);
const j = html.indexOf(END);
if (i === -1 || j === -1 || j < i) throw new Error('Marqueurs CSS:START / CSS:END introuvables dans index.html');

const block = `${START}\n  <style>${css}${INDEX_OVERRIDES}</style>\n  `;
fs.writeFileSync(htmlPath, html.slice(0, i) + block + html.slice(j));
console.log(`index.html : ${css.length + INDEX_OVERRIDES.length} octets de CSS intégrés`);
