// Pictures for the แม่กน words (workbook pages 112-115, highlighted only).
// เครื่องบิน, กินข้าว and นอนหลับ already have pictures from other sounds.
const L = require('./lib');
const { C, INK, g, at, circle, ellipse, rect, path, line, tube, shine, shadow, text, sparkle, heart, star, motion, backdrop, face,
  kid, girl, mom, man, grandma, person, draw, cat, bird, cloudShape, speech, glass, bowl, table, numberBadge } = L;

const W = {};

// ---------------------------------------------------------------- props
const dad = (o = {}) => man(Object.assign({ shirt: C.blue, pants: C.brown }, o));
const teacher = (o = {}) => person(Object.assign({ hair: 'bun', hairColor: '#3B2323', shirt: C.teal, skirt: C.purple }, o));
const sun = (x, y, r = 60) => circle(x, y, r, C.yellow) + [0, 1, 2, 3, 4, 5, 6, 7].map(k => {
  const a = k * Math.PI / 4;
  return line(`M${(x + Math.cos(a) * (r + 16)).toFixed(0)} ${(y + Math.sin(a) * (r + 16)).toFixed(0)} L${(x + Math.cos(a) * (r + 40)).toFixed(0)} ${(y + Math.sin(a) * (r + 40)).toFixed(0)}`, 9, C.orange);
}).join('');
const sunset = () => `<circle cx="400" cy="410" r="330" fill="#FFD7B5"/>` + circle(630, 300, 58, C.orange);
const drop = (x, y, s, color = '#4DB8FF') => g(path('M0 -30 Q20 0 20 12 Q20 30 0 30 Q-20 30 -20 12 Q-20 0 0 -30Z', color, 5), at(x, y, s));
const rain = (xs) => xs.map(([a, b, s = 1]) => drop(a, b, s, '#6EC1FF')).join('');
const book = (x, y, s, cover = C.red) => g(
  path('M0 -10 Q-120 -60 -230 -20 L-230 140 Q-120 100 0 150Z', '#fff') + path('M0 -10 Q120 -60 230 -20 L230 140 Q120 100 0 150Z', '#fff') +
  path('M-230 140 Q-120 100 0 150 Q120 100 230 140 L230 162 Q120 122 0 172 Q-120 122 -230 162Z', cover) +
  line('M-190 20 Q-110 -6 -40 20 M-190 60 Q-110 34 -40 60 M40 20 Q110 -6 190 20 M40 60 Q110 34 190 60', 6, C.grayD), at(x, y, s));
const bed = (x, y, s) => g(rect(-260, 0, 520, 90, 24, C.brownL) + rect(-290, -130, 52, 240, 18, C.brown) + rect(238, -70, 52, 180, 18, C.brown) +
  rect(-236, -34, 480, 52, 20, '#fff'), at(x, y, s));
const pillow = (x, y, s) => g(rect(-90, -46, 180, 92, 28, '#fff') + line('M-50 -20 Q0 -6 50 -20', 5, C.grayL), at(x, y, s));
const house = (x, y, s) => g(path('M-220 -60 L0 -240 L220 -60Z', C.red) + rect(-180, -70, 360, 260, 16, C.cream) + rect(90, -200, 40, 90, 8, C.brown) +
  rect(-60, 30, 120, 160, 12, C.brownL) + circle(40, 110, 9, C.yellow, 5) +
  rect(-160, -30, 80, 70, 10, C.sky) + rect(80, -30, 80, 70, 10, C.sky) + line('M-120 -30 L-120 40 M120 -30 L120 40', 6), at(x, y, s));
const school = (x, y, s) => g(
  line('M0 -330 L0 -250', 8) + path('M4 -330 L120 -300 L4 -270Z', C.red, 5) +            // flag
  rect(-250, -250, 500, 300, 18, '#FFE9B8') + path('M-280 -250 L0 -330 L280 -250Z', '#E06A4E') +
  rect(-60, -120, 120, 170, 10, C.brown) + circle(32, -40, 9, C.yellow, 5) +
  [-180, -110, 110, 180].map(wx => rect(wx - 34, -200, 68, 72, 10, C.sky) + line(`M${wx} -200 L${wx} -128`, 5)).join('') +
  rect(-150, -72, 76, 46, 8, C.sky) + rect(74, -72, 76, 46, 8, C.sky) +
  rect(-120, -312, 240, 48, 10, '#fff') + text(0, -276, 1, 'โรงเรียน', INK, 0, 34), at(x, y, s));
