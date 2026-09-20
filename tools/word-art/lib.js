// Drawing kit for the word pictures: bold dark outlines, bright flat
// colours, a soft round backdrop, glossy highlights and cute faces.
// Everything is drawn on an 800x800 canvas.
const INK = '#2B2340';
const OW = 9; // outline width
const C = {
  red: '#FF5A5F', redD: '#D93A45', orange: '#FF9F1C', orangeD: '#E07B00', yellow: '#FFD23F', yellowD: '#E6AE00',
  green: '#3DCB6C', greenD: '#23A04E', lime: '#A6E22E', teal: '#2EC4B6', blue: '#3A86FF', blueD: '#1F5FD1', sky: '#8FD3FF',
  purple: '#8B5CF6', pink: '#FF6FB5', pinkL: '#FFC2DD', brown: '#A0632D', brownL: '#C98A4B', brownD: '#7A4520',
  skin: '#FFD1A6', skinD: '#F2B27E', white: '#FFFFFF', cream: '#FFF6E0', gray: '#AEB4C6', grayD: '#7C8399', grayL: '#E4E7F0',
  black: '#3A3350', hair: '#3B2A2A', hairGray: '#D9DCE6', blush: '#FF8FA3',
};
const BG = ['#FFE3EC', '#E3F1FF', '#FFF2C7', '#DDF7E6', '#EDE4FF', '#FFE6D5', '#D9F6F3'];

const S = (w = OW) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const f = (fill, w) => `fill="${fill}" ${S(w)}`;
const g = (inner, t = '') => `<g${t ? ` transform="${t}"` : ''}>${inner}</g>`;
const at = (x, y, s = 1, r = 0) => `translate(${x} ${y})${s !== 1 ? ` scale(${s})` : ''}${r ? ` rotate(${r})` : ''}`;
const circle = (cx, cy, r, fill, w) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${f(fill, w)}/>`;
const ellipse = (cx, cy, rx, ry, fill, w, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${f(fill, w)}${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
const rect = (x, y, w, h, r, fill, sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${f(fill, sw)}/>`;
const path = (d, fill = 'none', w) => `<path d="${d}" ${f(fill, w)}/>`;
const line = (d, w = OW, color = INK) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
// A cartoon limb/tube: dark outline stroke with a coloured stroke on top.
const tube = (d, color, w) => line(d, w + OW * 2) + line(d, w, color);
const shine = (cx, cy, rx, ry, rot = -25, op = 0.55) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${op}" transform="rotate(${rot} ${cx} ${cy})"/>`;
const shadow = (cx, cy, rx, ry = rx * 0.16) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}" opacity="0.13"/>`;
const text = (x, y, s, str, fill = INK, sw = 0, size = 120) =>
  `<text x="${x}" y="${y}" font-family="Arial Black, Leelawadee UI, Tahoma, sans-serif" font-weight="900" font-size="${size * s}" text-anchor="middle" fill="${fill}"${sw ? ` stroke="${INK}" stroke-width="${sw}" paint-order="stroke" stroke-linejoin="round"` : ''}>${str}</text>`;

function sparkle(x, y, s = 1, color = '#FFD23F') {
  return g(path('M0 -30 C4 -8 8 -4 30 0 C8 4 4 8 0 30 C-4 8 -8 4 -30 0 C-8 -4 -4 -8 0 -30Z', color, 5), at(x, y, s));
}
function heart(x, y, s = 1, color = C.red) {
  return g(path('M0 18 C-30 -4 -34 -26 -18 -34 C-8 -39 0 -30 0 -22 C0 -30 8 -39 18 -34 C34 -26 30 -4 0 18Z', color, 6) + shine(-12, -22, 6, 4, -30), at(x, y, s));
}
function star(x, y, r = 30, color = C.yellow, w = 6) {
  let p = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.48 : r;
    p += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1);
  }
  return path(p + 'Z', color, w);
}
function motion(x, y, s = 1, rot = 0) { // three little "action" strokes
  return g(line('M0 -26 L26 -40') + line('M4 0 L36 0') + line('M0 26 L26 40'), at(x, y, s, rot));
}

