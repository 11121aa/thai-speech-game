// New-style pictures for the ป words that already had (older) illustrations.
const L = require('./lib');
const { C, INK, g, at, circle, ellipse, rect, path, line, tube, shine, shadow, text, sparkle, heart, star, motion, backdrop, face,
  kid, girl, mom, man, grandma, person, draw, bird, cloudShape, speech, bowl, glass, hand, table, inCircle, numberBadge } = L;

const W = {};
const fish = (x, y, s, color = C.orange, r = 0, o = {}) => g(path('M100 0 L190 -70 L180 0 L190 70Z', color) + ellipse(0, 0, 120, 80, color) +
  path('M-20 -76 Q20 -130 60 -70Z', color, 7) + line('M40 -50 Q60 0 40 50', 7) + circle(-60, -16, 16, '#fff', 6) + circle(-58, -14, 7, INK, 0) +
  (o.blow ? ellipse(-120, 10, 12, 14, '#E8505B', 6) : line('M-110 18 Q-96 30 -84 20', 6)) + shine(-10, -40, 30, 10, -10) + (o.spikes ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => { const a = k * Math.PI / 5; return line(`M${(Math.cos(a) * 120).toFixed(0)} ${(Math.sin(a) * 80).toFixed(0)} L${(Math.cos(a) * 150).toFixed(0)} ${(Math.sin(a) * 104).toFixed(0)}`, 7); }).join('') : ''), at(x, y, s, r));
const tree = (x, y, s, o = {}) => g(path('M-30 0 L-40 -200 L40 -200 L30 0Z', C.brown) + line('M-10 -60 L-20 -120 M14 -100 L20 -160', 6, C.brownD) +
  circle(-90, -260, 90, o.leaf || C.green) + circle(90, -260, 90, o.leaf || C.green) + circle(0, -330, 110, o.leaf || C.green) + circle(0, -230, 90, o.leaf || C.green) +
  (o.flowers ? [[-80, -300], [60, -350], [100, -240], [-20, -250], [-110, -220]].map(([a, b]) => circle(a, b, 16, o.flowers)).join('') : '') + shine(-40, -380, 40, 18, -20, 0.35), at(x, y, s));
const crab = (x, y, s) => g(line('M-110 20 L-170 60 L-190 110 M-110 40 L-150 90 L-160 130 M110 20 L170 60 L190 110 M110 40 L150 90 L160 130', 12, C.redD) +
  tube('M-100 -20 Q-170 -60 -160 -130', C.red, 22) + tube('M100 -20 Q170 -60 160 -130', C.red, 22) +
  path('M-190 -150 Q-200 -210 -150 -200 L-160 -160 L-120 -170 Q-120 -120 -190 -150Z', C.red) + path('M190 -150 Q200 -210 150 -200 L160 -160 L120 -170 Q120 -120 190 -150Z', C.red) +
  ellipse(0, 20, 130, 90, C.red) + line('M-40 -60 L-50 -110 M40 -60 L50 -110', 8) + circle(-50, -120, 20, '#fff') + circle(50, -120, 20, '#fff') + circle(-48, -118, 9, INK, 0) + circle(52, -118, 9, INK, 0) +
  line('M-30 40 Q0 60 30 40', 7) + ellipse(-70, 30, 16, 9, C.blush, 0) + ellipse(70, 30, 16, 9, C.blush, 0) + shine(-50, -10, 30, 12, -20), at(x, y, s));
const duck = (x, y, s, color = C.yellow, o = {}) => g(line('M-20 120 L-24 160 M30 120 L34 160', 10, C.orangeD) + ellipse(-24, 164, 22, 8, C.orange, 6) + ellipse(34, 164, 22, 8, C.orange, 6) +
  ellipse(0, 50, 120, 84, color) + path('M-120 30 Q-160 0 -150 60Z', color) + ellipse(-20, 50, 60, 36, o.wing || color, OWX) + circle(70, -60, 64, color) +
  path('M120 -54 Q190 -60 190 -36 Q190 -14 124 -20Z', C.orange) + `<ellipse cx="80" cy="-78" rx="9" ry="11" fill="${INK}"/><circle cx="83" cy="-82" r="3" fill="#fff"/>` + ellipse(60, -44, 12, 7, C.blush, 0), at(x, y, s));
