// Player sprite sheet for the platformer.
//
//   node sprite.js
//     -> out/player/player-anim.png   the atlas Phaser loads
//     -> out/player/player-anim.json  JSONHash frame map (same names as before)
//     -> out/player/<frame>.png       one file per frame, for previewing
//     -> out/player/_sheet.png        contact sheet
//
// The figure is posed by a tiny skeleton (hip -> knee -> ankle, shoulder ->
// elbow -> wrist) so the run cycle comes out of one phase number instead of
// eighteen hand-drawn poses. Angles are DEGREES CLOCKWISE FROM STRAIGHT DOWN,
// so +30 means "swung forward" (the runner faces +x) and a point at angle a,
// length L from a joint is (L*sin a, L*cos a) in SVG coordinates.
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { C, INK } = require('./lib');

const OUT = path.join(__dirname, 'out', 'player');
fs.mkdirSync(OUT, { recursive: true });

// ── drawing helpers ───────────────────────────────────────────────────────
const OW = 3.4;                       // ink outline width
const D = Math.PI / 180;
const n = (v) => Math.round(v * 10) / 10;
const cap = 'stroke-linecap="round" stroke-linejoin="round"';
const ink = (d, w) => '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="' + n(w) + '" ' + cap + '/>';
const col = (d, c, w) => '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + n(w) + '" ' + cap + '/>';
const fill = (d, c, w) => '<path d="' + d + '" fill="' + c + '" stroke="' + INK + '" stroke-width="' + n(w === undefined ? OW : w) + '" ' + cap + '/>';
const dot = (p, r, c, w) => '<circle cx="' + n(p[0]) + '" cy="' + n(p[1]) + '" r="' + n(r) + '" fill="' + c + '"' +
  (w === 0 ? ' ' : ' stroke="' + INK + '" stroke-width="' + n(w === undefined ? OW : w) + '" ') + '/>';
const G = (inner, t) => '<g transform="' + t + '">' + inner + '</g>';
const M = (a, b) => 'M' + n(a[0]) + ' ' + n(a[1]) + ' L' + n(b[0]) + ' ' + n(b[1]);

// Walk a chain of joints: from p, take each [angle, length] in turn.
function chain(p, steps) {
  const out = [p];
  for (const step of steps) {
    const q = out[out.length - 1];
    out.push([q[0] + Math.sin(step[0] * D) * step[1], q[1] + Math.cos(step[0] * D) * step[1]]);
  }
  return out;
}
// One limb: every ink stroke first, then every colour stroke, so the joints
// read as one continuous shape instead of stacked sausages.
function limb(pts, colors, widths) {
  let s = '';
  for (let i = 0; i < pts.length - 1; i++) s += ink(M(pts[i], pts[i + 1]), widths[i] + OW * 2);
  for (let i = 0; i < pts.length - 1; i++) s += col(M(pts[i], pts[i + 1]), colors[i], widths[i]);
  return s;
}

// ── the figure ────────────────────────────────────────────────────────────
const R = { thigh: 26, shin: 26, upper: 19, fore: 18, torso: 35, neck: 7, headR: 17 };
const SKIN = [C.skin, C.skinD];
const SHIRT = [C.red, C.redD];
const SHORT = [C.blue, C.blueD];
const SHOE = [C.yellow, C.yellowD];

function shoe(ankle, rot, far) {
  const body = fill('M-6 -4 Q-10 5 -3 6 L11 6 Q16 5 15 -2 Q9 -7 -6 -4Z', far ? SHOE[1] : SHOE[0]) +
    col('M-8 4.5 L14 4.5', far ? '#C89200' : '#ffffff', 2.2);
  return G(body, 'translate(' + n(ankle[0]) + ' ' + n(ankle[1]) + ') rotate(' + n(rot) + ')');
}

function leg(hip, thighAng, kneeFlex, far) {
  const shinAng = thighAng - kneeFlex;
  const pts = chain(hip, [[thighAng, R.thigh], [shinAng, R.shin]]);
  const rot = Math.max(-28, Math.min(72, -shinAng * 0.8));   // rigid-ish ankle
  return limb(pts, far ? [SKIN[1], SKIN[1]] : [SKIN[0], SKIN[0]], [11, 9]) + shoe(pts[2], rot, far);
}

function arm(sh, upperAng, elbowFlex, far) {
  const pts = chain(sh, [[upperAng, R.upper], [upperAng + elbowFlex, R.fore]]);
  return limb(pts, far ? [SKIN[1], SKIN[1]] : [SKIN[0], SKIN[0]], [10, 9]) +
    dot(pts[2], 5.5, far ? SKIN[1] : SKIN[0]);
}