// Backdrop: a soft coloured circle with a few confetti dots.
function backdrop(i, opts = {}) {
  const c = BG[i % BG.length];
  const dots = opts.dots === false ? '' :
    `<circle cx="120" cy="170" r="12" fill="${c}"/><circle cx="690" cy="140" r="16" fill="${c}"/><circle cx="700" cy="640" r="10" fill="${c}"/><circle cx="96" cy="600" r="14" fill="${c}"/>`;
  return `<circle cx="400" cy="410" r="330" fill="${c}"/>` + dots;
}

// Cute face centred at (0,0) for a head of radius ~r.
function face(r = 70, o = {}) {
  const ex = r * 0.36, ey = -r * 0.05, er = r * 0.12;
  let eyes;
  if (o.eyes === 'closed') eyes = line(`M${-ex - er} ${ey} Q${-ex} ${ey + er} ${-ex + er} ${ey}`, 7) + line(`M${ex - er} ${ey} Q${ex} ${ey + er} ${ex + er} ${ey}`, 7);
  else if (o.eyes === 'happy') eyes = line(`M${-ex - er} ${ey + 4} Q${-ex} ${ey - er} ${-ex + er} ${ey + 4}`, 7) + line(`M${ex - er} ${ey + 4} Q${ex} ${ey - er} ${ex + er} ${ey + 4}`, 7);
  else if (o.eyes === 'tired') eyes = line(`M${-ex - er} ${ey} L${-ex + er} ${ey + 3}`, 7) + line(`M${ex - er} ${ey + 3} L${ex + er} ${ey}`, 7) + line(`M${-ex - er} ${ey - 12} L${-ex + er} ${ey - 6}`, 5) + line(`M${ex - er} ${ey - 6} L${ex + er} ${ey - 12}`, 5);
  else if (o.eyes === 'x') eyes = line(`M${-ex - 9} ${ey - 9} L${-ex + 9} ${ey + 9} M${-ex + 9} ${ey - 9} L${-ex - 9} ${ey + 9}`, 6) + line(`M${ex - 9} ${ey - 9} L${ex + 9} ${ey + 9} M${ex + 9} ${ey - 9} L${ex - 9} ${ey + 9}`, 6);
  else {
    const lx = (o.look || 0) * er * 0.35;
    eyes = `<ellipse cx="${-ex + lx}" cy="${ey}" rx="${er * 0.8}" ry="${er}" fill="${INK}"/><ellipse cx="${ex + lx}" cy="${ey}" rx="${er * 0.8}" ry="${er}" fill="${INK}"/>` +
      `<circle cx="${-ex + lx + er * 0.3}" cy="${ey - er * 0.4}" r="${er * 0.32}" fill="#fff"/><circle cx="${ex + lx + er * 0.3}" cy="${ey - er * 0.4}" r="${er * 0.32}" fill="#fff"/>`;
  }
  const my = r * 0.32;
  let mouth;
  switch (o.mouth || 'smile') {
    case 'big': mouth = path(`M${-r * 0.28} ${my - 8} Q0 ${my + r * 0.42} ${r * 0.28} ${my - 8} Z`, '#E8505B', 6) + path(`M${-r * 0.12} ${my + r * 0.16} Q0 ${my + r * 0.05} ${r * 0.12} ${my + r * 0.16} Q0 ${my + r * 0.28} ${-r * 0.12} ${my + r * 0.16}Z`, '#FF9AA8', 0); break;
    case 'open': mouth = ellipse(0, my + 4, r * 0.13, r * 0.16, '#E8505B', 6); break;
    case 'yawn': mouth = ellipse(0, my + 8, r * 0.2, r * 0.26, '#8E2F3C', 6); break;
    case 'o': mouth = ellipse(0, my, r * 0.08, r * 0.1, '#E8505B', 5); break;
    case 'flat': mouth = line(`M${-r * 0.14} ${my} L${r * 0.14} ${my}`, 7); break;
    case 'sad': mouth = line(`M${-r * 0.16} ${my + 8} Q0 ${my - 10} ${r * 0.16} ${my + 8}`, 7); break;
    case 'wavy': mouth = line(`M${-r * 0.2} ${my} q${r * 0.07} -10 ${r * 0.13} 0 q${r * 0.07} 10 ${r * 0.13} 0 q${r * 0.07} -10 ${r * 0.14} 0`, 6); break;
    case 'tongue': mouth = line(`M${-r * 0.18} ${my - 4} Q0 ${my + r * 0.18} ${r * 0.18} ${my - 4}`, 7) + path(`M${-r * 0.07} ${my + 6} Q0 ${my + r * 0.3} ${r * 0.08} ${my + 6}`, '#FF7A8A', 5); break;
    case 'chew': mouth = ellipse(0, my, r * 0.12, r * 0.07, '#E8505B', 5); break;
    case 'none': mouth = ''; break;
    default: mouth = line(`M${-r * 0.17} ${my - 4} Q0 ${my + r * 0.2} ${r * 0.17} ${my - 4}`, 7);
  }
  const blush = o.blush === false ? '' :
    `<ellipse cx="${-r * 0.58}" cy="${r * 0.2}" rx="${r * 0.14}" ry="${r * 0.08}" fill="${C.blush}" opacity="0.75"/><ellipse cx="${r * 0.58}" cy="${r * 0.2}" rx="${r * 0.14}" ry="${r * 0.08}" fill="${C.blush}" opacity="0.75"/>`;
  return blush + eyes + mouth;
}

