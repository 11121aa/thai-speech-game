// Measures every dress-up garment and writes js/dressup-fit.js, the table
// the game uses to line the body up with whatever is being worn.
//
//   cd tools/dressup-fit && npm install && node measure.js
//
// Why a generated table: the avatar's arms, legs and feet are drawn in code,
// and the clothes are 50 hand-drawn SVGs whose sleeves end in different
// places and whose trouser legs are different widths. Any single set of
// hand-tuned body coordinates fits some designs and misses the rest, so
// instead each file is rasterised here and its own attachment points are
// read off the pixels:
//
//   shirt  cuff[0|1]  where each sleeve opening is, and how wide
//          hemY       bottom of the shirt
//   pants  leg[0|1]   centre and width of each trouser leg at the hem
//          hemY       bottom of the trousers
//   shoes  top[0|1]   centre and width of each shoe at its opening
//          topY       top of the shoes
//   hat    brimY      lowest ink, i.e. where the hat meets the head
//          brim       centre and width there
//   bag    strapY     topmost ink, i.e. where the strap crosses the shoulder
//
// All values are in the file's OWN viewBox units, so the game can map them
// through whatever scale it places the piece at. Rerun this whenever the art
// in img/dressup changes.
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const ROOT = path.resolve(__dirname, '..', '..');
const ART = path.join(ROOT, 'img', 'dressup');
const OUT = path.join(ROOT, 'js', 'dressup-fit.js');
const SS = 4; // rasterise at 4 px per viewBox unit

function rasterise(file) {
  const svg = fs.readFileSync(file, 'utf8');
  const vb = /viewBox="([^"]+)"/.exec(svg)[1].split(/[\s,]+/).map(Number);
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: Math.round(vb[2] * SS) } }).render();
  const px = img.pixels;
  const W = img.width, H = img.height;
  // runs of opaque pixels on one raster row, in viewBox units
  const runs = (ry) => {
    const out = [];
    let s = -1;
    for (let x = 0; x < W; x++) {
      const on = px[(ry * W + x) * 4 + 3] > 40;
      if (on && s < 0) s = x;
      if ((!on || x === W - 1) && s >= 0) {
        const x0 = vb[0] + s / SS, x1 = vb[0] + (on ? x : x - 1) / SS;
        if (x1 - x0 > 1) out.push({ x0, x1, cx: (x0 + x1) / 2, w: x1 - x0 });
        s = -1;
      }
    }
    return out;
  };
  const rows = [];
  for (let ry = 0; ry < H; ry++) rows.push(runs(ry));
  const yOf = (ry) => vb[1] + ry / SS;
  const inked = rows.map((r, i) => (r.length ? i : -1)).filter(i => i >= 0);
  return { vb, W, H, rows, yOf, top: inked[0], bot: inked[inked.length - 1], runs };
}

const round = (v) => Math.round(v * 10) / 10;
const pt = (r) => ({ cx: round(r.cx), w: round(r.w) });

// Measures the two halves of a paired garment over a band at one end --
// the trouser hems, or the shoe openings. Taking a band and splitting on
// the art's own midline survives the designs where a single row is owned
// by a lace, a strap or a turn-up rather than by both halves.
function pair(m, ink, end, frac) {
  const h = ink.y1 - ink.y0;
  const y0 = end === 'top' ? ink.y0 : ink.y1 - h * frac;
  const y1 = end === 'top' ? ink.y0 + h * frac : ink.y1;
  const mid = (ink.x0 + ink.x1) / 2;
  const side = [{ x0: Infinity, x1: -Infinity }, { x0: Infinity, x1: -Infinity }];
  for (let ry = 0; ry < m.rows.length; ry++) {
    const y = m.yOf(ry);
    if (y < y0 || y > y1) continue;
    for (const run of m.rows[ry]) {
      const i = run.cx < mid ? 0 : 1;
      side[i].x0 = Math.min(side[i].x0, run.x0);
      side[i].x1 = Math.max(side[i].x1, run.x1);
    }
  }
  // Width is taken at the very end (the hem, the ankle opening) rather
  // than across the band, since that is the part the body has to fit
  // inside; a band-wide figure would include the flare above it.
  const endRuns = [[], []];
  const edge = end === 'top' ? ink.y0 : ink.y1;
  for (let ry = 0; ry < m.rows.length; ry++) {
    if (Math.abs(m.yOf(ry) - edge) > 3) continue;
    for (const run of m.rows[ry]) endRuns[run.cx < mid ? 0 : 1].push(run.w);
  }
  return side.map((e, i) => {
    if (!isFinite(e.x0)) e = { x0: ink.x0 + (ink.x1 - ink.x0) * (i ? 0.75 : 0.25) - 10,
                               x1: ink.x0 + (ink.x1 - ink.x0) * (i ? 0.75 : 0.25) + 10 };
    const band = e.x1 - e.x0;
    // narrowest real run at the very edge: that is the hole the limb goes
    // through. Slivers (a lace tip, a stitch) are ignored.
    const real = endRuns[i].filter(w => w > band * 0.4);
    return { cx: round((e.x0 + e.x1) / 2), w: round(real.length ? Math.min.apply(null, real) : band) };
  });
}

