// Pictures for the meaningful ม words (W1-W3).
const L = require('./lib');
const { C, g, at, circle, ellipse, rect, path, line, tube, shine, shadow, text, sparkle, heart, star, motion, backdrop, face,
  kid, girl, mom, man, draw, cat, dog, pig, bear, horse, cloudShape, speech, bowl, glass } = L;

const W = {};

W['แม่'] = (i) => backdrop(i) + shadow(400, 712, 150) +
  draw(400, 712, 1.45, mom({ arms: { l: [-60, -150], r: [60, -150] }, face: { eyes: 'happy', mouth: 'big' } })) +
  heart(400, 520, 1.3, C.red) + heart(210, 250, 0.8, C.pink) + heart(600, 230, 0.9, C.pink);

W['ม้า'] = (i) => backdrop(i) + shadow(380, 690, 220) + draw(360, 510, 1.3, horse(0, 0, 1)) + sparkle(640, 250, 0.8);

W['หมี'] = (i) => backdrop(i) + shadow(400, 700, 170) + draw(400, 500, 1.4, bear(0, 0, 1)) + sparkle(620, 220, 0.8) + sparkle(190, 300, 0.6);

W['แมว'] = (i) => backdrop(i) + shadow(400, 700, 150) + draw(400, 470, 1.45, cat(0, 0, 1, C.orange));

W['หมู'] = (i) => backdrop(i) + shadow(400, 700, 170) + draw(400, 470, 1.5, pig(0, 0, 1));

W['เหม็น'] = (i) => backdrop(i) + shadow(400, 712, 150) +
  draw(470, 712, 1.35, kid({ arms: { l: [-12, -226], r: [100, -190] }, face: { eyes: 'x', mouth: 'wavy' }, shirt: C.teal })) +
  // stinky sock with green cloud
  g(path('M0 0 L40 0 L44 90 Q48 130 100 130 L104 170 Q20 180 4 130 Z', '#fff') + rect(-4, -10, 52, 30, 10, C.red) +
    '<path d="M-10 -40 q20 -30 0 -60 q-20 -30 0 -60" fill="none" stroke="#7BC950" stroke-width="12" stroke-linecap="round"/>' +
    '<path d="M40 -50 q20 -30 0 -60 q-20 -30 0 -60" fill="none" stroke="#7BC950" stroke-width="12" stroke-linecap="round"/>', at(160, 470)) +
  cloudShape(250, 250, 0.55, '#B8E986');

W['มีด'] = (i) => backdrop(i) + g(
  path('M-230 -40 L120 -40 L130 40 L-150 40 Q-230 30 -250 -30 Z', '#E4E9F2') + shine(-60, -14, 120, 10, 0, 0.8) +
  line('M-200 18 L110 18', 5, '#B7C0D3') +
  rect(120, -56, 250, 112, 40, C.red) + circle(190, 0, 12, '#fff', 5) + circle(290, 0, 12, '#fff', 5) + shine(230, -30, 60, 10, 0, 0.5),
  at(380, 420, 1, -30));

W['มือ'] = (i) => backdrop(i) + g(
  path('M-110 60 L-120 -120 Q-120 -150 -95 -150 Q-72 -150 -70 -120 L-64 -20 L-60 -200 Q-58 -232 -30 -232 Q-4 -232 -4 -200 L0 -30 L8 -220 Q10 -252 38 -250 Q64 -248 64 -216 L60 -20 L76 -180 Q80 -210 106 -206 Q130 -202 128 -172 L118 30 L170 -40 Q196 -70 222 -48 Q240 -30 222 -2 L130 150 Q90 210 10 214 Q-100 214 -110 60Z', C.skin) +
  line('M-40 120 Q0 150 50 120', 6) + shine(-80, -80, 10, 40, 0, 0.5), at(390, 480)) + sparkle(640, 230, 0.8) + sparkle(170, 280, 0.6);

