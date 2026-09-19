// Pictures for the sentence-level items of ม น ห ย ค.
const L = require('./lib');
const { C, INK, g, at, circle, ellipse, rect, path, line, tube, shine, shadow, text, sparkle, heart, star, motion, backdrop, face,
  kid, girl, mom, man, grandma, person, draw, cat, dog, pig, horse, bird, mouse, cloudShape, speech, bowl, glass, hand, table, inCircle, numberBadge,
  robot, owl, coin, gift } = L;
const Y = require('./w_yor')._h, N = require('./w_nor')._h, H = require('./w_hor')._h, K = require('./w_kor')._h, P = require('./w_por')._h;

const W = {};
const dad = (o = {}) => man(Object.assign({ shirt: C.blue, pants: C.brown }, o));
const baby = N.baby;
const sun = (x, y, r = 60) => circle(x, y, r, C.yellow) + [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k * Math.PI / 4; return line(`M${(x + Math.cos(a) * (r + 16)).toFixed(0)} ${(y + Math.sin(a) * (r + 16)).toFixed(0)} L${(x + Math.cos(a) * (r + 40)).toFixed(0)} ${(y + Math.sin(a) * (r + 40)).toFixed(0)}`, 9, C.orange); }).join('');
const sunset = () => `<circle cx="400" cy="410" r="330" fill="#FFD7B5"/>` + circle(640, 300, 60, C.orange) + `<rect x="0" y="0" width="0" height="0"/>`;
const giant = (x, y, s, color = '#3DBE6E', o = {}) => g(
  tube('M-50 60 L-60 220', color, 50) + tube('M50 60 L60 220', color, 50) + ellipse(-70, 230, 50, 24, C.brownD) + ellipse(70, 230, 50, 24, C.brownD) +
  tube(`M-100 -100 Q-180 -20 ${o.armL || '-170 60'}`, color, 40) + tube(`M100 -100 Q180 -20 ${o.armR || '170 60'}`, color, 40) +
  rect(-120, -140, 240, 220, 60, C.red) + rect(-120, 0, 240, 36, 0, C.yellow, 6) +
  path('M-100 -140 Q-110 -300 0 -310 Q110 -300 100 -140Z', color) + path('M-90 -290 L-70 -390 L-40 -310 L0 -420 L40 -310 L70 -390 L90 -290Z', C.yellow) +
  circle(-40, -230, 22, '#fff') + circle(40, -230, 22, '#fff') + circle(-38, -228, 10, INK, 0) + circle(42, -228, 10, INK, 0) + line('M-70 -266 L-20 -252 M70 -266 L20 -252', 9) +
  path('M-50 -180 Q0 -150 50 -180 Q30 -150 0 -150 Q-30 -150 -50 -180Z', '#8E2F3C', 6) + path('M-40 -178 L-32 -154 L-24 -174Z M40 -178 L32 -154 L24 -174Z', '#fff', 4), at(x, y, s));
const door = (x, y, s) => g(rect(-110, -300, 220, 320, 14, C.brown) + rect(-90, -280, 180, 300, 8, C.brownL) + circle(60, -130, 10, C.yellow, 5) + rect(-60, -250, 120, 90, 8, 'none', 6), at(x, y, s));
const cake = (x, y, s, c = C.pink) => g(rect(-60, -20, 120, 70, 12, '#FFE3B3') + rect(-60, -40, 120, 30, 12, c) + circle(0, -56, 14, C.red) + line('M0 -70 L4 -86', 5), at(x, y, s));
const candy = (x, y, s, c = C.pink) => g(path('M-70 0 L-110 -30 L-110 30Z M70 0 L110 -30 L110 30Z', c, 7) + circle(0, 0, 60, c) + line('M-40 -40 Q0 0 40 40 M-20 -56 Q20 0 56 20', 7, '#fff'), at(x, y, s));
const easel = (x, y, s) => g(line('M-100 180 L0 -200 L100 180 M0 -200 L0 190', 14, C.brownD) + rect(-130, -160, 260, 200, 10, '#fff') +
  circle(-50, -90, 30, C.yellow, 0) + path('M-110 20 L-40 -60 L10 0 L60 -50 L110 20Z', C.green, 0) + rect(-130, -160, 260, 200, 10, 'none') + rect(-140, 40, 280, 16, 6, C.brown), at(x, y, s));
