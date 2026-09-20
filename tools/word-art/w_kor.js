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
// Key drawn pointing LEFT: bit at x=0 so it can be placed on a keyhole.
const key = (x, y, s, r = 0) => g(circle(250, 0, 60, C.orange) + circle(250, 0, 24, '#fff') + rect(30, -18, 180, 36, 10, C.orange) +
  rect(30, -54, 20, 40, 6, C.orange) + rect(70, -50, 16, 34, 6, C.orange), at(x, y, s, r));
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
W['ขี่'] = (i) => {
  // One local frame for bike + rider (group placed at 400,540).
  // Contact points: GRIP (196,-150)  PEDAL_F (52,96)  PEDAL_B (-16,150)  SEAT (-40,-70)
  const GRIP = [196, -150], PF = [52, 96], PB = [-16, 150], SEAT = [-40, -70];
  const wheel = (x, y) => circle(x, y, 92, 'none', 17) + circle(x, y, 92, 'none', 7).replace(`stroke="${INK}"`, `stroke="${C.grayD}"`);
  const bike =
    wheel(-170, 124) + wheel(180, 124) +
    line('M-170 124 L-40 -50 L96 -50 L180 124 M-40 -50 L18 124 L96 -50 M18 124 L-170 124', 14, C.red) +
    line('M96 -50 L150 -150 L196 -150', 14, C.grayD) +           // handlebar ends exactly at GRIP
    rect(-78, -76, 96, 22, 11, C.black) +                        // saddle under SEAT
    circle(18, 124, 20, C.grayD) + line('M18 124 L52 96 M18 124 L-16 150', 12, C.grayD) +
    rect(PF[0] - 24, PF[1] - 8, 48, 16, 6, C.black) + rect(PB[0] - 24, PB[1] - 8, 48, 16, 6, C.black);
  const rider =
    tube(`M-24 -104 L36 -40 L${PF[0]} ${PF[1] - 14}`, C.blue, 32) +
    tube(`M-30 -104 L-58 -30 L${PB[0]} ${PB[1] - 14}`, C.blueD, 32) +
    g(ellipse(0, 0, 27, 15, C.black, 6), at(PF[0], PF[1] - 6)) + g(ellipse(0, 0, 27, 15, C.black, 6), at(PB[0], PB[1] - 6)) +
    path('M-76 -96 Q-104 -200 -12 -216 L26 -212 Q66 -204 56 -160 L28 -84 Q-24 -60 -76 -96Z', C.yellow) +
    tube(`M34 -196 L120 -178 L${GRIP[0] - 18} ${GRIP[1] - 10}`, C.skin, 22) +
    circle(GRIP[0] - 4, GRIP[1] - 6, 20, C.skin, 7) +
    g(circle(0, 0, 64, C.skin) + path('M-64 -6 Q-68 -78 0 -74 Q68 -78 64 -6 Q46 -40 12 -36 Q-12 -52 -32 -34 Q-50 -32 -64 -6Z', C.hair) +
      g(face(62, { eyes: 'happy', mouth: 'big', look: 1 }), at(0, 8)), at(0, -274));
  return backdrop(i) + shadow(400, 690, 250) + g(bike + rider, at(400, 540, 0.92)) + motion(120, 440, 0.9, 180);
};
W['แขน'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, kid({ shirt: C.red, sleeve: C.skin, arms: { l: [-150, -290], r: [150, -290] }, face: { eyes: 'happy', mouth: 'big' } })) + sparkle(170, 250, 0.8) + sparkle(630, 250, 0.8) + motion(660, 420, 0.7) + motion(140, 420, 0.7, 180);
W['ข้าว'] = (i) => backdrop(i) + shadow(400, 690, 190) + riceBowl(400, 540, 1.35, C.blue) + tube('M520 330 L450 470', '#D9A066', 10) + tube('M550 340 L470 474', '#D9A066', 10) +
  line('M330 330 q-20 -30 0 -60 M410 320 q-20 -30 0 -60', 8, '#fff');