const desk = (x, y, s, top = '') => g(rect(-200, -20, 400, 34, 12, C.brownL) + rect(-170, 14, 26, 150, 8, C.brown) + rect(144, 14, 26, 150, 8, C.brown) + g(top, at(0, -20)), at(x, y, s));
const plate = (x, y, s, food = '') => g(ellipse(0, 0, 150, 52, '#fff') + ellipse(0, -6, 108, 34, '#F3F6FF', 5) + g(food, at(0, -16)), at(x, y, s));
const spoon = (x, y, s, r = 0, color = C.grayD) => g(ellipse(0, -96, 36, 48, '#E9ECF5') + rect(-11, -62, 22, 150, 11, '#D8DDEA'), at(x, y, s, r));
const fork = (x, y, s, r = 0) => g(rect(-11, -62, 22, 150, 11, '#D8DDEA') + rect(-34, -120, 68, 62, 10, '#E9ECF5') +
  line('M-14 -116 L-14 -70 M14 -116 L14 -70', 7, INK), at(x, y, s, r));
const rice = () => path('M-82 6 Q-78 -62 0 -66 Q78 -62 82 6 Q0 26 -82 6Z', '#FFFDF4', 6) +
  line('M-46 -22 Q-30 -36 -14 -24 M10 -32 Q26 -44 42 -30 M-24 -6 Q-8 -20 8 -8', 5, '#E6E2D2');
const candle = (x, y, s, h = 150) => g(rect(-34, -h, 68, h, 10, '#FFF0C9') + line(`M0 -${h} L0 -${h + 26}`, 5) +
  path(`M0 -${h + 86} Q34 -${h + 36} 0 -${h + 22} Q-34 -${h + 36} 0 -${h + 86}Z`, C.orange) +
  path(`M0 -${h + 64} Q16 -${h + 34} 0 -${h + 26} Q-16 -${h + 34} 0 -${h + 64}Z`, C.yellow, 0) +
  line(`M-18 -${h - 30} L-18 -20`, 5, '#E8D6A4'), at(x, y, s));
const rock = (x, y, s, color = '#A9AFC4') => g(path('M-110 50 Q-130 -20 -60 -54 Q0 -86 70 -56 Q132 -26 110 46 Q50 70 -30 66Z', color) +
  line('M-54 -20 Q-10 -4 30 -30', 6, '#8A90A6') + shine(-50, -28, 24, 12), at(x, y, s));
const calendar = (x, y, s, day = 'จันทร์') => g(rect(-150, -170, 300, 330, 20, '#fff') + rect(-150, -170, 300, 80, 20, C.red) +
  rect(-150, -130, 300, 40, 0, C.red, 0) + line('M-150 -90 L150 -90', 5) + rect(-150, -170, 300, 330, 20, 'none') +
  line('M-80 -200 L-80 -150 M80 -200 L80 -150', 12, C.grayD) + text(0, 30, 1, day, INK, 0, 76) + text(0, 110, 1, 'MON', C.grayD, 0, 34), at(x, y, s));
const moon = (x, y, s) => g(path('M0 -90 A90 90 0 1 0 0 90 A70 70 0 1 1 0 -90Z', C.yellow) + circle(-34, -20, 10, C.yellowD, 0) + circle(-20, 34, 7, C.yellowD, 0), at(x, y, s));
const pencil = (x, y, s, r = 0) => g(rect(-20, -150, 40, 230, 8, C.yellow) + path('M-20 80 L20 80 L0 130Z', '#F3D3A8') + path('M-8 110 L8 110 L0 130Z', INK, 0) +
  rect(-20, -180, 40, 34, 8, C.pink) + line('M-20 -146 L20 -146', 5), at(x, y, s, r));
const paper = (x, y, s, r = 0) => g(rect(-110, -150, 220, 300, 12, '#fff') + line('M-70 -90 L70 -90 M-70 -40 L70 -40 M-70 10 L70 10 M-70 60 L20 60', 6, C.grayL), at(x, y, s, r));
const laptop = (x, y, s) => g(path('M-170 20 L-130 -150 L130 -150 L170 20Z', C.grayD) + rect(-120, -140, 240, 150, 8, '#CFE9FF') +
  rect(-200, 20, 400, 30, 12, C.gray) + line('M-50 34 L50 34', 7, C.grayD), at(x, y, s));
const flower = (x, y, s, petal = C.pink, open = true) => g(
  line('M0 0 L0 -150', 12, C.green) + path('M0 -70 Q-70 -100 -84 -44 Q-30 -34 0 -70Z', C.green, 6) +
  (open ? [0, 1, 2, 3, 4, 5].map(k => ellipse(Math.cos(k * Math.PI / 3) * 54, -150 + Math.sin(k * Math.PI / 3) * 54, 42, 34, petal, 6, k * 60)).join('') + circle(0, -150, 32, C.yellow)
        : ellipse(0, -164, 34, 54, petal) + line('M0 -210 L0 -120', 5, '#D98FB4')), at(x, y, s));