// Head, authored on a 22px skull and scaled to R.headR. Drawn in its own
// space with the face looking +x.
function head(c, tilt) {
  const s = R.headR / 22;
  return G(
    dot([0, 0], 22, C.skin) +
    fill('M-23 -2 Q-26 -24 -4 -24 Q16 -24 22 -5 Q11 -14 -1 -12 Q-14 -9 -18 4 Q-21 5 -23 -2Z', C.hair) +
    fill('M16 -18 Q30 -22 24 -9 Q21 -14 14 -14Z', C.hair) +                       // front tuft
    fill('M-16 0 Q-9 1 -12 8 Q-17 8 -16 0Z', C.skinD, 2) +                        // ear
    dot([12, 0], 3, INK, 0) +                                                     // eye
    ink('M8.5 -7 Q12.5 -9.5 16.5 -6.5', 2.2) +                                    // brow
    ink('M7 10 Q12 13.5 16.5 9', 2.4) +                                           // smile
    fill('M20 1 Q25.5 4.5 19 7.5', C.skinD, 2) +                                  // nose
    dot([1, 10], 3.4, C.blush, 0),
    'translate(' + n(c[0]) + ' ' + n(c[1]) + ') rotate(' + n(tilt) + ') scale(' + n(s) + ')');
}

// A whole figure, drawn with the ground line at y = 0. Torso and shorts live
// in a body-local space (origin at the hip, -y up the spine, +x forward) that
// the lean rotates, so the silhouette can be shaped instead of stroked.
function figure(o) {
  const lean = o.lean, hip = [0, o.hipY];
  const up = [Math.sin(lean * D), -Math.cos(lean * D)];
  const along = (d) => [hip[0] + up[0] * d, hip[1] + up[1] * d];
  const perp = [Math.cos(lean * D), Math.sin(lean * D)];                // forward
  const shJoint = along(R.torso - 2);
  const shoulder = (d) => [shJoint[0] + perp[0] * d, shJoint[1] + perp[1] * d];
  const bodyT = 'translate(' + n(hip[0]) + ' ' + n(hip[1]) + ') rotate(' + n(lean) + ')';
  const shorts = fill('M-13 -7 Q-16 11 -8 13 Q-4 4 0 2 Q4 4 8 13 Q17 11 14 -6 Q0 -13 -13 -7Z', SHORT[0]) +
    col('M-7 6 Q0 2 7 6', SHORT[1], 2);
  const shirt = fill('M-11 -3 L-13.5 -21 Q-14 -32 -4 -34 L6 -34 Q14.5 -31 14 -21 L11.5 -3 Q0 1 -11 -3Z', SHIRT[0]) +
    col('M-10 -6 Q0 -2 10.5 -6', SHIRT[1], 2.4) +                                    // hem
    col('M-3 -33 Q3 -29 9 -32', SHIRT[1], 2.4);                                   // collar
  const neckPts = [along(R.torso - 2), along(R.torso + R.neck)];
  const neck = ink(M(neckPts[0], neckPts[1]), 10 + OW * 2) + col(M(neckPts[0], neckPts[1]), C.skinD, 10);
  return arm(shoulder(-2), o.upper[1], o.elbow[1], true) +
    leg(hip, o.thigh[1], o.knee[1], true) +
    leg(hip, o.thigh[0], o.knee[0], false) +
    G(shorts, bodyT) + neck + G(shirt, bodyT) +
    head(along(R.torso + R.neck + R.headR * 0.78), lean * 0.5 + (o.tilt || 0)) +
    arm(shoulder(4), o.upper[0], o.elbow[0], false);
}

// Lowest sole in a pose, so every frame can be dropped onto the ground.
function soleY(o) {
  let low = -1e9;
  for (const i of [0, 1]) {
    const pts = chain([0, o.hipY], [[o.thigh[i], R.thigh], [o.thigh[i] - o.knee[i], R.shin]]);
    low = Math.max(low, pts[2][1] + 6);
  }
  return low;
}
// Plant the pose on the ground and render it into a w x h frame.
function frame(o, w, h, lift) {
  const dy = (o.plant === 'hip' ? -(o.hipY + 15) : -soleY(o)) - (lift || 0);
  return G(figure(o), 'translate(' + n(w / 2 + (o.dx || 0)) + ' ' + n(h - 3 + dy) + ')');
}

// ── poses ─────────────────────────────────────────────────────────────────
const bump = (x, c) => Math.pow((1 + Math.cos(2 * Math.PI * (x - c))) / 2, 2);
const thighA = (p) => 34 * Math.sin(2 * Math.PI * p);
const kneeF = (p) => 12 + 72 * bump(p, 0.95) + 14 * bump(p, 0.55);

function runPose(p) {
  const q = (p + 0.5) % 1, s = Math.sin(2 * Math.PI * p);
  return {
    hipY: -58, lean: 15 - 3 * s,
    thigh: [thighA(p), thighA(q)], knee: [kneeF(p), kneeF(q)],
    upper: [-46 * s, 46 * s], elbow: [82 - 34 * s, 82 + 34 * s],
  };
}

