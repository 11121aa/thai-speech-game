// Pictures for the meaningful ห words (W1-W3).
const L = require('./lib');
const { C, INK, g, at, circle, ellipse, rect, path, line, tube, shine, shadow, text, sparkle, heart, star, motion, backdrop, face,
  kid, girl, mom, man, person, draw, cat, dog, bird, cloudShape, speech, bowl, glass, numberBadge, hand, robot, owl, mushroom, coin, gift, inCircle } = L;

const W = {};
const ear = (x, y, s) => g(path('M-60 -150 Q60 -200 110 -80 Q150 20 60 90 Q30 120 30 170 Q20 220 -30 210 Q-80 200 -70 150 Q-60 100 -90 40 Q-140 -80 -60 -150Z', C.skin) +
  path('M-30 -90 Q50 -120 70 -40 Q80 20 30 50 Q0 70 10 110', 'none', 8) + path('M-20 -30 Q20 -40 20 0', 'none', 7) + shine(-50, -100, 20, 10, -30), at(x, y, s));
const shell = (x, y, s, color = '#FFB38A') => g(path('M0 110 L-150 -10 Q-150 -130 0 -140 Q150 -130 150 -10Z', color) +
  line('M0 110 L-110 -80 M0 110 L-50 -126 M0 110 L0 -140 M0 110 L50 -126 M0 110 L110 -80', 7) + path('M-40 110 L40 110 L30 150 L-30 150Z', color) + shine(-70, -70, 24, 12, -30), at(x, y, s));
const rock = (x, y, s, color = '#A9AFC4') => g(path('M-170 80 Q-190 -20 -110 -80 Q-40 -150 50 -120 Q150 -110 170 -20 Q190 70 120 90 Q0 110 -170 80Z', color) +
  path('M-60 -60 Q0 -90 60 -70', 'none', 6) + ellipse(60, 20, 26, 14, '#C7CCDB', 0) + ellipse(-80, 30, 18, 10, '#8B91A8', 0) + shine(-90, -40, 30, 14, -20), at(x, y, s));
const dice = (x, y, s, n) => {
  const pts = { 5: [[-50, -50], [50, -50], [0, 0], [-50, 50], [50, 50]], 6: [[-50, -55], [50, -55], [-50, 0], [50, 0], [-50, 55], [50, 55]] }[n];
  return g(rect(-110, -110, 220, 220, 40, '#fff') + pts.map(([a, b]) => circle(a, b, 20, C.red, 0)).join(''), at(x, y, s));
};
const bark = (x, y, s) => g(path('M0 -60 L30 -20 L80 -40 L60 0 L110 30 L50 40 L60 90 L10 50 L-40 90 L-30 40 L-90 30 L-40 0 L-70 -50 L-20 -20Z', C.yellow, 7), at(x, y, s));
const umbrellaClosed = (x, y, s) => g(path('M-30 -200 Q-60 60 -8 140 L8 140 Q60 60 30 -200Z', C.purple) + line('M-20 -150 L0 120 M20 -150 L4 120', 5, '#6B3FD6') +
  rect(-40, -20, 80, 26, 10, C.yellow) + line('M0 -200 L0 -250', 10) + line('M0 140 L0 230 Q0 270 -40 270', 16) + line('M0 140 L0 230 Q0 270 -40 270', 8, C.brown), at(x, y, s));
const shrimp = (x, y, s, r) => g(path('M-80 0 Q-80 -70 0 -70 Q80 -70 80 0 Q80 40 40 50 Q60 20 40 0 Q20 -30 -20 -20 Q-50 -10 -50 30 Q-60 60 -90 40 Q-80 20 -80 0Z', '#FF8A5C', 6) +
  line('M-30 -60 L-26 -30 M10 -68 L10 -36 M44 -60 L36 -30', 5) + circle(-60, -30, 6, INK, 0) + line('M-76 -40 Q-130 -90 -150 -40 M-76 -30 Q-140 -60 -150 -10', 4), at(x, y, s, r));
const onion = (x, y, s) => g(path('M0 -150 Q30 -110 90 -60 Q160 20 110 110 Q60 170 0 170 Q-60 170 -110 110 Q-160 20 -90 -60 Q-30 -110 0 -150Z', '#C77DFF') +
  line('M0 -150 Q-60 0 -20 168 M0 -150 Q60 0 20 168 M0 -140 L0 168', 5, '#9B4DDB') + line('M-10 170 Q-20 200 -40 206 M10 170 Q20 200 40 206 M0 170 L0 212', 5, C.brownL) +
  path('M0 -150 Q-10 -210 -40 -230 M0 -150 Q10 -210 30 -240', 'none', 10) + line('M0 -150 Q-10 -210 -40 -230 M0 -150 Q10 -210 30 -240', 4, C.green) + shine(-60, -30, 20, 40, 20), at(x, y, s));
