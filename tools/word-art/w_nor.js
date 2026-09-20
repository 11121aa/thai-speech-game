// Pictures for the meaningful น words (W1-W3).
const L = require('./lib');
const { C, INK, g, at, circle, ellipse, rect, path, line, tube, shine, shadow, text, sparkle, heart, star, motion, backdrop, face,
  kid, girl, mom, man, person, draw, cat, mouse, bird, cloudShape, speech, glass, bowl, numberBadge } = L;

const W = {};
const drop = (x, y, s, color = '#4DB8FF') => g(path('M0 -120 Q70 -20 70 30 Q70 100 0 100 Q-70 100 -70 30 Q-70 -20 0 -120Z', color) + shine(-28, 10, 14, 30, 20, 0.6), at(x, y, s));
const baby = (o = {}) => person(Object.assign({ hair: 'baby', shirt: C.yellow, pants: C.yellow, legs: 'stand' }, o));
const milkCarton = (x, y, s) => g(path('M-70 -60 L0 -130 L70 -60Z', C.blue) + rect(-70, -60, 140, 200, 10, '#fff') + rect(-70, 0, 140, 70, 0, C.blue, 0) +
  rect(-70, -60, 140, 200, 10, 'none') + ellipse(0, 36, 36, 22, '#fff', 0) + text(0, 50, 1, 'MILK', C.blue, 0, 26) + rect(-16, -150, 32, 30, 6, C.red), at(x, y, s));
const book = (x, y, s, open = true) => g(
  path('M0 -10 Q-120 -60 -230 -20 L-230 140 Q-120 100 0 150Z', '#fff') + path('M0 -10 Q120 -60 230 -20 L230 140 Q120 100 0 150Z', '#fff') +
  path('M-230 140 Q-120 100 0 150 Q120 100 230 140 L230 160 Q120 120 0 170 Q-120 120 -230 160Z', C.red) +
  line('M-190 20 Q-110 -6 -40 20 M-190 60 Q-110 34 -40 60 M40 20 Q110 -6 190 20 M40 60 Q110 34 190 60', 6, C.grayD), at(x, y, s));
const bed = (x, y, s, blanket = C.blue) => g(rect(-260, 0, 520, 90, 24, C.brownL) + rect(-280, -120, 50, 230, 18, C.brown) + rect(230, -60, 50, 170, 18, C.brown) +
  rect(-230, -30, 470, 50, 20, '#fff'), at(x, y, s));
const lime = (x, y, s, cut = false) => cut
  ? g(circle(0, 0, 100, '#A6E22E') + circle(0, 0, 80, '#E9F9B9', 0) + [0, 1, 2, 3, 4, 5, 6, 7].map(k => line(`M0 0 L${(Math.cos(k * Math.PI / 4) * 72).toFixed(1)} ${(Math.sin(k * Math.PI / 4) * 72).toFixed(1)}`, 5, '#A6E22E')).join('') + circle(0, 0, 100, 'none'), at(x, y, s))
  : g(ellipse(0, 0, 110, 100, '#7ED957') + shine(-44, -40, 26, 16) + circle(-40, 30, 5, C.greenD, 0) + circle(20, 50, 5, C.greenD, 0) + circle(50, -10, 5, C.greenD, 0) + path('M90 -40 Q140 -80 160 -40 Q120 -20 90 -40Z', C.green), at(x, y, s));
const hand = L.hand;

