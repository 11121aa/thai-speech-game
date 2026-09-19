// Pictures for the meaningful ย words (W1-W3). เล่นหุ่นยนต์ is drawn in w_hor.
const L = require('./lib');
const { C, INK, g, at, circle, ellipse, rect, path, line, tube, shine, shadow, text, sparkle, heart, star, motion, backdrop, face,
  kid, girl, mom, man, grandma, person, draw, mouse, cloudShape, speech, bowl, glass, hand, inCircle } = L;

const W = {};
const stopSign = (x, y, s) => {
  let p = ''; for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; p += (k ? 'L' : 'M') + (Math.cos(a) * 120).toFixed(1) + ' ' + (Math.sin(a) * 120).toFixed(1); }
  return g(rect(-14, 100, 28, 180, 8, C.grayD) + path(p + 'Z', C.red) + path(p.replace(/(-?\d+\.\d)/g, (m) => (parseFloat(m) * 0.84).toFixed(1)) + 'Z', 'none', 6).replace(`stroke="${INK}"`, 'stroke="#fff"') +
    text(0, 22, 1, 'STOP', '#fff', 0, 58), at(x, y, s));
};
const car = (x, y, s, color = C.blue, o = {}) => g(
  path('M-240 40 Q-250 -40 -170 -50 L-110 -130 Q-90 -150 -60 -150 L90 -150 Q120 -150 140 -130 L200 -50 Q260 -40 250 40 Q250 70 220 70 L-220 70 Q-250 70 -240 40Z', color) +
  path('M-96 -118 L-50 -120 L-50 -60 L-150 -60Z', C.sky, 7) + path('M-20 -120 L80 -120 L140 -60 L-20 -60Z', C.sky, 7) +
  circle(-140, 70, 54, C.black) + circle(140, 70, 54, C.black) + circle(-140, 70, 22, C.grayL, 6) + circle(140, 70, 22, C.grayL, 6) +
  ellipse(226, -10, 16, 12, C.yellow, 6) + rect(-30, -30, 44, 12, 6, C.grayL, 5) + shine(-180, -20, 30, 10, -10) + (o.face ? g(face(60, { eyes: 'happy' }), at(40, 0)) : ''), at(x, y, s));
const fridge = (x, y, s, open = false) => g(open
  ? rect(-130, -250, 260, 500, 30, '#F2F5FA') + rect(-110, -230, 220, 460, 16, '#DDF3FF') + line('M-110 -80 L110 -80 M-110 60 L110 60', 8) +
    g(`${circle(-60, -120, 30, C.red)}${rect(10, -170, 60, 90, 12, C.blue)}${ellipse(-40, 20, 44, 30, C.yellow)}${circle(50, 20, 26, C.green)}${rect(-80, 110, 60, 90, 12, '#fff')}${text(-50, 170, 1, 'M', C.blue, 0, 34)}${circle(40, 160, 34, C.orange)}`) +
    path('M130 -250 L230 -210 L230 230 L130 250Z', '#F2F5FA') + rect(160, -120, 20, 100, 8, C.grayD) + text(-10, -300, 1, '', INK)
  : rect(-130, -250, 260, 500, 30, '#F2F5FA') + line('M-130 -60 L130 -60', 8) + rect(80, -200, 20, 100, 8, C.grayD) + rect(80, -20, 20, 120, 8, C.grayD) +
    circle(-60, -180, 18, C.red, 5) + rect(-80, -140, 60, 40, 8, C.yellow, 5) + shine(-90, 60, 16, 90, 0, 0.8), at(x, y, s));
const mosquito = (x, y, s, r = 0) => g(ellipse(-40, -40, 50, 28, '#DDF3FF', 6, -30) + ellipse(20, -46, 50, 28, '#DDF3FF', 6, 30) +
  line('M-10 20 L-60 80 M10 20 L20 90 M30 10 L80 70', 6) + ellipse(0, 0, 60, 26, '#6B6E8A') + line('M-30 -20 L-30 22 M-10 -24 L-10 24 M10 -24 L10 24', 5, '#474A63') +
  circle(-70, -6, 26, '#6B6E8A') + circle(-78, -12, 8, '#fff', 0) + circle(-76, -12, 4, INK, 0) + line('M-94 0 L-150 20', 5), at(x, y, s, r));