W['เมฆ'] = (i) => backdrop(i) + cloudShape(400, 420, 1.55, '#fff') + g(face(90, { eyes: 'happy', mouth: 'smile' }), at(400, 420)) +
  g(line('M0 0 L0 50', 10, '#5AB4FF') + line('M60 0 L60 50', 10, '#5AB4FF') + line('M120 0 L120 50', 10, '#5AB4FF'), at(310, 560)) + sparkle(620, 220, 0.7);

W['หมา'] = (i) => backdrop(i) + shadow(400, 712, 170) + draw(400, 500, 1.4, dog(0, 0, 1, C.brownL, { collar: true }));

// ---- W2
W['ไม่มี'] = (i) => backdrop(i) + shadow(400, 712, 190) +
  draw(420, 712, 1.35, kid({ arms: { l: [-140, -170], r: [140, -170] }, face: { mouth: 'sad' }, shirt: C.yellow, pants: C.green })) +
  // empty open box
  g(path('M-80 0 L80 0 L80 90 L-80 90Z', C.brownL) + path('M-80 0 L-120 -40 L40 -40 L80 0Z', '#D9A066') + path('M-80 0 L-40 -30 L120 -30 L80 0Z', '#E8B67E'), at(170, 600)) +
  text(650, 330, 1, '?', C.purple, 14, 150);

W['แมวเหมียว'] = (i) => backdrop(i) + shadow(360, 712, 150) + draw(360, 480, 1.35, cat(0, 0, 1, '#FFB35C', { face: { mouth: 'open' } })) +
  g(path('M20 -40 L20 40 Q20 60 0 60 Q-20 60 -20 42 Q-20 24 2 24 L8 24 L8 -40 L60 -54 L60 20 Q60 40 40 40 Q20 40 20 22', C.purple, 6), at(610, 290)) + sparkle(560, 460, 0.6);

W['มาม่า'] = (i) => backdrop(i) + shadow(400, 660, 190) +
  bowl(400, 520, 1.25, C.red, g(ellipse(0, -10, 112, 20, '#FFE08A', 0) +
    line('M-80 -12 q20 -30 40 0 q20 30 40 0 q20 -30 40 0 q20 30 40 0', 8, C.yellowD) + line('M-60 -24 q20 -20 40 0 q20 20 40 0 q20 -20 40 0', 8, C.yellowD) +
    ellipse(-40, -30, 22, 14, '#fff') + circle(-40, -30, 8, C.yellow, 0) + path('M40 -40 L80 -30 L50 -14Z', C.green, 5), at(0, 0))) +
  tube('M470 250 L420 470', '#D9A066', 12) + tube('M520 260 L450 470', '#D9A066', 12) +
  line('M330 330 q-20 -30 0 -60 M390 320 q-20 -30 0 -60', 8, '#fff') ;

W['แม่ครัว'] = (i) => backdrop(i) + shadow(400, 712, 160) +
  draw(420, 712, 1.35, mom({ skirt: C.teal, shirt: '#fff', apron: C.red, arms: { l: [-110, -150], r: [80, -110] },
    hat: (hy) => g(rect(-60, -40, 120, 50, 12, '#fff') + circle(-40, -70, 36, '#fff') + circle(0, -86, 42, '#fff') + circle(40, -70, 36, '#fff'), at(0, hy - 90)) })) +
  g(ellipse(0, 0, 80, 22, C.grayD) + tube('M70 0 L170 -10', C.black, 14), at(190, 505)) + g(line('M-20 -40 q-10 -20 0 -40 M20 -40 q-10 -20 0 -40', 7, C.grayD), at(190, 470));

W['แม่ม้า'] = (i) => backdrop(i) + shadow(400, 700, 260) + draw(330, 520, 1.05, horse(0, 0, 1, C.brownL, C.brownD)) +
  draw(560, 600, 0.6, horse(0, 0, 1, '#E8C39E', C.brown)) + heart(470, 260, 0.9, C.pink);