W['น้ำ'] = (i) => backdrop(i) + shadow(400, 700, 150) + drop(400, 480, 1.9) + g(face(70, { eyes: 'happy' }), at(400, 540)) + drop(620, 280, 0.45) + drop(200, 320, 0.35);
W['หนู'] = (i) => backdrop(i) + shadow(400, 700, 150) + draw(400, 500, 1.45, mouse(0, 0, 1)) + g(path('M0 0 L80 -40 L90 30Z', C.yellow) + circle(40, 0, 8, '#FFE58A', 0) + circle(66, -10, 6, '#FFE58A', 0), at(160, 640, 1.2));
W['นุ่ม'] = (i) => backdrop(i) + shadow(400, 690, 220) + g(
  path('M-220 -60 Q-230 -130 -150 -120 Q0 -150 150 -120 Q230 -130 220 -60 Q240 0 220 60 Q230 130 150 120 Q0 150 -150 120 Q-230 130 -220 60 Q-240 0 -220 -60Z', '#FFD6E7') +
  line('M-150 -80 Q0 -100 150 -80', 5, '#F5A9C8') + shine(-120, -60, 50, 18, -10) + g(face(90, { eyes: 'closed', mouth: 'smile' }), at(0, 20)), at(400, 480)) +
  cloudShape(620, 250, 0.35, '#fff', 6) + sparkle(190, 260, 0.8, '#FFB3D1') + sparkle(640, 640, 0.6, '#FFB3D1');
W['หนึ่ง'] = (i) => backdrop(i) + numberBadge(400, 600, 1.9, '1', C.orange) + g(ellipse(0, 0, 70, 84, C.red) + path('M-10 80 L10 80 L0 96Z', C.red, 5) + line('M0 96 Q20 150 -10 220', 5) + shine(-26, -30, 14, 24), at(610, 250, 0.8));
W['นก'] = (i) => backdrop(i) + shadow(400, 690, 130) + draw(390, 470, 1.6, bird(0, 0, 1, C.sky, { crest: true })) + line('M150 690 L650 690', 16, C.brown) + sparkle(640, 230, 0.7);
W['หน้า'] = (i) => backdrop(i) + g(
  circle(-160, 10, 50, C.skin) + circle(160, 10, 50, C.skin) + circle(0, 0, 200, C.skin) +
  path('M-196 -30 Q-210 -210 0 -212 Q210 -210 196 -30 Q150 -120 60 -110 Q0 -150 -60 -110 Q-150 -120 -196 -30Z', C.hair) +
  g(face(200, { mouth: 'big' }), at(0, 30)) + line('M-8 30 Q0 60 12 46', 7), at(400, 440));
W['นม'] = (i) => backdrop(i) + shadow(400, 690, 150) + milkCarton(330, 520, 1.3) + glass(560, 560, 0.75, '#fff', { level: -30 }) + sparkle(640, 240, 0.8);
W['น้อง'] = (i) => backdrop(i) + shadow(400, 712, 140) + draw(400, 712, 1.55, baby({ arms: { l: [-110, -200], r: [110, -200] }, face: { eyes: 'happy', mouth: 'big' },
  headExtra: () => '' })) + heart(230, 260, 0.8, C.pink) + heart(590, 280, 0.7, C.pink);
W['นิ้ว'] = (i) => backdrop(i) + g(L.hand([true, false, false, false, false]), at(370, 540, 1.15)) + sparkle(600, 250, 0.9) + motion(560, 330, 0.7, -60);
W['เหนื่อย'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.4, kid({ arms: { l: [-60, -60], r: [60, -60] }, face: { eyes: 'tired', mouth: 'wavy' }, shirt: C.red })) +
  drop(560, 330, 0.28, '#7CC8FF') + drop(250, 310, 0.24, '#7CC8FF') + drop(590, 400, 0.2, '#7CC8FF') + line('M300 200 q20 -20 40 0 q20 20 40 0', 6, C.grayD);

// ---- W2
W['ดื่มน้ำ'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.4, girl({ arms: { l: [-60, -110], r: [52, -208] }, face: { eyes: 'closed', mouth: 'none' } })) +
  g(glass(0, 0, 0.55, '#6CC7FF', { level: -20 }), at(478, 408, 1, -30)) + drop(620, 260, 0.3);
W['นกน้อย'] = (i) => backdrop(i) + shadow(400, 690, 120) +
  g(path('M-200 0 Q0 120 200 0 Q180 90 0 100 Q-180 90 -200 0Z', '#C98A4B') + line('M-180 20 L-120 50 M-60 40 L0 70 M60 50 L120 30', 7, C.brownD), at(400, 640)) +
  draw(400, 470, 1.15, bird(0, 0, 1, C.yellow)) + sparkle(620, 250, 0.7);