// Faces +x; flip:true turns it round to face -x without moving it.
const car = (x, y, s, color = C.blue, flip = false) => g(
  path('M-170 10 L-130 -80 Q-120 -100 -90 -100 L80 -100 Q110 -100 125 -74 L170 10Z', color) +
  rect(-180, 0, 360, 70, 26, color) + rect(-110, -84, 90, 70, 10, C.sky) + rect(10, -84, 100, 70, 10, C.sky) +
  circle(-100, 70, 44, C.black) + circle(-100, 70, 18, C.gray, 0) + circle(100, 70, 44, C.black) + circle(100, 70, 18, C.gray, 0) +
  circle(168, 18, 14, C.yellow, 5), `translate(${x} ${y}) scale(${flip ? -s : s} ${s})`);
const ball = (x, y, s, color = C.red) => g(circle(0, 0, 70, color) + path('M-70 0 Q0 -36 70 0 Q0 36 -70 0Z', '#fff', 5) + shine(-28, -30, 18, 10), at(x, y, s));
const blocks = (x, y, s) => g(rect(-120, -60, 110, 110, 14, C.red) + text(-65, 24, 1, 'ก', '#fff', 0, 64) +
  rect(0, -60, 110, 110, 14, C.blue) + text(55, 24, 1, 'ข', '#fff', 0, 64) +
  rect(-62, -172, 110, 110, 14, C.green) + text(-7, -88, 1, 'ค', '#fff', 0, 64), at(x, y, s));
const teddy = (x, y, s) => g(circle(-62, -96, 30, C.brownL) + circle(62, -96, 30, C.brownL) + circle(0, -70, 76, C.brownL) +
  ellipse(0, 70, 86, 76, C.brownL) + ellipse(-96, 40, 36, 30, C.brownL) + ellipse(96, 40, 36, 30, C.brownL) +
  ellipse(-46, 140, 34, 30, C.brownL) + ellipse(46, 140, 34, 30, C.brownL) + ellipse(0, -48, 36, 28, C.cream, 5) +
  g(face(70, { mouth: 'smile' }), at(0, -66)), at(x, y, s));
const scissors = (x, y, s, r = 0) => g(line('M-46 90 L40 -74 M46 90 L-40 -74', 16, C.grayD) +
  circle(-52, 112, 32, 'none', 14) + circle(52, 112, 32, 'none', 14) + circle(0, 20, 9, C.grayD), at(x, y, s, r));
const umbrella = (x, y, s) => g(path('M-180 0 Q-180 -160 0 -160 Q180 -160 180 0 Q120 -34 60 0 Q0 -34 -60 0 Q-120 -34 -180 0Z', C.red) +
  line('M0 -160 L0 150 Q0 190 -40 190', 12, C.brownD) + line('M0 -160 L0 -186', 6), at(x, y, s));
const noodles = () => ellipse(0, 0, 86, 40, '#FFF3DC') + line('M-60 -10 Q-30 -34 0 -12 Q30 -34 60 -10', 7, '#F0DEB6') + line('M-50 6 Q-20 -16 10 4 Q40 -16 62 2', 7, '#F0DEB6') +
  path('M-30 -30 Q0 -54 30 -30 Q0 -14 -30 -30Z', C.green, 5);
const ferris = (x, y, s) => g(line('M-120 180 L0 0 L120 180', 16, C.grayD) + circle(0, 0, 160, 'none', 14) +
  [0, 1, 2, 3, 4, 5].map(k => { const a = k * Math.PI / 3; const px = Math.cos(a) * 160, py = Math.sin(a) * 160;
    return line(`M0 0 L${px.toFixed(0)} ${py.toFixed(0)}`, 8, C.grayD) + rect(px - 26, py - 10, 52, 46, 10, [C.red, C.yellow, C.green, C.sky, C.pink, C.orange][k]); }).join('') +
  circle(0, 0, 22, C.yellow), at(x, y, s));
const board = (x, y, s, content = '') => g(rect(-210, -170, 420, 300, 16, '#2F6B4F') + rect(-210, -170, 420, 300, 16, 'none') +
  rect(-220, 120, 440, 26, 10, C.brownL) + g(content, at(0, -20)), at(x, y, s));

// ---------------------------------------------------------------- W1
W['กิน'] = (i) => backdrop(i) + shadow(400, 716, 240) +
  draw(392, 690, 1.12, kid({ legs: 'none', shirt: C.green, arms: { l: [-110, -150], r: [74, -250] }, face: { eyes: 'happy', mouth: 'chew' } })) +
  g(spoon(0, 0, 0.46, 160), at(474, 352)) +
  g(rect(-250, -24, 500, 38, 14, C.brownL) + rect(-210, 14, 26, 130, 8, C.brown) + rect(184, 14, 26, 130, 8, C.brown), at(400, 668)) +
  g(bowl(0, 0, 0.66, C.blue, g(rice(), at(0, -4))), at(400, 630)) + sparkle(650, 280, 0.8);