W['มากมาย'] = (i) => {
  const cols = [C.red, C.yellow, C.blue, C.green, C.pink, C.purple, C.orange, C.teal];
  let s = backdrop(i) + shadow(400, 690, 250);
  const pos = [[250, 640], [350, 650], [450, 650], [550, 640], [300, 560], [400, 570], [500, 560], [350, 480], [450, 480], [400, 400], [200, 580], [600, 580], [250, 500], [550, 500]];
  pos.forEach(([x, y], k) => { s += circle(x, y, 52, cols[k % cols.length]) + shine(x - 18, y - 20, 12, 7); });
  return s + sparkle(620, 300, 0.9) + sparkle(190, 330, 0.7) + sparkle(400, 290, 0.6);
};

W['มังกร'] = (i) => backdrop(i) + g(
  tube('M-240 120 Q-160 20 -60 120 Q40 220 120 80', C.green, 90) +
  path('M-230 60 L-210 20 L-190 60 M-130 70 L-110 30 L-90 80 M-20 150 L0 110 L20 160', C.yellow, 6) +
  path('M100 20 Q120 -120 240 -80 Q300 -60 290 0 Q280 60 200 70 Q120 80 100 20Z', C.green) +
  path('M160 -100 L130 -170 L190 -120Z M220 -96 L230 -170 L250 -100Z', C.yellow) +
  ellipse(250, 10, 50, 32, '#9BE8A9') + circle(236, 0, 6, C.greenD, 0) + circle(264, 0, 6, C.greenD, 0) +
  `<ellipse cx="180" cy="-40" rx="12" ry="15" fill="${L.INK}"/><circle cx="184" cy="-45" r="5" fill="#fff"/>` +
  line('M280 40 Q300 60 290 90 M270 50 Q260 80 280 100', 6) + path('M180 -2 Q210 30 250 40', 'none', 7) +
  path('M300 -10 Q360 -40 380 -10 Q360 20 300 10Z', C.orange, 6) + path('M300 -4 Q340 -20 356 -6', C.yellow, 0),
  at(360, 400)) + sparkle(160, 230, 0.7) + sparkle(640, 640, 0.6);

W['มะม่วง'] = (i) => backdrop(i) + shadow(400, 690, 190) + g(
  path('M-150 40 Q-190 -150 20 -170 Q190 -170 180 20 Q170 170 20 180 Q-120 190 -150 40Z', C.yellow) +
  path('M20 -170 Q80 -150 120 -100', 'none', 0) + shine(-70, -80, 30, 60, 30) +
  line('M20 -166 L30 -210', 12, C.brownD) + path('M30 -200 Q100 -260 170 -210 Q100 -180 30 -200Z', C.green) + line('M40 -202 Q100 -214 150 -210', 5),
  at(400, 470));

W['รถเมล์'] = (i) => backdrop(i) + shadow(400, 670, 260) + g(
  rect(-260, -170, 520, 290, 50, C.red) + rect(-230, -140, 110, 90, 16, C.sky) + rect(-100, -140, 110, 90, 16, C.sky) + rect(30, -140, 110, 90, 16, C.sky) +
  rect(170, -140, 70, 170, 14, C.sky) + rect(-260, 20, 520, 26, 10, C.yellow) + circle(-160, 130, 50, C.black) + circle(160, 130, 50, C.black) +
  circle(-160, 130, 20, C.grayL, 6) + circle(160, 130, 20, C.grayL, 6) + ellipse(240, 70, 14, 20, C.yellow, 6) + shine(-200, -120, 16, 30, 20) + shine(-70, -120, 16, 30, 20),
  at(400, 520));