const chest = (x, y, s, content = '') => g(content + rect(-190, -40, 380, 180, 20, C.brown) + rect(-190, -40, 380, 36, 10, C.brownD) +
  rect(-160, -10, 20, 150, 0, '#E0A96D', 0) + rect(140, -10, 20, 150, 0, '#E0A96D', 0) + rect(-24, 0, 48, 56, 10, C.yellow) + circle(0, 22, 7, INK, 0) + rect(-190, -40, 380, 180, 20, 'none'), at(x, y, s));

W['หู'] = (i) => backdrop(i) + ear(400, 420, 1.4) + g(line('M0 -40 Q30 0 0 40 M40 -70 Q90 0 40 70', 9, C.purple), at(600, 400));
W['ห้า'] = (i) => backdrop(i) + g(hand([true, true, true, true, true]), at(300, 560, 1.15)) + numberBadge(590, 520, 1.3, '5', C.blue);
W['หอย'] = (i) => backdrop(i) + shadow(400, 690, 180) + shell(400, 460, 1.4) + sparkle(620, 250, 0.8) + sparkle(190, 320, 0.6);
W['หิน'] = (i) => backdrop(i) + shadow(400, 670, 230) + rock(400, 540, 1.3) + rock(640, 610, 0.35, '#C2C7D6') + rock(170, 630, 0.3, '#9097AE');
W['เห็ด'] = (i) => backdrop(i) + shadow(400, 690, 170) + mushroom(400, 520, 1.5) + mushroom(600, 630, 0.5, C.orange) + g(line('M-20 0 L20 0 M0 -20 L0 20', 0), at(0, 0)) +
  path('M140 690 Q160 640 180 690 M620 690 Q640 650 660 690', 'none', 0) + line('M150 690 Q170 640 190 690 M610 700 Q630 660 650 700', 7, C.green);
W['หาง'] = (i) => backdrop(i) + shadow(380, 700, 170) +
  // cat seen from behind, big fluffy striped tail with a pointer
  g(tube('M60 60 Q220 40 230 -120 Q236 -230 150 -250', C.orange, 70) + line('M168 -60 L232 -70 M180 -150 L240 -140 M140 30 L190 -10', 10, C.orangeD) +
    path('M126 -270 Q190 -300 200 -236 Q160 -210 126 -270Z', '#fff') +
    ellipse(0, 60, 130, 110, C.orange) + line('M-60 0 L-40 30 M0 -20 L0 14 M60 0 L40 30', 8, C.orangeD) +
    ellipse(-60, 170, 34, 18, C.orange) + ellipse(60, 170, 34, 18, C.orange) +
    path('M-80 -110 L-96 -200 L-30 -140Z', C.orange) + path('M80 -110 L96 -200 L30 -140Z', C.orange) + ellipse(0, -90, 100, 84, C.orange), at(330, 520)) +
  g(path('M-30 -80 L30 -80 L30 0 L70 0 L0 80 L-70 0 L-30 0Z', C.red), at(640, 190, 0.8, -30)) + sparkle(170, 260, 0.7);
W['หก'] = (i) => backdrop(i) + numberBadge(290, 560, 1.6, '6', C.purple) + dice(560, 450, 1.1, 6);
W['หิว'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, kid({ arms: { l: [-30, -130], r: [30, -130] }, face: { mouth: 'sad' }, shirt: C.yellow })) +
  g(line('M-20 0 q10 -20 20 0 q10 20 20 0 q10 -20 20 0', 7, C.orange) + line('M-20 30 q10 -20 20 0 q10 20 20 0 q10 -20 20 0', 7, C.orange), at(470, 560)) +
  speech(600, 260, 0.9, g(tube('M-40 30 L20 -20', '#F5E6C8', 18) + circle(-50, 40, 14, '#F5E6C8') + circle(-34, 52, 14, '#F5E6C8') + ellipse(30, -30, 48, 40, C.orangeD) + shine(16, -44, 12, 8), at(0, -20)));
