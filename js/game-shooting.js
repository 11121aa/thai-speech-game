// ============================================================
//  SHOOTING GAME — Phaser 3 (Rotating-cannon mechanic)
// ============================================================
//  POLISH GUIDE (search for the label):
//    [TUNE]    Speed, tolerance, timeouts           (~line 16)
//    [CANNON]  Cannon position & barrel size        (~drawCannon)
//    [RINGS]   Bullseye ring colours                (~line 26)
//    [SKY]     Sky & ground colours                 (~drawBg)
//    [POP]     Score pop style                      (~showPop)
// ============================================================
//  Mechanic: a cannon at the bottom sweeps its aim left↔right.
//  Tap (or SPACE) to fire — if the aim line is within HIT_TOL
//  radians of a target's angle, you hit it.
// ============================================================

function createShootingGame(words, callbacks) {

  // ── [TUNE] Difficulty knobs ────────────────────────────────
  var AIM_SPEED   = 1.6;   // rad/s — POLISH: higher = harder to time
  var HIT_TOL     = 0.19;  // radians ≈ ±11° — POLISH: smaller = harder
  var TIMEOUT_MS  = 6000;  // ms each target stays alive
  var MAX_TARGETS = 3;     // max targets on screen at once
  var W = 800, H = 450;
  var GROUND_Y = H - 80;

  // [CANNON] Fixed cannon position — bottom centre
  var CANNON_X = W / 2;
  var CANNON_Y = H - 30;

  // ── [RINGS] Bullseye: outer → inner ───────────────────────
  var RING_R = [46, 37, 27, 18, 10];
  var RING_C = [0xe74c3c, 0xffffff, 0x2980b9, 0xffffff, 0xf1c40f];

  // ── Scene ─────────────────────────────────────────────────
  var ShootScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'shooting' });
      this.targets  = [];
      this.wordIdx  = 0;
      this.aimAngle = -Math.PI / 2;  // starts pointing straight up
      this.aimDir   = 1;             // 1 = sweeping right, -1 = left
      this.isPaused = false;
      this.trail    = null;          // { angle, life } shot-trail effect
    },

    create: function () {
      var self = this;

      // Static background (drawn once)
      var bgGfx = this.add.graphics();
      this.drawBg(bgGfx);

      // Dynamic layer — cleared every frame
      this.gfx = this.add.graphics();

      // Tap / click to fire
      this.input.on('pointerdown', function () {
        if (!self.isPaused) self.fire();
      });
      // Keyboard: SPACE also fires
      this.input.keyboard.on('keydown-SPACE', function () {
        if (!self.isPaused) self.fire();
      });

      // Hint text (fades out after 3 s)
      var hint = this.add.text(W / 2, 22,
        '🎯 เล็งให้ตรงแล้วแตะเพื่อยิง! (คลิก / SPACE)', {
          fontFamily: 'Prompt, sans-serif', fontSize: '15px', fontStyle: 'bold',
          color: '#2b2438', backgroundColor: '#ffffffbb',
          padding: { x: 10, y: 4 }
        }).setOrigin(0.5).setDepth(10);
      this.time.delayedCall(3000, function () {
        self.tweens.add({ targets: hint, alpha: 0, duration: 600,
          onComplete: function () { hint.destroy(); }
        });
      });

      // Stagger first three spawns
      [0, 1800, 3600].forEach(function (ms) {
        self.time.delayedCall(ms, function () { self.spawnTarget(); });
      });
    },

    // ── [SKY] Background ──────────────────────────────────────
    drawBg: function (g) {
      // Sky gradient bands
      var bands = 20;
      for (var i = 0; i < bands; i++) {
        var t  = i / bands;
        var r  = Math.round(Phaser.Math.Linear(135, 180, t));
        var gv = Math.round(Phaser.Math.Linear(206, 220, t));
        var b  = Math.round(Phaser.Math.Linear(235, 245, t));
        g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b));
        g.fillRect(0, i * (GROUND_Y / bands), W, GROUND_Y / bands + 1);
      }
      g.fillStyle(0x4caf50); g.fillRect(0, GROUND_Y,      W, 10);
      g.fillStyle(0x795548); g.fillRect(0, GROUND_Y + 10, W, H - GROUND_Y - 10);
    },

    // ── Spawn a target at a random angle from the cannon ─────
    spawnTarget: function () {
      if (this.isPaused || !words.length) return;
      var active = this.targets.filter(function (t) { return !t.done && !t.expired; }).length;
      if (active >= MAX_TARGETS) return;

      var word = words[this.wordIdx++ % words.length];
      var tries = 0, angle, tx, ty;

      do {
        // Pick an angle in the upper semicircle (pointing upward)
        angle = -Math.PI + Math.random() * Math.PI;
        var dist = 190 + Math.random() * 110;
        tx = CANNON_X + Math.cos(angle) * dist;
        ty = CANNON_Y + Math.sin(angle) * dist;
        tries++;
      } while (
        (ty < 50 || ty > GROUND_Y - 20 || tx < 70 || tx > W - 70 ||
          this.targets.some(function (u) {
            return !u.done && !u.expired && Math.hypot(u.x - tx, u.y - ty) < 110;
          })) && tries < 30
      );

      var label = this.add.text(tx, ty - 58, word.word, {
        fontFamily: 'Prompt, sans-serif', fontSize: '14px', fontStyle: 'bold',
        color: '#2b2438', backgroundColor: '#ffffffcc', padding: { x: 8, y: 3 }
      }).setOrigin(0.5, 1).setDepth(2);

      var emoji = this.add.text(tx, ty - 58 - label.height - 2,
        word.emoji || '🎯', { fontSize: '20px' }).setOrigin(0.5, 1).setDepth(2);

      this.targets.push({
        x: tx, y: ty,
        angle: angle,   // angle from cannon to this target
        word: word,
        hit: false, done: false, expired: false,
        born: this.time.now,
        s: 0,           // scale: 0 → 1 as target pops in
        label: label, emoji: emoji
      });
    },

    // ── Fire the cannon ───────────────────────────────────────
    fire: function () {
      var self = this;
      this.trail = { angle: this.aimAngle, life: 1.0 };  // visual trail

      for (var i = 0; i < this.targets.length; i++) {
        var t = this.targets[i];
        if (t.hit || t.expired || t.s < 0.4) continue;

        // Angle from cannon to this target
        var tAngle = Math.atan2(t.y - CANNON_Y, t.x - CANNON_X);
        var diff   = Math.abs(this.aimAngle - tAngle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;  // handle wrap

        if (diff < HIT_TOL) {
          t.hit = true;
          callbacks.onPoints(10);
          this.showPop(t.x, t.y - 65, '+10 ⭐');
          this.isPaused = true;
          var ref = t;
          callbacks.onPractice(t.word, null, function () {
            self.isPaused = false;
            ref.done = true;
            self.time.delayedCall(500, function () { self.spawnTarget(); });
          });
          return;
        }
      }
    },

    // ── Per-frame update ──────────────────────────────────────
    update: function (time, delta) {
      if (this.isPaused) return;
      var g = this.gfx;
      g.clear();
      var self = this;
      var dt = delta / 1000;

      // Sweep aim back and forth (pendulum)
      this.aimAngle += this.aimDir * AIM_SPEED * dt;
      if (this.aimAngle > -0.05)          { this.aimAngle = -0.05;          this.aimDir = -1; }
      if (this.aimAngle < -Math.PI + 0.05) { this.aimAngle = -Math.PI + 0.05; this.aimDir =  1; }

      // Fade trail
      if (this.trail) {
        this.trail.life -= dt * 3.5;
        if (this.trail.life <= 0) this.trail = null;
      }

      // Draw shot trail
      if (this.trail) {
        var tx2 = CANNON_X + Math.cos(this.trail.angle) * 400;
        var ty2 = CANNON_Y + Math.sin(this.trail.angle) * 400;
        g.lineStyle(5, 0xffd700, this.trail.life * 0.85);
        g.lineBetween(CANNON_X, CANNON_Y, tx2, ty2);
        g.fillStyle(0xffd700, this.trail.life);
        g.fillCircle(tx2, ty2, 7);
      }

      // Dashed aim line (12 segments, every other one drawn)
      var aimLen = 360;
      var aex = CANNON_X + Math.cos(this.aimAngle) * aimLen;
      var aey = CANNON_Y + Math.sin(this.aimAngle) * aimLen;
      for (var s = 0; s < 12; s++) {
        if (s % 2 === 0) {
          var t0 = s / 12, t1 = (s + 0.65) / 12;
          g.lineStyle(2, 0xffffff, 0.65);
          g.lineBetween(
            CANNON_X + (aex - CANNON_X) * t0, CANNON_Y + (aey - CANNON_Y) * t0,
            CANNON_X + (aex - CANNON_X) * t1, CANNON_Y + (aey - CANNON_Y) * t1
          );
        }
      }

      // Crosshair at aim tip
      g.lineStyle(2.5, 0xff4444, 0.92);
      g.lineBetween(aex - 10, aey, aex + 10, aey);
      g.lineBetween(aex, aey - 10, aex, aey + 10);
      g.fillStyle(0xff4444, 0.3);
      g.fillCircle(aex, aey, 8);

      // Draw the cannon
      this.drawCannon(g);

      // Update targets
      var toRemove = [];
      this.targets.forEach(function (t) {
        var elapsed = time - t.born;

        if (!t.hit && !t.expired) {
          t.s = Math.min(1, t.s + 0.05);
          if (elapsed >= TIMEOUT_MS) {
            t.expired = true;
            self.showPop(t.x, t.y - 65, '⌛');
            self.time.delayedCall(400, function () { self.spawnTarget(); });
          }
        } else if (t.done || t.expired) {
          t.s = Math.max(0, t.s - 0.1);
        }

        if (t.s > 0) {
          self.drawTarget(g, t, time, elapsed);
          var ly = t.y - 58 * t.s;
          t.label.setPosition(t.x, ly).setAlpha(t.hit ? 0.4 : t.s);
          t.emoji.setPosition(t.x, ly - t.label.height - 2).setAlpha(t.hit ? 0.4 : t.s);
        } else if (t.done || t.expired) {
          t.label.destroy(); t.emoji.destroy();
          toRemove.push(t);
        }
      });
      toRemove.forEach(function (t) {
        self.targets = self.targets.filter(function (u) { return u !== t; });
      });
    },

    // ── [CANNON] Draw the rotating cannon ────────────────────
    drawCannon: function (g) {
      // Base platform
      g.fillStyle(0x795548);
      g.fillRect(CANNON_X - 30, CANNON_Y + 14, 60, 14);

      // Wheel (circle base)
      g.fillStyle(0x5d4037);
      g.fillCircle(CANNON_X, CANNON_Y, 22);
      g.lineStyle(3, 0x3e2723);
      g.strokeCircle(CANNON_X, CANNON_Y, 22);

      // Barrel (rotated rectangle — manual polygon)
      var len = 48, bw = 13;
      var cos = Math.cos(this.aimAngle), sin = Math.sin(this.aimAngle);
      var px  = -sin * bw / 2, py = cos * bw / 2;

      g.fillStyle(0x3e2723);
      g.fillPoints([
        { x: CANNON_X + px,              y: CANNON_Y + py },
        { x: CANNON_X - px,              y: CANNON_Y - py },
        { x: CANNON_X - px + cos * len,  y: CANNON_Y - py + sin * len },
        { x: CANNON_X + px + cos * len,  y: CANNON_Y + py + sin * len }
      ], true);

      // Muzzle tip
      g.fillStyle(0x212121);
      g.fillCircle(CANNON_X + cos * len, CANNON_Y + sin * len, 9);
    },

    // ── Draw one bullseye target ──────────────────────────────
    drawTarget: function (g, t, time, elapsed) {
      var frac  = t.hit ? 1 : Math.max(0, (TIMEOUT_MS - elapsed) / TIMEOUT_MS);
      var shake = (!t.hit && !t.expired && elapsed > TIMEOUT_MS - 1200)
        ? Math.sin(time * 0.04) * 4 : 0;
      var cx = t.x + shake, cy = t.y;

      if (t.hit && !t.done) g.setAlpha(0.45);

      // Stand pole
      g.fillStyle(0x7d6b5a);
      g.fillRect(cx - 4, cy, 8, (GROUND_Y - cy) * t.s);

      // Bullseye rings (outer → inner)
      for (var ri = 0; ri < RING_R.length; ri++) {
        g.fillStyle(RING_C[ri]);
        g.fillCircle(cx, cy, RING_R[ri] * t.s);
      }
      g.lineStyle(1, 0x00000022);
      g.lineBetween(cx - 46 * t.s, cy, cx + 46 * t.s, cy);
      g.lineBetween(cx, cy - 46 * t.s, cx, cy + 46 * t.s);

      // Timer arc (green → yellow → red)
      if (!t.hit && !t.expired && t.s > 0.3) {
        var arcColor = frac > 0.5 ? 0x27ae60 : frac > 0.25 ? 0xf39c12 : 0xe74c3c;
        g.lineStyle(5 * t.s, arcColor);
        g.beginPath();
        g.arc(cx, cy, 58 * t.s, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false, 0.02);
        g.strokePath();
      }

      g.setAlpha(1);
    },

    // ── [POP] Floating score text ─────────────────────────────
    showPop: function (x, y, text) {
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif', fontSize: '22px', fontStyle: 'bold',
        color: '#ff9f1c', stroke: '#ffffff', strokeThickness: 4
      }).setOrigin(0.5).setDepth(10);
      this.tweens.add({
        targets: pop, y: y - 55, alpha: 0, duration: 900, ease: 'Power2',
        onComplete: function () { pop.destroy(); }
      });
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'shootingGame',
    width:  W, height: H,
    scale:  { mode: Phaser.Scale.NONE },
    scene:  ShootScene,
    audio:  { noAudio: true }
  });
}

// Public API
var ShootingGame = (function () {
  var game = null;
  function start(words, cbs) {
    stop();
    setTimeout(function () { game = createShootingGame(words, cbs); }, 60);
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }
  return { start: start, stop: stop };
}());