W['น่ารัก'] = (i) => backdrop(i) + shadow(400, 700, 140) + draw(400, 480, 1.35, cat(0, 0, 1, '#fff', { stripes: false, face: { eyes: 'happy', mouth: 'smile' } })) +
  heart(220, 240, 1, C.pink) + heart(600, 220, 1.2, C.red) + heart(640, 400, 0.7, C.pink) + sparkle(180, 420, 0.6);
W['นอนหลับ'] = (i) => backdrop(i) + shadow(400, 690, 260) + bed(400, 560, 1) +
  g(circle(0, 0, 80, C.skin) + path('M-80 -4 Q-84 -90 0 -86 Q84 -90 80 -4 Q60 -44 20 -40 Q-10 -60 -30 -38 Q-60 -36 -80 -4Z', C.hair) + g(face(80, { eyes: 'closed', mouth: 'o' }), at(0, 10)), at(260, 470)) +
  path('M-130 540 Q60 450 640 520 L640 620 L140 620 Q120 580 -130 540Z', 'none', 0) +
  g(path('M-60 0 Q100 -60 380 -20 L380 80 L-60 80Z', C.blue) + circle(40, 30, 14, '#fff', 0) + circle(150, 10, 14, '#fff', 0) + circle(260, 20, 14, '#fff', 0), at(300, 530)) +
  text(420, 330, 1, 'Z', C.purple, 10, 70) + text(490, 270, 1, 'Z', C.purple, 10, 90) + text(580, 200, 1, 'Z', C.purple, 10, 110);
W['น้ำตาล'] = (i) => backdrop(i) + shadow(400, 690, 190) + bowl(400, 560, 1.2, C.pink, g(path('M-110 -10 Q-60 -80 0 -70 Q60 -80 110 -10Z', '#fff'), at(0, 0))) +
  g(rect(-40, -40, 80, 80, 10, '#fff') + line('M-40 -10 L40 -10', 3, C.grayL), at(250, 330, 1, -15)) + g(rect(-40, -40, 80, 80, 10, '#fff'), at(560, 310, 1, 20)) + sparkle(640, 470, 0.6) + sparkle(180, 460, 0.5);
W['นิทาน'] = (i) => backdrop(i) + shadow(400, 690, 230) + book(400, 520, 1.25) +
  star(290, 290, 36) + star(510, 250, 44, C.pink) + g(path('M0 -60 Q-60 -10 -10 40 Q-60 30 -60 -20 Q-60 -80 0 -60Z', C.yellow, 6), at(400, 330)) + sparkle(620, 360, 0.6) + sparkle(190, 380, 0.6);
W['นิ้วก้อย'] = (i) => backdrop(i) + g(L.hand([false, false, false, true, false]), at(380, 540, 1.15)) + sparkle(210, 270, 0.9, C.pink) + g(path('M0 0 L70 -30', 'none', 8) + path('M70 -30 L42 -34 L58 -12Z', INK, 0), at(520, 300));
W['นิดหน่อย'] = (i) => backdrop(i) + shadow(300, 690, 110) + shadow(560, 690, 100) +
  glass(300, 540, 1.05, '#FFB347', { level: 78 }) +
  g(line('M0 0 L0 82 M-18 0 L18 0 M-18 82 L18 82', 7, C.red), at(206, 544)) +
  g(circle(0, 0, 18, '#FFB347') + circle(38, 10, 14, '#FFB347') + circle(18, -32, 12, '#FFB347'), at(566, 620)) +
  sparkle(210, 300, 0.8) + sparkle(620, 320, 0.6);