W['ไข้'] = (i) => backdrop(i) + shadow(400, 712, 150) + draw(400, 712, 1.35, kid({ arms: { l: [-80, -100], r: [80, -100] }, face: { eyes: 'tired', mouth: 'wavy' }, shirt: C.sky,
  headExtra: (hy) => rect(-70, hy - 70, 140, 40, 14, '#fff') + g(rect(0, -10, 150, 20, 10, '#fff') + circle(150, 0, 18, C.red) + rect(0, -4, 110, 8, 4, C.red, 0), at(20, hy + 50, 1, 20)) })) +
  g(path('M-20 -50 q-20 30 0 50 q20 20 0 50', 'none', 8).replace(`stroke="${INK}"`, `stroke="${C.red}"`), at(210, 280)) + g(path('M-20 -50 q-20 30 0 50 q20 20 0 50', 'none', 8).replace(`stroke="${INK}"`, `stroke="${C.red}"`), at(600, 270));
W['เข็ม'] = (i) => backdrop(i) + g(path('M-14 -260 Q0 -290 14 -260 L10 230 L0 270 L-10 230Z', '#DDE3EE') + ellipse(0, -220, 6, 26, INK, 0) + shine(-6, 0, 3, 160, 0, 0.8), at(400, 410, 1, 30)) +
  line('M468 250 Q640 200 620 360 Q600 480 480 470 Q340 460 360 580 Q380 660 520 650', 10, C.red) + g(circle(0, 0, 60, C.pink) + line('M-50 -30 L50 30 M-56 0 L56 0 M-50 30 L50 -30', 5, '#E0559A'), at(560, 650));
W['เข่า'] = (i) => backdrop(i) + g(L.silhouette((fill, w) => {
    const st = w ? ` stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"` : '';
    return `<path d="M-84 -300 L92 -300 L104 -170 Q112 -120 86 -92
                     Q140 -54 138 30 Q136 104 104 150 L98 168
                     Q94 186 64 186 L34 186 Q10 186 12 166 L20 130
                     Q42 84 40 34 Q38 -12 -4 -34 Q-70 -68 -76 -160Z" fill="${fill}"${st}/>`;
  }, C.skin) +
  line('M-24 -104 Q44 -140 96 -104', 6, '#E3A377') +
  // ankle notch + shoe with the toes pointing right
  line('M16 140 Q56 150 96 140', 6, '#E3A377') + circle(22, 142, 9, '#E3A377', 0) +
  path('M6 168 Q-6 206 22 216 L150 216 Q186 216 184 194 Q182 172 140 166 L96 158 L92 168Z', C.black) +
  line('M30 190 L150 196', 5, '#55506E') +
  rect(-100, -340, 210, 80, 26, C.blue), at(380, 400, 0.92)) +
  g(circle(0, 0, 80, 'none', 11).replace(`stroke="${INK}"`, `stroke="${C.red}"`), at(404, 300)) +
  g(line('M0 0 L-86 -20', 9, C.red) + path('M-86 -20 L-52 -30 L-56 -2Z', C.red, 0), at(620, 300)) + sparkle(200, 620, 0.7);
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
W['กินข้าว'] = (i) => backdrop(i) + shadow(400, 712, 170) +
  draw(420, 712, 1.3, kid({ arms: { l: [-120, -190], r: [70, -170] }, face: { eyes: 'happy', mouth: 'chew' }, shirt: C.red })) +
  riceBowl(258, 470, 0.58, C.teal) +
  g(line('M0 0 L-58 -52', 13) + line('M0 0 L-58 -52', 6, C.grayL) + ellipse(-70, -62, 22, 15, C.grayL, 6, -40) + ellipse(-70, -64, 13, 8, '#fff', 0, -40), at(512, 490));