W['เห่า'] = (i) => backdrop(i) + shadow(360, 712, 170) + draw(360, 510, 1.3, dog(0, 0, 1, '#E8C39E', { bark: true })) + bark(610, 260, 0.9) + motion(560, 380, 0.8, 0);
W['หาว'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.4, kid({ arms: { l: [-130, -330], r: [130, -330] }, face: { eyes: 'closed', mouth: 'yawn' }, shirt: C.purple })) +
  text(610, 250, 1, 'z', C.purple, 8, 70) + text(660, 190, 1, 'Z', C.purple, 8, 90) + g(line('M0 0 q20 -20 40 0', 6, C.grayD), at(170, 330));

// ---- W2
W['ห้องน้ำ'] = (i) => backdrop(i) + shadow(400, 700, 180) + g(
  rect(-40, -300, 190, 170, 30, '#fff') + rect(-40, -300, 190, 30, 14, '#DDE4F0') + rect(100, -250, 30, 16, 6, C.grayD) +
  path('M-150 -120 L170 -120 Q170 40 40 60 L60 150 L-60 150 L-40 60 Q-150 40 -150 -120Z', '#fff') + ellipse(10, -120, 160, 36, '#fff') + ellipse(10, -120, 120, 22, '#AEE3FF') +
  shine(-110, -40, 14, 40, 20, 0.8), at(400, 540)) + sparkle(630, 260, 0.7, C.sky) + sparkle(190, 300, 0.6, C.sky);
W['หุบร่ม'] = (i) => backdrop(i) + umbrellaClosed(400, 400, 1.3) + g(line('M0 0 L-20 40 M40 -10 L20 30', 6, '#6EC1FF'), at(220, 300)) + g(line('M0 0 L-20 40 M40 -10 L20 30', 6, '#6EC1FF'), at(560, 250));
W['กุ้งแห้ง'] = (i) => backdrop(i) + shadow(400, 690, 220) + g(ellipse(0, 0, 230, 60, '#F3E3C3') + path('M-230 0 Q-220 80 0 90 Q220 80 230 0', '#E6C88F'), at(400, 620)) +
  shrimp(300, 560, 0.9, -10) + shrimp(480, 570, 0.85, 20) + shrimp(390, 480, 0.9, 5) + shrimp(270, 470, 0.6, -40) + shrimp(520, 470, 0.6, 40) + sparkle(640, 260, 0.6);
W['ห้าสิบ'] = (i) => backdrop(i) + numberBadge(400, 520, 1.5, '50', C.green) + coin(230, 640, 1) + coin(330, 670, 1) + coin(470, 670, 1) + coin(570, 640, 1);
W['หกสิบ'] = (i) => backdrop(i) + numberBadge(400, 520, 1.5, '60', C.orange) + star(220, 640, 34) + star(310, 670, 34, C.pink) + star(490, 670, 34, C.teal) + star(580, 640, 34, C.purple);
W['ทหาร'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, man({ shirt: '#5E8C3A', pants: '#4B7030', sleeve: '#5E8C3A', arms: { l: [-80, -100], r: [52, -268] }, face: { mouth: 'flat' },
  hat: (hy) => g(path('M-86 10 Q-86 -80 0 -84 Q86 -80 86 10Z', '#4B7030') + rect(-100, -6, 200, 24, 10, '#3E5E28') + star(0, -40, 18, C.yellow, 5), at(0, hy - 30)),
  torsoExtra: rect(-52, -130, 104, 16, 4, C.brown) + rect(-12, -134, 24, 24, 4, C.yellow, 5) })) + star(210, 260, 30) + sparkle(620, 250, 0.7);
W['หุ่นยนต์'] = (i) => backdrop(i) + shadow(400, 710, 170) + robot(400, 500, 1.1, { wave: true }) + sparkle(640, 250, 0.8) + sparkle(180, 560, 0.6);
W['นกฮูก'] = (i) => backdrop(i) + line('M130 650 L670 650', 20, C.brownD) + owl(400, 470, 1.25) + path('M100 180 Q140 150 170 180 Q140 200 100 180Z', 'none', 0) +
  g(path('M-40 -40 Q20 -60 30 0 Q10 40 -30 30 Q0 0 -40 -40Z', C.yellow, 6), at(620, 220)) + star(190, 230, 22) + star(230, 330, 14);
