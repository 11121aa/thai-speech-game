// Pictures for the meaningful ค words (W1-W3; the list also uses ข).
const L = require('./lib');
const { C, INK, g, at, circle, ellipse, rect, path, line, tube, shine, shadow, text, sparkle, heart, star, motion, backdrop, face,
  kid, girl, mom, man, person, draw, bird, cloudShape, speech, bowl, glass, hand, table, inCircle } = L;

const W = {};
const egg = (x, y, s, color = '#FFF6E6', r = 0) => g(path('M0 -120 Q90 -120 96 20 Q96 120 0 120 Q-96 120 -96 20 Q-90 -120 0 -120Z', color) + shine(-40, -40, 18, 34, 20, 0.7), at(x, y, s, r));
const eggHalf = (x, y, s, yolk = C.yellow) => g(path('M-100 0 Q-96 110 0 110 Q96 110 100 0Z', '#fff') + ellipse(0, 0, 100, 34, '#fff') + circle(0, 4, 44, yolk, 6) + shine(-16, -8, 12, 6), at(x, y, s));
const riceBowl = (x, y, s, color = C.blue) => bowl(x, y, s, color, g(path('M-116 -10 Q-100 -90 0 -96 Q100 -90 116 -10Z', '#fff') +
  [[-60, -40], [-20, -60], [20, -44], [60, -56], [-40, -70], [30, -76], [80, -30], [-80, -24]].map(([a, b]) => ellipse(a, b, 10, 6, '#F0EEE6', 3)).join(''), at(0, 0)));
const hen = (x, y, s) => g(line('M-20 120 L-24 170 M30 120 L34 170', 10, C.orangeD) +
  path('M-140 20 Q-170 -40 -120 -60 Q-140 -10 -100 0Z', C.red) + ellipse(0, 40, 130, 100, '#fff') + path('M-40 20 Q10 90 80 40 Q40 10 -40 20Z', '#F2F2F2') +
  circle(90, -60, 60, '#fff') + path('M60 -120 Q70 -150 90 -130 Q100 -160 120 -130 Q140 -140 130 -110Z', C.red) + path('M146 -60 L186 -48 L146 -34Z', C.orange) +
  path('M140 -24 Q150 0 136 10 Q124 -4 130 -24Z', C.red, 6) + `<ellipse cx="104" cy="-70" rx="8" ry="10" fill="${INK}"/><circle cx="107" cy="-74" r="3" fill="#fff"/>` + ellipse(84, -40, 12, 7, C.blush, 0), at(x, y, s));
const toad = (x, y, s) => g(ellipse(-110, 90, 60, 30, '#7FA650') + ellipse(110, 90, 60, 30, '#7FA650') +
  ellipse(0, 20, 170, 110, '#8DB860') + circle(-80, -80, 48, '#8DB860') + circle(80, -80, 48, '#8DB860') + circle(-80, -84, 26, '#FFE58A', 6) + circle(80, -84, 26, '#FFE58A', 6) +
  ellipse(-80, -84, 8, 16, INK, 0) + ellipse(80, -84, 8, 16, INK, 0) + ellipse(0, 50, 100, 60, '#D6E7A8', 0) +
  [[-110, -10], [-60, 10], [60, 0], [110, -20], [0, -30], [-20, 90], [120, 40]].map(([a, b]) => circle(a, b, 12, '#6E9444', 0)).join('') +
  line('M-80 -10 Q0 30 80 -10', 8) + ellipse(-120, 20, 18, 10, C.blush, 0) + ellipse(120, 20, 18, 10, C.blush, 0), at(x, y, s));
const plane = (x, y, s, r = 0) => g(path('M-40 -30 L-20 -200 L40 -200 L60 -30Z', C.blue) + path('M-20 40 L-10 150 L30 150 L40 40Z', C.blue) +
  path('M-250 20 Q-260 -40 -180 -40 L200 -40 Q280 -30 290 10 Q280 50 200 60 L-180 60 Q-250 60 -250 20Z', '#fff') + path('M-250 20 Q-260 -40 -200 -40 L-220 -140 L-170 -140 L-120 -40', C.red) +
  circle(-90, 10, 20, C.sky, 6) + circle(-20, 10, 20, C.sky, 6) + circle(50, 10, 20, C.sky, 6) + path('M200 -40 Q260 -30 280 0 L220 0 Q200 -20 200 -40Z', C.sky, 6) + shine(-120, -20, 80, 8, 0, 0.8), at(x, y, s, r));