W['สีขาว'] = (i) => backdrop(i, { dots: false }) + `<circle cx="400" cy="410" r="330" fill="#CFE0F5"/>` + g(rect(-130, -80, 260, 220, 20, C.grayL) + ellipse(0, -80, 130, 34, '#fff') + rect(-150, -10, 300, 60, 10, C.blue, 6) + path('M-130 -80 Q-80 -150 -40 -80', 'none', 8), at(360, 520)) +
  brush(600, 330, 1, 30, '#fff') + g(path('M0 0 Q20 60 0 90 Q-20 60 0 0Z', '#fff', 6), at(250, 360));
W['เครื่องบิน'] = (i) => backdrop(i) + cloudShape(200, 600, 0.4) + cloudShape(620, 220, 0.35) + plane(400, 420, 1.05, -15) + motion(110, 470, 0.7, 170);
W['คุกกี้'] = (i) => backdrop(i) + shadow(400, 690, 220) + cookie(330, 520, 1.1, 10) + cookie(530, 430, 0.9, -20) + g(path('M-100 0 A100 100 0 0 1 60 -80 L20 -20 L60 20 L20 50 Z', '#E0A96D'), at(560, 620, 0.6)) + sparkle(200, 260, 0.7);
W['คุกเข่า'] = (i) => backdrop(i) + shadow(400, 700, 190) +
  draw(400, 700, 1.35, girl({ legs: 'kneel', arms: { l: [-70, -150], r: [70, -150] }, face: { eyes: 'happy', mouth: 'smile' } })) + sparkle(620, 260, 0.7) + sparkle(180, 300, 0.6);
W['เขาขายของ'] = (i) => backdrop(i) + shadow(400, 700, 250) +
  draw(400, 560, 0.95, man({ arms: { l: [-110, -150], r: [110, -150] }, face: { eyes: 'happy', mouth: 'big' }, shirt: C.orange,
    hat: (hy) => g(path('M-90 10 Q-80 -80 0 -84 Q80 -80 90 10Z', C.yellow) + path('M-160 10 Q0 -20 160 10 Q0 40 -160 10Z', C.yellow), at(0, hy - 40)) })) +
  stall(400, 620, 0.9, circle(-150, -80, 34, C.red) + circle(-100, -80, 34, C.orange) + ellipse(20, -80, 50, 34, C.yellow) + circle(130, -80, 36, C.green) + circle(170, -110, 30, C.green), false)
W['เขียนหนังสือ'] = (i) => backdrop(i) + shadow(400, 700, 260) +
  // stool, then the child, then the desk in front
  rect(196, 560, 150, 26, 10, C.brownD) + rect(210, 586, 20, 110, 6, '#8E5A2E') + rect(312, 586, 20, 110, 6, '#8E5A2E') +
  draw(300, 566, 1.0, girl({ legs: 'none', arms: { l: [10, -70], r: [150, -76] }, face: { eyes: 'closed', mouth: 'smile' } })) +
  table(450, 520, 430) +
  paper(430, 502, 0.42, -84) + line('M382 498 q22 -14 44 0 q22 14 44 0', 5, C.blue) +
  g(rect(-9, -110, 18, 130, 7, C.yellow) + path('M-9 20 L9 20 L0 48Z', '#F3D9B1', 5) + rect(-9, -126, 18, 20, 5, C.pink, 5), at(468, 452, 1, 26)) + sparkle(630, 250, 0.6);
W['หญ้าสีเขียว'] = (i) => backdrop(i, { dots: false }) + inCircle(
  `<rect x="0" y="480" width="800" height="400" fill="${C.green}"/>` + line('M0 480 L800 480', 9) +
  Array.from({ length: 22 }, (_, k) => { const x = 60 + k * 32, h = 70 + (k * 37) % 60; return path(`M${x - 18} 490 Q${x} ${490 - h} ${x + 4} ${480 - h} Q${x + 8} ${490 - h * 0.6} ${x + 18} 490Z`, k % 2 ? '#56D67C' : C.greenD, 6); }).join('') +
  circle(620, 220, 56, C.yellow) + cloudShape(230, 220, 0.35) + g(circle(0, 0, 18, C.yellow, 5) + [0, 1, 2, 3, 4].map(k => circle((Math.cos(k * 1.256) * 26).toFixed(1), (Math.sin(k * 1.256) * 26).toFixed(1), 14, '#fff', 5)).join('') + circle(0, 0, 14, C.yellow, 5), at(520, 420)));
