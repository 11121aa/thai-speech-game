// ============================================================
//  SHOOTING GAME — Phaser 3  (Rotating-cannon mechanic)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Speed, tolerance, timeouts           (~line 22)
//    [PROJ]    Projectile speed & hit radius        (~line 26)
//    [CANNON]  Cannon position & barrel size        (~drawCannon)
//    [RINGS]   Bullseye ring colours                (~line 37)
//    [SKY]     Sky & ground colours                 (~drawBg)
//    [POP]     Score pop style                      (~showPop)
// ============================================================
//  How the game works:
//    - A cannon at the bottom sweeps its aim left ↔ right
//    - Tap (or SPACE) to fire — a real cannonball flies across the screen
//    - Watch where the ball lands — timing + aim angle both matter
//    - Hit a bullseye → 💥 impact + pronunciation practice modal
//    - Each target has a countdown timer — miss it and it expires
//  Sound effects:
//    - CannonFire  → plays when the cannon fires
//    - CongratSFX  → plays when the player finishes pronouncing a word
// ============================================================

function createShootingGame(words, callbacks) {

  // ── [TUNE] Difficulty knobs ────────────────────────────────────
  var AIM_SPEED   = 1.6;   // how fast the aim sweeps (radians/second) — higher = harder to time
  var TIMEOUT_MS  = 7000;  // how long each target stays alive before expiring (ms)
  var MAX_TARGETS = 3;     // maximum targets on screen at once
  var W = 800, H = 450;
  var GROUND_Y = H - 80;

  // [CANNON] Fixed position at the bottom-centre
  var CANNON_X = W / 2;
  var CANNON_Y = H - 30;
  var BARREL_LEN = 48;     // length of the cannon barrel in pixels

  // ── [PROJ] Projectile settings ────────────────────────────────
  var PROJ_SPD   = 9;   // cannonball travel speed in pixels per frame (~540 px/s at 60fps)
  var PROJ_HIT_R = 36;  // pixel radius — projectile must come within this distance of a target centre to hit

  var RELOAD_MS  = 2000; // milliseconds between shots (reload time)

  // ── [RINGS] Bullseye ring colours from outer to inner ─────────
  var RING_R = [32, 25, 18, 12, 7];   // smaller targets — harder to hit
  var RING_C = [0xe74c3c, 0xffffff, 0x2980b9, 0xffffff, 0xf1c40f];

  // ── Scene ─────────────────────────────────────────────────────
  var ShootScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'shooting' });

      this.targets      = [];           // active bullseye targets
      this.projectiles  = [];           // cannonballs currently in flight: { x, y, vx, vy }
      this.wordIdx      = 0;
      this.aimAngle     = -Math.PI / 2; // starts pointing straight up
      this.aimDir       = 1;            // +1 = sweeping right, -1 = sweeping left
      this.isPaused     = false;
      this.trail        = null;         // { angle, life } — fading line after a shot
      this.reloadUntil  = 0;           // timestamp when reload finishes (0 = ready to fire)
    },

    // preload() runs before create() — load all assets (audio, images, etc.)
    preload: function () {
      this.load.audio('CannonFire', 'soundeffect/CannonFire.mp3');
      this.load.audio('CongratSFX', 'soundeffect/CongratSFX.mp3');
    },

    create: function () {
      var self = this;

      // Create sound instances (volume can be adjusted here)
      this.sfxCannon  = this.sound.add('CannonFire', { volume: 0.6 });
      this.sfxCongrat = this.sound.add('CongratSFX', { volume: 0.8 });

      // Static background drawn once
      var bgGfx = this.add.graphics();
      this.drawBg(bgGfx);

      // Dynamic layer — cleared every frame
      this.gfx = this.add.graphics();

      // Tap / click to fire
      this.input.on('pointerdown', function () {
        if (!self.isPaused) self.fire();
      });
      // SPACE also fires
      this.input.keyboard.on('keydown-SPACE', function () {
        if (!self.isPaused) self.fire();
      });

      // Hint text (fades after 3 s)
      var hint = this.add.text(W / 2, 22,
        '🎯 เล็งให้ตรงแล้วแตะเพื่อยิง! — ลูกปืนใช้เวลาเดินทาง!', {
          fontFamily: 'Prompt, sans-serif', fontSize: '15px', fontStyle: 'bold',
          color: '#2b2438', backgroundColor: '#ffffffbb',
          padding: { x: 10, y: 4 }
        }).setOrigin(0.5).setDepth(10);
      this.time.delayedCall(3000, function () {
        self.tweens.add({ targets: hint, alpha: 0, duration: 600,
          onComplete: function () { hint.destroy(); }
        });
      });

      // Stagger first three target spawns
      [0, 1800, 3600].forEach(function (ms) {
        self.time.delayedCall(ms, function () { self.spawnTarget(); });
      });
    },

    // ── [SKY] Static background ────────────────────────────────────
    drawBg: function (g) {
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

    // ── Spawn a target at a random angle from the cannon ─────────
    // Targets are placed further away than before so the projectile travel is more visible
    spawnTarget: function () {
      if (this.isPaused || !words.length) return;
      var active = this.targets.filter(function (t) { return !t.done && !t.expired; }).length;
      if (active >= MAX_TARGETS) return;

      var word = words[this.wordIdx++ % words.length];
      var tries = 0, angle, tx, ty;

      do {
        angle = -Math.PI + Math.random() * Math.PI; // upper semicircle
        // [TUNE] Targets are 320–430px away — far enough that reload time feels meaningful
        var dist = 320 + Math.random() * 110;
        tx = CANNON_X + Math.cos(angle) * dist;
        ty = CANNON_Y + Math.sin(angle) * dist;
        tries++;
      } while (
        (ty < 50 || ty > GROUND_Y - 20 || tx < 70 || tx > W - 70 ||
          this.targets.some(function (u) {
            return !u.done && !u.expired && Math.hypot(u.x - tx, u.y - ty) < 110;
          })) && tries < 30
      );

      var label = this.add.text(tx, ty - 40, word.word, {
        fontFamily: 'Prompt, sans-serif', fontSize: '13px', fontStyle: 'bold',
        color: '#2b2438', backgroundColor: '#ffffffcc', padding: { x: 6, y: 2 }
      }).setOrigin(0.5, 1).setDepth(2);

      var emoji = this.add.text(tx, ty - 40 - label.height - 2,
        word.emoji || '🎯', { fontSize: '16px' }).setOrigin(0.5, 1).setDepth(2);

      this.targets.push({
        x: tx, y: ty, angle: angle, word: word,
        hit: false, done: false, expired: false,
        born: this.time.now, s: 0,
        label: label, emoji: emoji
      });
    },

    // ── Fire the cannon ───────────────────────────────────────────
    fire: function () {
      if (this.time.now < this.reloadUntil) return; // still reloading — ignore the tap

      this.sfxCannon.play();
      this.reloadUntil = this.time.now + RELOAD_MS; // start 2-second reload
      this.trail = { angle: this.aimAngle, life: 1.0 };

      var cos = Math.cos(this.aimAngle);
      var sin = Math.sin(this.aimAngle);
      this.projectiles.push({
        x:  CANNON_X + cos * (BARREL_LEN + 9),
        y:  CANNON_Y + sin * (BARREL_LEN + 9),
        vx: cos * PROJ_SPD,
        vy: sin * PROJ_SPD
      });
    },

    // ── Per-frame update ──────────────────────────────────────────
    update: function (time, delta) {
      if (this.isPaused) return;
      var g    = this.gfx;
      var self = this;
      var dt   = delta / 1000;
      g.clear();

      // ── Sweep aim angle back and forth (pendulum) ────────────────
      this.aimAngle += this.aimDir * AIM_SPEED * dt;
      if (this.aimAngle > -0.05)           { this.aimAngle = -0.05;           this.aimDir = -1; }
      if (this.aimAngle < -Math.PI + 0.05) { this.aimAngle = -Math.PI + 0.05; this.aimDir =  1; }

      // ── Fade the trail from the last shot ────────────────────────
      if (this.trail) {
        this.trail.life -= dt * 3.5;
        if (this.trail.life <= 0) this.trail = null;
      }
      if (this.trail) {
        var tx2 = CANNON_X + Math.cos(this.trail.angle) * 400;
        var ty2 = CANNON_Y + Math.sin(this.trail.angle) * 400;
        g.lineStyle(5, 0xffd700, this.trail.life * 0.85);
        g.lineBetween(CANNON_X, CANNON_Y, tx2, ty2);
        g.fillStyle(0xffd700, this.trail.life);
        g.fillCircle(tx2, ty2, 7);
      }

      // ─�� Move projectiles + check collisions ──────────────────────
      // filter() keeps projectiles that return true; removes ones that return false
      this.projectiles = this.projectiles.filter(function (proj) {
        proj.x += proj.vx; // move horizontally
        proj.y += proj.vy; // move vertically (no gravity on cannonballs — straight line)

        // Remove the projectile once it travels off the canvas
        if (proj.x < -20 || proj.x > W + 20 || proj.y < -20 || proj.y > H + 20) return false;

        // Check pixel distance against every active target
        for (var i = 0; i < self.targets.length; i++) {
          var t = self.targets[i];
          if (t.hit || t.expired || t.s < 0.4) continue; // skip unavailable targets
          var dx = proj.x - t.x, dy = proj.y - t.y;
          // Pythagoras: distance² = dx² + dy² (avoid slow sqrt by comparing squared values)
          if (dx * dx + dy * dy < PROJ_HIT_R * PROJ_HIT_R) {
            // ── HIT! ──────────────────────────────────────────────
            t.hit = true;
            callbacks.onPoints(10);
            self.showPop(t.x, t.y - 48, '+10 ⭐');
            self.isPaused = true;
            var ref = t;
            callbacks.onPractice(t.word, null, function () {
              self.sfxCongrat.play(); // play congrat sound when word is pronounced
              self.isPaused = false;
              ref.done = true;
              self.time.delayedCall(500, function () { self.spawnTarget(); });
            });
            return false; // remove the projectile on hit
          }
        }
        return true; // keep the projectile if it hasn't hit anything yet
      });

      // ── Draw projectiles ─────────────────────────────────────────
      this.projectiles.forEach(function (proj) {
        // Smoke trail: two fading lines behind the ball (gets thinner further back)
        g.lineStyle(4, 0x999999, 0.45);
        g.lineBetween(proj.x, proj.y,
                      proj.x - proj.vx * 4, proj.y - proj.vy * 4);
        g.lineStyle(2, 0xcccccc, 0.22);
        g.lineBetween(proj.x - proj.vx * 4, proj.y - proj.vy * 4,
                      proj.x - proj.vx * 9, proj.y - proj.vy * 9);
        // Dark iron cannonball with a slight highlight
        g.fillStyle(0x1a1a2e);
        g.fillCircle(proj.x, proj.y, 7);
        g.lineStyle(2, 0x3a3a5e);
        g.strokeCircle(proj.x, proj.y, 7);
        g.fillStyle(0x5a5a8e, 0.4);
        g.fillCircle(proj.x - 2, proj.y - 2, 3); // small highlight spot
      });

      // ── Reload state ───────────────────────────────────────────
      var reloading   = time < this.reloadUntil;
      var reloadFrac  = reloading
        ? Math.min(1, (time - (this.reloadUntil - RELOAD_MS)) / RELOAD_MS)
        : 1; // 0→1 as reload progresses; 1 = ready

      // ── Dashed aim line (dimmed while reloading) ───────────────
      var aimAlpha = reloading ? 0.25 : 0.65;
      var aimLen   = 360;
      var aex = CANNON_X + Math.cos(this.aimAngle) * aimLen;
      var aey = CANNON_Y + Math.sin(this.aimAngle) * aimLen;
      for (var s = 0; s < 12; s++) {
        if (s % 2 === 0) {
          var t0 = s / 12, t1 = (s + 0.65) / 12;
          g.lineStyle(2, 0xffffff, aimAlpha);
          g.lineBetween(
            CANNON_X + (aex - CANNON_X) * t0, CANNON_Y + (aey - CANNON_Y) * t0,
            CANNON_X + (aex - CANNON_X) * t1, CANNON_Y + (aey - CANNON_Y) * t1
          );
        }
      }

      // Crosshair at aim tip (grey while reloading, red when ready)
      var chColor = reloading ? 0x888888 : 0xff4444;
      var chAlpha = reloading ? 0.4 : 0.92;
      g.lineStyle(2.5, chColor, chAlpha);
      g.lineBetween(aex - 10, aey, aex + 10, aey);
      g.lineBetween(aex, aey - 10, aex, aey + 10);
      g.fillStyle(chColor, reloading ? 0.12 : 0.3);
      g.fillCircle(aex, aey, 8);

      // Draw the cannon
      this.drawCannon(g);

      // ── Reload arc around the cannon base ──────────────────────
      if (reloading) {
        // Grey background ring
        g.lineStyle(5, 0x444444, 0.35);
        g.strokeCircle(CANNON_X, CANNON_Y, 28);
        // Filling orange arc that grows as reload completes
        g.lineStyle(5, 0xff9900, 0.9);
        g.beginPath();
        g.arc(CANNON_X, CANNON_Y, 28,
              -Math.PI / 2,
              -Math.PI / 2 + reloadFrac * Math.PI * 2,
              false, 0.02);
        g.strokePath();
      }

      // ── Update and draw targets ───────────────────────────────────
      var toRemove = [];
      this.targets.forEach(function (t) {
        var elapsed = time - t.born;

        if (!t.hit && !t.expired) {
          t.s = Math.min(1, t.s + 0.05); // pop-in animation
          if (elapsed >= TIMEOUT_MS) {
            t.expired = true;
            self.showPop(t.x, t.y - 48, '⌛');
            self.time.delayedCall(400, function () { self.spawnTarget(); });
          }
        } else if (t.done || t.expired) {
          t.s = Math.max(0, t.s - 0.1); // pop-out animation
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

    // ── [CANNON] Draw the rotating cannon ────────────────────────
    drawCannon: function (g) {
      // Base platform
      g.fillStyle(0x795548);
      g.fillRect(CANNON_X - 30, CANNON_Y + 14, 60, 14);

      // Wheel/base circle
      g.fillStyle(0x5d4037);
      g.fillCircle(CANNON_X, CANNON_Y, 22);
      g.lineStyle(3, 0x3e2723);
      g.strokeCircle(CANNON_X, CANNON_Y, 22);

      // Barrel (rotated rectangle — manual polygon using cos/sin)
      var len = BARREL_LEN, bw = 13;
      var cos = Math.cos(this.aimAngle), sin = Math.sin(this.aimAngle);
      var px  = -sin * bw / 2, py = cos * bw / 2;
      g.fillStyle(0x3e2723);
      g.fillPoints([
        { x: CANNON_X + px,             y: CANNON_Y + py             },
        { x: CANNON_X - px,             y: CANNON_Y - py             },
        { x: CANNON_X - px + cos * len, y: CANNON_Y - py + sin * len },
        { x: CANNON_X + px + cos * len, y: CANNON_Y + py + sin * len }
      ], true);

      // Muzzle tip circle
      g.fillStyle(0x212121);
      g.fillCircle(CANNON_X + cos * len, CANNON_Y + sin * len, 9);
    },

    // ── Draw one bullseye target ──────────────────────────────────
    drawTarget: function (g, t, time, elapsed) {
      var frac  = t.hit ? 1 : Math.max(0, (TIMEOUT_MS - elapsed) / TIMEOUT_MS);
      var shake = (!t.hit && !t.expired && elapsed > TIMEOUT_MS - 1200)
        ? Math.sin(time * 0.04) * 4 : 0;
      var cx = t.x + shake, cy = t.y;

      if (t.hit && !t.done) g.setAlpha(0.45);

      // Pole from target down to ground
      g.fillStyle(0x7d6b5a);
      g.fillRect(cx - 4, cy, 8, (GROUND_Y - cy) * t.s);

      // Bullseye rings outer → inner
      for (var ri = 0; ri < RING_R.length; ri++) {
        g.fillStyle(RING_C[ri]);
        g.fillCircle(cx, cy, RING_R[ri] * t.s);
      }
      g.lineStyle(1, 0x00000022);
      g.lineBetween(cx - 32 * t.s, cy, cx + 32 * t.s, cy);
      g.lineBetween(cx, cy - 32 * t.s, cx, cy + 32 * t.s);

      // Countdown arc (green → yellow → red) just outside the outermost ring
      if (!t.hit && !t.expired && t.s > 0.3) {
        var arcColor = frac > 0.5 ? 0x27ae60 : frac > 0.25 ? 0xf39c12 : 0xe74c3c;
        g.lineStyle(4 * t.s, arcColor);
        g.beginPath();
        g.arc(cx, cy, 40 * t.s, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false, 0.02);
        g.strokePath();
      }

      g.setAlpha(1);
    },

    // ── [POP] Floating score text ─────────────────────────────────
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
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    scene:  ShootScene
    // audio not disabled — sounds are enabled
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