W['หน้าหนาว'] = (i) => {
  let s = backdrop(i, { dots: false }) + shadow(400, 712, 150) + draw(400, 712, 1.35, kid({ shirt: C.red, pants: C.blueD, arms: { l: [-40, -150], r: [40, -150] }, face: { mouth: 'o' },
    hat: (hy) => g(path('M-84 10 Q-80 -96 0 -96 Q80 -96 84 10Z', C.teal) + circle(0, -104, 22, '#fff') + rect(-90, -6, 180, 30, 14, '#fff'), at(0, hy - 36)),
    torsoExtra: rect(-60, -186, 120, 30, 14, C.yellow) + rect(22, -176, 30, 70, 10, C.yellow) }));
  [[170, 230], [620, 220], [220, 470], [640, 460], [520, 150], [260, 130]].forEach(([x, y]) => {
    s += g(line('M-24 0 L24 0 M-12 -21 L12 21 M-12 21 L12 -21', 7, '#6EC1FF'), at(x, y));
  });
  return s;
};
W['มะนาว'] = (i) => backdrop(i) + shadow(400, 690, 190) + lime(330, 500, 1.35) + lime(560, 580, 0.8, true);

// ---- W3
W['นักกีฬา'] = (i) => backdrop(i) + shadow(400, 712, 160) + draw(400, 712, 1.35, kid({ shirt: C.red, pants: C.blueD, arms: { l: [-120, -230], r: [110, -110] }, face: { eyes: 'happy', mouth: 'big' },
  hat: (hy) => rect(-86, -20, 172, 24, 10, C.yellow) + '', torsoExtra: text(0, -118, 1, '1', '#fff', 0, 44),
  extraFront: line('M-40 -178 L0 -120 L40 -178', 6) + circle(0, -104, 22, C.yellow, 6) + star(0, -104, 12, C.orange, 0) })) +
  motion(200, 500, 0.9, 180) + sparkle(620, 230, 0.8);
W['นาฬิกา'] = (i) => backdrop(i) + g(
  rect(-60, -330, 120, 160, 30, C.purple) + rect(-60, 170, 120, 160, 30, C.purple) +
  circle(0, 0, 190, C.yellow) + circle(0, 0, 150, '#fff') +
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(k => { const a = k * Math.PI / 6; return `<circle cx="${(Math.sin(a) * 122).toFixed(1)}" cy="${(-Math.cos(a) * 122).toFixed(1)}" r="${k % 3 ? 6 : 11}" fill="${INK}"/>`; }).join('') +
  line('M0 0 L0 -90', 13) + line('M0 0 L64 36', 13) + circle(0, 0, 14, C.red, 6) + rect(186, -24, 30, 48, 8, C.yellow) + shine(-90, -110, 20, 40, 30),
  at(400, 420));
W['น้ำตาลทราย'] = (i) => backdrop(i) + shadow(400, 690, 170) + g(
  path('M-150 -160 Q-160 -200 -110 -200 L110 -200 Q160 -200 150 -160 L170 150 Q170 190 120 190 L-120 190 Q-170 190 -170 150Z', '#fff') +
  path('M-150 -160 Q0 -130 150 -160', 'none', 7) + rect(-110, -40, 220, 140, 20, C.pink) + text(0, 44, 1, 'SUGAR', '#fff', 0, 40) + shine(-110, -100, 16, 50, 0),
  at(360, 470)) + g([0, 1, 2, 3, 4, 5, 6, 7].map(k => rect(((k * 37) % 90) - 45, ((k * 53) % 90) - 45, 14, 14, 3, '#fff', 4)).join(''), at(600, 590)) + sparkle(620, 250, 0.7);
W['น้องน่ารัก'] = (i) => backdrop(i) + shadow(400, 712, 140) + draw(400, 712, 1.5, baby({ shirt: C.pinkL, pants: C.pinkL, arms: { l: [-90, -130], r: [90, -130] }, face: { eyes: 'happy', mouth: 'smile' },
  hat: (hy) => g(heart(0, 0, 0.9, C.pink), at(40, hy - 90)) })) + heart(210, 280, 1, C.red) + heart(610, 250, 1.1, C.pink) + sparkle(640, 470, 0.6);