W['แมวน้ำ'] = (i) => backdrop(i) + shadow(400, 700, 210) + g(
  path('M-230 150 Q-260 40 -120 30 Q-60 -130 50 -130 Q150 -130 150 -30 Q150 80 60 150Z', '#8FA3BF') +
  path('M-230 150 L-300 110 L-290 180Z', '#8FA3BF') + path('M-60 100 Q-40 170 20 170 Q-10 120 -30 90Z', '#6F84A2') +
  ellipse(90, -20, 40, 28, '#C3D0E2') + ellipse(90, -34, 14, 10, L.INK, 0) + g(face(80, { mouth: 'none' }), at(60, -60)) +
  line('M56 -14 L10 -24 M56 -4 L10 0 M124 -14 L170 -24 M124 -4 L170 0', 4) + shine(-40, -40, 30, 14, -30) +
  circle(60, -196, 50, C.red) + line('M20 -196 Q60 -166 100 -196', 6, '#fff') + shine(40, -216, 12, 8),
  at(430, 520)) + sparkle(200, 250, 0.7);

// ---- W3
W['กินมาม่า'] = (i) => backdrop(i) + shadow(400, 712, 170) +
  draw(400, 712, 1.3, kid({ arms: { l: [-60, -110], r: [40, -205] }, face: { eyes: 'happy', mouth: 'chew' }, shirt: C.green })) +
  bowl(400, 610, 0.85, C.red, g(ellipse(0, -10, 112, 20, '#FFE08A', 0) + line('M-80 -12 q20 -30 40 0 q20 30 40 0 q20 -30 40 0 q20 30 40 0', 8, C.yellowD), at(0, 0))) +
  tube('M460 440 L400 560', '#D9A066', 9) + tube('M478 452 L416 566', '#D9A066', 9) + line('M405 470 q10 30 -4 60', 7, C.yellowD);

W['มะม่วงมัน'] = (i) => {
  const mango = (x, y, s, r) => g(path('M-150 40 Q-190 -150 20 -170 Q190 -170 180 20 Q170 170 20 180 Q-120 190 -150 40Z', '#7ED957') + shine(-70, -80, 30, 60, 30) +
    line('M20 -166 L30 -200', 12, C.brownD), at(x, y, s, r));
  return backdrop(i) + shadow(400, 690, 230) + mango(300, 480, 0.8, -15) + mango(510, 500, 0.8, 20) +
    g(path('M0 0 Q80 -80 160 0 Q80 40 0 0Z', '#FFF3B0') + path('M0 0 Q80 -80 160 0', 'none'), at(320, 640)) +
    path('M540 180 Q620 120 690 180 Q620 210 540 180Z', C.green);
};

W['ยกมือขวา'] = (i) => backdrop(i) + shadow(400, 712, 150) +
  draw(400, 712, 1.4, girl({ arms: { l: [-70, -380], r: [80, -100] }, face: { eyes: 'happy', mouth: 'big' } })) + motion(250, 170, 0.9, 200);

W['ดูแมวน้ำ'] = (i) => backdrop(i) + shadow(560, 712, 120) + shadow(260, 700, 170) +
  draw(580, 712, 1.1, kid({ arms: { l: [-110, -200], r: [80, -110] }, face: { look: -1, mouth: 'open' } })) +
  g(path('M-230 150 Q-260 40 -120 30 Q-60 -130 50 -130 Q150 -130 150 -30 Q150 80 60 150Z', '#8FA3BF') + path('M-230 150 L-300 110 L-290 180Z', '#8FA3BF') +
    ellipse(90, -20, 40, 28, '#C3D0E2') + ellipse(90, -34, 14, 10, L.INK, 0) + g(face(80, { mouth: 'none' }), at(60, -60)), at(280, 560, 0.72)) +
  text(420, 260, 1, '!', C.orange, 12, 120);

W['ไม่มีหมา'] = (i) => backdrop(i) + shadow(400, 680, 220) + g(
  path('M-170 -20 L0 -170 L170 -20 Z', C.red) + rect(-140, -30, 280, 220, 12, '#E0A96D') + path('M-70 190 L-70 60 Q0 -10 70 60 L70 190Z', '#4A3350') +
  rect(-80, -120, 160, 40, 10, '#fff') + text(0, -88, 1, 'DOG', C.brown, 0, 30), at(360, 470)) +
  g(ellipse(0, 0, 70, 20, C.blue) + path('M-70 0 L-56 40 L56 40 L70 0', C.blue) + ellipse(20, -2, 20, 8, '#D9A066', 0), at(610, 650)) +
  text(620, 320, 1, '?', C.purple, 14, 150);

