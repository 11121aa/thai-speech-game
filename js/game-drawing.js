// ============================================================
//  DRAWING GAME — Phaser 3  (landscape 800×500)
//
//  Trace the picture. One word per round: its illustration sits
//  faint in the middle, its OUTLINE is drawn as a dashed guide,
//  and the child drags a finger all the way round it. Finish the
//  loop and the picture fills in with colour, then the usual
//  pronunciation pop-up opens for that word.
//
//  Where the outline comes from:
//    The word's own picture, traced by its INK. Every illustration
//    in this project is a flat-vector drawing with a dark outline,
//    sitting on a pale coloured disc -- so the shape of the opaque
//    pixels is just that disc, the same circle for every word. What
//    makes each picture itself is the dark line work, so the PNG is
//    redrawn small, its dark pixels are kept, the largest connected
//    run of them is found (the subject's own outline), and that is
//    sampled into a silhouette. The child traces round the fish, not
//    round the circle behind it. Pictures with no usable line work
//    fall back to a simple shape (circle, star, heart...).
//
//  Deliberately forgiving: straying off the line never punishes,
//  it just stops the trail advancing until the finger comes back.
//  Lifting mid-way keeps your progress.
//
//  SECTIONS
//    [TUNE]     Sizes, tolerance, how much counts as finished
//    [OUTLINE]  Picture → traceable path
//    [SHAPES]   The fallback shapes
//    [SCENE]    Phaser scene: rounds, drawing, input
// ============================================================