W['ขายไข่ไก่'] = (i) => backdrop(i) + shadow(400, 700, 240) + table(400, 560, 480) + basketEggs(400, 500, 1.1) +
  g(rect(-90, -60, 180, 90, 12, '#fff') + text(0, 6, 1, '฿5', C.red, 0, 52), at(400, 250)) + line('M400 310 L400 380', 7) + egg(620, 360, 0.35);
W['ไขกุญแจ'] = (i) => backdrop(i) + shadow(380, 690, 150) + padlock(380, 500, 1.15) +
  // key comes in at an angle, its bit ending on the keyhole (380,523)
  g(key(0, 0, 0.78, -18), at(392, 528)) +
  // the hole drawn again over the tip: the key reads as going into it
  g(circle(0, 0, 25, INK, 0) + rect(-9, 0, 18, 64, 6, INK, 0), at(380, 520)) +
  g(path('M-22 -6 A24 24 0 0 1 22 -6 L14 14 L-14 14Z', '#C99A00', 0), at(380, 512)) +
  motion(210, 380, 0.7, 200) + sparkle(630, 300, 0.7);
W['ขึ้นข้างบน'] = (i) => backdrop(i, { dots: false }) + inCircle(stairs(400, 560, 1.1)) + draw(312, 560, 0.7, kid({ arms: { l: [-80, -110], r: [120, -230] }, face: { eyes: 'happy', mouth: 'big' } })) + arrowUp(620, 250, 0.7);
W['กินคุกกี้'] = (i) => backdrop(i) + shadow(400, 712, 150) +
  draw(400, 712, 1.3, girl({ arms: { l: [-110, -130], r: [46, -216] }, face: { eyes: 'happy', mouth: 'chew' } })) +
  g(path('M-120 0 A120 120 0 1 1 30 -108 L-10 -40 L34 -14 L6 40Z', '#E0A96D') + [[-60, -30], [-20, 30], [-70, 40], [10, -60]].map(([a, b]) => ellipse(a, b, 16, 12, '#5A3520', 0)).join(''), at(492, 430, 0.42)) +
  cookie(230, 620, 0.42) + g(circle(0, 0, 7, '#E0A96D', 0) + circle(18, 16, 5, '#E0A96D', 0), at(470, 520));
W['กินไข่เค็ม'] = (i) => backdrop(i) + shadow(400, 690, 220) + g(ellipse(0, 0, 250, 70, '#fff') + ellipse(0, -6, 210, 52, '#EAF4FF', 0), at(400, 600)) +
  eggHalf(310, 560, 1, '#FF8C1A') + eggHalf(500, 570, 0.9, '#FF8C1A') + tube('M600 300 L520 490', C.grayL, 12) + ellipse(510, 510, 28, 20, C.grayL) + sparkle(200, 280, 0.7);
W['กระดาษขาว'] = (i) => backdrop(i, { dots: false }) + `<circle cx="400" cy="410" r="330" fill="#D6E4F7"/>` + paper(430, 430, 1.2, 8) + paper(340, 450, 1.1, -8).replace('#fff', '#F7F9FF') + paper(400, 430, 1.2, 0) + sparkle(620, 230, 0.7, '#fff');
W['ขนมปัง'] = (i) => backdrop(i) + shadow(400, 680, 230) + bread(360, 480, 1.1) + sparkle(620, 250, 0.7);

Object.defineProperty(W, '_h', { value: { egg, cookie, paper, stall, eggHalf, riceBowl, hen, basketEggs, brush }, enumerable: false });
module.exports = W;