const chickenLeg = (x, y, s, r = 0) => g(tube('M60 70 L120 140', '#FFF1D6', 26) + circle(118, 160, 20, '#FFF1D6') + circle(140, 138, 20, '#FFF1D6') +
  path('M-90 -40 Q-60 -130 30 -100 Q110 -70 90 20 Q70 90 -10 70 Q-120 40 -90 -40Z', '#C8702E') + line('M-40 -60 L10 -20 M-10 -80 L50 -30 M-60 -20 L-10 20', 8, '#8E4A1A') + shine(-40, -70, 26, 10, -20, 0.4), at(x, y, s, r));
const grill = (x, y, s, top = '') => g(path('M-220 0 L220 0 Q200 120 0 130 Q-200 120 -220 0Z', C.black) + line('M-140 120 L-180 220 M140 120 L180 220', 14) +
  path('M-60 60 Q-40 40 -20 60 Q0 30 20 60 Q40 40 60 60', C.orange, 0) + rect(-230, -14, 460, 18, 8, C.grayD) + line('M-200 -5 L200 -5', 4, C.gray) + top, at(x, y, s));
const pill = (x, y, s, r = 0) => g(path('M-70 -30 L0 -30 L0 30 L-70 30 Q-100 30 -100 0 Q-100 -30 -70 -30Z', C.red) + path('M0 -30 L70 -30 Q100 -30 100 0 Q100 30 70 30 L0 30Z', '#fff') + shine(-60, -14, 24, 6, 0), at(x, y, s, r));
const tire = (x, y, s) => g(circle(0, 0, 200, C.black) + circle(0, 0, 90, C.grayL) + circle(0, 0, 40, C.gray) +
  [0, 1, 2, 3, 4].map(k => { const a = k * 2 * Math.PI / 5; return circle((Math.cos(a) * 62).toFixed(1), (Math.sin(a) * 62).toFixed(1), 12, C.grayD, 5); }).join('') +
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(k => { const a = k * Math.PI / 6; return line(`M${(Math.cos(a) * 150).toFixed(1)} ${(Math.sin(a) * 150).toFixed(1)} L${(Math.cos(a) * 196).toFixed(1)} ${(Math.sin(a) * 196).toFixed(1)}`, 10, '#57536E'); }).join('') +
  circle(0, 0, 200, 'none') + shine(-110, -110, 40, 14, -45, 0.25), at(x, y, s));
const cane = (x, y) => line(`M${x} ${y} L${x} ${y + 170} M${x} ${y} Q${x} ${y - 40} ${x - 36} ${y - 30}`, 22) + line(`M${x} ${y} L${x} ${y + 170} M${x} ${y} Q${x} ${y - 40} ${x - 36} ${y - 30}`, 10, C.brown);
const longan = (x, y, s) => {
  let o = line('M0 -200 L0 -120 M0 -150 L-80 -80 M0 -150 L80 -90', 8, C.brownD);
  [[-80, -40], [0, -60], [80, -40], [-110, 40], [-30, 30], [50, 30], [120, 40], [-70, 110], [10, 110], [90, 110], [-20, 180], [60, 180]].forEach(([a, b]) => { o += circle(a, b, 48, '#D9A55B') + shine(a - 14, b - 16, 12, 8); });
  return g(o + path('M0 -200 Q60 -260 120 -210 Q60 -180 0 -200Z', C.green), at(x, y, s));
};
const soundWaves = (x, y, s) => g(line('M0 -40 Q30 0 0 40 M40 -80 Q90 0 40 80 M80 -120 Q150 0 80 120', 10, C.purple), at(x, y, s));

W['หยุด'] = (i) => backdrop(i) + shadow(400, 690, 90) + stopSign(400, 360, 1.3) + g(hand([true, true, true, true, true]), at(620, 640, 0.5));
W['ยาย'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.4, grandma({ arms: { l: [-90, -110], r: [90, -110] } })) + heart(610, 270, 0.9, C.pink);
W['ใหญ่'] = (i) => backdrop(i) + shadow(360, 700, 220) + g(
  ellipse(0, 40, 180, 130, '#9AA8C9') + rect(-150, 80, 60, 120, 24, '#9AA8C9') + rect(-50, 90, 60, 110, 24, '#9AA8C9') + rect(60, 90, 60, 110, 24, '#9AA8C9') +
  ellipse(-180, -60, 90, 110, '#B5C1DD') + circle(-120, -90, 110, '#9AA8C9') + tube('M-200 -40 Q-260 60 -230 140', '#9AA8C9', 46) +
  g(face(90, { mouth: 'smile' }), at(-110, -100)) + tube('M170 10 Q210 30 200 70', '#9AA8C9', 12), at(380, 470)) +
  draw(640, 690, 0.45, mouse(0, 0, 1)) + path('M600 420 L660 420 M630 400 L630 440', 'none', 0);