// createDrawingGame is called with:
//   words     = array of { word, emoji, reading, id, image_url, ... }
//   callbacks = { onPoints, onPractice, onFinish }
function createDrawingGame(words, callbacks) {

  var W = 800, H = 500;

  // ── [TUNE] ───────────────────────────────────────────────────
  var PATH_PTS   = 150;  // points the traced path is resampled to
  var TOL        = 52;   // how far off the line a finger may stray (px)
  var LOOKAHEAD  = 14;   // how many points ahead one move may jump
  var DONE_FRAC  = 0.93; // how much of the loop counts as finished
  var ART_BOX    = 320;  // how big the TRACED SHAPE should be on screen
  var PIC_MAX    = 470;  // ...but never blow the whole picture up past this
  var ART_CX     = W / 2, ART_CY = 274;
  var DASH_ON    = 11, DASH_OFF = 10;  // the guide's dashes, in pixels

  var C = {
    bg1: 0xfdf6e8, bg2: 0xf6e7cd,
    guide: 0xb9a68c, trail: 0x2ec4b6, trailGlow: 0x8ff0e6,
    head: 0xffffff, start: 0x27ae60, ink: '#2b2438'
  };

  // ── [OUTLINE] Picture → traceable path ───────────────────────

  // The picture is traced at this resolution: small enough that
  // walking the boundary is instant, big enough that an 800px
  // drawing's outline stroke survives as a connected line.
  var GRID = 220;
  var INK  = 110;   // a pixel this dark or darker counts as line work

  // Reads a texture's pixels into a 0/1 mask of "is there a dark
  // line here", at GRID or smaller. Returns null if the image can't
  // be read (a cross-origin upload taints the canvas, and
  // getImageData throws -- which must not take the round down).
  function maskOf(scene, key) {
    var src;
    try { src = scene.textures.get(key).getSourceImage(); } catch (e) { return null; }
    if (!src || !src.width || !src.height) return null;

    var sc = Math.min(GRID / src.width, GRID / src.height, 1);
    var w  = Math.max(8, Math.round(src.width  * sc));
    var h  = Math.max(8, Math.round(src.height * sc));
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(src, 0, 0, w, h);

    var px;
    try { px = cx.getImageData(0, 0, w, h).data; } catch (e) { return null; }

    // Opaque AND dark: the drawing's own outline, not the disc it
    // sits on. Rec. 601 luma, which keeps a saturated mid-tone (a
    // red apple body) out of the mask while catching near-blacks.
    var m = new Uint8Array(w * h);
    for (var i = 0; i < w * h; i++) {
      if (px[i * 4 + 3] <= 80) continue;
      var lum = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
      if (lum < INK) m[i] = 1;
    }
    // One dilation pass. Shrinking an 800px drawing to 220 thins a
    // 6px stroke to under a pixel, and antialiasing breaks it into
    // dashes; without this the "largest blob" is a fragment of an
    // outline rather than the whole closed one.
    var d = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var k = y * w + x;
        if (m[k]) { d[k] = 1; continue; }
        if ((x > 0 && m[k - 1]) || (x < w - 1 && m[k + 1]) ||
            (y > 0 && m[k - w]) || (y < h - 1 && m[k + w])) d[k] = 1;
      }
    }
    return { m: d, w: w, h: h };
  }

  // Largest connected blob, flood-filled four-ways. A picture often
  // has several pieces (an apple and its leaf, a face and its hat);
  // tracing the first one found would sometimes trace the leaf.
  function biggestBlob(mask) {
    var w = mask.w, h = mask.h, m = mask.m;
    var lab = new Int32Array(w * h), cur = 0, best = 0, bestN = 0;
    var stack = [];
    for (var s = 0; s < w * h; s++) {
      if (!m[s] || lab[s]) continue;
      cur++; var n = 0;
      stack.push(s); lab[s] = cur;
      while (stack.length) {
        var p = stack.pop(); n++;
        var x = p % w, y = (p - x) / w;
        if (x > 0     && m[p - 1] && !lab[p - 1]) { lab[p - 1] = cur; stack.push(p - 1); }
        if (x < w - 1 && m[p + 1] && !lab[p + 1]) { lab[p + 1] = cur; stack.push(p + 1); }
        if (y > 0     && m[p - w] && !lab[p - w]) { lab[p - w] = cur; stack.push(p - w); }
        if (y < h - 1 && m[p + w] && !lab[p + w]) { lab[p + w] = cur; stack.push(p + w); }
      }
      if (n > bestN) { bestN = n; best = cur; }
    }
    if (!best) return null;
    var out = new Uint8Array(w * h);
    for (var k = 0; k < w * h; k++) out[k] = lab[k] === best ? 1 : 0;
    return { m: out, w: w, h: h, n: bestN };
  }

  // The blob's silhouette, sampled as one ray per angle from its
  // centre: for each of RAYS directions, the furthest pixel of the
  // blob along that ray. It is not a true contour -- a deep notch
  // gets bridged -- and that is the point. A real boundary walk
  // produces loops that double back on themselves, and a line that
  // crosses itself is impossible to trace with one finger and
  // impossible to score "how far round are you" against. This
  // always returns one simple closed loop, in order.
  var RAYS = 180;
  function radialOutline(blob) {
    var w = blob.w, h = blob.h, m = blob.m;

    var sx = 0, sy = 0, n = 0;
    for (var k = 0; k < w * h; k++) {
      if (!m[k]) continue;
      sx += k % w; sy += (k - k % w) / w; n++;
    }
    if (!n) return null;
    var cx = sx / n, cy = sy / n;

    var maxR = Math.hypot(w, h), pts = [], lastR = 0;
    for (var i = 0; i < RAYS; i++) {
      var a = (i / RAYS) * Math.PI * 2;
      var ca = Math.cos(a), sa = Math.sin(a), hit = 0;
      for (var r = 1; r <= maxR; r += 0.7) {
        var x = Math.round(cx + ca * r), y = Math.round(cy + sa * r);
        if (x < 0 || y < 0 || x >= w || y >= h) break;
        if (m[y * w + x]) hit = r;
      }
      // A ray that leaves the picture without touching the blob (the
      // centre can fall in a hollow) keeps the neighbouring radius,
      // so the loop stays closed instead of collapsing to the centre.
      if (!hit) hit = lastR;
      lastR = hit;
      pts.push({ x: cx + ca * hit, y: cy + sa * hit });
    }
    return lastR > 2 ? pts : null;
  }

  // Even spacing along the contour: the raw walk has one point per
  // pixel step, which is both far too many and unevenly spaced
  // (diagonals are longer). Progress and tolerance both assume the
  // points are evenly spread, so this is not cosmetic.
  function resample(pts, n) {
    var total = 0, segs = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      var d = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push(d); total += d;
    }
    if (!total) return null;
    var step = total / n, out = [], want = 0, acc = 0, j = 0;
    while (out.length < n && j < pts.length) {
      var a2 = pts[j], b2 = pts[(j + 1) % pts.length], d2 = segs[j];
      while (d2 > 0 && want <= acc + d2 && out.length < n) {
        var t = (want - acc) / d2;
        out.push({ x: a2.x + (b2.x - a2.x) * t, y: a2.y + (b2.y - a2.y) * t });
        want += step;
      }
      acc += d2; j++;
    }
    return out.length >= n * 0.8 ? out : null;
  }

  // Rounds off the pixel staircase. Two light passes: enough to make
  // the line pleasant to follow, not so much that a star loses its
  // points.
  function smooth(pts, passes) {
    var p = pts;
    for (var s = 0; s < (passes || 2); s++) {
      var out = [];
      for (var i = 0; i < p.length; i++) {
        var a = p[(i - 1 + p.length) % p.length], b = p[i], c = p[(i + 1) % p.length];
        out.push({ x: (a.x + 2 * b.x + c.x) / 4, y: (a.y + 2 * b.y + c.y) / 4 });
      }
      p = out;
    }
    return p;
  }

  // Image pixels → 0..1 of the image's own width/height. The scene
  // then places the path with exactly the picture's own scale and
  // centre, which is what keeps the dashed line ON the drawing
  // instead of near it.
  function normalise(pts, w, h) {
    return pts.map(function (p) { return { x: p.x / w, y: p.y / h }; });
  }

  // Scales a path into the art box and centres it there.
  function fitPath(pts, box, cx, cy) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach(function (p) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    });
    var w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
    var s = Math.min(box / w, box / h);
    return pts.map(function (p) {
      return { x: cx + (p.x - minX - w / 2) * s, y: cy + (p.y - minY - h / 2) * s };
    });
  }

  // The whole pipeline, with every failure falling through to null
  // so the caller can use a shape instead.
  function outlineFromTexture(scene, key) {
    var mask = maskOf(scene, key);          if (!mask) return null;
    var blob = biggestBlob(mask);           if (!blob) return null;

    // A line drawing's ink is a few per cent of the frame. Far below
    // that is a speck (an eye, a bubble); far above it is a dark
    // photo, where "the largest dark blob" means nothing.
    var frac = blob.n / (blob.w * blob.h);
    if (frac < 0.004 || frac > 0.55) return null;

    var walk = radialOutline(blob);         if (!walk) return null;

    // Must actually be a picture-sized shape. A tiny closed contour
    // traced up to 300px on screen is a blown-up smudge.
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    walk.forEach(function (p) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    });
    if ((maxX - minX) < mask.w * 0.25 && (maxY - minY) < mask.h * 0.25) return null;

    var even = resample(walk, PATH_PTS);    if (!even) return null;
    return normalise(smooth(even, 3), mask.w, mask.h);
  }

  // ── [SHAPES] Fallbacks, for words with no usable picture ─────
  function shapePath(kind, n) {
    var pts = [], i, t;
    for (i = 0; i < n; i++) {
      t = (i / n) * Math.PI * 2;
      var r = 1;
      if (kind === 'star')   r = (Math.cos(5 * t) > 0) ? 1 : 0.46;
      if (kind === 'flower') r = 0.72 + 0.28 * Math.cos(6 * t);
      if (kind === 'heart') {
        pts.push({ x: 16 * Math.pow(Math.sin(t), 3),
                   y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t)
                        - 2 * Math.cos(3 * t) - Math.cos(4 * t)) });
        continue;
      }
      if (kind === 'square') {
        // a rounded square, as four arcs -- a hard corner is hard to
        // trace and reads as a mistake when the trail stalls on it
        r = 1 / Math.max(Math.abs(Math.cos(t)), Math.abs(Math.sin(t)));
        r = Math.min(r, 1.32);
      }
      pts.push({ x: Math.cos(t) * r, y: Math.sin(t) * r });
    }
    if (kind === 'star') pts = smooth(pts, 1);
    return fitPath(pts, ART_BOX, ART_CX, ART_CY);
  }
  var SHAPES = ['circle', 'star', 'heart', 'square', 'flower'];

  // ── [SCENE] ──────────────────────────────────────────────────
  var DrawScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function DrawScene() { Phaser.Scene.call(this, { key: 'DrawScene' }); },

    preload: function () {
      this.load.audio('dw_step', 'soundeffect/CoinPickup.mp3');
      this.load.audio('dw_done', 'soundeffect/LevelUp.mp3');
      this.load.audio('dw_all',  'soundeffect/CongratSFX.mp3');

      // Same picture lookup every other game uses: the word's own
      // upload first (keyed by id), then the generated-illustration
      // manifest (keyed by text), then nothing.
      words.forEach(function (w) {
        if (w.image_url) {
          this.load.image('img_' + w.id, w.image_url);
        } else {
          var url = Illustrations.get(w.word);
          if (url) this.load.image('ill_' + w.word, url);
        }
      }, this);
    },

    create: function () {
      var self = this;
      var ca = this.cache.audio;
      this.sfxStep = ca.exists('dw_step') ? this.sound.add('dw_step', { volume: 0.4 }) : null;
      this.sfxDone = ca.exists('dw_done') ? this.sound.add('dw_done', { volume: 0.7 }) : null;
      this.sfxAll  = ca.exists('dw_all')  ? this.sound.add('dw_all',  { volume: 0.8 }) : null;

      // background: a warm paper wash, so the picture and the line
      // both read against it
      var bg = this.add.graphics();
      for (var b = 0; b < 24; b++) {
        var t = b / 24;
        var r = Math.round(Phaser.Math.Linear(253, 246, t));
        var g = Math.round(Phaser.Math.Linear(246, 231, t));
        var bl = Math.round(Phaser.Math.Linear(232, 205, t));
        bg.fillStyle(Phaser.Display.Color.GetColor(r, g, bl));
        bg.fillRect(0, b * (H / 24), W, H / 24 + 1);
      }

      this.picture  = null;                 // the faint/filled artwork
      this.gGuide   = this.add.graphics().setDepth(2);
      this.gTrail   = this.add.graphics().setDepth(3);
      this.idx      = 0;                    // which word we are on
      this.path     = null;
      this.prog     = 0;                    // furthest point index reached
      this.tracing  = false;
      this.locked   = true;                 // true while a pop-up is open

      this.wordText = this.add.text(W / 2, 34, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '30px', fontStyle: 'bold',
        color: C.ink
      }).setOrigin(0.5).setDepth(6);

      this.subText = this.add.text(W / 2, 66, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '15px', color: '#7a6a58'
      }).setOrigin(0.5).setDepth(6);

      this.countText = this.add.text(W - 16, 20, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '16px', fontStyle: 'bold',
        color: '#7a6a58'
      }).setOrigin(1, 0).setDepth(6);

      this.input.on('pointerdown', function (p) { self.onDown(p.x, p.y); });
      this.input.on('pointermove', function (p) { if (p.isDown) self.onMove(p.x, p.y); });
      this.input.on('pointerup',   function () { self.tracing = false; });
      this.input.on('pointerupoutside', function () { self.tracing = false; });

      this.nextRound();

      // The control preview: this game is nothing but one gesture, so
      // showing it before the first round is the whole tutorial.
      if (window.GestureHint) GestureHint.gate(this, 'drawing');
    },

    // ── A round ────────────────────────────────────────────────
    nextRound: function () {
      var self = this;
      if (this.idx >= words.length) return this.finish();

      var w = words[this.idx];
      this.word = w;

      // the picture, if this word has one that loaded
      var imgKey = 'img_' + w.id, illKey = 'ill_' + w.word;
      var key = this.textures.exists(imgKey) ? imgKey
              : this.textures.exists(illKey) ? illKey : null;

      if (this.picture) { this.picture.destroy(); this.picture = null; }

      var outline = key ? outlineFromTexture(this, key) : null;
      if (key) {
        this.picture = this.add.image(ART_CX, ART_CY, key).setDepth(1);
        var iw = this.picture.width, ih = this.picture.height;
        var sc;

        if (outline) {
          // Scale to the SUBJECT, not to the file. These illustrations
          // put a small drawing on a big disc, so fitting the file to
          // the frame leaves a fish a third of the size of the space
          // it is sitting in -- too small for a four-year-old to trace.
          var bx0 = 1, bx1 = 0, by0 = 1, by1 = 0;
          outline.forEach(function (p) {
            if (p.x < bx0) bx0 = p.x; if (p.x > bx1) bx1 = p.x;
            if (p.y < by0) by0 = p.y; if (p.y > by1) by1 = p.y;
          });
          var ow = Math.max(1e-3, (bx1 - bx0) * iw), oh = Math.max(1e-3, (by1 - by0) * ih);
          sc = Math.min(ART_BOX / ow, ART_BOX / oh, PIC_MAX / Math.max(iw, ih));

          // Centre the SHAPE in the frame and move the picture by the
          // same offset, so the dashed line stays exactly on the art.
          var ocx = (bx0 + bx1) / 2, ocy = (by0 + by1) / 2;
          this.picture.setPosition(ART_CX - (ocx - 0.5) * iw * sc,
                                   ART_CY - (ocy - 0.5) * ih * sc);
          var px0 = this.picture.x, py0 = this.picture.y;
          outline = outline.map(function (p) {
            return { x: px0 + (p.x - 0.5) * iw * sc, y: py0 + (p.y - 0.5) * ih * sc };
          });
        } else {
          sc = Math.min(ART_BOX / iw, ART_BOX / ih);
        }
        this.picture.setScale(sc).setAlpha(0.22);
      }

      // No picture, or one we could not find an edge in: trace a
      // shape instead, with the word's emoji sitting inside it.
      if (!outline) {
        outline = shapePath(SHAPES[this.idx % SHAPES.length], PATH_PTS);
        if (!this.picture) {
          var face = (w.emoji && w.emoji !== w.word) ? w.emoji : '✏️';
          this.picture = this.add.text(ART_CX, ART_CY, face, {
            fontFamily: 'Prompt, sans-serif', fontSize: '110px'
          }).setOrigin(0.5).setDepth(1).setAlpha(0.18);
        }
      }

      this.path    = outline;
      this.prog    = 0;
      this.tracing = false;
      this.locked  = false;

      this.wordText.setText(w.word);
      this.subText.setText('ลากนิ้วตามเส้นประ รอบรูปให้ครบ');
      this.countText.setText((this.idx + 1) + ' / ' + words.length);
      this.drawGuide();
    },

    // ── Drawing ────────────────────────────────────────────────
    // The guide is redrawn only when the path changes; the trail is
    // redrawn on every move, which is the only thing that changes
    // while a finger is down.
    drawGuide: function () {
      var g = this.gGuide, p = this.path;
      g.clear();
      if (!p) return;
      g.lineStyle(6, C.guide, 0.7);
      // Dashes of a fixed LENGTH. Dashing per point instead made them
      // as short as the gap between points -- on a small shape that
      // is a 3px dash under a 7px line, which reads as a fuzzy
      // caterpillar rather than as a line to follow.
      var carry = 0, on = true;
      for (var i = 0; i < p.length; i++) {
        var a = p[i], b = p[(i + 1) % p.length];
        var seg = Math.hypot(b.x - a.x, b.y - a.y), t0 = 0;
        while (t0 < seg) {
          var want = (on ? DASH_ON : DASH_OFF) - carry;
          var t1 = Math.min(seg, t0 + want);
          if (on) {
            g.lineBetween(a.x + (b.x - a.x) * (t0 / seg), a.y + (b.y - a.y) * (t0 / seg),
                          a.x + (b.x - a.x) * (t1 / seg), a.y + (b.y - a.y) * (t1 / seg));
          }
          if (t1 - t0 >= want) { on = !on; carry = 0; } else { carry += t1 - t0; }
          t0 = t1;
        }
      }
      this.drawTrail();
    },

    drawTrail: function () {
      var g = this.gTrail, p = this.path;
      g.clear();
      if (!p) return;

      if (this.prog > 0) {
        g.lineStyle(18, C.trailGlow, 0.45);
        for (var i = 0; i < this.prog; i++) g.lineBetween(p[i].x, p[i].y, p[i + 1].x, p[i + 1].y);
        g.lineStyle(10, C.trail, 1);
        for (var j = 0; j < this.prog; j++) g.lineBetween(p[j].x, p[j].y, p[j + 1].x, p[j + 1].y);
      }

      // where to put the finger next: the start dot, or the head of
      // the trail if they have already begun
      var at = p[Math.min(this.prog, p.length - 1)];
      g.fillStyle(this.prog > 0 ? C.head : C.start, 1);
      g.fillCircle(at.x, at.y, this.prog > 0 ? 10 : 13);
      g.lineStyle(4, this.prog > 0 ? C.trail : 0xffffff, 1);
      g.strokeCircle(at.x, at.y, this.prog > 0 ? 10 : 13);
    },

    // ── Input ──────────────────────────────────────────────────
    onDown: function (x, y) {
      if (this.locked || !this.path) return;
      var at = this.path[Math.min(this.prog, this.path.length - 1)];
      // Must start on the dot. It is the one rule of the game, and
      // the dot is drawn big and green to say so.
      if (Math.hypot(x - at.x, y - at.y) <= TOL) this.tracing = true;
    },

    onMove: function (x, y) {
      if (!this.tracing || this.locked || !this.path) return;
      var p = this.path, best = -1;
      // Furthest point ahead that the finger is near: taking the
      // furthest (not the nearest) is what lets a fast drag through
      // a tight curve keep up without skipping the whole shape,
      // since LOOKAHEAD caps how far one move may carry.
      for (var i = this.prog + 1; i <= Math.min(this.prog + LOOKAHEAD, p.length - 1); i++) {
        if (Math.hypot(x - p[i].x, y - p[i].y) <= TOL) best = i;
      }
      if (best < 0) return;

      var was = Math.floor(this.prog / 12);
      this.prog = best;
      if (Math.floor(this.prog / 12) > was && this.sfxStep) {
        this.sfxStep.play();   // a tick every twelfth of the way round
      }
      this.drawTrail();

      if (this.prog >= Math.floor((p.length - 1) * DONE_FRAC)) this.complete();
    },

    // ── Finishing a picture ────────────────────────────────────
    complete: function () {
      var self = this;
      if (this.locked) return;
      this.locked  = true;
      this.tracing = false;

      // snap the trail closed, so a 93% trace still looks finished
      this.prog = this.path.length - 1;
      this.drawTrail();
      if (this.sfxDone) this.sfxDone.play();

      // the picture fills in -- the reward for going all the way round
      if (this.picture) {
        this.tweens.add({ targets: this.picture, alpha: 1, scale: this.picture.scale * 1.06,
                          duration: 320, yoyo: false, ease: 'Back.easeOut' });
      }
      this.tweens.add({ targets: this.gGuide, alpha: 0, duration: 300 });

      var star = this.add.text(ART_CX, ART_CY - ART_BOX / 2 - 18, '⭐', {
        fontFamily: 'Prompt, sans-serif', fontSize: '46px'
      }).setOrigin(0.5).setDepth(7);
      this.tweens.add({ targets: star, y: star.y - 40, alpha: 0, duration: 900,
                        onComplete: function () { star.destroy(); } });

      if (callbacks.onPoints) callbacks.onPoints(10);

      this.time.delayedCall(620, function () {
        callbacks.onPractice(self.word, null, function () {
          self.idx++;
          self.gGuide.setAlpha(1);
          self.gTrail.clear();
          self.nextRound();
        });
      });
    },

    finish: function () {
      var self = this;
      this.locked = true;
      this.gGuide.clear(); this.gTrail.clear();
      if (this.picture) { this.picture.destroy(); this.picture = null; }
      this.wordText.setText('เก่งมาก! วาดครบทุกรูปแล้ว 🎉');
      this.subText.setText('');
      if (this.sfxAll) this.sfxAll.play();
      this.time.delayedCall(1200, function () {
        if (callbacks.onFinish) callbacks.onFinish();
      });
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'drawingGame',
    width:  W, height: H,
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, autoRound: true },
    backgroundColor: '#fdf6e8',
    scene:  DrawScene
  });
}

// ── Public API ────────────────────────────────────────────────────
var DrawingGame = (function () {
  var game = null;

  function start(words, cbs) {
    stop();
    setTimeout(function () { game = createDrawingGame(words, cbs); }, 60);
  }

  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }

  return { start: start, stop: stop };
}());