const OWX = 9;
const pipe = (x, y, s, r = 0) => g(path('M-26 -200 L26 -200 L40 160 Q0 190 -40 160Z', '#B5652E') + [-120, -60, 0, 60, 120].map(v => circle(0, v, 11, INK, 0)).join('') +
  rect(-16, -250, 32, 56, 10, C.yellow) + line('M-36 100 L36 100 M-30 130 L30 130', 6, C.yellow), at(x, y, s, r));
const target = (x, y, s) => g(circle(0, 0, 160, C.red) + circle(0, 0, 118, '#fff') + circle(0, 0, 76, C.red) + circle(0, 0, 34, '#fff') + circle(0, 0, 12, C.red, 0) + shine(-80, -90, 30, 12, -40, 0.4), at(x, y, s));
const can = (x, y, s, label = C.red, pic = '') => g(rect(-110, -150, 220, 300, 30, C.grayL) + ellipse(0, -150, 110, 26, '#F4F6FA') + ellipse(0, -150, 80, 16, 'none', 5) +
  rect(-110, -90, 220, 180, 0, label, 0) + line('M-110 -90 L110 -90 M-110 90 L110 90', 7) + rect(-110, -150, 220, 300, 30, 'none') + pic + shine(-80, -30, 12, 60, 0, 0.5), at(x, y, s));
const bag = (x, y, s, color = C.red) => g(path('M-70 -80 Q-70 -160 0 -160 Q70 -160 70 -80', 'none', 30) + path('M-70 -80 Q-70 -160 0 -160 Q70 -160 70 -80', 'none', 14).replace(`stroke="${INK}"`, `stroke="${C.brownD}"`) +
  rect(-150, -90, 300, 220, 36, color) + rect(-150, -90, 300, 70, 30, C.redD) + rect(-26, -34, 52, 40, 10, C.yellow) + shine(-100, 20, 16, 50, 0, 0.4), at(x, y, s));
const house = (x, y, s, open = false) => g(path('M-220 -60 L0 -240 L220 -60Z', C.red) + rect(-180, -70, 360, 260, 16, C.cream) + rect(90, -200, 40, 90, 8, C.brown) +
  (open ? path('M-60 190 L-60 30 L60 30 L60 190Z', '#4A3350') + path('M60 190 L60 30 L110 60 L110 170Z', C.brownL) : rect(-60, 30, 120, 160, 12, C.brownL) + circle(40, 110, 9, C.yellow, 5)) +
  rect(-160, -30, 80, 70, 10, C.sky) + rect(80, -30, 80, 70, 10, C.sky) + line('M-120 -30 L-120 40 M120 -30 L120 40', 6), at(x, y, s));
const rain = (xs) => xs.map(([a, b]) => g(path('M0 -30 Q20 0 20 12 Q20 30 0 30 Q-20 30 -20 12 Q-20 0 0 -30Z', '#6EC1FF', 5), at(a, b))).join('');
const lungs = (x, y, s, color = C.pink) => g(line('M0 -220 L0 -110 M0 -110 L-50 -70 M0 -110 L50 -70', 16) + line('M0 -220 L0 -110 M0 -110 L-50 -70 M0 -110 L50 -70', 6, '#fff') +
  path('M-40 -130 Q-170 -150 -170 20 Q-170 160 -60 150 Q-20 150 -20 100 L-20 -100Z', color) + path('M40 -130 Q170 -150 170 20 Q170 160 60 150 Q20 150 20 100 L20 -100Z', color) +
  shine(-110, -40, 20, 40, 10, 0.4) + shine(110, -40, 20, 40, -10, 0.4), at(x, y, s));
const coral = (x, y, s, color = '#FF6F91') => g(tube('M0 160 L0 40 Q0 -20 -60 -60 L-70 -150 M0 40 Q40 -10 80 -40 L90 -140 M-60 -60 L-120 -100 M80 -40 L140 -60 M0 60 Q-10 0 10 -80', color, 30), at(x, y, s));
const clay = (x, y, s) => g(path('M-110 100 Q-150 -20 -80 -80 L-60 -140 L60 -140 L80 -80 Q150 -20 110 100Z', '#C8713F') + ellipse(0, -140, 60, 16, '#A8592E') +
  line('M-100 0 Q0 30 100 0', 6, '#A8592E') + shine(-60, -40, 16, 40, 10, 0.4), at(x, y, s));
