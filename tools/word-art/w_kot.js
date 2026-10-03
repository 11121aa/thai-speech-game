// Pictures for the แม่กด words (workbook pages 116-119, highlighted only).
// รถยนต์ already has a picture from another sound.
const L = require('./lib');
const { C, INK, g, at, circle, ellipse, rect, path, line, tube, shine, shadow, text, sparkle, heart, star, motion, backdrop, face,
  kid, girl, mom, man, person, draw, cat, bird, cloudShape, speech, glass, bowl, numberBadge } = L;

const W = {};

// ---------------------------------------------------------------- props
const dad = (o = {}) => man(Object.assign({ shirt: C.blue, pants: C.brown }, o));
const teacher = (o = {}) => person(Object.assign({ hair: 'bun', hairColor: '#3B2323', shirt: C.teal, skirt: C.purple }, o));
const sun = (x, y, r = 60) => circle(x, y, r, C.yellow) + [0, 1, 2, 3, 4, 5, 6, 7].map(k => {
  const a = k * Math.PI / 4;
  return line(`M${(x + Math.cos(a) * (r + 16)).toFixed(0)} ${(y + Math.sin(a) * (r + 16)).toFixed(0)} L${(x + Math.cos(a) * (r + 40)).toFixed(0)} ${(y + Math.sin(a) * (r + 40)).toFixed(0)}`, 9, C.orange);
}).join('');
const drop = (x, y, s, color = '#4DB8FF') => g(path('M0 -30 Q20 0 20 12 Q20 30 0 30 Q-20 30 -20 12 Q-20 0 0 -30Z', color, 5), at(x, y, s));
const bubbles = (pts) => pts.map(([x, y, r]) => circle(x, y, r, '#EAF6FF', 5) + shine(x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.18)).join('');
const temple = (x, y, s) => g(
  rect(-200, -40, 400, 180, 12, C.cream) + rect(-200, 140, 400, 30, 10, '#E3D7B8') +
  [-150, -50, 50, 150].map(wx => rect(wx - 26, 0, 52, 90, 26, '#8E6B3F')).join('') +
  path('M-250 -40 L0 -170 L250 -40Z', '#C73B3B') + path('M-200 -90 L0 -200 L200 -90Z', '#E0583F') +
  path('M-150 -140 L0 -230 L150 -140Z', C.yellowD) +
  path('M0 -230 L18 -270 L0 -340 L-18 -270Z', C.yellow) + circle(0, -350, 14, C.yellow) +
  line('M-250 -40 L-282 -78 M250 -40 L282 -78', 10, C.yellowD), at(x, y, s));
const fan = (x, y, s, r = 0) => g(
  path('M0 120 L-170 -70 Q0 -170 170 -70Z', C.pink) +
  [-120, -60, 0, 60, 120].map(a => line(`M0 120 L${(Math.sin(a * Math.PI / 180) * 196).toFixed(0)} ${(120 - Math.cos(a * Math.PI / 180) * 196).toFixed(0)}`, 5, '#D96FA0')).join('') +
  path('M0 120 L-170 -70 Q0 -170 170 -70Z', 'none') + circle(0, 120, 22, C.brownD) + rect(-14, 110, 28, 70, 12, C.brownD), at(x, y, s, r));
const brush = (x, y, s, r = 0) => g(rect(-70, -26, 140, 52, 20, C.brownL) + rect(-60, 26, 120, 34, 8, '#F2E3C0') +
  line('M-40 26 L-40 60 M-14 26 L-14 60 M14 26 L14 60 M40 26 L40 60', 6, '#CBB184'), at(x, y, s, r));
const ant = (x, y, s, color = INK, r = 0) => g(
  ellipse(-78, 0, 44, 36, color) + ellipse(0, 4, 34, 28, color) + ellipse(74, 0, 54, 44, color) +
  line('M-54 10 L-40 54 M-6 16 L0 60 M44 14 L54 56', 8, color) +
  line('M-54 -8 L-70 -44 M-6 -12 L-4 -50 M44 -8 L58 -46', 8, color) +
  line('M-100 -22 Q-130 -60 -112 -86 M-86 -26 Q-104 -70 -78 -92', 7, color) +
  circle(-90, -6, 7, '#fff') + circle(-91, -6, 4, INK, 0) + shine(66, -14, 16, 9), at(x, y, s, r));