const cookie = (x, y, s, r = 0) => g(circle(0, 0, 120, '#E0A96D') + [[-50, -40], [30, -60], [60, 20], [-20, 40], [-70, 30], [20, 80]].map(([a, b]) => ellipse(a, b, 16, 12, '#5A3520', 0)).join('') +
  path('M-100 -60 Q-110 -20 -96 10', 'none', 0) + shine(-60, -70, 20, 8, -30, 0.4), at(x, y, s, r));
const paint = (x, y, s, color) => g(path('M-150 40 Q-200 -40 -120 -80 Q-80 -170 20 -140 Q130 -170 150 -80 Q220 -40 170 30 Q200 110 110 110 Q60 170 -20 130 Q-120 160 -140 90 Q-190 80 -150 40Z', color) +
  circle(210, -120, 22, color) + circle(-210, 110, 16, color) + circle(220, 90, 12, color) + shine(-60, -80, 40, 16, -20, 0.4), at(x, y, s));
const brush = (x, y, s, r, tip) => g(rect(-16, -160, 32, 170, 14, C.brownL) + rect(-24, 0, 48, 50, 8, C.grayL) + path('M-24 50 Q-30 120 0 150 Q30 120 24 50Z', tip), at(x, y, s, r));
const stall = (x, y, s, goods, roof = true) => g(rect(-230, -40, 460, 170, 16, C.brownL) + (roof ? rect(-220, -260, 20, 230, 6, C.brownD) + rect(200, -260, 20, 230, 6, C.brownD) +
  path('M-260 -250 L260 -250 L240 -170 L-240 -170Z', C.red) + [-180, -60, 60, 180].map(a => path(`M${a - 60} -250 L${a} -250 L${a - 10} -170 L${a - 70} -170Z`, '#fff', 6)).join('') +
  [-240, -120, 0, 120].map(a => path(`M${a} -170 Q${a + 60} -120 ${a + 120} -170`, C.red, 6)).join('') : '') + goods, at(x, y, s));
const basketEggs = (x, y, s) => g(egg(-70, -40, 0.5) + egg(0, -60, 0.55, '#F3D9B1') + egg(70, -40, 0.5) + egg(-35, -20, 0.5, '#F3D9B1') + egg(35, -20, 0.5) +
  path('M-150 -20 L150 -20 L120 110 L-120 110Z', '#D9A066') + line('M-140 20 L140 20 M-130 60 L130 60 M-60 -20 L-50 110 M0 -20 L0 110 M60 -20 L50 110', 6, C.brown), at(x, y, s));
const padlock = (x, y, s) => g(path('M-80 -60 L-80 -140 Q-80 -230 0 -230 Q80 -230 80 -140 L80 -110', 'none', 44) + path('M-80 -60 L-80 -140 Q-80 -230 0 -230 Q80 -230 80 -140 L80 -110', 'none', 26).replace(`stroke="${INK}"`, `stroke="${C.gray}"`) +
  rect(-130, -70, 260, 220, 36, C.yellow) + circle(0, 20, 24, INK, 0) + rect(-8, 20, 16, 60, 6, INK, 0) + shine(-80, -20, 20, 40, 0), at(x, y, s));