const net = (x, y, s) => g(path('M0 0 Q-160 60 -200 220 L200 220 Q160 60 0 0Z', 'rgba(255,255,255,0.5)') +
  line('M0 0 L-200 220 M0 0 L-100 220 M0 0 L0 220 M0 0 L100 220 M0 0 L200 220 M-60 70 Q0 60 60 70 M-120 140 Q0 120 120 140', 5), at(x, y, s));
const crown = (hy, c = C.yellow) => path(`M-70 ${hy - 70} L-80 ${hy - 150} L-40 ${hy - 110} L0 ${hy - 170} L40 ${hy - 110} L80 ${hy - 150} L70 ${hy - 70}Z`, c) + circle(0, hy - 120, 12, C.red, 5);
const noSign = (x, y, s) => g(circle(0, 0, 110, '#fff', 14) + circle(0, 0, 110, 'none', 0) + `<circle cx="0" cy="0" r="100" fill="none" stroke="${C.red}" stroke-width="26"/>` + line('M-70 -70 L70 70', 26, C.red), at(x, y, s));
const dumbbell = (x, y, s) => g(rect(-140, -12, 280, 24, 10, C.grayD) + rect(-190, -60, 50, 120, 14, C.black) + rect(140, -60, 50, 120, 14, C.black), at(x, y, s));
const window_ = (x, y, s) => g(rect(-150, -150, 300, 300, 20, C.brownL) + rect(-130, -130, 260, 260, 10, '#DDF3FF') + line('M0 -130 L0 130 M-130 0 L130 0', 10, C.brownL), at(x, y, s));
const field = (water = false) => inCircle(`<rect x="0" y="430" width="800" height="400" fill="${water ? '#8ED8FF' : '#9ADB6E'}"/>` + line('M0 430 L800 430', 9) +
  [[120, 520], [250, 500], [380, 520], [510, 500], [640, 520], [180, 620], [320, 610], [460, 620], [600, 610]].map(([a, b]) => line(`M${a} ${b} L${a - 14} ${b - 60} M${a} ${b} L${a} ${b - 70} M${a} ${b} L${a + 14} ${b - 60}`, 7, C.greenD)).join('') +
  (water ? line('M60 560 q30 -14 60 0 M400 680 q30 -14 60 0 M560 560 q30 -14 60 0', 6, '#fff') : '') + cloudShape(230, 220, 0.4, '#D6DEEB') + cloudShape(560, 180, 0.35, '#D6DEEB'));

// ---- ม
W['แม่ม้าไม่มองมา'] = (i) => backdrop(i) + shadow(400, 700, 260) + g(horse(0, 0, 1), at(560, 520, -1.0).replace('scale(-1)', 'scale(-1 1)')) + draw(230, 610, 0.55, horse(0, 0, 1, '#E8C39E', C.brown)) + text(360, 250, 1, '?', C.purple, 12, 100);
W['แม่มองแมวมันเหม็นมาก'] = (i) => backdrop(i) + shadow(470, 712, 140) + draw(480, 712, 1.2, mom({ arms: { l: [-12, -226], r: [110, -140] }, face: { eyes: 'x', mouth: 'wavy' } })) +
  draw(230, 580, 0.7, cat(0, 0, 1, '#C0C6D6')) + line('M220 380 q20 -30 0 -60 q-20 -30 0 -60 M280 380 q20 -30 0 -60 q-20 -30 0 -60', 12, '#7BC950');
W['แม่มีมะม่วงมันมากมาย'] = (i) => backdrop(i) + shadow(400, 712, 160) + draw(400, 712, 1.25, mom({ arms: { l: [-110, -120], r: [110, -120] }, face: { eyes: 'happy', mouth: 'big' } })) +
  g(path('M-170 -40 L170 -40 L140 90 L-140 90Z', '#D9A066') + line('M-160 0 L160 0 M-150 40 L150 40', 6, C.brown) +
    [[-110, -70], [-40, -90], [30, -80], [100, -70], [-70, -120], [0, -130], [70, -118]].map(([a, b]) => ellipse(a, b, 44, 32, '#7ED957')).join(''), at(400, 610));