W['มองแมวเหมียว'] = (i) => backdrop(i) + shadow(270, 712, 130) + shadow(560, 700, 120) +
  draw(270, 712, 1.2, girl({ arms: { l: [-80, -130], r: [40, -120] }, face: { look: 1, mouth: 'smile' } })) +
  draw(570, 560, 0.95, cat(0, 0, 1, '#FFB35C')) + heart(420, 250, 0.8, C.pink);

W['มอเตอร์ไซค์'] = (i) => backdrop(i) + shadow(400, 670, 250) + g(
  circle(-180, 110, 80, C.black) + circle(-180, 110, 34, C.grayL, 7) + circle(190, 110, 80, C.black) + circle(190, 110, 34, C.grayL, 7) +
  path('M-180 110 L-70 -10 L90 -10 L190 110', 'none', 12) +
  path('M-130 -40 Q-80 -110 20 -100 L110 -60 Q120 10 40 30 L-90 30 Q-150 20 -130 -40Z', C.red) + rect(-110, -130, 120, 36, 16, C.black) +
  tube('M100 -60 L150 -150', C.grayD, 14) + tube('M130 -150 L200 -160', C.black, 14) + circle(210, -110, 22, C.yellow) +
  path('M-20 30 L60 30 L40 80 L-20 80Z', C.grayD) + shine(-70, -60, 30, 12, -20),
  at(400, 530));

W['ม้ามอมแมม'] = (i) => backdrop(i) + shadow(380, 690, 220) +
  draw(360, 510, 1.3, horse(0, 0, 1, '#E8C39E', C.brown, { spots: ellipse(-60, 30, 36, 20, '#8B5A2B', 0) + ellipse(30, 60, 26, 16, '#8B5A2B', 0) + ellipse(150, -120, 18, 12, '#8B5A2B', 0) + ellipse(-90, 150, 30, 14, '#8B5A2B', 0) + ellipse(90, 20, 22, 30, '#8B5A2B', 0) })) +
  g(ellipse(0, 0, 60, 16, '#8B5A2B', 0) + ellipse(60, 10, 40, 12, '#8B5A2B', 0), at(200, 700)) + line('M560 280 q10 -20 0 -40 q-10 -20 0 -40', 7, '#8B5A2B') + line('M600 300 q10 -20 0 -40', 7, '#8B5A2B');

W['แม่มาหา'] = (i) => backdrop(i) + shadow(480, 712, 150) + shadow(250, 712, 110) +
  draw(500, 712, 1.3, mom({ arms: { l: [-150, -210], r: [140, -210] }, face: { eyes: 'happy', mouth: 'big' } })) +
  draw(240, 712, 0.95, kid({ arms: { l: [-130, -220], r: [120, -230] }, face: { eyes: 'happy', mouth: 'big' } })) + heart(370, 240, 1, C.red) + motion(700, 420, 0.8);

W['กี่โมงแล้ว'] = (i) => backdrop(i) + g(
  circle(0, 0, 200, C.teal) + circle(0, 0, 160, '#fff') +
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(k => { const a = k * Math.PI / 6; return `<circle cx="${(Math.sin(a) * 132).toFixed(1)}" cy="${(-Math.cos(a) * 132).toFixed(1)}" r="${k % 3 ? 7 : 12}" fill="${L.INK}"/>`; }).join('') +
  line('M0 0 L0 -100', 14) + line('M0 0 L70 30', 14) + circle(0, 0, 16, C.red, 6) +
  circle(-130, -200, 50, C.yellow) + circle(130, -200, 50, C.yellow) + line('M-110 170 L-140 220 M110 170 L140 220', 14) + shine(-90, -120, 20, 40, 30),
  at(360, 440)) + text(640, 360, 1, '?', C.purple, 14, 170);

module.exports = W;