const frog = (x, y, s) => g(
  tube('M-70 10 L-132 -30 L-150 40', C.greenD, 30) + tube('M70 10 L132 -30 L150 40', C.greenD, 30) +
  path('M-178 36 Q-196 72 -160 74 L-122 60Z', C.greenD, 7) + path('M178 36 Q196 72 160 74 L122 60Z', C.greenD, 7) +
  ellipse(0, 0, 112, 86, C.green) + ellipse(0, 28, 74, 46, '#CFF0C0', 0) + ellipse(0, 0, 112, 86, 'none') +
  tube('M-56 50 L-74 86', C.greenD, 22) + tube('M56 50 L74 86', C.greenD, 22) +
  path('M-96 84 Q-112 104 -84 106 L-58 96Z', C.greenD, 6) + path('M96 84 Q112 104 84 106 L58 96Z', C.greenD, 6) +
  circle(-50, -82, 34, C.green) + circle(50, -82, 34, C.green) +
  circle(-50, -86, 16, '#fff') + circle(50, -86, 16, '#fff') + circle(-47, -86, 9, INK, 0) + circle(53, -86, 9, INK, 0) +
  line('M-40 8 Q0 44 40 8', 7) + ellipse(-62, 20, 12, 8, '#8FD97A', 0) + ellipse(62, 20, 12, 8, '#8FD97A', 0), at(x, y, s));
const fish = (x, y, s, color = C.orange, r = 0) => g(ellipse(0, 0, 96, 64, color) + path('M80 0 L164 -56 L164 56Z', color) +
  circle(-44, -16, 12, '#fff') + circle(-46, -16, 6, INK, 0) + line('M-10 16 Q10 30 30 16', 6) + path('M0 -62 L30 -110 L58 -56Z', color, 6) + shine(-30, -36, 22, 10), at(x, y, s, r));
const porcupine = (x, y, s) => g(
  [...Array(13)].map((_, k) => { const a = (-168 + k * 14) * Math.PI / 180;
    return line(`M${(Math.cos(a) * 70).toFixed(0)} ${(Math.sin(a) * 50).toFixed(0)} L${(Math.cos(a) * 160).toFixed(0)} ${(Math.sin(a) * 130).toFixed(0)}`, 11, '#6B4A2F'); }).join('') +
  ellipse(0, 0, 130, 86, C.brownL) + path('M110 -20 Q190 -6 196 30 Q150 44 112 34Z', C.brownL) +
  circle(170, 6, 9, INK, 0) + circle(196, 30, 11, '#5A3A22') + line('M150 36 Q168 48 186 38', 5) +
  ellipse(-60, 80, 34, 20, C.brownL) + ellipse(50, 84, 34, 20, C.brownL), at(x, y, s));
const straw = (x, y, s, color = C.red) => g(line('M0 150 L0 -40 L70 -92', 22, color) + line('M0 150 L0 -40 L70 -92', 10, '#fff')
  .replace(`stroke="#fff"`, `stroke="#ffffff" opacity="0.45"`), at(x, y, s));
const cup = (x, y, s, liquid = '#FF9F6E') => g(path('M-96 -110 L96 -110 L72 110 Q0 128 -72 110Z', '#EAF3FF') +
  path('M-84 -60 L84 -60 L66 102 Q0 118 -66 102Z', liquid, 0) + path('M-96 -110 L96 -110 L72 110 Q0 128 -72 110Z', 'none') +
  ellipse(0, -110, 96, 20, '#fff'), at(x, y, s));
const banknote = (x, y, s, r = 0, color = '#9BE2B4') => g(rect(-130, -70, 260, 140, 12, color) + rect(-108, -50, 216, 100, 8, 'none', 5) +
  circle(0, 0, 36, '#CFF3DC', 5) + text(0, 14, 1, '฿', '#2F7D4F', 0, 44), at(x, y, s, r));
const coin = (x, y, s) => g(circle(0, 0, 44, C.yellow) + circle(0, 0, 30, 'none', 5) + text(0, 14, 1, '฿', C.yellowD, 0, 38), at(x, y, s));
const paper = (x, y, s, r = 0, lines = true) => g(rect(-110, -150, 220, 300, 12, '#fff') +
  (lines ? line('M-70 -90 L70 -90 M-70 -40 L70 -40 M-70 10 L70 10 M-70 60 L20 60', 6, C.grayL) : ''), at(x, y, s, r));
const pencil = (x, y, s, r = 0) => g(rect(-20, -150, 40, 230, 8, C.yellow) + path('M-20 80 L20 80 L0 130Z', '#F3D3A8') + path('M-8 110 L8 110 L0 130Z', INK, 0) +
  rect(-20, -180, 40, 34, 8, C.pink) + line('M-20 -146 L20 -146', 5), at(x, y, s, r));
const scissors = (x, y, s, r = 0) => g(line('M-46 90 L40 -74 M46 90 L-40 -74', 16, C.grayD) +
  circle(-52, 112, 32, 'none', 14) + circle(52, 112, 32, 'none', 14) + circle(0, 20, 9, C.grayD), at(x, y, s, r));