const sign = (x, y, s, content) => g(line('M-120 -120 L0 -200 L120 -120', 8) + circle(0, -200, 12, C.yellow) + rect(-170, -130, 340, 170, 20, C.brownL) + rect(-150, -110, 300, 130, 12, '#FFF3D6') + content, at(x, y, s));
const apron = (x, y, s) => g(path('M-70 -220 L70 -220 L90 -120 L170 -120 L130 260 L-130 260 L-170 -120 L-90 -120Z', C.teal) + path('M-70 -220 Q0 -300 70 -220', 'none', 12) +
  rect(-80, 60, 160, 110, 20, '#5FDDD1') + line('M-170 -110 L-260 -60 M170 -110 L260 -60', 10) + circle(-20, -40, 14, C.yellow, 5) + circle(30, -60, 10, C.pink, 5) + circle(10, 0, 12, C.red, 5), at(x, y, s));
const skirt = (x, y, s) => g(rect(-140, -170, 280, 50, 18, C.purple) + path('M-140 -130 L140 -130 L240 160 Q0 210 -240 160Z', C.pink) +
  line('M-80 -120 L-140 170 M0 -120 L0 190 M80 -120 L140 170', 7, '#E0559A') + [[-120, 60], [60, 40], [150, 120], [-40, 140]].map(([a, b]) => circle(a, b, 12, '#fff', 0)).join(''), at(x, y, s));
const lotusLeaf = (x, y, s) => g(path('M0 0 Q-140 -60 -150 60 Q-60 150 0 60 Q60 150 150 60 Q140 -60 0 0Z', C.green) + line('M0 0 L0 110', 6, C.greenD), at(x, y, s));

W['ปลา'] = (i) => backdrop(i, { dots: false }) + inCircle(`<rect x="0" y="560" width="800" height="300" fill="#8ED8FF"/>` + line('M0 560 q50 -24 100 0 q50 24 100 0 q50 -24 100 0 q50 24 100 0 q50 -24 100 0 q50 24 100 0 q50 -24 100 0 q50 24 100 0', 8, '#fff')) +
  fish(400, 420, 1.35, C.orange) + g(circle(0, 0, 16, '#DDF3FF', 5) + circle(30, -50, 10, '#DDF3FF', 5), at(220, 330));
W['เป่า'] = (i) => backdrop(i) + shadow(340, 712, 130) + draw(320, 712, 1.3, girl({ arms: { l: [-70, -110], r: [70, -110] }, face: { mouth: 'o', eyes: 'closed' } })) +
  g(line('M0 0 L100 -10 M0 30 L120 30 M0 60 L100 70', 8, C.sky), at(420, 380)) + g(ellipse(0, 0, 50, 60, C.red) + shine(-18, -20, 10, 16) + line('M0 60 L0 70', 5), at(620, 360)) + sparkle(610, 220, 0.6);
W['ป่า'] = (i) => backdrop(i, { dots: false }) + inCircle(`<rect x="0" y="600" width="800" height="300" fill="${C.green}"/>` +
  tree(200, 640, 0.9) + tree(600, 650, 0.85, { leaf: '#2FAE5C' }) + tree(400, 680, 1.1, { leaf: '#56D67C' }) + circle(640, 180, 40, C.yellow));
W['ปก'] = (i) => backdrop(i) + shadow(400, 690, 200) + g(rect(-170, -220, 340, 440, 20, C.blue) + rect(-150, -220, 30, 440, 0, C.blueD, 0) + rect(-170, -220, 340, 440, 20, 'none') +
  star(40, -60, 60, C.yellow) + rect(-60, 60, 200, 30, 10, '#fff') + rect(-40, 110, 160, 20, 10, '#fff', 0) + shine(80, -170, 50, 14, -20, 0.4), at(400, 440)) + sparkle(630, 240, 0.7);