// ---------------------------------------------------------------- people
// Chibi person. Local coords: feet at y=0, head centre at (0,-250).
// o: {skin, hair:'short'|'bob'|'bun'|'pigtails'|'grayBun'|'bald'|'spiky', hairColor, shirt, pants, skirt, arms:{l:[x,y],r:[x,y]},
//     legs:'stand'|'kneel', face:{...}, hat, extraBack, extraFront, hands:true}
function person(o = {}) {
  const skin = o.skin || C.skin, shirt = o.shirt || C.blue, pants = o.pants || C.blueD;
  const hc = o.hairColor || (o.hair === 'grayBun' || o.hair === 'grayShort' ? C.hairGray : C.hair);
  const armsDefault = { l: [-80, -100], r: [80, -100] };
  const arms = Object.assign({}, armsDefault, o.arms || {});
  let out = o.extraBack || '';
  // Long hair belongs behind the body, so draw it before the torso.
  const hy0 = -250;
  let hairBack = '';
  switch (o.hair || 'short') {
    case 'bob': hairBack = path(`M-96 ${hy0 + 96} Q-112 ${hy0 - 70} 0 ${hy0 - 92} Q112 ${hy0 - 70} 96 ${hy0 + 96} Q60 ${hy0 + 110} 40 ${hy0 + 80} L-40 ${hy0 + 80} Q-60 ${hy0 + 110} -96 ${hy0 + 96}Z`, hc); break;
    case 'long': hairBack = path(`M-96 ${hy0 + 150} Q-116 ${hy0 - 70} 0 ${hy0 - 92} Q116 ${hy0 - 70} 96 ${hy0 + 150} Q40 ${hy0 + 170} 0 ${hy0 + 150} Q-40 ${hy0 + 170} -96 ${hy0 + 150}Z`, hc); break;
    case 'bun': case 'grayBun': hairBack = circle(0, hy0 - 88, 30, hc); break;
    case 'pigtails': hairBack = ellipse(-92, hy0 + 6, 26, 36, hc, OW, 20) + ellipse(92, hy0 + 6, 26, 36, hc, OW, -20); break;
  }
  out += hairBack;
  // legs
  if (o.legs === 'kneel') {
    // front knee down on the floor, back shin folded behind
    out += tube('M20 -100 L40 -30 L-40 -16', o.legColor || pants, 32);
    out += tube('M-16 -100 L-30 -30 L-104 -18', o.legColor || pants, 32);
    out += ellipse(-116, -14, 24, 14, o.shoes || C.black, 6) + ellipse(-52, -12, 24, 14, o.shoes || C.black, 6);
  } else if (o.legs !== 'none') {
    out += tube('M-22 -95 L-24 -14', o.legColor || pants, 30) + tube('M22 -95 L24 -14', o.legColor || pants, 30);
    out += ellipse(-30, -8, 26, 15, o.shoes || C.black, 6) + ellipse(30, -8, 26, 15, o.shoes || C.black, 6);
  }
  // arms behind body
  const arm = (side, pt) => {
    const sx = side * 46, sy = -158;
    const [ex, ey] = pt;
    const mx = (sx + ex) / 2 + side * 18, my = (sy + ey) / 2 + 10;
    return tube(`M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}`, o.sleeve || shirt, 26);
  };
  out += arm(-1, arms.l) + arm(1, arms.r);
  // torso
  if (o.skirt) out += path('M-50 -172 L50 -172 L74 -86 L-74 -86 Z', o.skirt, OW);
  else out += rect(-52, -178, 104, 96, 32, pants, OW);
  out += path('M-52 -140 Q-52 -178 -20 -178 L20 -178 Q52 -178 52 -140 L52 -112 L-52 -112 Z', shirt, OW);
  if (o.apron) out += path('M-34 -160 L34 -160 L40 -86 L-40 -86 Z', o.apron, 7);
  if (o.torsoExtra) out += o.torsoExtra;
  // hands
  if (o.hands !== false) out += circle(arms.l[0], arms.l[1], 17, skin, 7) + circle(arms.r[0], arms.r[1], 17, skin, 7);
  // head
  const hy = -250;
  let hairFront = '';
  const headR = 80;
  out += circle(-78, hy + 8, 16, skin) + circle(78, hy + 8, 16, skin);
  out += circle(0, hy, headR, skin);
  switch (o.hair || 'short') {
    case 'short': case 'grayShort': hairFront = path(`M-80 ${hy - 4} Q-84 ${hy - 90} 0 ${hy - 86} Q84 ${hy - 90} 80 ${hy - 4} Q60 ${hy - 44} 20 ${hy - 40} Q-10 ${hy - 60} -30 ${hy - 38} Q-60 ${hy - 36} -80 ${hy - 4}Z`, hc); break;
    case 'spiky': hairFront = path(`M-80 ${hy - 10} L-86 ${hy - 60} L-54 ${hy - 70} L-50 ${hy - 104} L-14 ${hy - 86} L10 ${hy - 110} L30 ${hy - 84} L66 ${hy - 96} L62 ${hy - 60} L84 ${hy - 50} L80 ${hy - 10} Q40 ${hy - 50} 0 ${hy - 44} Q-40 ${hy - 50} -80 ${hy - 10}Z`, hc); break;
    case 'bob': case 'long': case 'pigtails': case 'bun': case 'grayBun': hairFront = path(`M-82 ${hy + 4} Q-86 ${hy - 88} 0 ${hy - 86} Q86 ${hy - 88} 82 ${hy + 4} Q70 ${hy - 40} 30 ${hy - 46} Q10 ${hy - 30} -10 ${hy - 48} Q-60 ${hy - 44} -82 ${hy + 4}Z`, hc); break;
    case 'bald': hairFront = path(`M-80 ${hy + 4} Q-82 ${hy - 30} -64 ${hy - 40} M80 ${hy + 4} Q82 ${hy - 30} 64 ${hy - 40}`, 'none'); break;
    case 'baby': hairFront = line(`M-6 ${hy - 80} Q10 ${hy - 104} 22 ${hy - 88}`, 8); break;
  }
  out += hairFront;
  if (o.hat) out += o.hat(hy);
  if (o.glasses) out += g(circle(-30, -2, 20, 'none', 6) + circle(30, -2, 20, 'none', 6) + line('M-10 -2 L10 -2', 6), at(0, hy));
  out += g(face(headR, o.face || {}), at(0, hy + 10));
  if (o.headExtra) out += o.headExtra(hy);
  out += o.extraFront || '';
  return out;
}
const kid = (o = {}) => person(Object.assign({ hair: 'short', shirt: C.orange, pants: C.blue }, o));
const girl = (o = {}) => person(Object.assign({ hair: 'pigtails', hairColor: '#4A2C2A', shirt: C.pink, skirt: C.purple }, o));
const mom = (o = {}) => person(Object.assign({ hair: 'bob', hairColor: '#3B2323', shirt: C.red, skirt: C.yellow }, o));
const grandma = (o = {}) => person(Object.assign({ hair: 'grayBun', shirt: C.purple, skirt: C.teal, glasses: true, face: { eyes: 'happy' } }, o));
const man = (o = {}) => person(Object.assign({ hair: 'short', shirt: C.green, pants: C.brown }, o));
const draw = (x, y, s, body) => g(body, at(x, y, s));