const key = (x, y, s, r = 0) => g(circle(0, 0, 60, C.orange) + circle(0, 0, 24, '#fff') + rect(50, -18, 200, 36, 10, C.orange) + rect(190, 18, 24, 40, 6, C.orange) + rect(230, 18, 20, 30, 6, C.orange), at(x, y, s, r));
const bread = (x, y, s) => g(path('M-220 120 L-220 -40 Q-230 -150 -120 -150 L120 -150 Q230 -150 220 -40 L220 120Z', '#D98B3F') +
  path('M-190 -60 Q-150 -120 -90 -110 M-20 -120 Q30 -130 80 -110', 'none', 7) + shine(-140, -80, 40, 14, -10, 0.45) +
  g(path('M-130 150 L-130 -30 Q-150 -130 -60 -130 L60 -130 Q150 -130 130 -30 L130 150Z', '#FFE3B3') + path('M-110 130 L-110 -24 Q-124 -110 -54 -110 L54 -110 Q124 -110 110 -24 L110 130Z', 'none', 0) +
    line('M-110 128 L-110 -24 Q-124 -110 -54 -110 L54 -110 Q124 -110 110 -24 L110 128', 12, '#E8A45C') + circle(-40, 0, 5, '#E9C58A', 0) + circle(30, 40, 5, '#E9C58A', 0) + circle(0, -50, 4, '#E9C58A', 0), at(230, 30, 0.9, 8)), at(x, y, s));
const paper = (x, y, s, r = 0) => g(path('M-150 -200 L90 -200 L150 -140 L150 200 L-150 200Z', '#fff') + path('M90 -200 L90 -140 L150 -140', '#E4E7F0', 7) + shine(-110, -100, 10, 60, 0, 0.9), at(x, y, s, r));
const stairs = (x, y, s) => g(path('M-260 200 L-260 100 L-140 100 L-140 0 L-20 0 L-20 -100 L100 -100 L100 -200 L240 -200 L240 200Z', '#F2B880') +
  line('M-260 100 L-140 100 M-140 0 L-20 0 M-20 -100 L100 -100 M100 -200 L240 -200', 10, '#fff'), at(x, y, s));
const arrowUp = (x, y, s, color = C.green) => g(path('M0 -120 L90 -10 L36 -10 L36 110 L-36 110 L-36 -10 L-90 -10Z', color), at(x, y, s));

W['ไข่'] = (i) => backdrop(i) + shadow(400, 690, 150) + egg(400, 470, 1.6) + g(face(90, { eyes: 'happy' }), at(400, 520)) + sparkle(610, 260, 0.8) + egg(620, 630, 0.4, '#F3D9B1', 20);
W['ขาว'] = (i) => backdrop(i, { dots: false }) + `<circle cx="400" cy="410" r="330" fill="#DCE6F5"/>` + paint(400, 440, 1.3, '#fff') + g(face(80, { eyes: 'happy' }), at(400, 440)) + sparkle(620, 250, 0.8, '#fff');
W['ขี่'] = (i) => backdrop(i) + shadow(400, 700, 230) + g(
  circle(-170, 90, 90, 'none', 18) + circle(-170, 90, 90, 'none', 8).replace(`stroke="${INK}"`, `stroke="${C.grayD}"`) + circle(180, 90, 90, 'none', 18) +
  line('M-170 90 L-40 -40 L100 -40 L180 90 M-40 -40 L10 90 L100 -40 M10 90 L-170 90', 14, C.red) + line('M100 -40 L120 -110 L170 -120', 14, C.grayD) + rect(-80, -60, 90, 24, 12, C.black), at(400, 540)) +
  draw(370, 520, 1, kid({ legs: 'none', arms: { l: [120, -170], r: [150, -160] }, face: { eyes: 'happy', mouth: 'big' }, shirt: C.yellow,
    extraBack: tube('M-20 -95 L60 -10 L40 60', C.blue, 30) + tube('M20 -95 L90 0 L120 60', C.blueD, 30) })) + motion(120, 460, 0.9, 180);
W['แขน'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, kid({ shirt: C.red, sleeve: C.skin, arms: { l: [-150, -290], r: [150, -290] }, face: { eyes: 'happy', mouth: 'big' } })) + sparkle(170, 250, 0.8) + sparkle(630, 250, 0.8) + motion(660, 420, 0.7) + motion(140, 420, 0.7, 180);
W['ข้าว'] = (i) => backdrop(i) + shadow(400, 690, 190) + riceBowl(400, 540, 1.35, C.blue) + tube('M520 330 L450 470', '#D9A066', 10) + tube('M550 340 L470 474', '#D9A066', 10) +
  line('M330 330 q-20 -30 0 -60 M410 320 q-20 -30 0 -60', 8, '#fff');