W['ปีน'] = (i) => backdrop(i) + tree(430, 760, 1.1) + draw(390, 560, 0.85, kid({ arms: { l: [20, -300], r: [90, -280] }, face: { eyes: 'happy', mouth: 'big' }, shirt: C.orange })) + motion(620, 430, 0.7, -30);
W['ปรุง'] = (i) => backdrop(i) + shadow(400, 700, 230) + g(path('M-200 -20 L200 -20 Q190 120 0 130 Q-190 120 -200 -20Z', C.grayD) + ellipse(0, -20, 200, 36, C.gray) + ellipse(0, -24, 170, 26, '#FFB35C', 0) +
  circle(-60, -30, 16, C.green) + circle(40, -24, 14, C.red) + rect(-236, -34, 50, 24, 10, C.black) + rect(186, -34, 50, 24, 10, C.black), at(400, 560)) +
  g(path('M-30 -60 L30 -60 L40 60 L-40 60Z', C.red) + rect(-20, -90, 40, 34, 8, '#fff'), at(560, 330, 1, 140)) + g(circle(0, 0, 7, C.red, 0) + circle(12, 20, 6, C.red, 0) + circle(-10, 34, 6, C.red, 0), at(520, 430)) +
  line('M320 440 q-20 -30 0 -60 M420 430 q-20 -30 0 -60', 8, C.gray);
W['ป่วย'] = (i) => backdrop(i) + shadow(400, 690, 260) + g(rect(-260, 0, 520, 90, 24, C.brownL) + rect(-280, -120, 50, 230, 18, C.brown) + rect(-230, -30, 470, 50, 20, '#fff'), at(400, 560)) +
  g(circle(0, 0, 80, C.skin) + path('M-80 -4 Q-84 -90 0 -86 Q84 -90 80 -4 Q60 -44 20 -40 Q-10 -60 -30 -38 Q-60 -36 -80 -4Z', C.hair) + g(face(80, { eyes: 'tired', mouth: 'sad' }), at(0, 10)) + rect(-60, -60, 120, 30, 12, '#fff'), at(260, 470)) +
  g(path('M-60 0 Q100 -60 380 -20 L380 80 L-60 80Z', C.pinkL), at(300, 530)) + g(rect(0, -10, 150, 20, 10, '#fff') + circle(150, 0, 18, C.red) + rect(0, -4, 110, 8, 4, C.red, 0), at(560, 300, 1, -30)) +
  g(path('M-30 -50 q-20 30 0 50 q20 20 0 50', 'none', 8).replace(`stroke="${INK}"`, `stroke="${C.red}"`), at(200, 300));
W['เปลี่ยน'] = (i) => backdrop(i) + g(path('M-100 -60 L-40 -110 L40 -110 L100 -60 L70 -20 L50 -40 L50 110 L-50 110 L-50 -40 L-70 -20Z', C.red), at(230, 440)) +
  g(path('M-100 -60 L-40 -110 L40 -110 L100 -60 L70 -20 L50 -40 L50 110 L-50 110 L-50 -40 L-70 -20Z', C.blue), at(570, 440)) +
  g(path('M-80 -20 Q0 -100 80 -20', 'none', 16) + path('M-80 -20 Q0 -100 80 -20', 'none', 6).replace(`stroke="${INK}"`, 'stroke="#fff"') + path('M70 -44 L96 -6 L52 -10Z', INK, 0), at(400, 300)) +
  g(path('M80 20 Q0 100 -80 20', 'none', 16) + path('M80 20 Q0 100 -80 20', 'none', 6).replace(`stroke="${INK}"`, 'stroke="#fff"') + path('M-70 44 L-96 6 L-52 10Z', INK, 0), at(400, 600));
W['แปลง'] = (i) => backdrop(i, { dots: false }) + inCircle(`<rect x="0" y="420" width="800" height="400" fill="#B97A45"/>` + line('M0 420 L800 420', 9) +
  [470, 560, 650].map(y => `<path d="M60 ${y} Q400 ${y - 30} 740 ${y}" fill="none" stroke="#8E5A2E" stroke-width="10"/>`).join('') +
  [[140, 450], [260, 440], [380, 436], [500, 440], [620, 450], [180, 540], [320, 530], [460, 530], [600, 540], [240, 630], [400, 620], [560, 630]].map(([a, b]) =>
    path(`M${a} ${b} Q${a - 40} ${b - 50} ${a - 10} ${b - 70} Q${a} ${b - 40} ${a} ${b}Z M${a} ${b} Q${a + 40} ${b - 50} ${a + 10} ${b - 70} Q${a} ${b - 40} ${a} ${b}Z`, C.green, 6)).join('') +
  circle(620, 200, 50, C.yellow) + cloudShape(230, 220, 0.35));