W['แม่พามานะมาดูแมวน้ำ'] = (i) => backdrop(i) + shadow(560, 712, 160) + draw(620, 712, 1.0, mom({ arms: { l: [-90, -110], r: [80, -110] }, face: { look: -1, mouth: 'smile' } })) +
  draw(470, 712, 0.75, kid({ arms: { l: [-60, -110], r: [80, -110] }, face: { look: -1, mouth: 'open' } })) +
  g(path('M-230 150 Q-260 40 -120 30 Q-60 -130 50 -130 Q150 -130 150 -30 Q150 80 60 150Z', '#8FA3BF') + path('M-230 150 L-300 110 L-290 180Z', '#8FA3BF') + ellipse(90, -20, 40, 28, '#C3D0E2') + ellipse(90, -34, 14, 10, INK, 0) + g(face(80, { mouth: 'none' }), at(60, -60)), at(240, 580, 0.62));
W['แม่มองเมฆจนเมื่อย'] = (i) => backdrop(i) + cloudShape(300, 230, 0.6) + cloudShape(560, 180, 0.45) + shadow(420, 712, 140) +
  draw(420, 712, 1.2, mom({ arms: { l: [-60, -210], r: [60, -210] }, face: { eyes: 'tired', mouth: 'wavy' } })) + g(line('M-20 0 L20 0 M-20 20 L20 20', 6, C.red), at(560, 380));
W['แม่มีม้ามากมาย'] = (i) => backdrop(i) + shadow(400, 712, 260) + draw(200, 560, 0.55, horse(0, 0, 1)) + draw(410, 540, 0.55, horse(0, 0, 1, '#E8C39E', C.brown)) + draw(300, 660, 0.5, horse(0, 0, 1, '#fff', C.gray)) +
  draw(620, 712, 0.9, mom({ arms: { l: [-120, -200], r: [80, -110] }, face: { eyes: 'happy', mouth: 'big' } }));
W['แมลงบินมาหามานี'] = (i) => {
  const bfly = (x, y, s, c) => g(ellipse(-40, -30, 44, 36, c) + ellipse(40, -30, 44, 36, c) + ellipse(-30, 30, 30, 24, c) + ellipse(30, 30, 30, 24, c) + ellipse(0, 0, 10, 50, INK, 0) + line('M0 -50 L-20 -80 M0 -50 L20 -80', 5), at(x, y, s));
  return backdrop(i) + shadow(400, 712, 140) + draw(400, 712, 1.3, girl({ arms: { l: [-110, -220], r: [110, -220] }, face: { eyes: 'happy', mouth: 'big' } })) +
    bfly(200, 260, 0.9, C.pink) + bfly(620, 240, 0.8, C.yellow) + bfly(640, 460, 0.6, C.sky) + line('M240 300 q40 40 80 0', 5, C.grayD);
};
W['ไม่มืดแล้วแม่มาได้'] = (i) => backdrop(i, { dots: false }) + inCircle(`<rect x="0" y="0" width="800" height="800" fill="#FFE9B8"/><rect x="0" y="600" width="800" height="300" fill="${C.green}"/>` + sun(620, 240, 60)) +
  draw(380, 712, 1.2, mom({ arms: { l: [-150, -210], r: [140, -210] }, face: { eyes: 'happy', mouth: 'big' } })) + motion(170, 480, 0.8, 180);
W['แม่ม้ามาหาลูกมัน'] = (i) => backdrop(i) + shadow(400, 700, 260) + draw(300, 520, 1.0, horse(0, 0, 1)) + g(horse(0, 0, 1, '#E8C39E', C.brown), at(620, 600, 0.6).replace('scale(0.6)', 'scale(-0.6 0.6)')) + heart(470, 270, 1.1, C.red);
W['หมูมีมันมากมาย'] = (i) => backdrop(i) + shadow(400, 712, 220) + g(pig(0, 0, 1), at(400, 480, 1.5).replace('scale(1.5)', 'scale(1.9 1.5)')) + sparkle(640, 230, 0.7);

// ---- น
W['หนูนามีน้องหนึ่งคน'] = (i) => backdrop(i) + shadow(400, 712, 200) + draw(300, 712, 1.2, girl({ arms: { l: [-90, -130], r: [120, -150] }, face: { eyes: 'happy', mouth: 'big' } })) +
  draw(540, 712, 0.8, baby({ arms: { l: [-90, -150], r: [90, -150] }, face: { eyes: 'happy', mouth: 'smile' } })) + numberBadge(640, 330, 0.7, '1', C.orange);