W['ไข้'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, kid({ arms: { l: [-80, -100], r: [80, -100] }, face: { eyes: 'tired', mouth: 'wavy' }, shirt: C.sky,
  headExtra: (hy) => rect(-70, hy - 70, 140, 40, 14, '#fff') + g(rect(0, -10, 150, 20, 10, '#fff') + circle(150, 0, 18, C.red) + rect(0, -4, 110, 8, 4, C.red, 0), at(20, hy + 50, 1, 20)) })) +
  g(path('M-20 -50 q-20 30 0 50 q20 20 0 50', 'none', 8).replace(`stroke="${INK}"`, `stroke="${C.red}"`), at(210, 280)) + g(path('M-20 -50 q-20 30 0 50 q20 20 0 50', 'none', 8).replace(`stroke="${INK}"`, `stroke="${C.red}"`), at(600, 270));
W['เข็ม'] = (i) => backdrop(i) + g(path('M-14 -260 Q0 -290 14 -260 L10 230 L0 270 L-10 230Z', '#DDE3EE') + ellipse(0, -220, 6, 26, INK, 0) + shine(-6, 0, 3, 160, 0, 0.8), at(400, 410, 1, 30)) +
  line('M468 250 Q640 200 620 360 Q600 480 480 470 Q340 460 360 580 Q380 660 520 650', 10, C.red) + g(circle(0, 0, 60, C.pink) + line('M-50 -30 L50 30 M-56 0 L56 0 M-50 30 L50 -30', 5, '#E0559A'), at(560, 650));
W['เข่า'] = (i) => backdrop(i) + g(
  path('M-60 -260 L60 -260 L70 -40 Q80 40 40 80 L60 260 L-60 260 L-50 80 Q-100 20 -70 -60Z', C.skin) + ellipse(-4, 0, 70, 60, C.skin) +
  rect(-150, -300, 300, 90, 20, C.blue) + rect(-40, 260, 140, 50, 20, C.red) +
  g(rect(-50, -22, 100, 44, 16, '#FFE0B8') + circle(-20, 0, 5, '#E9B98A', 0) + circle(20, 0, 5, '#E9B98A', 0), at(-4, 0, 1, -10)) + shine(-30, -120, 10, 50, 0), at(400, 420)) + heart(620, 280, 0.8, C.red);
W['ค้อน'] = (i) => backdrop(i) + g(rect(-24, -60, 48, 380, 20, C.brownL) + line('M0 -20 L0 300', 5, C.brown) +
  path('M-150 -170 L110 -170 Q160 -170 160 -120 L160 -70 Q160 -20 110 -20 L-150 -20 L-190 -60 L-190 -130Z', C.grayD) + shine(-90, -130, 60, 12, 0, 0.35), at(420, 400, 1, 30)) + star(200, 300, 30) + motion(220, 420, 0.8, 160);
W['คัน'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, kid({ arms: { l: [-40, -150], r: [60, -300] }, face: { mouth: 'wavy', eyes: 'x' }, shirt: C.green,
  extraFront: circle(-20, -150, 10, C.red, 0) + circle(20, -130, 8, C.red, 0) + circle(40, -170, 7, C.red, 0) + circle(-40, -270, 8, C.red, 0) + circle(40, -230, 7, C.red, 0) })) +
  motion(540, 200, 0.7, -20) + motion(240, 440, 0.7, 180);

// ---- W2
W['ขายของ'] = (i) => backdrop(i) + shadow(400, 700, 250) + stall(400, 520, 1,
  circle(-150, -80, 34, C.red) + circle(-100, -80, 34, C.orange) + circle(-125, -120, 34, C.red) + ellipse(20, -80, 50, 34, C.yellow) + ellipse(20, -118, 40, 28, C.yellow) + circle(130, -80, 36, C.green) + circle(170, -110, 30, C.green)) +
  g(rect(-70, -30, 140, 60, 12, '#fff') + text(0, 14, 1, '฿10', C.red, 0, 40), at(400, 590));