W['เป็น'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, kid({ shirt: '#fff', pants: C.blue, arms: { l: [-80, -100], r: [100, -160] }, face: { eyes: 'happy', mouth: 'big' },
  torsoExtra: line('M-30 -170 Q-40 -110 -10 -110 Q20 -110 16 -140', 7) + circle(16, -146, 12, C.grayD, 5) + rect(20, -150, 24, 30, 6, C.red, 5) })) + star(210, 260, 30) + sparkle(610, 250, 0.8);
W['ปลอม'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, kid({ shirt: C.purple, arms: { l: [-80, -100], r: [80, -100] }, face: { mouth: 'none', eyes: 'open' }, glasses: true,
  headExtra: (hy) => path(`M-70 ${hy + 50} Q-40 ${hy + 20} 0 ${hy + 44} Q40 ${hy + 20} 70 ${hy + 50} Q40 ${hy + 70} 0 ${hy + 56} Q-40 ${hy + 70} -70 ${hy + 50}Z`, C.hair) + ellipse(0, hy + 24, 20, 16, '#F2B27E') })) +
  text(620, 300, 1, '?', C.purple, 14, 140);
W['ไป'] = (i) => backdrop(i) + shadow(380, 712, 150) + draw(360, 712, 1.3, kid({ shirt: C.green, arms: { l: [-90, -130], r: [150, -200] }, face: { eyes: 'happy', mouth: 'big' } })) +
  g(path('M-80 -40 L40 -40 L40 -90 L130 0 L40 90 L40 40 L-80 40Z', C.orange), at(600, 450)) + motion(140, 480, 0.8, 180);
W['ปี่'] = (i) => backdrop(i) + pipe(400, 420, 1.1, 30) + g(line('M0 30 L0 -40 L40 -50 L40 20', 7), at(210, 320)) + circle(200, 350, 16, INK) + circle(240, 340, 16, INK) +
  g(path('M0 20 L0 -40', 'none', 7) + circle(-10, 22, 14, INK, 0), at(620, 260)) + sparkle(620, 520, 0.6);
W['ปู่'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.4, man({ hair: 'grayShort', shirt: C.teal, pants: C.brown, glasses: true, arms: { l: [-80, -110], r: [100, -110] }, face: { eyes: 'happy', mouth: 'smile' },
  headExtra: (hy) => path(`M-40 ${hy + 46} Q0 ${hy + 30} 40 ${hy + 46} Q0 ${hy + 60} -40 ${hy + 46}Z`, '#fff', 6) })) +
  line('M540 560 L540 720 M540 560 Q540 520 504 530', 22) + line('M540 560 L540 720 M540 560 Q540 520 504 530', 10, C.brown);
W['ป้า'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.4, mom({ hair: 'bun', hairColor: '#4A2C2A', shirt: C.orange, skirt: C.green, arms: { l: [-110, -170], r: [80, -100] }, face: { eyes: 'happy', mouth: 'big' } })) +
  bag(580, 580, 0.35, C.pink) + heart(220, 260, 0.8, C.pink);
W['เป้า'] = (i) => backdrop(i) + target(400, 420, 1.5) + g(line('M0 0 L180 -120', 12) + line('M0 0 L180 -120', 5, C.brownL) + path('M180 -120 L220 -160 L230 -110Z M170 -140 L200 -170 L200 -130Z', C.pink, 5), at(400, 420)) + star(190, 240, 30);
W['ปอดบวม'] = (i) => backdrop(i) + lungs(400, 450, 1.2, '#FF8FA3') + g(line('M-20 -40 L20 40 M20 -40 L-20 40', 0), at(0, 0)) +
  circle(330, 480, 26, '#FFD2DA', 5) + circle(470, 440, 22, '#FFD2DA', 5) + g(path('M-30 -50 q-20 30 0 50 q20 20 0 50', 'none', 8).replace(`stroke="${INK}"`, `stroke="${C.red}"`), at(640, 330)) + text(180, 330, 1, '!', C.red, 12, 110);