const desk = (x, y, s, top = '') => g(rect(-200, -20, 400, 34, 12, C.brownL) + rect(-170, 14, 26, 150, 8, C.brown) + rect(144, 14, 26, 150, 8, C.brown) + g(top, at(0, -20)), at(x, y, s));
const plate = (x, y, s, food = '') => g(ellipse(0, 0, 150, 52, '#fff') + ellipse(0, -6, 108, 34, '#F3F6FF', 5) + g(food, at(0, -16)), at(x, y, s));
const spoon = (x, y, s, r = 0) => g(ellipse(0, -96, 36, 48, '#E9ECF5') + rect(-11, -62, 22, 150, 11, '#D8DDEA'), at(x, y, s, r));
const mushroom = (x, y, s, cap = C.red) => g(rect(-22, -20, 44, 76, 16, C.cream) + path('M-84 -16 Q-84 -92 0 -92 Q84 -92 84 -16 Q0 4 -84 -16Z', cap) +
  circle(-40, -50, 12, '#fff', 0) + circle(26, -62, 9, '#fff', 0) + circle(46, -34, 8, '#fff', 0), at(x, y, s));
const cabbage = (x, y, s) => g(
  path('M-96 -40 Q-150 -120 -118 -176 Q-74 -128 -52 -62Z', '#7FBF3F') +
  path('M96 -40 Q150 -120 118 -176 Q74 -128 52 -62Z', '#7FBF3F') +
  path('M-104 -20 Q-110 -150 0 -186 Q110 -150 104 -20 Q104 120 0 126 Q-104 120 -104 -20Z', '#F6FBE6') +
  path('M-104 -30 Q-96 -130 -40 -170 Q-20 -90 -34 100 Q-80 86 -104 -30Z', '#EAF6D2', 0) +
  path('M104 -30 Q96 -130 40 -170 Q20 -90 34 100 Q80 86 104 -30Z', '#EAF6D2', 0) +
  path('M-104 -20 Q-110 -150 0 -186 Q110 -150 104 -20 Q104 120 0 126 Q-104 120 -104 -20Z', 'none') +
  line('M0 -170 L0 110 M-54 -140 Q-62 -20 -48 96 M54 -140 Q62 -20 48 96', 6, '#BBD98A') +
  path('M-104 -24 Q-60 -72 -20 -36 Q20 -74 60 -36 Q92 -70 104 -24', 'none', 6) +
  ellipse(0, 126, 86, 28, '#7FBF3F'), at(x, y, s));
const bag = (x, y, s, color = C.orange, torn = false) => g(
  path('M-60 -150 Q0 -210 60 -150', 'none', 14) + rect(-130, -150, 260, 230, 26, color) +
  rect(-130, -80, 260, 40, 0, '#00000018', 0) + rect(-130, -150, 260, 230, 26, 'none') +
  (torn ? path('M60 -20 L120 -10 L74 20 L128 36 L60 70 Z', '#00000000', 7) + path('M64 -16 L112 -6 L70 18 L120 34 L62 62', 'none', 7) : '') +
  circle(0, -10, 16, C.yellow, 5), at(x, y, s));
const toilet = (x, y, s) => g(rect(-70, -210, 140, 120, 18, '#fff') + rect(-56, -196, 112, 40, 8, '#DCE6F5', 0) +
  path('M-100 -90 L100 -90 L80 40 Q0 70 -80 40Z', '#fff') + ellipse(0, -84, 100, 34, '#EAF3FF') +
  rect(-70, -210, 140, 120, 18, 'none') + rect(-60, 40, 120, 40, 12, '#E7EDF8'), at(x, y, s));
const flag = (x, y, s) => g(line('M-170 -140 L-170 170', 12, C.brownD) +
  rect(-170, -150, 320, 46, 0, '#A51931') + rect(-170, -104, 320, 46, 0, '#F4F5F8') +
  rect(-170, -58, 320, 92, 0, '#2D2A4A') + rect(-170, 34, 320, 46, 0, '#F4F5F8') + rect(-170, 80, 320, 46, 0, '#A51931') +
  rect(-170, -150, 320, 276, 0, 'none'), at(x, y, s));
const switchPlate = (x, y, s, on = true) => g(rect(-90, -130, 180, 260, 20, '#F2F4FA') +
  rect(-46, -86, 92, 172, 14, on ? C.green : C.gray) + rect(-40, on ? -80 : 6, 80, 74, 12, '#fff') +
  text(0, on ? 130 : 130, 1, on ? 'เปิด' : 'ปิด', INK, 0, 44), at(x, y, s));
const door = (x, y, s, open = false) => g(rect(-120, -300, 240, 330, 14, C.brown) +
  (open ? path('M-100 20 L-100 -280 L40 -240 L40 40Z', '#4A3350') : rect(-100, -280, 200, 300, 8, C.brownL) + circle(66, -130, 11, C.yellow, 5)), at(x, y, s));

// ---------------------------------------------------------------- W1
W['วัด'] = (i) => backdrop(i) + shadow(400, 700, 250) + temple(400, 560, 0.92) + sun(650, 220, 42) +
  g(path('M-70 40 Q-70 -40 0 -40 Q70 -40 70 40Z', C.green, 6) + line('M0 40 L0 -20', 8, C.brown), at(160, 680, 0.7));