W['ยาม'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, man({ shirt: '#3C5AA6', pants: '#26335E', arms: { l: [-80, -100], r: [110, -170] }, face: { mouth: 'smile' },
  hat: (hy) => g(path('M-90 0 Q-80 -80 0 -84 Q80 -80 90 0Z', '#26335E') + path('M-96 0 L100 0 L130 24 L-96 20Z', C.black) + circle(0, -40, 18, C.yellow, 6), at(0, hy - 40)),
  torsoExtra: rect(20, -170, 26, 30, 6, C.yellow, 5) })) + g(rect(-20, -60, 40, 90, 16, C.black) + circle(0, -70, 20, C.yellow), at(560, 450)) + star(200, 260, 26);
W['ย่าง'] = (i) => backdrop(i) + shadow(400, 700, 220) + grill(400, 520, 1.1,
  line('M-160 -60 L160 -60', 6, C.brownL) + [-110, -40, 30, 100].map(a => ellipse(a, -60, 28, 22, '#C8702E')).join('') +
  line('M-160 -130 L160 -130', 6, C.brownL) + [-110, -40, 30, 100].map(a => circle(a, -130, 22, k2(a))).join('')) +
  line('M300 330 q-20 -30 0 -60 q20 -30 0 -60 M400 320 q-20 -30 0 -60 q20 -30 0 -60 M500 330 q-20 -30 0 -60', 9, C.gray);
function k2(a) { return a % 20 === 0 ? C.green : C.red; }
W['ยักษ์'] = (i) => backdrop(i) + shadow(400, 712, 180) + g(
  path('M-150 -20 Q-160 -140 -100 -170 L100 -170 Q160 -140 150 -20 Q150 120 0 130 Q-150 120 -150 -20Z', '#3DBE6E') +
  path('M-120 -170 L-100 -290 L-60 -210 L0 -330 L60 -210 L100 -290 L120 -170Z', C.yellow) + circle(0, -250, 18, C.red, 6) +
  path('M-110 -70 L-30 -50 M110 -70 L30 -50', 'none', 12) + circle(-60, -30, 26, '#fff') + circle(60, -30, 26, '#fff') + circle(-56, -28, 12, INK, 0) + circle(56, -28, 12, INK, 0) +
  path('M-70 40 Q0 90 70 40 Q40 80 0 80 Q-40 80 -70 40Z', '#8E2F3C', 7) + path('M-60 42 L-48 80 L-34 50Z M60 42 L48 80 L34 50Z', '#fff', 5) + ellipse(0, 10, 20, 14, '#2E9A58', 6) +
  path('M-150 -20 Q-200 -30 -190 20 Q-180 50 -150 40Z M150 -20 Q200 -30 190 20 Q180 50 150 40Z', '#3DBE6E') +
  rect(-120, 130, 240, 140, 40, C.red) + rect(-120, 150, 240, 30, 0, C.yellow, 6), at(400, 470));
W['ยุง'] = (i) => backdrop(i) + mosquito(400, 420, 2.2, -10) + g(line('M0 0 q20 -20 40 0 q20 20 40 0', 6, C.grayD), at(150, 630)) + sparkle(620, 640, 0.6);
W['ยิง'] = (i) => backdrop(i) + g(circle(0, 0, 150, C.red) + circle(0, 0, 110, '#fff') + circle(0, 0, 70, C.red) + circle(0, 0, 32, '#fff'), at(520, 400)) +
  g(line('M0 0 L-260 60', 12) + line('M0 0 L-260 60', 5, C.brownL) + path('M10 -2 L-30 -18 L-24 10Z', C.grayD, 6) + path('M-260 60 L-300 40 L-290 70 L-310 80 L-270 76Z', C.pink, 5), at(530, 400)) +
  motion(200, 470, 0.8, 190) + star(640, 230, 30);