W['นอน'] = (i) => backdrop(i) + shadow(400, 700, 250) + bed(400, 560, 1) + pillow(210, 486, 1) +
  g(circle(0, 0, 76, C.skin) + path('M-76 -4 Q-80 -86 0 -82 Q80 -86 76 -4 Q56 -42 18 -38 Q-10 -56 -28 -36 Q-56 -34 -76 -4Z', C.hair) +
    g(face(76, { eyes: 'closed', mouth: 'smile' }), at(0, 10)), at(214, 466)) +
  g(path('M-60 0 Q100 -60 380 -20 L380 80 L-60 80Z', C.blue) + circle(40, 30, 14, '#fff', 0) + circle(160, 10, 14, '#fff', 0) + circle(280, 22, 14, '#fff', 0), at(300, 528)) +
  text(470, 318, 1, 'Z', C.purple, 10, 76) + text(560, 250, 1, 'Z', C.purple, 10, 96);
W['อ่าน'] = (i) => backdrop(i) + shadow(400, 712, 160) +
  draw(400, 712, 1.3, kid({ shirt: C.purple, arms: { l: [-120, -140], r: [120, -140] }, face: { eyes: 'closed', mouth: 'smile' } })) +
  book(400, 470, 0.78) + sparkle(640, 270, 0.8) + sparkle(170, 300, 0.6);
W['ฟัน'] = (i) => backdrop(i) + shadow(400, 690, 170) +
  g(path('M-150 -120 Q-150 -200 -60 -190 Q0 -184 60 -190 Q150 -200 150 -120 Q150 -10 90 110 Q60 170 30 110 Q10 60 0 60 Q-10 60 -30 110 Q-60 170 -90 110 Q-150 -10 -150 -120Z', '#fff') +
    shine(-74, -110, 34, 20, -20) + g(face(90, { eyes: 'happy', mouth: 'smile', blush: false }), at(0, -40)), at(380, 450, 1.25)) +
  g(rect(-26, -170, 52, 300, 16, C.sky) + path('M-44 -230 Q0 -270 44 -230 L44 -170 L-44 -170Z', '#fff') +
    line('M-26 -222 L-26 -170 M0 -234 L0 -170 M26 -222 L26 -170', 6, C.grayL), at(640, 560, 0.8, 18)) + sparkle(180, 260, 0.9);
W['เทียน'] = (i) => backdrop(i) + shadow(400, 700, 150) + candle(400, 700, 1.5, 150) +
  sparkle(560, 330, 0.8, C.orange) + sparkle(250, 300, 0.6, C.yellow) + sparkle(600, 470, 0.5, C.yellow);
W['ศูนย์'] = (i) => backdrop(i) + shadow(400, 700, 200) + numberBadge(330, 470, 2.1, '๐', C.purple) +
  g(rect(-74, -74, 148, 148, 24, '#fff') + text(0, 44, 1, '0', C.purple, 0, 116), at(596, 606, 0.86)) +
  sparkle(190, 270, 0.8) + sparkle(640, 300, 0.6);
W['ดิน'] = (i) => backdrop(i) + shadow(400, 712, 190) +
  g(path('M-230 60 Q-250 -60 -150 -70 Q0 -96 150 -70 Q250 -60 230 60Z', '#8B5A2B') +
    path('M-230 60 Q-250 -60 -150 -70 Q0 -96 150 -70 Q250 -60 230 60Z', 'none', 0) +
    ellipse(-120, -40, 22, 12, '#A3703C', 0) + ellipse(60, -56, 26, 14, '#A3703C', 0) + ellipse(150, -24, 18, 10, '#A3703C', 0), at(400, 640)) +
  g(line('M0 0 L0 -130', 13, C.green) + path('M0 -70 Q-90 -110 -100 -40 Q-30 -26 0 -70Z', C.green, 6) + path('M0 -104 Q84 -140 96 -74 Q30 -60 0 -104Z', C.lime, 6), at(400, 596)) +
  g(path('M-40 -10 Q0 -40 40 -10 Q0 10 -40 -10Z', '#6E4420', 5), at(250, 686, 0.9)) + sparkle(630, 300, 0.7);
W['บ้าน'] = (i) => backdrop(i) + shadow(400, 700, 230) + house(400, 500, 0.92) + sun(640, 220, 46) +
  g(path('M-70 40 Q-70 -40 0 -40 Q70 -40 70 40Z', C.green, 6) + line('M0 40 L0 -20', 8, C.brown), at(170, 660, 0.9));