W['ไข่ไก่'] = (i) => backdrop(i) + shadow(400, 700, 230) + hen(340, 460, 1.1) + egg(560, 620, 0.55) + egg(640, 640, 0.45, '#F3D9B1') + egg(480, 650, 0.4);
W['สีเขียว'] = (i) => backdrop(i) + paint(380, 460, 1.3, C.green) + brush(610, 330, 1, 30, C.green) + sparkle(200, 250, 0.8);
W['คางคก'] = (i) => backdrop(i) + shadow(400, 690, 230) + toad(400, 520, 1.2) + g(path('M0 0 Q60 -40 120 0 Q60 30 0 0Z', C.green), at(160, 650));
W['ข้างบน'] = (i) => backdrop(i) + shadow(400, 700, 180) + rect(250, 480, 300, 210, 20, C.brownL) + line('M250 540 L550 540', 6) + circle(400, 380, 90, C.red) + shine(370, 350, 24, 14) +
  arrowUp(620, 300, 0.8) + star(210, 280, 26);
W['กินข้าว'] = (i) => backdrop(i) + shadow(400, 712, 160) + draw(400, 712, 1.3, kid({ arms: { l: [-60, -110], r: [36, -210] }, face: { eyes: 'happy', mouth: 'chew' }, shirt: C.red })) +
  riceBowl(400, 610, 0.7, C.teal) + g(line('M0 0 L-40 -100', 14) + line('M0 0 L-40 -100', 6, C.grayL) + ellipse(-46, -114, 20, 14, C.grayL, 6), at(470, 520));
W['สีขาว'] = (i) => backdrop(i, { dots: false }) + `<circle cx="400" cy="410" r="330" fill="#CFE0F5"/>` + g(rect(-130, -80, 260, 220, 20, C.grayL) + ellipse(0, -80, 130, 34, '#fff') + rect(-150, -10, 300, 60, 10, C.blue, 6) + path('M-130 -80 Q-80 -150 -40 -80', 'none', 8), at(360, 520)) +
  brush(600, 330, 1, 30, '#fff') + g(path('M0 0 Q20 60 0 90 Q-20 60 0 0Z', '#fff', 6), at(250, 360));
W['เครื่องบิน'] = (i) => backdrop(i) + cloudShape(200, 600, 0.4) + cloudShape(620, 220, 0.35) + plane(400, 420, 1.05, -15) + motion(110, 470, 0.7, 170);
W['คุกกี้'] = (i) => backdrop(i) + shadow(400, 690, 220) + cookie(330, 520, 1.1, 10) + cookie(530, 430, 0.9, -20) + g(path('M-100 0 A100 100 0 0 1 60 -80 L20 -20 L60 20 L20 50 Z', '#E0A96D'), at(560, 620, 0.6)) + sparkle(200, 260, 0.7);
W['คุกเข่า'] = (i) => backdrop(i) + shadow(380, 712, 150) + draw(420, 712, 1.35, girl({ legs: 'kneel', arms: { l: [-40, -150], r: [40, -150] }, face: { eyes: 'happy', mouth: 'smile' } })) + sparkle(620, 260, 0.7);

// ---- W3
W['เขาขายของ'] = (i) => backdrop(i) + shadow(400, 700, 250) +
  draw(400, 560, 0.95, man({ arms: { l: [-110, -150], r: [110, -150] }, face: { eyes: 'happy', mouth: 'big' }, shirt: C.orange,
    hat: (hy) => g(path('M-90 10 Q-80 -80 0 -84 Q80 -80 90 10Z', C.yellow) + path('M-160 10 Q0 -20 160 10 Q0 40 -160 10Z', C.yellow), at(0, hy - 40)) })) +
  stall(400, 620, 0.9, circle(-150, -80, 34, C.red) + circle(-100, -80, 34, C.orange) + ellipse(20, -80, 50, 34, C.yellow) + circle(130, -80, 36, C.green) + circle(170, -110, 30, C.green), false)