// Round-bodied animal head pieces
function catHead(color = C.orange, o = {}) {
  return path('M-70 -40 L-78 -110 L-26 -70Z', color) + path('M70 -40 L78 -110 L26 -70Z', color) +
    path('M-62 -58 L-66 -92 L-40 -70Z', C.pinkL, 0) + path('M62 -58 L66 -92 L40 -70Z', C.pinkL, 0) +
    ellipse(0, 0, 90, 76, color) + (o.stripes ? line('M-14 -72 L-10 -52 M0 -76 L0 -54 M14 -72 L10 -52', 6) : '') +
    g(face(76, o.face || { mouth: 'none' }), at(0, 4)) + path('M-8 10 L8 10 L0 20Z', C.pink, 4) + line('M0 20 Q-10 32 -20 26 M0 20 Q10 32 20 26', 5) +
    line('M-60 16 L-100 8 M-60 26 L-100 30 M60 16 L100 8 M60 26 L100 30', 4);
}
function cat(x, y, s, color = C.orange, o = {}) {
  const body = ellipse(0, 96, 78, 66, color) + (o.stripes !== false ? line('M-40 50 L-30 70 M-50 90 L-36 104 M40 50 L30 70 M50 90 L36 104', 7) : '') +
    ellipse(-36, 156, 26, 16, color) + ellipse(36, 156, 26, 16, color) +
    tube('M70 120 Q150 110 130 20', color, 24);
  return g(body + g(catHead(color, o), at(0, -20)), at(x, y, s));
}
function dog(x, y, s, color = C.brownL, o = {}) {
  const ear = o.earColor || C.brownD;
  const body = ellipse(0, 100, 84, 64, color) + ellipse(-40, 160, 26, 16, color) + ellipse(40, 160, 26, 16, color) +
    tube('M76 90 Q130 60 118 20', color, 22) + (o.collar ? path('M-50 36 Q0 60 50 36', 'none') + tube('M-50 36 Q0 58 50 36', C.red, 12) : '');
  let head = ellipse(-78, -10, 26, 52, ear, OW, 20) + ellipse(78, -10, 26, 52, ear, OW, -20) + ellipse(0, -20, 88, 78, color) +
    ellipse(0, 22, 44, 32, C.cream) + ellipse(0, 6, 16, 11, INK, 0) + g(face(76, Object.assign({ mouth: 'none' }, o.face || {})), at(0, -26));
  if (o.bark) head += ellipse(0, 44, 22, 18, '#8E2F3C', 6);
  else if (o.tongue !== false) head += line('M-12 24 Q0 34 12 24', 6) + path('M-9 30 Q0 58 10 30Z', '#FF7A8A', 5);
  return g(body + g(head, at(0, -30)), at(x, y, s));
}
function pig(x, y, s) {
  const p = '#FFA3C1';
  return g(ellipse(0, 90, 96, 70, p) + ellipse(-50, 152, 22, 16, p) + ellipse(50, 152, 22, 16, p) +
    line('M92 80 q20 -10 12 -24 q-10 -10 -16 6', 6) +
    path('M-66 -70 L-90 -120 L-30 -92Z', p) + path('M66 -70 L90 -120 L30 -92Z', p) +
    ellipse(0, -30, 92, 80, p) + g(face(80, { mouth: 'none' }), at(0, -46)) +
    ellipse(0, 6, 34, 24, '#FF7FA8') + ellipse(-11, 6, 6, 9, INK, 0) + ellipse(11, 6, 6, 9, INK, 0) +
    line('M-16 40 Q0 50 16 40', 6), at(x, y, s));
}
function bear(x, y, s, color = C.brown) {
  return g(ellipse(0, 100, 92, 74, color) + ellipse(0, 110, 50, 44, C.brownL, 0) + ellipse(-50, 166, 28, 18, color) + ellipse(50, 166, 28, 18, color) +
    circle(-64, -92, 30, color) + circle(64, -92, 30, color) + circle(-64, -92, 14, C.brownL, 0) + circle(64, -92, 14, C.brownL, 0) +
    circle(0, -26, 92, color) + ellipse(0, 12, 40, 30, C.brownL) + ellipse(0, 0, 15, 11, INK, 0) +
    g(face(80, { mouth: 'none' }), at(0, -42)) + line('M-12 20 Q0 30 12 20', 6), at(x, y, s));
}
function mouse(x, y, s, color = C.gray) {
  return g(tube('M60 120 Q150 150 150 60 Q150 20 120 30', color, 12) + ellipse(0, 100, 72, 60, color) + ellipse(-36, 152, 22, 14, color) + ellipse(36, 152, 22, 14, color) +
    circle(-70, -70, 46, color) + circle(70, -70, 46, color) + circle(-70, -70, 28, C.pinkL, 0) + circle(70, -70, 28, C.pinkL, 0) +
    ellipse(0, -10, 80, 70, color) + g(face(70, { mouth: 'none' }), at(0, -22)) + circle(0, 22, 12, C.pink, 5) +
    line('M-40 26 L-90 16 M-40 34 L-90 40 M40 26 L90 16 M40 34 L90 40', 4) + line('M-10 40 Q0 48 10 40', 5), at(x, y, s));
}
function bird(x, y, s, color = C.yellow, o = {}) {
  const wing = o.flap ? path('M-10 20 Q-80 -60 -110 -20 Q-80 30 -10 40Z', color) : ellipse(-30, 40, 44, 28, color, OW, -20);
  return g(ellipse(-4, 150, 14, 8, C.orange) + ellipse(34, 150, 14, 8, C.orange) + line('M0 120 L-2 146 M30 120 L32 146', 7, C.orangeD) +
    path('M-86 70 L-130 50 L-120 90Z', color) + ellipse(0, 60, 90, 76, color) + wing + (o.crest ? path('M-10 -60 Q0 -100 20 -80 Q10 -70 6 -58Z', color) : '') +
    g(face(64, { mouth: 'none', blush: true }), at(20, 10)) + path('M68 22 L110 34 L68 46Z', C.orange), at(x, y, s));
}
function horse(x, y, s, color = C.brownL, mane = C.brownD, o = {}) {
  let out = tube('M-80 60 L-84 170', color, 30) + tube('M-40 64 L-40 172', color, 30) + tube('M50 64 L54 172', color, 30) + tube('M84 58 L84 168', color, 30);
  out += rect(-102, 152, 40, 24, 8, INK, 0) + rect(-60, 154, 40, 24, 8, INK, 0) + rect(34, 154, 40, 24, 8, INK, 0) + rect(64, 150, 40, 24, 8, INK, 0);
  out += tube('M-110 10 Q-160 30 -150 100', mane, 22);
  out += ellipse(0, 40, 120, 70, color);
  out += path('M60 10 Q80 -80 110 -120 L170 -100 Q150 -40 116 30Z', color);
  out += ellipse(160, -110, 56, 44, color, OW, 20) + ellipse(190, -84, 30, 26, C.cream) + circle(196, -84, 5, INK);
  out += path('M120 -150 L128 -190 L146 -150Z', color) + path('M84 -110 Q96 -170 130 -160 Q110 -120 104 -40 Q90 -50 84 -110Z', mane);
  out += `<ellipse cx="152" cy="-124" rx="8" ry="10" fill="${INK}"/><circle cx="155" cy="-128" r="3" fill="#fff"/>`;
  if (o.spots) out += o.spots;
  return g(out, at(x, y, s));
}
function cloudShape(x, y, s, fill = '#fff', w = OW) {
  return g(path('M-120 40 Q-170 40 -160 -4 Q-150 -44 -104 -34 Q-90 -96 -26 -90 Q30 -130 76 -74 Q140 -90 150 -30 Q190 -10 164 30 Q150 50 120 40Z', fill, w), at(x, y, s));
}
function speech(x, y, s, content, fill = '#fff') {
  return g(path('M-100 -60 Q-100 -90 -70 -90 L70 -90 Q100 -90 100 -60 L100 20 Q100 50 70 50 L-10 50 L-40 84 L-36 50 L-70 50 Q-100 50 -100 20Z', fill) + content, at(x, y, s));
}
function table(x, y, w, color = C.brownL) {
  return rect(x - w / 2, y, w, 26, 10, color) + rect(x - w / 2 + 20, y + 26, 20, 90, 6, C.brownD) + rect(x + w / 2 - 40, y + 26, 20, 90, 6, C.brownD);
}
function bowl(x, y, s, color = C.blue, fillTop) {
  return g(rect(-40, 88, 80, 16, 6, color) + path('M-120 -10 L120 -10 Q116 90 0 96 Q-116 90 -120 -10Z', color) + ellipse(0, -10, 120, 24, '#fff') +
    (fillTop || '') + shine(-70, 30, 14, 26, 20, 0.45), at(x, y, s));
}
function glass(x, y, s, liquid = C.sky, o = {}) {
  return g(path('M-70 -120 L70 -120 L56 120 L-56 120Z', '#EAF6FF') + path(`M-64 ${o.level || -40} L64 ${o.level || -40} L56 120 L-56 120Z`, liquid, 0) +
    path('M-70 -120 L70 -120 L56 120 L-56 120Z', 'none') + line(`M-64 ${o.level || -40} L64 ${o.level || -40}`, 6) + shine(-40, 20, 8, 60, 0, 0.6) + (o.extra || ''), at(x, y, s));
}
function numberBadge(x, y, s, str, color = C.orange) {
  return text(x, y, s, str, color, 20, 260);
}