W['พัด'] = (i) => backdrop(i) + shadow(400, 712, 180) +
  draw(330, 712, 1.2, kid({ shirt: C.sky, arms: { l: [-96, -130], r: [120, -230] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  fan(560, 380, 0.78, 22) + motion(620, 520, 0.8, 120) + motion(640, 440, 0.6, 140) + sparkle(190, 280, 0.7);
W['ขัด'] = (i) => backdrop(i) + shadow(400, 716, 240) +
  draw(330, 716, 1.05, kid({ legs: 'kneel', shirt: C.orange, arms: { l: [-60, -110], r: [140, -70] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  brush(560, 650, 0.86, -8) + bubbles([[620, 520, 30], [672, 580, 20], [560, 470, 18]]) +
  line('M150 706 L680 706', 12, C.grayL) + motion(640, 660, 0.6);
W['มด'] = (i) => backdrop(i) + shadow(400, 690, 180) + ant(380, 500, 1.25) +
  g(path('M-60 30 Q0 -40 60 30Z', '#C98A4B') + ellipse(0, 30, 62, 16, '#A0632D'), at(620, 660, 0.9)) + sparkle(190, 280, 0.8);
W['โดด'] = (i) => backdrop(i) + ellipse(400, 712, 120, 22, INK, 0).replace('fill="' + INK + '"', 'fill="' + INK + '" opacity="0.13"') +
  draw(400, 600, 1.3, kid({ shirt: C.red, arms: { l: [-150, -300], r: [150, -300] },
    face: { eyes: 'happy', mouth: 'big' } })) +
  motion(190, 540, 0.8, 180) + motion(620, 540, 0.8) + sparkle(640, 280, 0.8) + sparkle(180, 300, 0.6);
W['วาด'] = (i) => backdrop(i) + shadow(400, 716, 230) +
  draw(300, 716, 1.1, kid({ shirt: C.purple, arms: { l: [-110, -130], r: [150, -200] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  g(pencil(0, 0, 0.5, 44), at(500, 508)) + paper(590, 600, 0.78, 6, false) +
  g(circle(-40, -40, 26, C.yellow, 5) + path('M-80 40 L-20 -30 L30 20 L80 -34 L80 40Z', C.green, 5), at(590, 600, 0.72)) + sparkle(200, 270, 0.7);
W['เจ็ด'] = (i) => backdrop(i) + numberBadge(400, 470, 1.9, '๗', C.orange) +
  g([...Array(7)].map((_, k) => circle(-150 + (k % 4) * 100, k < 4 ? 0 : 90, 32, C.red)).join(''), at(390, 640, 0.62)) +
  text(620, 330, 1, '7', C.orange, 8, 84) + sparkle(180, 290, 0.7);
W['แปด'] = (i) => backdrop(i) + numberBadge(400, 470, 1.9, '๘', C.teal) +
  g([...Array(8)].map((_, k) => circle(-150 + (k % 4) * 100, k < 4 ? 0 : 90, 32, C.blue)).join(''), at(390, 640, 0.62)) +
  text(620, 330, 1, '8', C.teal, 8, 84) + sparkle(180, 290, 0.7);
W['ปิด'] = (i) => backdrop(i) + shadow(400, 712, 200) + door(420, 700, 1.0) +
  g(path('M0 0 L-120 0', 'none', 12) + path('M-120 0 L-78 -24 L-78 24Z', INK, 0), at(260, 480, 0.9)) +
  sparkle(640, 280, 0.7) + motion(250, 560, 0.6, 180);
W['กอด'] = (i) => backdrop(i) + shadow(400, 716, 250) +
  draw(330, 716, 1.15, girl({ arms: { l: [-96, -150], r: [150, -170] }, face: { eyes: 'closed', mouth: 'smile' } })) +
  draw(486, 716, 1.05, kid({ shirt: C.yellow, arms: { l: [-160, -170], r: [96, -150] }, face: { eyes: 'closed', mouth: 'big' } })) +
  heart(200, 290, 0.9, C.red) + heart(630, 260, 1.05, C.pink) + heart(650, 430, 0.6, C.red);
W['เลือด'] = (i) => backdrop(i) + shadow(400, 700, 180) +
  g(L.hand([true, true, true, true, true]), at(380, 620, 1.0)) +
  g(rect(-62, -24, 124, 48, 16, '#FFD9A8') + rect(-20, -24, 40, 48, 0, '#FFEBD2', 0) + rect(-62, -24, 124, 48, 16, 'none') +
    circle(-8, -2, 4, '#E9C08A', 0) + circle(10, 6, 4, '#E9C08A', 0), at(366, 470, 1.0, -14)) +
  drop(560, 400, 0.6, '#E23B3B') + drop(620, 500, 0.42, '#E23B3B') + sparkle(190, 300, 0.6);

// ---------------------------------------------------------------- W2
W['หลอดดูด'] = (i) => backdrop(i) + shadow(400, 700, 180) + cup(400, 560, 1.1) + g(straw(0, 0, 1.0), at(400, 470)) +
  bubbles([[620, 330, 22], [660, 400, 14]]) + sparkle(180, 300, 0.7);
W['วาดรูป'] = (i) => backdrop(i) + shadow(400, 724, 250) +
  g(line('M-110 190 L0 -190 L110 190 M0 -190 L0 200', 14, C.brownD) + rect(-140, -170, 280, 210, 10, '#fff') +
    circle(-54, -96, 32, C.yellow, 0) + path('M-120 20 L-44 -64 L10 -4 L64 -54 L120 20Z', C.green, 0) + rect(-140, -170, 280, 210, 10, 'none') +
    rect(-150, 40, 300, 16, 6, C.brown), at(470, 520, 0.92)) +
  draw(210, 724, 1.0, kid({ shirt: C.pink, arms: { l: [-96, -130], r: [150, -210] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  g(brush(0, 0, 0.42, 40), at(330, 500)) + sparkle(650, 270, 0.7);
W['เปิดปิด'] = (i) => backdrop(i) + shadow(260, 700, 120) + shadow(560, 700, 120) +
  switchPlate(260, 540, 0.9, true) + switchPlate(560, 540, 0.9, false) + sparkle(400, 260, 0.8);
W['เงินสด'] = (i) => backdrop(i) + shadow(400, 700, 220) +
  banknote(350, 500, 1.0, -8) + banknote(430, 580, 0.92, 7, '#B9ECC9') + coin(610, 630, 1.0) + coin(540, 680, 0.78) +
  sparkle(200, 290, 0.8) + sparkle(650, 300, 0.6);
W['พูดชัด'] = (i) => backdrop(i) + shadow(400, 716, 200) +
  draw(300, 716, 1.2, kid({ shirt: C.green, arms: { l: [-96, -120], r: [110, -140] }, face: { eyes: 'happy', mouth: 'big' } })) +
  g(cloudShape(0, 0, 0.78, '#fff', 7) + text(0, 24, 1, 'ก ข', INK, 0, 76), at(580, 360)) +
  sparkle(650, 540, 0.7) + sparkle(180, 300, 0.6);
W['กระโดด'] = (i) => backdrop(i) + ellipse(400, 716, 130, 22, INK, 0).replace('fill="' + INK + '"', 'fill="' + INK + '" opacity="0.13"') +
  draw(400, 580, 1.25, kid({ shirt: C.orange, legs: 'kneel', arms: { l: [-160, -290], r: [160, -290] },
    face: { eyes: 'happy', mouth: 'big' } })) +
  motion(170, 520, 0.8, 180) + motion(640, 520, 0.8) + star(640, 270, 28, C.yellow) + sparkle(180, 290, 0.6);
W['มดกัด'] = (i) => backdrop(i) + shadow(400, 700, 200) +
  g(L.hand([true, true, true, true, true]), at(360, 630, 0.98)) + ant(430, 450, 0.56, '#8C3A2A', -14) +
  star(576, 300, 42, C.red, 6) + text(600, 404, 1, 'โอ๊ย!', C.red, 8, 52) + motion(180, 420, 0.6, 180);
W['ตัดผม'] = (i) => backdrop(i) + shadow(400, 724, 210) +
  g(rect(-26, 40, 52, 170, 14, C.grayD) + rect(-110, 210, 220, 26, 10, C.grayD) + rect(-130, -10, 260, 54, 20, C.teal), at(400, 530, 1)) +
  draw(400, 608, 1.12, person({ legs: 'none', hair: 'short', shirt: '#FFE3B5', sleeve: '#FFE3B5', hands: false,
    arms: { l: [-120, -120], r: [120, -120] }, face: { eyes: 'closed', mouth: 'smile' },
    torsoExtra: path('M-62 -190 Q0 -168 62 -190 L104 -82 L-104 -82Z', '#FFE3B5', 7) })) +
  g(scissors(0, 0, 0.7, 30), at(196, 250)) +
  line('M530 300 q-12 24 8 38 M566 352 q-14 22 6 36', 7, C.hair) + sparkle(640, 250, 0.8);
W['ไปวัด'] = (i) => backdrop(i) + shadow(400, 716, 250) + temple(540, 560, 0.48) + sun(170, 230, 38) +
  draw(250, 716, 1.0, kid({ shirt: C.yellow, arms: { l: [-110, -120], r: [96, -210] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  g(path('M0 0 L0 -90', 'none', 9) + [0, 1, 2].map(k => circle(-18 + k * 18, -104, 16, [C.pink, C.yellow, C.purple][k])).join(''), at(346, 520, 0.92)) +
  g(path('M0 0 L70 -30', 'none', 9) + path('M70 -30 L42 -34 L58 -12Z', INK, 0), at(400, 430));

// ---------------------------------------------------------------- W3
W['ผักกาดขาว'] = (i) => backdrop(i) + shadow(400, 700, 190) + cabbage(390, 520, 1.05) +
  g(path('M-60 30 Q-30 -40 0 10 Q30 -40 60 30Z', C.green, 6), at(620, 650, 0.8)) + sparkle(190, 280, 0.8);
W['กบกระโดด'] = (i) => backdrop(i) + shadow(430, 712, 160) +
  g(ellipse(0, 0, 150, 46, '#5BC98A') + path('M-150 0 L-40 -10 L-20 10Z', '#49B377', 0) + ellipse(0, 0, 150, 46, 'none'), at(240, 690, 1)) +
  frog(430, 470, 1.08) + motion(170, 470, 0.7, 180) + motion(660, 470, 0.7) +
  g(path('M0 0 Q90 -120 180 -10', 'none', 7).replace('stroke-width="7"', 'stroke-width="7" stroke-dasharray="18 16"'), at(180, 560)) + sparkle(640, 250, 0.7);
W['กระเป๋าขาด'] = (i) => backdrop(i) + shadow(400, 706, 190) + bag(380, 580, 1.05, C.orange, true) +
  g(path('M0 0 L-70 -34', 'none', 9) + path('M-70 -34 L-40 -36 L-54 -14Z', INK, 0), at(640, 480)) +
  text(640, 620, 1, 'ขาด', C.red, 7, 46) + sparkle(190, 290, 0.7);
W['ขัดห้องน้ำ'] = (i) => backdrop(i) + shadow(430, 712, 220) + toilet(470, 640, 0.86) +
  draw(230, 716, 0.96, kid({ legs: 'kneel', shirt: C.teal, arms: { l: [-60, -110], r: [140, -90] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  brush(400, 600, 0.6, -24) + bubbles([[560, 380, 30], [630, 450, 20], [500, 320, 18], [660, 350, 13]]) + motion(200, 430, 0.6, 180);
W['กินผัดเห็ด'] = (i) => backdrop(i) + shadow(400, 716, 240) +
  draw(392, 690, 1.08, kid({ legs: 'none', shirt: C.brownL, arms: { l: [-110, -150], r: [74, -250] }, face: { eyes: 'happy', mouth: 'chew' } })) +
  g(spoon(0, 0, 0.44, 160), at(470, 356)) +
  g(rect(-250, -24, 500, 38, 14, C.brownL) + rect(-210, 14, 26, 130, 8, C.brown) + rect(184, 14, 26, 130, 8, C.brown), at(400, 668)) +
  plate(400, 646, 0.92, mushroom(0, 10, 0.4) + mushroom(-60, 22, 0.32, C.brown) + mushroom(58, 24, 0.3, C.orange)) + sparkle(650, 280, 0.7);
W['หลอดดูดน้ำ'] = (i) => backdrop(i) + shadow(400, 716, 230) +
  draw(250, 716, 1.05, kid({ shirt: C.sky, arms: { l: [-96, -130], r: [140, -200] }, face: { eyes: 'happy', mouth: 'o' } })) +
  cup(520, 580, 0.92, '#6CC7FF') + g(straw(0, 0, 0.86), at(520, 500)) + drop(650, 320, 0.4) + bubbles([[640, 430, 18]]);
W['ตัดกระดาษ'] = (i) => backdrop(i) + shadow(400, 700, 200) + paper(360, 560, 1.05, -6) +
  g(path('M-110 -150 L-110 150', 'none', 6).replace('stroke-width="6"', 'stroke-width="6" stroke-dasharray="16 14"'), at(360, 560, 1.05)) +
  g(scissors(0, 0, 0.78, -40), at(560, 420)) + sparkle(190, 290, 0.7) +
  g(path('M-40 0 L40 -16', 'none', 6), at(620, 650, 1));
W['ประเทศไทย'] = (i) => backdrop(i) + shadow(400, 700, 200) + flag(420, 540, 0.96) +
  g(temple(0, 0, 0.3), at(200, 680)) + sparkle(640, 260, 0.8) + sparkle(190, 300, 0.6);
W['เจ็ดสิบแปด'] = (i) => backdrop(i) + numberBadge(290, 480, 1.7, '๗', C.orange) + numberBadge(510, 480, 1.7, '๘', C.teal) +
  g(rect(-150, -70, 300, 140, 24, '#fff') + text(0, 36, 1, '78', C.purple, 0, 104), at(400, 672, 0.78)) +
  sparkle(180, 280, 0.7) + sparkle(650, 300, 0.6);
W['มดแดงกัด'] = (i) => backdrop(i) + shadow(400, 700, 200) +
  g(L.hand([true, true, true, true, true]), at(350, 636, 0.96)) +
  ant(420, 452, 0.52, '#D13B2A', -14) + ant(560, 540, 0.4, '#D13B2A', 10) +
  star(584, 300, 44, C.red, 6) + text(606, 406, 1, 'โอ๊ย!', C.red, 8, 50) + motion(176, 430, 0.6, 180);
W['ขีดเส้นใต้'] = (i) => backdrop(i) + shadow(400, 700, 210) +
  g(rect(-170, -210, 340, 420, 16, '#fff') + line('M-120 -120 L120 -120 M-120 -40 L120 -40 M-120 120 L60 120', 7, C.grayL) +
    text(0, 56, 1, 'กด', INK, 0, 76) + line('M-90 86 L90 86', 12, C.red), at(370, 500, 0.92)) +
  g(pencil(0, 0, 0.52, 36), at(620, 600)) + sparkle(190, 280, 0.7);

// ---------------------------------------------------------------- sentences
W['แม่กินแกงเผ็ดหมดแล้ว'] = (i) => backdrop(i) + shadow(400, 716, 250) +
  draw(330, 700, 1.1, mom({ arms: { l: [-110, -150], r: [80, -250] }, face: { eyes: 'happy', mouth: 'chew' } })) +
  g(spoon(0, 0, 0.44, 160), at(410, 356)) +
  g(rect(-250, -24, 500, 38, 14, C.brownL) + rect(-210, 14, 26, 130, 8, C.brown) + rect(184, 14, 26, 130, 8, C.brown), at(400, 668)) +
  g(bowl(0, 0, 0.6, C.red), at(540, 636)) +
  g(path('M0 -40 Q30 -10 18 20 Q6 44 -18 20 Q-30 -8 0 -40Z', C.orange) + path('M0 -16 Q12 0 6 16 Q0 26 -8 14 Q-12 0 0 -16Z', C.yellow, 0), at(640, 420, 1.1)) +
  text(640, 560, 1, 'เผ็ด!', C.red, 7, 42);
W['ปลากระโดดน้ำไปมา'] = (i) => backdrop(i) +
  g(path('M-330 0 Q-220 -40 -110 0 Q0 40 110 0 Q220 -40 330 0 L330 200 L-330 200Z', '#6EC1FF'), at(400, 600)) +
  fish(330, 420, 0.78, C.orange, -24) + fish(600, 520, 0.56, C.pink, 18) +
  g(path('M0 0 Q90 -130 190 -20', 'none', 7).replace('stroke-width="7"', 'stroke-width="7" stroke-dasharray="18 16"'), at(190, 520)) +
  drop(250, 330, 0.34) + drop(500, 300, 0.26) + sun(640, 230, 40);
W['เขารับเด็กมาเป็นบุตรบุญธรรม'] = (i) => backdrop(i) + shadow(400, 720, 270) +
  draw(250, 720, 1.08, mom({ arms: { l: [-110, -150], r: [140, -180] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  draw(560, 720, 1.08, dad({ arms: { l: [-140, -180], r: [110, -150] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  draw(405, 720, 0.66, kid({ shirt: C.yellow, arms: { l: [-120, -200], r: [120, -200] }, face: { eyes: 'happy', mouth: 'big' } })) +
  heart(400, 300, 1.3, C.red) + heart(200, 330, 0.6, C.pink) + heart(620, 320, 0.6, C.pink);
W['ฉันพูดชัดเจนมากขึ้น'] = (i) => backdrop(i) + shadow(400, 716, 200) +
  draw(300, 716, 1.2, kid({ shirt: C.red, arms: { l: [-96, -120], r: [120, -230] }, face: { eyes: 'happy', mouth: 'big' } })) +
  g(cloudShape(0, 0, 0.8, '#fff', 7) + text(0, 26, 1, 'ก ข ค', INK, 0, 66), at(580, 350)) +
  g(path('M0 0 L0 -110', 'none', 12, C.green).replace(`stroke="${INK}"`, `stroke="${C.green}"`) +
    path('M0 -110 L-30 -62 L30 -62Z', C.green, 0), at(650, 610)) + sparkle(180, 300, 0.7);
W['เม่นเป็นสัตว์ที่แปลกชนิดหนึ่ง'] = (i) => backdrop(i) + shadow(400, 700, 230) + porcupine(380, 540, 1.08) +
  g(cloudShape(0, 0, 0.42, '#fff', 6) + text(0, 16, 1, '?', C.purple, 0, 64), at(640, 300)) +
  g(path('M-70 30 Q-40 -40 0 10 Q40 -40 70 30Z', C.green, 6), at(190, 680, 0.7)) + sparkle(640, 520, 0.6);
W['เด็กจดการบ้านเสร็จแล้ว'] = (i) => backdrop(i) + shadow(400, 724, 250) +
  desk(400, 640, 1.08, g(rect(-120, -92, 240, 92, 10, '#fff') + line('M-80 -64 L80 -64 M-80 -34 L40 -34', 6, C.grayL), at(0, 0))) +
  draw(400, 690, 0.86, kid({ legs: 'none', shirt: C.green, arms: { l: [-120, -140], r: [130, -150] }, face: { eyes: 'happy', mouth: 'big' } })) +
  g(pencil(0, 0, 0.36, 28), at(560, 586)) +
  g(path('M-60 0 L-16 46 L62 -50', 'none', 20).replace(`stroke="${INK}"`, `stroke="${C.green}"`), at(620, 350, 1)) + sparkle(190, 290, 0.7);
W['โกรธกันเป็นสิ่งไม่ดี'] = (i) => backdrop(i) + shadow(400, 720, 260) +
  draw(250, 720, 1.08, kid({ shirt: C.red, arms: { l: [-110, -110], r: [96, -110] }, face: { eyes: 'x', mouth: 'flat' } })) +
  draw(550, 720, 1.08, girl({ arms: { l: [-96, -110], r: [110, -110] }, face: { eyes: 'x', mouth: 'flat' } })) +
  g(line('M-30 -30 L30 30 M30 -30 L-30 30', 14, C.red), at(400, 420, 1.2)) +
  g(circle(0, 0, 60, 'none', 12).replace(`stroke="${INK}"`, `stroke="${C.red}"`), at(400, 420, 1.2)) +
  g(line('M0 0 L26 -26 M14 6 L44 0 M-2 16 L22 28', 7, C.red), at(180, 420)) +
  g(line('M0 0 L-26 -26 M-14 6 L-44 0 M2 16 L-22 28', 7, C.red), at(620, 420));
W['แม่ไปซื้อกับข้าวที่ตลาดสด'] = (i) => backdrop(i) + shadow(400, 724, 270) +
  g(rect(-230, -40, 460, 46, 12, C.brownL) + rect(-200, 6, 24, 130, 8, C.brown) + rect(176, 6, 24, 130, 8, C.brown) +
    path('M-250 -40 L-250 -150 L250 -150 L250 -40Z', C.red) + [0, 1, 2, 3].map(k => rect(-250 + k * 125, -150, 62, 110, 0, '#fff', 0)).join('') +
    path('M-250 -40 L-250 -150 L250 -150 L250 -40Z', 'none'), at(520, 600, 0.78)) +
  cabbage(452, 538, 0.3) + mushroom(530, 548, 0.3) + g(fish(0, 0, 0.26, C.sky), at(610, 544)) +
  draw(220, 724, 1.05, mom({ arms: { l: [-120, -170], r: [110, -140] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  g(bag(0, 0, 0.42, C.green), at(140, 600)) + sparkle(190, 270, 0.6);
W['ฉันทำกระเป๋าเสื้อขาด'] = (i) => backdrop(i) + shadow(400, 700, 230) +
  g(path('M-190 -170 Q-120 -210 -60 -200 Q0 -150 60 -200 Q120 -210 190 -170 L230 -60 L160 -30 L160 190 L-160 190 L-160 -30 L-230 -60Z', C.sky) +
    path('M-60 -200 Q0 -150 60 -200 L30 -120 L0 -96 L-30 -120Z', '#fff', 6) +
    rect(40, -40, 110, 110, 10, '#8FD3FF', 6) +
    path('M44 10 L104 24 L58 48 L112 64', 'none', 7) +
    line('M-160 -30 L-160 190 L160 190 L160 -30', 'none'), at(400, 500, 0.92)) +
  g(path('M0 0 L-70 -30', 'none', 9) + path('M-70 -30 L-40 -34 L-54 -10Z', INK, 0), at(640, 540)) +
  text(650, 660, 1, 'ขาด', C.red, 7, 44);
W['ครูตรวจห้องที่จัดไว้'] = (i) => backdrop(i) + shadow(400, 724, 260) +
  g(rect(-250, -120, 500, 30, 10, C.brownL) + rect(-250, 40, 500, 30, 10, C.brownL) +
    [-170, -40, 90].map(bx => rect(bx, -90, 40, 50, 6, [C.red, C.green, C.yellow][[-170, -40, 90].indexOf(bx)])).join('') +
    [-150, -20, 110].map(bx => rect(bx, 70, 40, 50, 6, [C.purple, C.sky, C.orange][[-150, -20, 110].indexOf(bx)])).join(''), at(250, 520, 0.72)) +
  draw(580, 724, 1.08, teacher({ arms: { l: [-130, -150], r: [120, -170] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  g(rect(-70, -96, 140, 190, 12, C.brownL) + rect(-56, -80, 112, 160, 8, '#fff') +
    path('M-36 -10 L-10 24 L38 -40', 'none', 14).replace(`stroke="${INK}"`, `stroke="${C.green}"`) + rect(-30, -112, 60, 24, 8, C.grayD), at(470, 530, 0.78)) +
  sparkle(180, 280, 0.7);
W['เด็กคิดเลขคณิตเร็ว'] = (i) => backdrop(i) + shadow(400, 716, 220) +
  draw(330, 716, 1.18, kid({ shirt: C.purple, arms: { l: [-96, -120], r: [130, -250] }, face: { eyes: 'happy', mouth: 'big' } })) +
  g(cloudShape(0, 0, 0.72, '#fff', 7) + text(0, 22, 1, '7+8', INK, 0, 60), at(590, 330)) +
  text(650, 560, 1, '15', C.green, 8, 68) + motion(180, 420, 0.7, 180) + sparkle(200, 290, 0.7) + star(660, 680, 24, C.yellow);

module.exports = W;