const POSES = {
  // gather, drive off the ground, stretch out at the top. The leading arm
  // goes up-FORWARD (positive) so it never crosses the face, which is drawn
  // under the near arm.
  jump_0: { hipY: -38, lean: 22, thigh: [20, 26], knee: [70, 80], upper: [-50, -30], elbow: [100, 110] },
  jump_1: { hipY: -64, lean: 8, thigh: [-6, 28], knee: [26, 70], upper: [130, -40], elbow: [40, 30] },
  jump_2: { hipY: -72, lean: 2, thigh: [-12, 16], knee: [14, 34], upper: [150, -55], elbow: [25, 20] },
  // held while airborne: knee up in front, other leg trailing, arms spread
  airbound_0: { hipY: -58, lean: 10, thigh: [36, -18], knee: [80, 30], upper: [-70, 60], elbow: [70, 45] },
  // dropping into a feet-first slide: the torso tips BACK (negative lean) and
  // the legs shoot forward, and from slidein_2 on the weight is on the seat.
  slidein_0: { hipY: -46, lean: 6, thigh: [52, 18], knee: [66, 44], upper: [-62, 26], elbow: [72, 48] },
  slidein_1: { hipY: -34, lean: -22, thigh: [72, 34], knee: [42, 58], upper: [-84, 8], elbow: [60, 40] },
  slidein_2: { hipY: -24, lean: -42, thigh: [84, 52], knee: [26, 46], upper: [-96, -16], elbow: [50, 34], plant: 'hip' },
  slide_0: { hipY: -20, lean: -52, thigh: [88, 60], knee: [18, 38], upper: [-104, -28], elbow: [44, 30], plant: 'hip' },
  slide_1: { hipY: -18, lean: -56, thigh: [92, 64], knee: [14, 32], upper: [-110, -34], elbow: [40, 26], plant: 'hip' },
  slide_2: { hipY: -21, lean: -50, thigh: [86, 58], knee: [20, 40], upper: [-100, -24], elbow: [46, 32], plant: 'hip' },
};

// [name, pose, frame w, frame h, lift off the ground]
const FRAMES = [];
for (let i = 0; i < 7; i++) FRAMES.push(['run_' + i, runPose(i / 7), 130, 150, 0]);
FRAMES.push(['jump_0', POSES.jump_0, 130, 198, 0]);
FRAMES.push(['jump_1', POSES.jump_1, 130, 198, 10]);
FRAMES.push(['jump_2', POSES.jump_2, 130, 198, 22]);
FRAMES.push(['airbound_0', POSES.airbound_0, 130, 150, 14]);
FRAMES.push(['slidein_0', POSES.slidein_0, 170, 128, 0]);
FRAMES.push(['slidein_1', POSES.slidein_1, 170, 128, 0]);
FRAMES.push(['slidein_2', POSES.slidein_2, 170, 128, 0]);
FRAMES.push(['slide_0', POSES.slide_0, 170, 95, 0]);
FRAMES.push(['slide_1', POSES.slide_1, 170, 95, 0]);
FRAMES.push(['slide_2', POSES.slide_2, 170, 95, 0]);

// ── render ────────────────────────────────────────────────────────────────
function svgDoc(w, h, body, bg) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
    (bg ? '<rect width="100%" height="100%" fill="' + bg + '"/>' : '') + body + '</svg>';
}
const png = (svg, w) => new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render().asPng();

const built = FRAMES.map((f) => ({ name: f[0], w: f[2], h: f[3], body: frame(f[1], f[2], f[3], f[4]) }));

// shelf-pack into a 1024-wide atlas
const AW = 1024, PAD = 2;
let x = PAD, y = PAD, rowH = 0, atlasBody = '';
const map = {};
for (const f of built) {
  if (x + f.w + PAD > AW) { x = PAD; y += rowH + PAD; rowH = 0; }
  map[f.name] = {
    frame: { x: x, y: y, w: f.w, h: f.h }, rotated: false, trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h }, sourceSize: { w: f.w, h: f.h },
  };
  atlasBody += G(f.body, 'translate(' + x + ' ' + y + ')');
  x += f.w + PAD;
  rowH = Math.max(rowH, f.h);
}
const AH = y + rowH + PAD;
fs.writeFileSync(path.join(OUT, 'player-anim.png'), png(svgDoc(AW, AH, atlasBody), AW));
fs.writeFileSync(path.join(OUT, 'player-anim.json'), JSON.stringify(
  { frames: map, meta: { image: 'player-anim.png', size: { w: AW, h: AH }, scale: '1' } }, null, 1));

// per-frame files + a contact sheet, for looking at the thing
for (const f of built) fs.writeFileSync(path.join(OUT, f.name + '.png'), png(svgDoc(f.w, f.h, f.body), f.w));
let sx = 4, sheet = '';
for (const f of built) {
  sheet += G(f.body, 'translate(' + sx + ' ' + (200 - f.h) + ')') +
    '<text x="' + (sx + f.w / 2) + '" y="214" font-family="Arial" font-size="11" text-anchor="middle" fill="#333">' + f.name + '</text>';
  sx += f.w + 4;
}
fs.writeFileSync(path.join(OUT, '_sheet.png'), png(svgDoc(sx, 220, sheet, '#eef4fa'), sx));
console.log('frames', built.length, 'atlas', AW + 'x' + AH);
