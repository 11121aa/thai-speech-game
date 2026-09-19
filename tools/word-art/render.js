// node render.js [module ...] -> renders every word the modules export
// into out/<word>.png (800x800, transparent) and out/_sheet_<module>.png.
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

function svgDoc(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">${body}</svg>`;
}
function render(svg, w) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: w }, font: { loadSystemFonts: true, defaultFontFamily: 'Arial' } }).render().asPng();
}

const mods = process.argv.slice(2);
for (const m of mods) {
  const words = require('./' + m);
  const names = Object.keys(words);
  const cells = [];
  names.forEach((w, i) => {
    let body;
    try { body = words[w](i); } catch (e) { console.error('FAIL', w, e.message); return; }
    const svg = svgDoc(body);
    fs.writeFileSync(path.join(OUT, w + '.svg'), svg);
    fs.writeFileSync(path.join(OUT, w + '.png'), render(svg, 800));
    cells.push({ w, body });
  });
  // contact sheet: 5 per row, 240px cells, word label under each
  const cols = 5, cw = 240, ch = 270, rows = Math.ceil(cells.length / cols);
  let sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cw}" height="${rows * ch}"><rect width="100%" height="100%" fill="#fff"/>`;
  cells.forEach((c, i) => {
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
    sheet += `<g transform="translate(${x} ${y}) scale(0.3)">${c.body}</g><text x="${x + cw / 2}" y="${y + 258}" font-family="Tahoma" font-size="22" text-anchor="middle">${c.w}</text>`;
  });
  sheet += '</svg>';
  fs.writeFileSync(path.join(OUT, '_sheet_' + m + '.png'), render(sheet, cols * cw));
  console.log(m, cells.length, 'rendered');
}