function measure(slot, file) {
  const m = rasterise(file);
  const ink = { x0: Infinity, x1: -Infinity, y0: m.yOf(m.top), y1: m.yOf(m.bot) };
  for (const r of m.rows) for (const run of r) { ink.x0 = Math.min(ink.x0, run.x0); ink.x1 = Math.max(ink.x1, run.x1); }
  const out = { vb: m.vb.map(round), ink: [round(ink.x0), round(ink.y0), round(ink.x1), round(ink.y1)] };

  if (slot === 'shirt') {
    // The hem row is the body alone, so anything outside its span on a
    // higher row is sleeve. The cuff is the lowest band of sleeve ink.
    const hem = m.rows[m.bot - 2] || m.rows[m.bot];
    const body = { x0: hem[0].x0, x1: hem[hem.length - 1].x1 };
    const side = [[], []];
    for (let ry = m.top; ry <= m.bot; ry++) {
      for (const run of m.rows[ry]) {
        if (run.cx < body.x0) side[0].push({ ry, run });
        else if (run.cx > body.x1) side[1].push({ ry, run });
      }
    }
    out.hemY = round(ink.y1);
    out.cuff = side.map(list => {
      if (!list.length) return null;
      const lowest = list[list.length - 1].ry;
      const band = list.filter(e => e.ry > lowest - 6 * SS);
      const cx = band.reduce((a, e) => a + e.run.cx, 0) / band.length;
      return { cx: round(cx), cy: round(m.yOf(lowest)), w: round(Math.max.apply(null, band.map(e => e.run.w))) };
    });
  } else if (slot === 'pants') {
    out.hemY = round(ink.y1);
    out.waistY = round(ink.y0);
    out.leg = pair(m, ink, 'bottom', 0.18);
  } else if (slot === 'shoes') {
    out.topY = round(ink.y0);
    out.top = pair(m, ink, 'top', 0.3);
  } else if (slot === 'hat') {
    const brim = (m.rows[m.bot - 2] || m.rows[m.bot]);
    out.brimY = round(ink.y1);
    out.brim = pt(brim.reduce((a, b) => (b.w > a.w ? b : a)));
  } else if (slot === 'bag') {
    const strap = m.rows[m.top + 2] || m.rows[m.top];
    out.strapY = round(ink.y0);
    out.strap = pt(strap.reduce((a, b) => (b.w > a.w ? b : a)));
  }
  return out;
}

const SLOTS = ['hat', 'shirt', 'pants', 'shoes', 'bag'];
const table = {};
for (const dir of ['', 'doll']) {
  for (const slot of SLOTS) {
    for (let i = 1; i <= 5; i++) {
      const name = slot + (i === 1 ? '' : '-' + i) + '.svg';
      const file = path.join(ART, dir, name);
      if (!fs.existsSync(file)) continue;
      const key = 'img/dressup/' + (dir ? dir + '/' : '') + name;
      table[key] = measure(slot, file);
    }
  }
}

const body = '// GENERATED by tools/dressup-fit/measure.js -- do not edit by hand.\n' +
  '// Attachment points for every dress-up garment, in each file\'s own\n' +
  '// viewBox units. js/game-dressup.js maps these onto the avatar so the\n' +
  '// arms meet the sleeves, the legs fill the trousers and the shoes sit\n' +
  '// under the trouser hems, whatever design is worn. See that tool\'s\n' +
  '// header for what each field means.\n' +
  'window.DRESSUP_FIT = {\n' +
  Object.keys(table).map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(table[k])).join(',\n') +
  '\n};\n';
fs.writeFileSync(OUT, body);
console.log('measured', Object.keys(table).length, 'files ->', path.relative(ROOT, OUT));