W['ตื่น'] = (i) => backdrop(i) + shadow(400, 700, 240) + sun(650, 230, 48) + bed(400, 600, 0.9) +
  draw(350, 596, 1.0, kid({ legs: 'none', shirt: C.yellow, arms: { l: [-156, -306], r: [156, -306] }, face: { eyes: 'happy', mouth: 'yawn' } })) +
  g(circle(0, 0, 70, '#fff') + circle(0, 0, 70, 'none') + line('M0 -40 L0 0 L36 14', 8) + circle(-50, -50, 24, C.red) + circle(50, -50, 24, C.red) +
    line('M-96 -50 q-20 -24 -4 -44 M96 -50 q20 -24 4 -44', 7, C.orange), at(620, 540, 0.82)) + sparkle(190, 280, 0.8);
W['ยืน'] = (i) => backdrop(i) + shadow(400, 716, 150) +
  draw(400, 712, 1.42, kid({ shirt: C.sky, arms: { l: [-86, -84], r: [86, -84] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  line('M120 716 L680 716', 14, C.green) + sparkle(640, 280, 0.8) + sparkle(170, 320, 0.6);

// ---------------------------------------------------------------- W2
W['ฝนตก'] = (i) => backdrop(i) + cloudShape(300, 250, 1.1) + cloudShape(560, 300, 0.8) +
  rain([[230, 420], [330, 470, 0.9], [430, 420, 0.8], [520, 490, 0.9], [610, 430, 0.8], [280, 560, 0.8], [470, 580, 0.9], [600, 570, 0.7]]) +
  g(ellipse(0, 0, 190, 34, '#9BD8FF') + ellipse(-40, -6, 70, 14, '#C7EAFF', 0), at(400, 690)) +
  line('M250 690 Q290 660 330 690', 6, '#6EC1FF') + line('M480 694 Q520 664 560 694', 6, '#6EC1FF');
W['โรงเรียน'] = (i) => backdrop(i) + shadow(400, 690, 250) + school(400, 640, 0.86) + sun(640, 210, 44) +
  g(path('M-70 40 Q-70 -40 0 -40 Q70 -40 70 40Z', C.green, 6) + line('M0 40 L0 -20', 8, C.brown), at(160, 670, 0.8));
W['อ่านเขียน'] = (i) => backdrop(i) + shadow(400, 700, 240) + book(300, 480, 0.8, C.blue) +
  paper(580, 560, 0.72, 8) + g(pencil(0, 0, 0.62, 34), at(640, 460)) + sparkle(200, 270, 0.8) + motion(660, 640, 0.6, 20);
W['ช้อนส้อม'] = (i) => backdrop(i) + shadow(400, 706, 200) +
  g(spoon(0, 0, 1.05, -14), at(300, 470)) + g(fork(0, 0, 1.05, 14), at(510, 470)) + sparkle(640, 300, 0.8) + sparkle(180, 330, 0.6);
W['ทำงาน'] = (i) => backdrop(i) + shadow(400, 724, 270) +
  draw(400, 690, 1.0, dad({ legs: 'none', arms: { l: [-130, -150], r: [130, -150] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  g(rect(-270, -26, 540, 40, 14, C.brownL) + rect(-230, 14, 28, 140, 8, C.brown) + rect(202, 14, 28, 140, 8, C.brown), at(400, 660)) +
  laptop(380, 626, 0.92) + g(paper(0, 0, 0.44, -10), at(650, 600)) + sparkle(170, 270, 0.7);
W['วันจันทร์'] = (i) => backdrop(i) + shadow(400, 706, 180) + calendar(380, 520, 1.02) + moon(630, 280, 0.72) + sparkle(190, 300, 0.7);
W['ก้อนหิน'] = (i) => backdrop(i) + shadow(400, 700, 220) + rock(390, 560, 1.4) + rock(620, 640, 0.72, '#BFC5D6') + rock(190, 660, 0.52, '#8F96AC') + sparkle(620, 280, 0.7);

// ---------------------------------------------------------------- W3
W['ไปโรงเรียน'] = (i) => backdrop(i) + shadow(400, 712, 240) + school(540, 580, 0.56) + sun(170, 220, 42) +
  draw(300, 712, 1.1, kid({ shirt: C.red, arms: { l: [-110, -120], r: [96, -200] }, face: { eyes: 'happy', mouth: 'big' },
    extraBack: rect(-130, -180, 110, 130, 22, C.orange) })) +
  g(path('M0 0 L80 -34', 'none', 9) + path('M80 -34 L50 -38 L66 -16Z', INK, 0), at(400, 420)) + motion(170, 620, 0.6, 180);
W['อ่านหนังสือ'] = (i) => backdrop(i) + shadow(400, 716, 240) + desk(400, 620, 1.05) +
  draw(400, 660, 0.84, girl({ arms: { l: [-120, -130], r: [120, -130] }, face: { eyes: 'closed', mouth: 'smile' }, legs: 'none' })) +
  book(400, 560, 0.56) + g(rect(-60, -40, 120, 40, 8, C.green) + rect(-60, -80, 120, 40, 8, C.orange), at(640, 616, 0.8)) + sparkle(190, 290, 0.8);
W['จักรยาน'] = (i) => {
  const wheel = (x, y) => circle(x, y, 92, 'none', 17) + circle(x, y, 92, 'none', 7).replace(`stroke="${INK}"`, `stroke="${C.grayD}"`);
  const bike = wheel(-170, 124) + wheel(180, 124) +
    line('M-170 124 L-40 -50 L96 -50 L180 124 M-40 -50 L18 124 L96 -50 M18 124 L-170 124', 14, C.red) +
    line('M96 -50 L150 -150 L196 -150 M150 -150 L104 -150', 14, C.grayD) +
    rect(-78, -76, 96, 22, 11, C.black) +
    circle(18, 124, 20, C.grayD) + line('M18 124 L52 96 M18 124 L-16 150', 12, C.grayD) +
    rect(28, 88, 48, 16, 6, C.black) + rect(-40, 142, 48, 16, 6, C.black);
  return backdrop(i) + shadow(400, 700, 250) + g(bike, at(400, 500, 1.05)) + sparkle(650, 280, 0.8) + motion(140, 420, 0.7, 180);
};
W['เล่นของเล่น'] = (i) => backdrop(i) + shadow(400, 712, 250) +
  draw(300, 712, 1.08, kid({ shirt: C.pink, arms: { l: [-120, -110], r: [120, -110] }, face: { eyes: 'happy', mouth: 'big' } })) +
  teddy(590, 560, 0.62) + ball(560, 690, 0.7, C.sky) + blocks(190, 690, 0.52) + sparkle(640, 260, 0.8) + star(200, 280, 26, C.yellow);
W['ดอกไม้บาน'] = (i) => backdrop(i) + shadow(400, 706, 230) + sun(640, 220, 46) +
  g(path('M-280 40 Q0 -20 280 40 L280 90 L-280 90Z', C.green), at(400, 660)) +
  flower(400, 650, 1.05, C.pink) + flower(230, 676, 0.72, C.yellow) + flower(570, 672, 0.78, C.purple) +
  flower(660, 690, 0.5, C.red, false) + sparkle(250, 300, 0.7) + sparkle(520, 270, 0.6);
W['รถชนกัน'] = (i) => backdrop(i) + shadow(240, 700, 150) + shadow(570, 700, 150) +
  car(240, 620, 0.62, C.blue) + car(570, 620, 0.62, C.red, true) +
  star(406, 540, 96, C.yellow, 8) + star(406, 540, 56, C.orange, 6) +
  text(400, 300, 1, 'ชน!', C.red, 10, 80) + motion(120, 430, 0.7, 180) + motion(690, 430, 0.7);
W['เรียนวันจันทร์'] = (i) => backdrop(i) + shadow(400, 716, 250) + calendar(630, 420, 0.6) +
  desk(360, 620, 1, book(0, -56, 0.34)) +
  draw(360, 660, 0.82, kid({ shirt: C.teal, arms: { l: [-110, -130], r: [110, -130] }, face: { eyes: 'happy', mouth: 'smile' }, legs: 'none' })) +
  g(pencil(0, 0, 0.36, 28), at(540, 590)) + sparkle(180, 300, 0.7);
W['ตัดผมสั้น'] = (i) => backdrop(i) + shadow(400, 724, 210) +
  g(rect(-26, 40, 52, 170, 14, C.grayD) + rect(-110, 210, 220, 26, 10, C.grayD) + rect(-130, -10, 260, 54, 20, C.red), at(400, 530, 1)) +
  draw(400, 608, 1.12, person({ legs: 'none', hair: 'short', shirt: '#C9E8FF', sleeve: '#C9E8FF', hands: false,
    arms: { l: [-120, -120], r: [120, -120] }, face: { eyes: 'happy', mouth: 'smile' },
    torsoExtra: path('M-62 -190 Q0 -168 62 -190 L104 -82 L-104 -82Z', '#C9E8FF', 7) })) +
  g(scissors(0, 0, 0.7, -30), at(606, 236)) +
  line('M262 292 q12 24 -8 38 M226 240 q14 22 -6 36 M566 350 q12 22 -8 36', 7, C.hair) + sparkle(170, 220, 0.8);
W['อ่านการ์ตูน'] = (i) => backdrop(i) + shadow(400, 712, 210) +
  draw(400, 712, 1.26, kid({ shirt: C.orange, arms: { l: [-126, -150], r: [126, -150] }, face: { eyes: 'happy', mouth: 'big' } })) +
  g(rect(-230, -150, 460, 300, 14, '#fff') + line('M0 -150 L0 150', 7, C.grayL) + line('M-230 0 L230 0', 7, C.grayL) +
    circle(-116, -76, 40, C.yellow, 6) + path('M-170 70 L-120 10 L-70 70Z', C.sky, 6) +
    path('M60 -120 L180 -96 L120 -60 L190 -28 L74 -14 L104 -70Z', C.red, 6) + text(130, -56, 1, 'POW', '#fff', 0, 30) +
    circle(130, 86, 44, C.green, 6), at(400, 560, 0.56)) +
  sparkle(640, 270, 0.8) + star(170, 300, 26, C.pink);
W['ช้อนกับจาน'] = (i) => backdrop(i) + shadow(400, 706, 220) + plate(370, 620, 1.18, rice()) +
  g(spoon(0, 0, 0.92, 18), at(620, 500)) + sparkle(200, 300, 0.8) + sparkle(650, 660, 0.5);

// ---------------------------------------------------------------- sentences
W['นักเรียนต้องไปโรงเรียนทุกวัน'] = (i) => backdrop(i) + shadow(400, 716, 250) + school(470, 560, 0.5) + sun(160, 210, 40) +
  draw(230, 716, 0.92, kid({ shirt: C.red, arms: { l: [-100, -110], r: [90, -190] }, face: { eyes: 'happy', mouth: 'big' },
    extraBack: rect(-120, -170, 100, 120, 20, C.orange) })) +
  draw(370, 716, 0.86, girl({ arms: { l: [-96, -180], r: [96, -110] }, face: { eyes: 'happy', mouth: 'smile' },
    extraBack: rect(-120, -170, 100, 120, 20, C.purple) })) +
  g(calendar(0, 0, 0.3, 'ทุก'), at(652, 652)) + motion(140, 640, 0.5, 180);
W['อ่านหนังสือตอนเย็นกับคุณแม่ทุกวัน'] = (i) => sunset() + shadow(400, 716, 250) +
  draw(300, 716, 1.05, mom({ arms: { l: [-120, -140], r: [120, -150] }, face: { eyes: 'closed', mouth: 'smile' } })) +
  draw(500, 716, 0.76, kid({ shirt: C.yellow, arms: { l: [-110, -130], r: [110, -130] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  book(400, 580, 0.5) + heart(200, 300, 0.7, C.red) + heart(620, 340, 0.6, C.pink);
W['ทานขนมจีนกับคุณพ่อตอนเย็น'] = (i) => sunset() + shadow(400, 716, 260) +
  draw(250, 700, 1.0, dad({ arms: { l: [-110, -130], r: [96, -200] }, face: { eyes: 'happy', mouth: 'chew' } })) +
  draw(560, 700, 0.74, kid({ shirt: C.green, arms: { l: [-96, -200], r: [110, -130] }, face: { eyes: 'happy', mouth: 'chew' } })) +
  g(rect(-230, -22, 460, 34, 12, C.brownL) + rect(-190, 12, 24, 120, 8, C.brown) + rect(166, 12, 24, 120, 8, C.brown), at(400, 650)) +
  g(bowl(0, 0, 0.62, C.blue, g(noodles(), at(0, -6))), at(400, 606)) + sparkle(640, 250, 0.6);
W['เล่นคอมพิวเตอร์ทุกวันกับคุณครู'] = (i) => backdrop(i) + shadow(400, 716, 260) +
  desk(400, 640, 1.1, g(rect(-150, -170, 300, 180, 14, C.grayD) + rect(-130, -152, 260, 144, 8, '#CFE9FF') +
    circle(-50, -96, 22, C.yellow, 5) + path('M-90 -40 L-20 -100 L40 -50 L110 -104 L110 -40Z', C.green, 5) +
    rect(-40, 10, 80, 20, 6, C.gray) + rect(-110, 30, 220, 26, 8, C.gray), at(0, -10))) +
  draw(210, 700, 0.78, kid({ shirt: C.red, arms: { l: [-96, -120], r: [110, -120] }, face: { eyes: 'happy', mouth: 'big' } })) +
  draw(600, 700, 0.9, teacher({ arms: { l: [-110, -130], r: [96, -150] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  sparkle(180, 260, 0.7) + sparkle(650, 250, 0.6);
W['เรียนพิเศษกับคุณครูตอนเย็น'] = (i) => sunset() + shadow(400, 716, 250) +
  board(300, 420, 0.72, text(0, 20, 1, 'ก ข ค', '#fff', 0, 86)) +
  draw(560, 716, 0.96, teacher({ arms: { l: [-150, -250], r: [110, -140] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  draw(250, 716, 0.7, kid({ shirt: C.yellow, arms: { l: [-96, -120], r: [96, -120] }, face: { eyes: 'happy', mouth: 'smile' } })) +
  g(pencil(0, 0, 0.34, 20), at(160, 660)) + sparkle(640, 230, 0.6);
W['ฝนตกตอนเย็นหลังโรงเรียนเลิก'] = (i) => sunset() + shadow(400, 716, 240) + school(540, 580, 0.48) +
  cloudShape(260, 230, 0.9, '#C9CEDE') + cloudShape(520, 200, 0.7, '#C9CEDE') +
  rain([[200, 380, 0.8], [300, 440, 0.7], [420, 390, 0.7], [530, 330, 0.6], [620, 420, 0.6], [250, 540, 0.6]]) +
  umbrella(250, 600, 0.68) +
  draw(250, 716, 0.72, kid({ shirt: C.red, arms: { l: [-60, -200], r: [96, -120] }, face: { eyes: 'happy', mouth: 'smile' } }));
W['จานและช้อนเอาไว้กินข้าว'] = (i) => backdrop(i) + shadow(400, 706, 240) + plate(380, 600, 1.3, rice()) +
  g(spoon(0, 0, 1.0, 16), at(650, 500)) + g(fork(0, 0, 0.9, -16), at(140, 510)) +
  sparkle(210, 290, 0.7) + sparkle(600, 300, 0.6);
W['ที่โรงเรียนพานักเรียนไปเที่ยวที่สวนสนุก'] = (i) => backdrop(i) + shadow(400, 716, 260) + ferris(520, 400, 0.92) +
  g(rect(-210, -120, 420, 170, 26, C.yellow) + rect(-170, -96, 110, 74, 10, C.sky) + rect(-40, -96, 110, 74, 10, C.sky) + rect(90, -96, 90, 74, 10, C.sky) +
    circle(-120, 60, 40, C.black) + circle(-120, 60, 16, C.gray, 0) + circle(120, 60, 40, C.black) + circle(120, 60, 16, C.gray, 0) +
    rect(-230, -10, 460, 56, 18, C.yellowD, 0) + rect(-210, -120, 420, 170, 26, 'none'), at(260, 620, 0.66)) +
  draw(140, 716, 0.6, kid({ shirt: C.red, arms: { l: [-110, -250], r: [110, -250] }, face: { eyes: 'happy', mouth: 'big' } })) +
  star(190, 270, 28, C.yellow) + sparkle(660, 600, 0.6);
W['คุณครูที่เด็กรักเป็นคนอ่อนหวาน'] = (i) => backdrop(i) + shadow(400, 716, 250) +
  draw(460, 716, 1.08, teacher({ arms: { l: [-130, -160], r: [130, -160] }, face: { eyes: 'happy', mouth: 'big' } })) +
  draw(230, 716, 0.72, kid({ shirt: C.orange, arms: { l: [-96, -120], r: [110, -230] }, face: { eyes: 'happy', mouth: 'big' } })) +
  heart(190, 290, 0.9, C.red) + heart(620, 260, 1.05, C.pink) + heart(660, 430, 0.6, C.red) + sparkle(300, 240, 0.6);
W['เขานอนหลับฝันดีทุกวัน'] = (i) => backdrop(i) + shadow(400, 700, 250) + bed(400, 580, 0.98) + pillow(216, 506, 0.98) +
  g(circle(0, 0, 74, C.skin) + path('M-74 -4 Q-78 -84 0 -80 Q78 -84 74 -4 Q54 -40 18 -36 Q-10 -54 -28 -34 Q-54 -32 -74 -4Z', C.hair) +
    g(face(74, { eyes: 'closed', mouth: 'smile' }), at(0, 10)), at(220, 486)) +
  g(path('M-60 0 Q100 -60 380 -20 L380 80 L-60 80Z', C.purple) + circle(60, 26, 14, '#fff', 0) + circle(180, 6, 14, '#fff', 0) + circle(290, 20, 14, '#fff', 0), at(300, 548)) +
  g(cloudShape(0, 0, 0.62, '#fff', 6) + star(-40, -10, 22, C.yellow) + heart(30, 0, 0.4, C.pink) + sparkle(0, -36, 0.4), at(560, 280)) +
  text(420, 376, 1, 'Z', C.purple, 9, 56) + text(486, 318, 1, 'Z', C.purple, 9, 72);

module.exports = W;