W['ประโยชน์'] = (i) => backdrop(i) + shadow(400, 690, 230) + g(ellipse(0, 0, 230, 60, '#fff'), at(400, 620)) +
  g(ellipse(0, 0, 90, 80, C.red) + path('M0 -76 Q20 -110 40 -100', 'none', 8) + path('M10 -84 Q60 -120 80 -80 Q40 -70 10 -84Z', C.green) + shine(-40, -30, 16, 26, 20), at(290, 530)) +
  g(path('M-40 -80 L40 -80 L60 60 Q0 100 -60 60Z', C.orange) + line('M-30 -40 L30 -40 M-34 0 L34 0 M-40 40 L40 40', 6, C.orangeD) + path('M-20 -80 Q-40 -140 -10 -150 Q10 -120 0 -80 Q20 -140 40 -130 Q30 -100 20 -80Z', C.green, 6), at(470, 520)) +
  g(hand([false, false, false, false, true]), at(620, 330, 0.45, -90)) + sparkle(200, 270, 0.7);
W['คนป๋วย'] = W['ป่วย'];
W['กระป๋อง'] = (i) => backdrop(i) + shadow(400, 690, 170) + can(400, 470, 1.3, C.blue, star(0, 0, 50, C.yellow)) + sparkle(620, 250, 0.7);
W['ปากเป็ด'] = (i) => backdrop(i) + g(circle(0, 0, 200, C.yellow) + circle(-70, -60, 30, '#fff', 0) + `<ellipse cx="-60" cy="-50" rx="16" ry="20" fill="${INK}"/><ellipse cx="80" cy="-50" rx="16" ry="20" fill="${INK}"/>` +
  path('M-120 30 Q0 -10 120 30 Q140 80 0 90 Q-140 80 -120 30Z', C.orange) + line('M-110 50 Q0 30 110 50', 7) + ellipse(-24, 22, 8, 6, INK, 0) + ellipse(24, 22, 8, 6, INK, 0) +
  ellipse(-130, -10, 26, 14, C.blush, 0) + ellipse(130, -10, 26, 14, C.blush, 0) + path('M-10 -196 Q10 -250 40 -220 Q20 -210 10 -190Z', C.yellow), at(400, 440)) + sparkle(620, 230, 0.7);
W['เปิดบ้าน'] = (i) => backdrop(i) + shadow(400, 700, 240) + house(400, 520, 1.1, true) + g(line('M0 0 L60 -20 M0 30 L70 30 M0 60 L60 80', 7, C.yellow), at(480, 600)) + sparkle(640, 240, 0.8);
W['ไปเที่ยว'] = (i) => backdrop(i) + shadow(400, 712, 170) + draw(360, 712, 1.25, girl({ arms: { l: [-100, -110], r: [140, -240] }, face: { eyes: 'happy', mouth: 'big' },
  hat: (hy) => path(`M-150 ${hy - 40} Q0 ${hy - 90} 150 ${hy - 40} Q0 ${hy - 10} -150 ${hy - 40}Z`, C.yellow) + path(`M-80 ${hy - 50} Q-70 ${hy - 140} 0 ${hy - 140} Q70 ${hy - 140} 80 ${hy - 50}Z`, C.yellow) + rect(-80, hy - 74, 160, 22, 8, C.red) })) +
  g(rect(-70, -100, 140, 180, 20, C.teal) + rect(-30, -130, 60, 34, 10, 'none', 10) + line('M-70 -40 L70 -40', 7) + rect(-60, 80, 30, 14, 6, INK, 0) + rect(30, 80, 30, 14, 6, INK, 0), at(200, 610, 0.8)) + sparkle(620, 250, 0.8);
W['ผูกป้าย'] = (i) => backdrop(i) + sign(400, 470, 1.1, text(0, -20, 1, '♥', C.red, 0, 90)) + g(line('M-240 -330 L240 -330', 0), at(0, 0)) +
  g(path('M0 0 Q-40 -40 -60 0 Q-40 40 0 0 Q40 -40 60 0 Q40 40 0 0Z', C.pink) + circle(0, 0, 12, C.pink), at(400, 270)) + sparkle(640, 260, 0.7);
W['ปั้นดิน'] = (i) => backdrop(i) + shadow(400, 690, 200) + clay(400, 510, 1.2) + g(hand([false, false, false, false, false]), at(210, 560, 0.5, 60)) + g(hand([false, false, false, false, false]), at(600, 520, 0.5, -60)) + sparkle(610, 250, 0.7);
W['เปียกฝน'] = (i) => backdrop(i) + cloudShape(400, 220, 0.9, '#C7D4EA') + draw(400, 712, 1.2, kid({ shirt: C.yellow, arms: { l: [-60, -140], r: [60, -140] }, face: { mouth: 'sad', eyes: 'closed' } })) +
  rain([[240, 330], [300, 420], [560, 320], [520, 430], [620, 520], [180, 470], [420, 330]]) + g(line('M0 0 q-10 -20 0 -30', 5, '#6EC1FF'), at(330, 390));