W['ยิ้ม'] = (i) => backdrop(i) + g(circle(0, 0, 210, C.yellow) + g(face(210, { eyes: 'happy', mouth: 'big' }), at(0, 10)) + shine(-110, -110, 40, 20, -40), at(400, 420)) + sparkle(640, 230, 0.9) + sparkle(170, 620, 0.7);
W['ยก'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.05, kid({ arms: { l: [-90, -390], r: [90, -390] }, face: { mouth: 'flat', eyes: 'closed' }, shirt: C.red,
  extraFront: rect(-130, -520, 260, 150, 16, C.brownL) + line('M-130 -470 L130 -470', 6) })) + motion(160, 250, 0.7, 180) + motion(640, 250, 0.7);

// ---- W2
W['ตู้เย็น'] = (i) => backdrop(i) + shadow(400, 690, 170) + fridge(400, 430, 1) + sparkle(610, 250, 0.7, C.sky) + g(line('M-24 0 L24 0 M-12 -21 L12 21 M-12 21 L12 -21', 6, '#6EC1FF'), at(200, 300));
W['รถยนต์'] = (i) => backdrop(i) + shadow(400, 660, 260) + car(400, 540, 1.2, C.red) + motion(110, 500, 0.8, 180);
W['คุณยาย'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(380, 712, 1.4, grandma({ shirt: C.pink, skirt: C.purple, arms: { l: [-80, -110], r: [120, -110] } })) + cane(560, 560) + heart(210, 280, 0.8, C.pink);
W['ลำไย'] = (i) => backdrop(i) + shadow(400, 690, 200) + longan(400, 470, 1.15) + g(circle(0, 0, 40, '#F7F3E6') + circle(0, 0, 16, C.brownD, 0), at(620, 640));
W['กินยา'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, girl({ arms: { l: [-70, -110], r: [46, -214] }, face: { mouth: 'o' } })) +
  pill(465, 406, 0.35, -30) + glass(220, 520, 0.5, '#8FD3FF', { level: -20 }) + sparkle(620, 250, 0.7);
W['ยิ้มแย้ม'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.45, girl({ arms: { l: [-90, -150], r: [90, -150] }, face: { eyes: 'happy', mouth: 'big' } })) +
  sparkle(200, 250, 1) + sparkle(610, 230, 1.2) + sparkle(640, 440, 0.7) + sparkle(160, 460, 0.6);
W['ไก่ย่าง'] = (i) => backdrop(i) + shadow(400, 690, 200) + g(ellipse(0, 0, 240, 60, '#fff') + ellipse(0, -6, 200, 44, '#EAF4FF', 0), at(400, 620)) +
  chickenLeg(330, 490, 1.1, -20) + chickenLeg(500, 520, 0.9, 30) + g(line('M0 0 q-20 -30 0 -60 q20 -30 0 -60', 9, C.gray), at(420, 300)) + g(path('M0 0 Q40 -40 80 0 Q40 20 0 0Z', C.green), at(560, 610));
W['ยุงเยอะ'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.25, kid({ arms: { l: [-130, -300], r: [140, -250] }, face: { mouth: 'open', eyes: 'x' }, shirt: C.green })) +
  mosquito(190, 250, 0.7, 10) + mosquito(620, 220, 0.8, -20) + mosquito(650, 450, 0.6, -5) + mosquito(160, 500, 0.55, 20) + mosquito(420, 170, 0.5, 0);
W['คุณย่า'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.4, grandma({ hair: 'grayShort', shirt: C.teal, skirt: C.brown, arms: { l: [-60, -140], r: [60, -140] },
  extraFront: g(ellipse(0, 0, 50, 40, C.red) + line('M-60 -60 L20 20 M60 -60 L-20 20', 6, C.brownL), at(0, -150)) })) + sparkle(620, 250, 0.7);
W['ห่วงใย'] = (i) => backdrop(i) + shadow(400, 712, 180) +
  draw(320, 712, 1.1, kid({ arms: { l: [-60, -150], r: [110, -170] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  draw(470, 712, 1.35, mom({ hair: 'long', arms: { l: [-190, -180], r: [60, -150] }, face: { eyes: 'happy', mouth: 'smile' } })) + heart(400, 230, 1.4, C.red) + heart(250, 300, 0.6, C.pink);

// ---- W3
W['คุณยายยิ้ม'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.45, grandma({ shirt: C.orange, skirt: C.purple, arms: { l: [-110, -170], r: [110, -170] }, face: { eyes: 'happy', mouth: 'big' } })) +
  sparkle(200, 250, 0.9) + sparkle(610, 240, 0.9);
W['คุณย่ายืน'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(380, 712, 1.45, grandma({ hair: 'grayShort', shirt: C.teal, skirt: C.brown, arms: { l: [-80, -100], r: [130, -110] }, face: { eyes: 'open', mouth: 'smile' } })) + cane(570, 560);
W['เปิดตู้เย็น'] = (i) => backdrop(i) + shadow(400, 690, 220) + fridge(370, 430, 0.95, true) + sparkle(640, 250, 0.7, C.sky) + g(path('M0 0 L60 0', 'none', 0), at(0, 0));
W['ยำวุ้นเส้น'] = (i) => backdrop(i) + shadow(400, 670, 230) + g(ellipse(0, 20, 250, 70, '#fff') + ellipse(0, 10, 210, 52, '#EAF4FF', 0) +
  line('M-150 0 q30 -30 60 0 q30 30 60 0 q30 -30 60 0 q30 30 60 0 q30 -30 60 0', 7, '#D8BE8C') + line('M-140 -20 q30 -30 60 0 q30 30 60 0 q30 -30 60 0 q30 30 60 0', 7, '#D8BE8C') +
  ellipse(-80, -30, 30, 18, '#FF8A5C') + ellipse(60, -40, 30, 18, '#FF8A5C') + circle(-10, -10, 16, C.red) + circle(120, -10, 12, C.red) +
  path('M-150 -30 Q-120 -80 -80 -50', C.green, 5) + path('M100 -40 Q140 -90 170 -40', C.green, 5) + line('M-40 -50 L-10 -60 M20 -20 L50 -30', 7, C.green), at(400, 520, 1.35)) + sparkle(620, 290, 0.7) + g(line('M0 0 q-20 -30 0 -60', 7, C.gray), at(400, 400));
W['รถยนต์หยุด'] = (i) => backdrop(i) + shadow(340, 670, 220) + car(320, 560, 0.9, C.blue) + stopSign(620, 300, 0.7);
W['ยิงปืนใหญ่'] = (i) => backdrop(i) + shadow(360, 690, 220) + g(
  path('M-80 -60 L220 -140 Q250 -150 260 -120 L270 -80 Q276 -54 250 -46 L-40 40Z', C.grayD) + ellipse(260, -100, 20, 44, INK, 0, -15) +
  circle(-60, 60, 90, C.brown) + circle(-60, 60, 30, C.brownD) + line('M-60 -30 L-60 150 M-150 60 L30 60 M-124 -4 L4 124 M-124 124 L4 -4', 8, C.brownD) + circle(-60, 60, 90, 'none') +
  shine(80, -100, 60, 10, -18, 0.4), at(340, 540)) + g(circle(0, 0, 50, C.black) + shine(-16, -16, 12, 8), at(660, 290)) + bark(0, 0, 0) +
  g(path('M0 -60 L30 -20 L80 -40 L60 0 L110 30 L50 40 L60 90 L10 50 L-40 90 L-30 40 L-90 30 L-40 0 L-70 -50 L-20 -20Z', C.orange, 7), at(600, 420, 0.7)) + cloudShape(560, 440, 0.25, '#E9ECF4', 6);
function bark() { return ''; }
W['กินไก่ย่าง'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, kid({ arms: { l: [-80, -110], r: [40, -200] }, face: { eyes: 'happy', mouth: 'chew' }, shirt: C.pink })) +
  chickenLeg(470, 400, 0.55, 120) + sparkle(200, 260, 0.7);
W['ยางรถยนต์'] = (i) => backdrop(i) + shadow(400, 700, 200) + tire(400, 440, 1.2) + sparkle(640, 230, 0.7);
W['ได้ยินเสียง'] = (i) => backdrop(i) + shadow(340, 712, 150) + draw(330, 712, 1.35, kid({ arms: { l: [-80, -110], r: [100, -260] }, face: { eyes: 'open', look: 1, mouth: 'o' }, shirt: C.yellow })) +
  soundWaves(520, 350, 0.9) + g(path('M-50 40 Q-50 -60 0 -60 Q50 -60 50 40 L66 60 L-66 60Z', C.yellow) + circle(0, 76, 16, C.orange) + line('M0 -60 L0 -80', 7), at(660, 280, 0.8));

Object.defineProperty(W, '_h', { value: { car, fridge, mosquito, stopSign, longan, pill, cane, chickenLeg, tire }, enumerable: false });
module.exports = W;