W['น้องของหนูนาชื่อว่านกน้อย'] = (i) => backdrop(i) + shadow(400, 712, 160) + draw(400, 712, 1.3, baby({ arms: { l: [-90, -150], r: [90, -150] }, face: { eyes: 'happy', mouth: 'smile' },
  torsoExtra: rect(-40, -170, 80, 50, 10, '#fff') + g(bird(0, 0, 1, C.yellow), at(0, -150, 0.18)) })) + draw(610, 330, 0.5, bird(0, 0, 1, C.yellow)) + heart(200, 280, 0.8, C.pink);
W['น้องนกน้อยมีหน้าตาน่ารักมาก'] = (i) => backdrop(i) + g(circle(-150, 10, 40, C.skin) + circle(150, 10, 40, C.skin) + circle(0, 0, 180, C.skin) + line('M-10 -170 Q10 -210 30 -180', 9) +
  g(face(180, { eyes: 'happy', mouth: 'big' }), at(0, 20)), at(400, 440)) + heart(180, 250, 1.1, C.pink) + heart(630, 240, 1.2, C.red) + heart(640, 620, 0.8, C.pink) + sparkle(170, 600, 0.7);
W['หนูนาชอบดูน้องนกน้อยเวลากินนมแม่'] = (i) => backdrop(i) + shadow(420, 712, 220) +
  draw(470, 712, 1.1, mom({ hair: 'long', arms: { l: [-80, -150], r: [70, -170] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  g(ellipse(0, 0, 80, 50, C.yellow) + circle(-60, -10, 40, C.skin) + g(face(40, { eyes: 'closed', mouth: 'none' }), at(-60, -6)), at(470, 530)) +
  g(rect(-20, -50, 40, 90, 16, '#fff') + rect(-26, -66, 52, 20, 8, C.sky), at(420, 480, 1, -60)) + draw(210, 712, 0.85, girl({ arms: { l: [-80, -110], r: [80, -110] }, face: { look: 1, mouth: 'smile' } })) + heart(330, 280, 0.8, C.pink);
W['น้องนกน้อยนอนหลับ'] = (i) => backdrop(i) + shadow(400, 690, 220) + g(path('M-220 0 Q-230 120 0 130 Q230 120 220 0Z', '#F3D9B1') + rect(-240, -20, 480, 40, 20, C.pinkL), at(400, 580)) +
  g(circle(0, 0, 80, C.skin) + g(face(80, { eyes: 'closed', mouth: 'o' }), at(0, 10)) + line('M-6 -80 Q10 -104 22 -88', 8), at(300, 500)) + g(path('M-60 0 Q100 -40 260 0 L260 60 L-60 60Z', C.yellow), at(380, 520)) +
  text(520, 330, 1, 'Z', C.purple, 10, 70) + text(590, 270, 1, 'Z', C.purple, 10, 90);
W['แม่พาน้องนกน้อยไปนอนบนที่นอนนุ่มนุ่ม'] = (i) => backdrop(i) + shadow(400, 700, 260) + N.bed(430, 600, 0.9) + g(path('M-60 0 Q100 -40 300 -10 L300 60 L-60 60Z', C.pinkL), at(340, 570)) +
  draw(560, 712, 1.1, mom({ arms: { l: [-140, -180], r: [-100, -150] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  g(circle(0, 0, 44, C.skin) + g(face(44, { eyes: 'closed', mouth: 'o' }), at(0, 6)), at(390, 470)) + cloudShape(230, 280, 0.3) + sparkle(200, 400, 0.6, C.pink);
W['หนูนานั่งเฝ้าน้องนกน้อยนอนหลับ'] = (i) => backdrop(i) + shadow(400, 700, 260) + g(path('M-160 0 Q-170 100 0 110 Q170 100 160 0Z', '#F3D9B1') + rect(-180, -20, 360, 40, 20, C.pinkL), at(520, 620)) +
  g(circle(0, 0, 60, C.skin) + g(face(60, { eyes: 'closed', mouth: 'o' }), at(0, 8)), at(460, 550)) + g(path('M-40 0 Q80 -30 200 0 L200 50 L-40 50Z', C.yellow), at(500, 570)) +
  draw(230, 712, 1.0, girl({ legs: 'kneel', arms: { l: [-40, -150], r: [80, -130] }, face: { look: 1, mouth: 'smile' } })) + text(600, 400, 1, 'Z', C.purple, 10, 80);
W['น้องน้อยแต่งตัวน่ารักน่าชม'] = (i) => backdrop(i) + shadow(400, 712, 140) + draw(400, 712, 1.45, baby({ shirt: C.pink, pants: C.pink, arms: { l: [-110, -170], r: [110, -170] }, face: { eyes: 'happy', mouth: 'big' },
  torsoExtra: path('M-50 -172 L50 -172 L90 -80 L-90 -80Z', C.pink) + [[-40, -110], [20, -130], [50, -100]].map(([a, b]) => circle(a, b, 8, '#fff', 0)).join(''),
  hat: (hy) => g(path('M0 0 Q-40 -40 -60 0 Q-40 40 0 0 Q40 -40 60 0 Q40 40 0 0Z', C.red) + circle(0, 0, 12, C.red), at(50, hy - 80)) })) + sparkle(200, 260, 0.9) + sparkle(620, 250, 1) + heart(640, 460, 0.7, C.pink);
W['พ่อเล่านิทานให้น้องฟัง'] = (i) => backdrop(i) + shadow(470, 712, 150) + shadow(230, 712, 100) +
  draw(480, 712, 1.2, dad({ arms: { l: [-110, -150], r: [60, -150] }, face: { mouth: 'open' } })) + g(N.book(0, 0, 0.42), at(410, 520)) +
  draw(220, 712, 0.95, kid({ arms: { l: [-60, -110], r: [60, -110] }, face: { look: 1, mouth: 'smile' } })) + star(350, 250, 26) + star(420, 200, 20, C.pink);
W['น้ำนองในนาเนิ่นนาน'] = (i) => backdrop(i, { dots: false }) + field(true) + g(line('M0 0 L-10 30 M30 -10 L20 20', 5, '#6EC1FF'), at(300, 300)) + g(line('M0 0 L-10 30 M30 -10 L20 20', 5, '#6EC1FF'), at(520, 280));

// ---- ห
W['ข้าวหอมจนหายหิว'] = (i) => backdrop(i) + shadow(400, 712, 160) + draw(400, 712, 1.3, kid({ arms: { l: [-60, -110], r: [60, -110] }, face: { eyes: 'happy', mouth: 'big' }, shirt: C.yellow })) +
  K.riceBowl(400, 610, 0.7, C.teal) + line('M340 470 q-20 -30 0 -60 M440 460 q-20 -30 0 -60', 7, C.gray) + heart(620, 280, 0.9, C.red);
W['หอยห้าห่อให้หนูหิ้ว'] = (i) => backdrop(i) + shadow(400, 712, 170) + draw(380, 712, 1.25, girl({ arms: { l: [-120, -110], r: [120, -110] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  [[200, 560], [250, 640], [560, 560], [610, 640], [150, 640]].map(([a, b]) => g(rect(-40, -40, 80, 70, 14, C.yellow) + line('M-20 -40 Q0 -80 20 -40', 7) + g(H.shell(0, 0, 0.18), at(0, 0)), at(a, b))).join('') + numberBadge(640, 330, 0.6, '5', C.blue);
W['มีไก่หายไปหกตัว'] = (i) => backdrop(i) + shadow(400, 700, 230) + g(path('M-200 -40 L0 -170 L200 -40Z', C.red) + rect(-170, -50, 340, 210, 12, '#E0A96D') + path('M-50 160 L-50 40 Q0 0 50 40 L50 160Z', '#4A3350'), at(360, 500)) +
  numberBadge(620, 360, 0.8, '6', C.orange) + text(630, 580, 1, '?', C.purple, 12, 110);
W['เอาแหไปหาปลา'] = (i) => backdrop(i, { dots: false }) + inCircle(`<rect x="0" y="540" width="800" height="300" fill="#8ED8FF"/>` + line('M0 540 L800 540', 9)) +
  draw(230, 560, 1.0, man({ legs: 'stand', arms: { l: [120, -240], r: [150, -200] }, face: { eyes: 'open', mouth: 'open' }, shirt: C.orange })) + net(520, 360, 1.0) + P.fish(520, 660, 0.35, C.orange) + P.fish(640, 620, 0.3, C.yellow);
W['มีเงินห้าสิบหกบาท'] = (i) => backdrop(i) + numberBadge(400, 460, 1.4, '56', C.green) + text(560, 460, 1, '฿', C.yellowD, 12, 110) + coin(250, 600, 1.2) + coin(360, 640, 1.2) + coin(470, 620, 1.2) + coin(570, 590, 1.1);
W['เก็บเงินในหีบมีหูหิ้ว'] = (i) => backdrop(i) + shadow(400, 690, 230) + H.chest(400, 530, 1.1, coin(-60, -60, 1.1) + coin(40, -80, 1.1) + coin(110, -50, 1)) +
  line('M200 540 q-50 0 -50 50 q0 40 50 40 M600 540 q50 0 50 50 q0 40 -50 40', 12) + sparkle(640, 280, 0.7);
W['เห็นนกฮูกหาอาหาร'] = (i) => backdrop(i, { dots: false }) + `<circle cx="400" cy="410" r="330" fill="#2E3A6B"/>` + path('M600 180 Q560 210 580 260 Q540 250 540 210 Q540 170 600 180Z', C.yellow) +
  star(200, 200, 14, '#fff', 0) + star(300, 150, 10, '#fff', 0) + line('M200 420 L560 420', 18, C.brownD) + owl(380, 320, 0.7) + draw(560, 640, 0.5, mouse(0, 0, 1)) + line('M430 380 Q520 460 540 560', 6, '#FFE58A');
W['หมาเห่าโฮ่งโฮ่ง'] = (i) => backdrop(i) + shadow(300, 712, 160) + draw(300, 520, 1.15, dog(0, 0, 1, C.brownL, { bark: true, collar: true })) +
  speech(560, 300, 1.2, text(0, 0, 1, 'โฮ่งโฮ่ง', C.orange, 8, 42));
W['ฮองเฮาหาฮ่องเต้ในห้อง'] = (i) => backdrop(i) + shadow(400, 712, 150) + door(620, 700, 0.9) +
  draw(360, 712, 1.3, mom({ hair: 'long', shirt: C.purple, skirt: C.red, arms: { l: [-80, -110], r: [130, -250] }, face: { look: 1, mouth: 'o' }, hat: (hy) => crown(hy) })) + text(620, 250, 1, '?', C.purple, 12, 110);
W['ห้ามหุ่นยนต์เข้าห้อง'] = (i) => backdrop(i) + shadow(400, 700, 230) + door(560, 700, 1.0) + robot(270, 520, 0.7) + noSign(560, 320, 0.8);

// ---- ย
W['คุณยายยิ้มยาก'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.45, grandma({ shirt: C.purple, arms: { l: [-60, -150], r: [60, -150] }, face: { eyes: 'open', mouth: 'flat' } })) + text(620, 280, 1, '?', C.purple, 12, 110);
W['เปิดตู้เย็นหยิบแยมให้หน่อย'] = (i) => backdrop(i) + shadow(400, 700, 230) + Y.fridge(300, 440, 0.85, true) + draw(580, 712, 1.0, kid({ arms: { l: [-110, -200], r: [80, -110] }, face: { eyes: 'happy', mouth: 'big' } })) +
  g(rect(-40, -40, 80, 90, 16, '#E0506A') + rect(-46, -60, 92, 26, 8, C.yellow) + rect(-30, -10, 60, 34, 6, '#fff') + heart(0, 8, 0.4, C.red), at(470, 480));
W['เด็กกินยาแล้วยิ้มแย้ม'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, kid({ arms: { l: [-110, -170], r: [110, -170] }, face: { eyes: 'happy', mouth: 'big' }, shirt: C.teal })) +
  Y.pill(200, 320, 0.5, -20) + glass(620, 560, 0.45, '#8FD3FF', { level: -20 }) + sparkle(610, 250, 1) + sparkle(190, 470, 0.7);
W['อย่าออกมายุงเยอะแยะ'] = (i) => backdrop(i) + window_(320, 440, 1.1) + draw(320, 560, 0.55, kid({ legs: 'none', arms: { l: [-60, -140], r: [60, -140] }, face: { mouth: 'o' } })) +
  Y.mosquito(560, 260, 0.5, 10) + Y.mosquito(620, 420, 0.6, -10) + Y.mosquito(560, 580, 0.45, 5) + noSign(170, 250, 0.4);
W['ย่ากินยำหมูยอเยอะแยะ'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.3, grandma({ hair: 'grayShort', shirt: C.teal, arms: { l: [-60, -110], r: [40, -205] }, face: { eyes: 'happy', mouth: 'chew' } })) +
  g(ellipse(0, 20, 150, 40, '#fff') + [[-80, 0], [-30, -14], [20, 0], [70, -10], [-50, 20], [40, 20]].map(([a, b]) => ellipse(a, b, 26, 16, '#F7C8A8', 5)).join('') + path('M-100 -10 Q-80 -40 -60 -10', C.green, 5), at(400, 620));
W['ยักษ์ใหญ่ยืนอยู่หน้าประตู'] = (i) => backdrop(i) + shadow(400, 712, 200) + door(560, 700, 1.3) + giant(380, 500, 0.85);
W['รถยนต์หยุดรอคุณยาย'] = (i) => backdrop(i, { dots: false }) + inCircle(`<rect x="0" y="560" width="800" height="300" fill="#8E93A8"/>` + [0, 1, 2, 3, 4].map(k => rect(300, 580 + k * 36, 200, 18, 4, '#fff', 0)).join('')) +
  Y.car(170, 520, 0.6, C.red) + draw(430, 700, 0.95, grandma({ arms: { l: [-80, -110], r: [100, -110] } })) + Y.cane(540, 590) + text(640, 280, 1, '', INK);
W['เด็กเล่นหุ่นยนต์ตอนเย็น'] = (i) => backdrop(i, { dots: false }) + `<circle cx="400" cy="410" r="330" fill="#FFD7B5"/>` + circle(630, 260, 60, C.orange) + shadow(400, 712, 240) +
  draw(260, 712, 1.1, kid({ arms: { l: [-90, -120], r: [120, -190] }, face: { eyes: 'happy', mouth: 'big' } })) + robot(540, 560, 0.72, { wave: true });
W['คุณย่ากินลำไยยามเย็น'] = (i) => backdrop(i, { dots: false }) + `<circle cx="400" cy="410" r="330" fill="#FFD7B5"/>` + circle(630, 260, 60, C.orange) + shadow(400, 712, 160) +
  draw(360, 712, 1.3, grandma({ hair: 'grayShort', shirt: C.teal, arms: { l: [-80, -110], r: [40, -205] }, face: { eyes: 'happy', mouth: 'chew' } })) + Y.longan(580, 600, 0.45);
W['ยักษ์ใหญ่ไล่เหยียบยักษ์เล็ก'] = (i) => backdrop(i) + shadow(400, 712, 260) + giant(280, 470, 0.72, '#3DBE6E', { armR: '230 -60' }) + giant(610, 600, 0.38, '#5AA9FF') + motion(700, 560, 0.5) + motion(450, 600, 0.6);

// ---- ค
W['เขาเคยขายไข่ข้าว'] = (i) => backdrop(i) + shadow(400, 700, 250) + draw(400, 560, 0.95, man({ arms: { l: [-110, -150], r: [110, -150] }, face: { eyes: 'happy', mouth: 'big' }, shirt: C.orange })) +
  K.stall(400, 620, 0.9, K.egg(-120, -80, 0.35) + K.egg(-80, -90, 0.35, '#F3D9B1') + K.riceBowl(100, -80, 0.35, C.blue), false);
W['พวกเขาซื้อขนมเค้กทุกคน'] = (i) => backdrop(i) + shadow(400, 712, 260) +
  draw(210, 712, 0.95, kid({ arms: { l: [-80, -110], r: [70, -170] }, face: { eyes: 'happy', mouth: 'big' }, shirt: C.green, extraFront: cake(80, -190, 0.6) })) +
  draw(400, 712, 0.95, girl({ arms: { l: [-80, -110], r: [70, -170] }, face: { eyes: 'happy', mouth: 'big' }, extraFront: cake(80, -190, 0.6, C.yellow) })) +
  draw(590, 712, 0.95, kid({ arms: { l: [-80, -110], r: [70, -170] }, face: { eyes: 'happy', mouth: 'big' }, shirt: C.purple, extraFront: cake(80, -190, 0.6, C.sky) }));
W['เด็กเคี้ยวขนมหวาน'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, girl({ arms: { l: [-80, -110], r: [40, -205] }, face: { eyes: 'happy', mouth: 'chew' } })) +
  candy(470, 420, 0.4) + candy(200, 300, 0.6, C.yellow) + candy(620, 280, 0.55, C.sky);
W['นักเรียนเขียนหนังสือ'] = (i) => backdrop(i) + shadow(400, 712, 220) + draw(360, 660, 1.1, kid({ legs: 'none', shirt: '#fff', pants: C.blueD, arms: { l: [-60, -110], r: [70, -120] }, face: { eyes: 'closed', mouth: 'smile' },
  torsoExtra: rect(-10, -176, 20, 30, 4, C.blueD, 5) })) + table(400, 560, 520) + K.paper(400, 510, 0.45, -80) + line('M340 510 q20 -14 40 0 q20 14 40 0', 5, C.blue) +
  g(rect(-8, -80, 16, 110, 6, C.yellow) + path('M-8 30 L8 30 L0 56Z', '#F3D9B1', 5), at(460, 480, 1, 30));
W['เด็กเรียนวิชาวาดเขียน'] = (i) => backdrop(i) + shadow(400, 712, 220) + easel(520, 520, 0.95) + draw(250, 712, 1.1, girl({ arms: { l: [-80, -110], r: [140, -230] }, face: { look: 1, mouth: 'smile' } })) +
  K.brush(410, 400, 0.4, 40, C.pink);
W['เขาไปซื้อไข่เค็มที่ร้านขายของ'] = (i) => backdrop(i) + shadow(400, 700, 250) + K.stall(470, 560, 0.75, K.eggHalf(-100, -60, 0.4, '#FF8C1A') + K.eggHalf(0, -60, 0.4, '#FF8C1A') + K.egg(100, -70, 0.3)) +
  draw(170, 712, 0.95, man({ arms: { l: [-80, -110], r: [140, -200] }, face: { look: 1, mouth: 'smile' }, shirt: C.green })) + coin(310, 440, 0.7);
W['เขาเป็นไข้และคันคอ'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, man({ arms: { l: [-80, -100], r: [30, -190] }, face: { eyes: 'tired', mouth: 'wavy' }, shirt: C.sky,
  headExtra: (hy) => g(rect(0, -10, 150, 20, 10, '#fff') + circle(150, 0, 18, C.red) + rect(0, -4, 110, 8, 4, C.red, 0), at(20, hy + 50, 1, 20)) })) +
  motion(520, 470, 0.6, -20) + circle(370, 460, 8, C.red, 0) + circle(400, 480, 7, C.red, 0) + g(path('M-20 -50 q-20 30 0 50 q20 20 0 50', 'none', 8).replace(`stroke="${INK}"`, `stroke="${C.red}"`), at(210, 280));
W['เด็ก ๆ แข่งขันคัดลายมือ'] = (i) => backdrop(i) + shadow(400, 712, 260) + table(400, 580, 580) +
  draw(250, 660, 0.85, kid({ legs: 'none', arms: { l: [-60, -110], r: [70, -120] }, face: { eyes: 'closed', mouth: 'flat' } })) +
  draw(550, 660, 0.85, girl({ legs: 'none', arms: { l: [-60, -120], r: [70, -110] }, face: { eyes: 'closed', mouth: 'flat' } })) +
  K.paper(260, 540, 0.3, -90) + K.paper(550, 540, 0.3, -90) + g(L.path('M-50 -60 L50 -60 L50 -10 A50 50 0 0 1 -50 -10Z', C.yellow) + rect(-12, 30, 24, 40, 4, C.yellow) + rect(-40, 66, 80, 20, 6, C.brown), at(400, 300));
W['ผู้ชายมีร่างกายแข็งแรง'] = (i) => backdrop(i) + shadow(400, 712, 160) + draw(400, 712, 1.3, man({ shirt: C.red, arms: { l: [-140, -330], r: [140, -330] }, face: { eyes: 'happy', mouth: 'big' },
  extraFront: dumbbell(0, -340, 0.85) })) + sparkle(170, 450, 0.8) + sparkle(640, 450, 0.8);
W['เจ้าของร้านเอาขนมมาขาย'] = (i) => backdrop(i) + shadow(400, 712, 200) + draw(400, 712, 1.2, mom({ shirt: C.pink, apron: C.yellow, arms: { l: [-150, -100], r: [150, -100] }, face: { eyes: 'happy', mouth: 'big' },
  extraFront: g(ellipse(0, 0, 190, 34, C.grayL) + K.cookie(-100, -24, 0.3) + cake(0, -30, 0.6) + K.cookie(100, -24, 0.3) + candy(50, -40, 0.25, C.sky), at(0, -96)) })) + sparkle(620, 250, 0.7);

module.exports = W;