// Draws parts as one shape: a wide ink stroke pass underneath, then the
// same parts filled on top, so shared edges leave no lines inside.
function silhouette(parts, fill, w = OW) {
  return parts(INK, w * 2) + parts(fill, 0);
}

function hand(fingers, o = {}) {
  // Palm facing the viewer, fingers up. Drawn as one silhouette so the
  // fingers merge into the palm instead of looking like stacked blocks.
  const skin = o.skin || C.skin;
  const F = [[-66, 150], [-14, 176], [38, 158], [88, 116]];
  const parts = (fill, w) => {
    let out = '';
    F.forEach(([x, h], k) => {
      out += fingers[k]
        ? `<rect x="${x - 25}" y="${-h}" width="50" height="${h + 90}" rx="25" fill="${fill}"${w ? ` stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"` : ''}/>`
        : `<rect x="${x - 25}" y="-30" width="50" height="120" rx="25" fill="${fill}"${w ? ` stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"` : ''}/>`;
    });
    out += `<rect x="-104" y="-4" width="230" height="216" rx="54" fill="${fill}"${w ? ` stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"` : ''}/>`;
    out += fingers[4]
      ? `<path d="M-84 52 L-166 -34 Q-190 -60 -164 -84 Q-138 -106 -114 -80 L-40 -2Z" fill="${fill}"${w ? ` stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"` : ''}/>`
      : `<path d="M-92 44 Q-158 40 -164 96 Q-168 150 -96 150 L-60 120Z" fill="${fill}"${w ? ` stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"` : ''}/>`;
    return out;
  };
  let creases = '';
  F.forEach(([x], k) => { if (!fingers[k]) creases += line(`M${x - 16} 8 Q${x} -6 ${x + 16} 8`, 5, 'rgba(43,35,64,0.45)'); });
  return silhouette(parts, skin) + creases + line('M-58 150 Q12 168 82 144', 5, 'rgba(43,35,64,0.22)');
}