W['ปลากระป๋อง'] = (i) => backdrop(i) + shadow(400, 680, 230) + can(330, 480, 1.1, C.red, g(fish(0, 0, 0.55, '#fff'), at(0, 0))) + fish(580, 560, 0.55, '#FF9F80') + sparkle(620, 250, 0.7);
W['แปดสิบแปด'] = (i) => backdrop(i) + numberBadge(400, 560, 1.7, '88', C.pink) + sparkle(200, 250, 0.8) + sparkle(610, 240, 0.9);
W['เป็ดพะโล้'] = (i) => backdrop(i) + shadow(400, 690, 230) + g(ellipse(0, 0, 240, 64, '#fff') + ellipse(0, -6, 200, 48, '#EAF4FF', 0), at(400, 610)) +
  g(ellipse(0, 0, 170, 90, '#8B4A20') + line('M-120 -20 L120 -20 M-100 30 L110 30', 6, '#6B3510') + ellipse(-40, -40, 40, 12, '#B96C36', 0) + ellipse(60, -30, 30, 10, '#B96C36', 0) + circle(-40, 20, 20, '#F3D9B1', 6) + circle(-40, 20, 10, C.orange, 0), at(400, 560)) +
  path('M540 520 Q570 470 610 500 Q580 520 540 520Z', C.green) + line('M320 430 q-20 -30 0 -60 M420 420 q-20 -30 0 -60', 8, C.gray);
W['ปลูกต้นไม้'] = (i) => backdrop(i, { dots: false }) + inCircle(`<rect x="0" y="600" width="800" height="300" fill="#B97A45"/>` + line('M0 600 L800 600', 9)) +
  draw(260, 700, 1.0, kid({ legs: 'kneel', shirt: C.orange, arms: { l: [100, -110], r: [150, -110] }, face: { eyes: 'happy', mouth: 'big' } })) +
  g(line('M0 0 L0 -140', 12) + line('M0 0 L0 -140', 5, C.greenD) + path('M0 -80 Q-80 -140 -110 -80 Q-60 -60 0 -80Z M0 -110 Q80 -170 110 -110 Q60 -90 0 -110Z', C.green, 7), at(500, 600)) +
  g(path('M-60 0 L60 0 L40 70 L-40 70Z', '#8FA3BF') + ellipse(0, 0, 60, 14, '#A9B8CE'), at(640, 440, 0.8, -30)) + rain([[590, 510], [620, 540]]);
W['ปะการัง'] = (i) => backdrop(i, { dots: false }) + inCircle(`<rect x="0" y="0" width="800" height="800" fill="#BDE8FF"/><rect x="0" y="640" width="800" height="200" fill="#F3D9A3"/>` +
  coral(300, 520, 1.2, '#FF6F91') + coral(520, 560, 0.9, C.orange) + coral(160, 600, 0.6, C.purple) + fish(600, 300, 0.4, C.yellow) + fish(230, 250, 0.3, C.teal, 0) +
  g(circle(0, 0, 14, '#fff', 5) + circle(24, -40, 9, '#fff', 5), at(440, 250)));