W['น้องดื่มนม'] = (i) => backdrop(i) + shadow(400, 712, 140) +
  draw(400, 712, 1.5, baby({ arms: { l: [-96, -150], r: [-40, -210] }, face: { eyes: 'closed', mouth: 'none', look: -1 } })) +
  g(rect(-34, -70, 68, 150, 26, '#fff') + rect(-34, 0, 68, 80, 22, '#FFF6D6', 0) + rect(-34, -70, 68, 150, 26, 'none') +
    rect(-40, -98, 80, 30, 10, C.sky) + path('M-16 -98 Q0 -148 16 -98Z', '#FFD9A0'), at(300, 430, 0.85, 34)) + heart(600, 280, 0.9, C.pink);
W['เล่านิทาน'] = (i) => backdrop(i) + shadow(470, 712, 150) + shadow(230, 712, 100) +
  draw(470, 712, 1.2, mom({ hair: 'long', arms: { l: [-110, -150], r: [60, -150] }, face: { mouth: 'open' } })) +
  g(book(0, 0, 0.42), at(400, 520, 1)) + draw(220, 712, 0.95, kid({ arms: { l: [-60, -110], r: [60, -110] }, face: { look: 1, mouth: 'smile' } })) +
  star(350, 250, 26) + star(420, 200, 20, C.pink) + sparkle(640, 260, 0.6);
W['ชูนิ้วก้อย'] = (i) => backdrop(i) + shadow(400, 712, 150) +
  draw(400, 712, 1.3, girl({ arms: { l: [-120, -300], r: [80, -100] }, face: { eyes: 'happy', mouth: 'big' }, hands: false })) +
  g(L.hand([false, false, false, true, false]), at(244, 262, 0.42)) + circle(244, 330, 20, C.skin, 7) + sparkle(160, 200, 0.7, C.pink);
W['ไปเล่นน้ำ'] = (i) => backdrop(i, { dots: false }) + L.inCircle(g(path('M-330 0 Q-250 -30 -170 0 Q-90 30 -10 0 Q70 -30 150 0 Q230 30 330 0 L330 200 Q300 280 0 300 Q-300 280 -330 200Z', '#5DBDFF'), at(400, 540))) +
  draw(400, 640, 1.2, kid({ legs: 'none', arms: { l: [-130, -240], r: [130, -240] }, face: { eyes: 'happy', mouth: 'big' }, shirt: C.teal })) +
  g(ellipse(0, 0, 150, 50, C.red) + ellipse(0, 0, 90, 24, '#5DBDFF', 6) + path('M-60 -40 L-30 -48 L-30 48 L-60 40Z', '#fff', 0) + path('M60 -40 L30 -48 L30 48 L60 40Z', '#fff', 0) + ellipse(0, 0, 150, 50, 'none'), at(400, 560)) +
  drop(200, 420, 0.3) + drop(610, 400, 0.35) + drop(250, 330, 0.2) + line('M140 560 q30 -20 60 0 M600 560 q30 -20 60 0', 7, '#fff');
W['น้ำมะนาว'] = (i) => backdrop(i) + shadow(400, 700, 150) + glass(400, 520, 1.3, '#E9F58A', { level: -60, extra: g(rect(-30, -30, 60, 60, 10, '#E8FBFF', 5), at(-20, 0, 1, 20)) + g(rect(-24, -24, 48, 48, 10, '#E8FBFF', 5), at(24, 60, 1, -12)) }) +
  g(circle(0, 0, 70, '#A6E22E') + circle(0, 0, 54, '#E9F9B9', 0) + circle(0, 0, 70, 'none'), at(520, 360)) + tube('M330 230 L380 480', C.pink, 16) + sparkle(640, 260, 0.6);
W['นอนที่นี่'] = (i) => backdrop(i) + shadow(400, 690, 260) + bed(430, 590, 0.95, C.teal) +
  g(path('M-60 0 Q100 -40 380 -10 L380 80 L-60 80Z', C.teal), at(300, 560)) +
  draw(200, 712, 1.05, kid({ arms: { l: [-80, -110], r: [140, -180] }, face: { mouth: 'open' } })) +
  g(path('M-30 -80 L30 -80 L30 0 L70 0 L0 80 L-70 0 L-30 0Z', C.red), at(480, 380));

Object.defineProperty(W, '_h', { value: { baby, book, bed, drop, milkCarton }, enumerable: false });
module.exports = W;