// Thumb and finger nearly touching: "just a little".
function pinchHand(o = {}) {
  const skin = o.skin || C.skin;
  return path('M40 150 Q-30 150 -60 96 Q-80 60 -40 40 L60 6 Q100 -8 116 24 Q130 54 96 70 L40 92Z', skin) +
    path('M96 -76 Q120 -110 150 -92 Q178 -74 160 -42 L110 40 Q92 66 62 50 Q34 32 52 2Z', skin) +
    line('M92 0 Q104 14 96 34', 5) + line('M70 96 Q84 112 78 130', 5);
}

function robot(x, y, s, o = {}) {
  const body = o.color || C.sky;
  return g(tube('M-40 120 L-44 190', C.grayD, 26) + tube('M40 120 L44 190', C.grayD, 26) + rect(-80, 180, 70, 30, 12, C.grayD) + rect(10, 180, 70, 30, 12, C.grayD) +
    tube(`M-100 20 Q-150 60 ${o.wave ? '-160 -60' : '-150 110'}`, C.grayD, 22) + tube('M100 20 Q150 60 150 110', C.grayD, 22) +
    circle(o.wave ? -160 : -150, o.wave ? -70 : 120, 24, C.yellow) + circle(150, 120, 24, C.yellow) +
    rect(-110, -20, 220, 160, 30, body) + rect(-60, 10, 120, 70, 14, '#fff') + circle(-30, 45, 12, C.red, 5) + circle(0, 45, 12, C.yellow, 5) + circle(30, 45, 12, C.green, 5) +
    rect(-20, -50, 40, 40, 8, C.grayD) + rect(-100, -220, 200, 170, 40, body) + line('M0 -220 L0 -270', 10) + circle(0, -280, 18, C.red) +
    rect(-70, -180, 140, 80, 26, '#2B2340', 6) + `<circle cx="-34" cy="-140" r="18" fill="#6EF0FF"/><circle cx="34" cy="-140" r="18" fill="#6EF0FF"/>` +
    line('M-26 -80 L26 -80', 7) + rect(-126, -170, 26, 60, 10, C.grayD) + rect(100, -170, 26, 60, 10, C.grayD) + shine(-70, -200, 20, 10, -20), at(x, y, s));
}
function owl(x, y, s, o = {}) {
  const c = o.color || '#A0632D', belly = '#F3D9B1';
  return g(path('M-100 -120 L-80 -180 L-40 -130Z M100 -120 L80 -180 L40 -130Z', c) +
    ellipse(0, 0, 120, 150, c) + ellipse(0, 50, 80, 90, belly, 0) + line('M-40 30 q20 16 40 0 q20 16 40 0 M-40 70 q20 16 40 0 q20 16 40 0 M-30 110 q15 12 30 0 q15 12 30 0', 5, '#C9A57A') +
    path('M-120 -20 Q-170 60 -110 120 Q-100 40 -120 -20Z', o.wing || '#7A4520') + path('M120 -20 Q170 60 110 120 Q100 40 120 -20Z', o.wing || '#7A4520') +
    circle(-46, -60, 44, '#fff') + circle(46, -60, 44, '#fff') + circle(-46, -58, 22, INK, 0) + circle(46, -58, 22, INK, 0) + circle(-38, -66, 8, '#fff', 0) + circle(54, -66, 8, '#fff', 0) +
    path('M-14 -24 L14 -24 L0 6Z', C.orange, 6) + ellipse(-30, 150, 20, 12, C.orange, 6) + ellipse(30, 150, 20, 12, C.orange, 6), at(x, y, s));
}
function mushroom(x, y, s, cap = C.red) {
  return g(path('M-50 0 Q-60 120 0 124 Q60 120 50 0Z', '#FFF3DC') + path('M-150 10 Q-150 -130 0 -140 Q150 -130 150 10 Q0 40 -150 10Z', cap) +
    circle(-70, -60, 20, '#fff', 0) + circle(20, -100, 16, '#fff', 0) + circle(80, -40, 22, '#fff', 0) + circle(-10, -30, 12, '#fff', 0) + shine(-90, -90, 20, 10, -30), at(x, y, s));
}
function coin(x, y, s) {
  return g(circle(0, 0, 40, C.yellow) + circle(0, 0, 26, 'none', 5) + text(0, 12, 1, '฿', C.yellowD, 0, 36), at(x, y, s));
}
function gift(x, y, s, box = C.red, ribbon = C.yellow) {
  return g(rect(-120, -60, 240, 180, 16, box) + rect(-140, -110, 280, 60, 16, box) + rect(-22, -110, 44, 230, 0, ribbon, 6) +
    path('M0 -110 Q-90 -200 -80 -130 Q-70 -100 0 -110Z', ribbon) + path('M0 -110 Q90 -200 80 -130 Q70 -100 0 -110Z', ribbon) + shine(-80, -80, 20, 10, 0), at(x, y, s));
}

// Keeps scenery (water, grass) inside the round backdrop.
let clipN = 0;
function inCircle(content) {
  const id = 'cc' + (++clipN);
  return `<clipPath id="${id}"><circle cx="400" cy="410" r="330"/></clipPath><g clip-path="url(#${id})">${content}</g><circle cx="400" cy="410" r="330" fill="none"/>`;
}

module.exports = { hand, pinchHand, silhouette, inCircle, robot, owl, mushroom, coin, gift, INK, OW, C, BG, S, f, g, at, circle, ellipse, rect, path, line, tube, shine, shadow, text, sparkle, heart, star, motion,
  backdrop, face, person, kid, girl, mom, grandma, man, draw, catHead, cat, dog, pig, bear, mouse, bird, horse, cloudShape, speech, table, bowl, glass, numberBadge };