W['เขียนหนังสือ'] = (i) => backdrop(i) + shadow(400, 712, 220) + draw(360, 660, 1.1, girl({ legs: 'none', arms: { l: [-60, -110], r: [70, -120] }, face: { eyes: 'closed', mouth: 'smile' } })) +
  table(400, 560, 520) + paper(400, 510, 0.45, -80) + line('M340 510 q20 -14 40 0 q20 14 40 0', 5, C.blue) +
  g(rect(-8, -80, 16, 110, 6, C.yellow) + path('M-8 30 L8 30 L0 56Z', '#F3D9B1', 5) + rect(-8, -94, 16, 18, 4, C.pink, 5), at(460, 480, 1, 30)) + sparkle(620, 250, 0.6);
W['หญ้าสีเขียว'] = (i) => backdrop(i, { dots: false }) + inCircle(
  `<rect x="0" y="480" width="800" height="400" fill="${C.green}"/>` + line('M0 480 L800 480', 9) +
  Array.from({ length: 22 }, (_, k) => { const x = 60 + k * 32, h = 70 + (k * 37) % 60; return path(`M${x - 18} 490 Q${x} ${490 - h} ${x + 4} ${480 - h} Q${x + 8} ${490 - h * 0.6} ${x + 18} 490Z`, k % 2 ? '#56D67C' : C.greenD, 6); }).join('') +
  circle(620, 220, 56, C.yellow) + cloudShape(230, 220, 0.35) + g(circle(0, 0, 18, C.yellow, 5) + [0, 1, 2, 3, 4].map(k => circle((Math.cos(k * 1.256) * 26).toFixed(1), (Math.sin(k * 1.256) * 26).toFixed(1), 14, '#fff', 5)).join('') + circle(0, 0, 14, C.yellow, 5), at(520, 420)));
W['ขายไข่ไก่'] = (i) => backdrop(i) + shadow(400, 700, 240) + table(400, 560, 480) + basketEggs(400, 500, 1.1) +
  g(rect(-90, -60, 180, 90, 12, '#fff') + text(0, 6, 1, '฿5', C.red, 0, 52), at(400, 250)) + line('M400 310 L400 380', 7) + egg(620, 360, 0.35);
W['ไขกุญแจ'] = (i) => backdrop(i) + padlock(360, 470, 1.1) + key(420, 500, 0.9, -20) + motion(640, 420, 0.7, -30) + sparkle(610, 240, 0.8);
W['ขึ้นข้างบน'] = (i) => backdrop(i, { dots: false }) + inCircle(stairs(400, 560, 1.1)) + draw(312, 560, 0.7, kid({ arms: { l: [-80, -110], r: [120, -230] }, face: { eyes: 'happy', mouth: 'big' } })) + arrowUp(620, 250, 0.7);
W['กินคุกกี้'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, girl({ arms: { l: [-80, -110], r: [40, -205] }, face: { eyes: 'happy', mouth: 'chew' } })) +
  cookie(470, 420, 0.42, 20) + cookie(620, 590, 0.35) + g(circle(0, 0, 8, '#E0A96D', 0) + circle(20, 14, 6, '#E0A96D', 0), at(470, 520));
W['กินไข่เค็ม'] = (i) => backdrop(i) + shadow(400, 690, 220) + g(ellipse(0, 0, 250, 70, '#fff') + ellipse(0, -6, 210, 52, '#EAF4FF', 0), at(400, 600)) +
  eggHalf(310, 560, 1, '#FF8C1A') + eggHalf(500, 570, 0.9, '#FF8C1A') + tube('M600 300 L520 490', C.grayL, 12) + ellipse(510, 510, 28, 20, C.grayL) + sparkle(200, 280, 0.7);
W['กระดาษขาว'] = (i) => backdrop(i, { dots: false }) + `<circle cx="400" cy="410" r="330" fill="#D6E4F7"/>` + paper(430, 430, 1.2, 8) + paper(340, 450, 1.1, -8).replace('#fff', '#F7F9FF') + paper(400, 430, 1.2, 0) + sparkle(620, 230, 0.7, '#fff');
W['ขนมปัง'] = (i) => backdrop(i) + shadow(400, 680, 230) + bread(360, 480, 1.1) + sparkle(620, 250, 0.7);

Object.defineProperty(W, '_h', { value: { egg, cookie, paper, stall, eggHalf, riceBowl, hen, basketEggs, brush }, enumerable: false });
module.exports = W;