W['หุบเขา'] = (i) => backdrop(i, { dots: false }) + inCircle(
  path('M60 700 L260 280 L400 520 L520 300 L760 700Z', '#6FCF7F') + path('M260 280 L210 390 L250 370 L290 400 L320 350Z', '#fff', 7) + path('M520 300 L470 400 L510 380 L550 410 L580 360Z', '#fff', 7) +
  path('M300 800 Q380 560 400 520 Q420 560 500 800Z', '#5DBDFF') + circle(620, 200, 50, C.yellow) + cloudShape(200, 180, 0.35) );
W['หมาเห่า'] = (i) => backdrop(i) + shadow(380, 712, 170) + draw(380, 510, 1.3, dog(0, 0, 1, C.brownL, { bark: true, collar: true })) + bark(610, 250, 0.8) + bark(660, 380, 0.5);

// ---- W3
W['หอมหัวใหญ่'] = (i) => backdrop(i) + shadow(400, 700, 170) + onion(400, 470, 1.2) + g(path('M0 0 Q60 -60 120 0 Q60 30 0 0Z', '#E3B4FF'), at(560, 640)) + sparkle(620, 250, 0.7);
W['หกสิบห้า'] = (i) => backdrop(i) + numberBadge(400, 560, 1.7, '65', C.purple) + sparkle(200, 250, 0.8) + sparkle(610, 240, 0.9);
W['ห้าสิบห้า'] = (i) => backdrop(i) + numberBadge(400, 560, 1.7, '55', C.teal) + sparkle(200, 250, 0.8) + sparkle(610, 240, 0.9);
W['หูกระต่าย'] = (i) => backdrop(i) + g(path('M0 0 L-200 -110 Q-240 0 -200 110Z', C.red) + path('M0 0 L200 -110 Q240 0 200 110Z', C.red) +
  circle(-120, -30, 14, '#fff', 0) + circle(-150, 40, 12, '#fff', 0) + circle(130, -20, 14, '#fff', 0) + circle(150, 50, 12, '#fff', 0) +
  rect(-50, -56, 100, 112, 30, C.redD) + shine(-150, -50, 30, 12, 30), at(400, 420)) + sparkle(200, 600, 0.7) + sparkle(610, 610, 0.8);
W['เล่นหุ่นยนต์'] = (i) => backdrop(i) + shadow(270, 712, 120) + shadow(540, 700, 120) +
  draw(260, 712, 1.1, kid({ arms: { l: [-90, -120], r: [120, -190] }, face: { eyes: 'happy', mouth: 'big' } })) + robot(540, 560, 0.72, { wave: true }) + sparkle(420, 250, 0.7);
W['ห่อของขวัญ'] = (i) => backdrop(i) + shadow(400, 690, 220) + gift(400, 500, 1.25, C.teal, C.pink) + g(path('M0 0 L60 -10 L50 40Z', C.yellow, 6), at(170, 330)) + sparkle(640, 250, 0.9) + heart(640, 520, 0.7, C.pink);
W['ทำเงินหาย'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, kid({ arms: { l: [-120, -200], r: [120, -200] }, face: { mouth: 'sad', eyes: 'open' }, shirt: C.teal })) +
  coin(230, 560, 0.9) + coin(180, 470, 0.7) + coin(600, 520, 0.8) + text(600, 310, 1, '?', C.purple, 14, 130) + line('M560 420 L580 450 M620 420 L600 450', 6, C.grayD);
W['เห็นนกฮูก'] = (i) => backdrop(i) + shadow(250, 712, 110) + draw(240, 712, 1.05, kid({ arms: { l: [-90, -120], r: [120, -240] }, face: { look: 1, mouth: 'open' } })) +
  line('M430 380 L700 380', 18, C.brownD) + owl(560, 280, 0.72) + text(400, 250, 1, '!', C.orange, 12, 100);
W['หีบใส่เห็ด'] = (i) => backdrop(i) + shadow(400, 690, 230) + chest(400, 530, 1.1, mushroom(-90, -60, 0.6) + mushroom(40, -80, 0.7, C.orange) + mushroom(130, -50, 0.5)) + sparkle(640, 280, 0.7);
W['เห่าโฮ่งโฮ่ง'] = (i) => backdrop(i) + shadow(300, 712, 160) + draw(300, 520, 1.15, dog(0, 0, 1, '#fff', { earColor: C.brownL, bark: true })) +
  speech(560, 300, 1.2, g(text(0, 0, 1, 'โฮ่ง', C.orange, 8, 60) + text(0, 0, 1, '', INK, 0, 10), at(0, -6)));

Object.defineProperty(W, '_h', { value: { bark, shell, chest, shrimp }, enumerable: false });
module.exports = W;