W['ถือกระเป๋า'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(370, 712, 1.35, girl({ arms: { l: [-80, -100], r: [110, -90] }, face: { eyes: 'happy', mouth: 'smile' } })) + bag(540, 690, 0.45, C.red) + sparkle(620, 250, 0.7);
W['ผ้ากันเปื้อน'] = (i) => backdrop(i) + apron(400, 440, 1.1) + sparkle(620, 250, 0.7) + sparkle(190, 560, 0.6);
W['ปู่เป่าปี่'] = (i) => backdrop(i) + shadow(380, 712, 150) + draw(360, 712, 1.3, man({ hair: 'grayShort', shirt: C.teal, pants: C.brown, arms: { l: [20, -170], r: [60, -140] }, face: { eyes: 'closed', mouth: 'o' },
  headExtra: (hy) => path(`M-40 ${hy + 46} Q0 ${hy + 30} 40 ${hy + 46} Q0 ${hy + 60} -40 ${hy + 46}Z`, '#fff', 6) })) + pipe(430, 520, 0.55, -60) +
  g(line('M0 30 L0 -40 L40 -50 L40 20', 7) + circle(-10, 32, 14, INK, 0) + circle(30, 22, 14, INK, 0), at(600, 300)) + g(line('M0 20 L0 -40', 7) + circle(-10, 22, 14, INK, 0), at(660, 420));
W['ปีนต้นไม้'] = W['ปีน'];
W['ใส่กระโปรง'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.4, girl({ skirt: C.pink, shirt: C.purple, arms: { l: [-110, -150], r: [110, -150] }, face: { eyes: 'happy', mouth: 'big' },
  torsoExtra: path('M-50 -172 L50 -172 L100 -60 L-100 -60Z', C.pink) + [[-60, -80], [0, -100], [60, -80]].map(([a, b]) => circle(a, b, 9, '#fff', 0)).join('') })) + sparkle(610, 250, 0.8) + heart(210, 260, 0.8, C.pink);
W['ปลาปักเป้ากินปู'] = (i) => backdrop(i, { dots: false }) + inCircle(`<rect x="0" y="0" width="800" height="800" fill="#BDE8FF"/><rect x="0" y="640" width="800" height="200" fill="#F3D9A3"/>`) +
  fish(330, 380, 1.1, C.yellow, 0, { spikes: true, blow: true }) + crab(590, 590, 0.55) + g(circle(0, 0, 12, '#fff', 5) + circle(20, -30, 8, '#fff', 5), at(170, 260));
W['ปังปอนปีนต้นประดู่'] = (i) => backdrop(i) + tree(430, 770, 1.1, { flowers: C.yellow }) + draw(390, 570, 0.85, kid({ arms: { l: [20, -300], r: [90, -280] }, face: { eyes: 'happy', mouth: 'big' }, shirt: C.red })) + motion(620, 430, 0.7, -30);
W['ป้ากับปู่ไปเป็นผู้ปกครอง'] = (i) => backdrop(i) + shadow(400, 712, 230) +
  draw(260, 712, 1.05, mom({ hair: 'bun', hairColor: '#4A2C2A', shirt: C.orange, skirt: C.green, arms: { l: [-80, -110], r: [100, -140] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  draw(560, 712, 1.05, man({ hair: 'grayShort', shirt: C.teal, pants: C.brown, glasses: true, arms: { l: [-100, -140], r: [80, -110] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  draw(410, 712, 0.7, kid({ arms: { l: [-110, -150], r: [110, -150] }, face: { eyes: 'happy', mouth: 'big' } })) + heart(410, 230, 1, C.red);
W['เปียปลูกต้นตีนเป็ด'] = (i) => backdrop(i, { dots: false }) + inCircle(`<rect x="0" y="600" width="800" height="300" fill="#B97A45"/>` + line('M0 600 L800 600', 9)) +
  draw(250, 700, 1.0, girl({ legs: 'kneel', arms: { l: [100, -110], r: [150, -110] }, face: { eyes: 'happy', mouth: 'big' } })) +
  g(line('M0 0 L0 -180', 14) + line('M0 0 L0 -180', 6, C.brown) + [[-90, -200], [-50, -250], [0, -270], [50, -250], [90, -200]].map(([a, b]) => path(`M0 -180 L${a} ${b} Q${a * 0.6} ${b - 30} ${a * 0.2} ${b + 10}Z`, C.green, 6)).join(''), at(530, 600)) + sparkle(640, 250, 0.6);
W['เปาอยู่กับปู่ริมป่าโปร่ง'] = (i) => backdrop(i, { dots: false }) + inCircle(`<rect x="0" y="600" width="800" height="300" fill="${C.green}"/>` +
  tree(140, 640, 0.6) + tree(660, 640, 0.6, { leaf: '#2FAE5C' }) + tree(560, 600, 0.45, { leaf: '#56D67C' })) +
  draw(420, 712, 1.0, man({ hair: 'grayShort', shirt: C.teal, pants: C.brown, glasses: true, arms: { l: [-100, -140], r: [80, -110] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  draw(270, 712, 0.75, kid({ arms: { l: [-90, -110], r: [110, -150] }, face: { eyes: 'happy', mouth: 'big' } }));

Object.defineProperty(W, '_h', { value: { fish, tree, can, house, rain }, enumerable: false });
module.exports = W;
