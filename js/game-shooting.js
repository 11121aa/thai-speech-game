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
//    - A cannon at the bottom sweeps its aim left and right
//    - Tap (or SPACE) to fire — a real cannonball flies across the screen
//    - Watch where the ball lands — timing + aim angle both matter
//    - Hit a bullseye → break effect + pronunciation practice modal
//    - Each target has a countdown timer — miss it and it expires
//    - Targets oscillate left-right so the game never feels static
//  Sound effects:
//    - CannonFire  → plays when the cannon fires
//    - TargetBreak → plays on impact
//    - CongratSFX  → plays when the player finishes pronouncing a word
// ============================================================

function createShootingGame(words, callbacks) {

  // ── [TUNE] Difficulty knobs ────────────────────────────────────
  var AIM_SPEED   = 1.6;   // aim sweep speed (radians/second)
  var TIMEOUT_MS  = 7000;  // ms before a target expires
  var MAX_TARGETS = 3;     // max targets on screen at once
  var W = 800, H = 450;
  var GROUND_Y = H - 80;   // y-coordinate of the grass line

  // [CANNON] Fixed at the bottom-centre
  var CANNON_X = W / 2;
  var CANNON_Y = H - 30;
  var BARREL_LEN = 48;

  // ── [PROJ] Projectile settings ────────────────────────────────
  var PROJ_SPD   = 9;    // cannonball speed (px/frame at 60fps)
  var PROJ_HIT_R = 36;   // hit radius (px)

  var RELOAD_MS  = 1500; // 1.5-second reload between shots

  // ── [RINGS] Bullseye colours outer → inner ─────────────────────
  var RING_R = [32, 25, 18, 12, 7];
  var RING_C = [0xe74c3c, 0xffffff, 0x2980b9, 0xffffff, 0xf1c40f];
  // Particle colours reuse ring colours for the break effect
  var BREAK_COLORS = [0xe74c3c, 0xffffff, 0x2980b9, 0xf1c40f, 0xff9900];

  // ── Scene ─────────────────────────────────────────────────────
  var ShootScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'shooting' });

      this.targets     = [];  // active bullseye targets
      this.projectiles = [];  // cannonballs in flight: { x, y, vx, vy }
      this.particles   = [];  // break effect particles: { x, y, vx, vy, life, color, r }
      this.wordIdx     = 0;
      this.aimAngle    = -Math.PI / 2; // starts pointing straight up
      this.aimDir      = 1;            // +1 sweeping right, -1 sweeping left
      this.isPaused    = false;
      this.trail       = null;          // { angle, life } — fading shot line
      this.reloadUntil = 0;            // timestamp when reload finishes
    },

    preload: function () {
      this.load.audio('CannonFire',  'soundeffect/CannonFire.mp3');
      this.load.audio('CongratSFX',  'soundeffect/CongratSFX.mp3');
      this.load.audio('TargetBreak', 'soundeffect/TargetBreak.mp3');
    },

    create: function () {
      var self = this;

      this.sfxCannon  = this.sound.add('CannonFire',  { volume: 0.6 });
      this.sfxCongrat = this.sound.add('CongratSFX',  { volume: 0.8 });
      this.sfxBreak   = this.sound.add('TargetBreak', { volume: 0.75 });

      // Static background drawn once onto its own graphics layer
      var bgGfx = this.add.graphics();
      this.drawBg(bgGfx);

      // Dynamic layer cleared and redrawn every frame
      this.gfx = this.add.graphics();

      this.input.on('pointerdown', function () {
        if (!self.isPaused) self.fire();
      });
      this.input.keyboard.on('keydown-SPACE', function () {
        if (!self.isPaused) self.fire();
      });

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

      // Stagger initial spawns at random offsets so targets appear one by one
      var delays = [
        0,
        500 + Math.floor(Math.random() * 600),
        1300 + Math.floor(Math.random() * 700)
      ];
      delays.forEach(function (ms) {
        self.time.delayedCall(ms, function () { self.spawnTarget(); });
      });
    },

    // ── [SKY] Static background ─────────────────────────────────────
    drawBg: function (g) {
      // Sky gradient (top of screen to ground line)
      var bands = 20;
      for (var i = 0; i < bands; i++) {
        var t  = i / bands;
        var r  = Math.round(Phaser.Math.Linear(100, 178, t));
        var gv = Math.round(Phaser.Math.Linear(180, 218, t));
        var b  = Math.round(Phaser.Math.Linear(230, 245, t));
        g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b));
        g.fillRect(0, i * (GROUND_Y / bands), W, GROUND_Y / bands + 1);
      }

      // Sun (upper right, with soft glow ring)
      g.fillStyle(0xffec6e, 0.45);
      g.fillCircle(718, 52, 52);
      g.fillStyle(0xffec6e);
      g.fillCircle(718, 52, 36);

      // Clouds — each is several overlapping circles
      g.fillStyle(0xffffff, 0.92);
      // Cloud 1 (left)
      g.fillCircle(95,  75, 22); g.fillCircle(122, 64, 28);
      g.fillCircle(150, 70, 22); g.fillCircle(172, 77, 15);
      // Cloud 2 (centre)
      g.fillCircle(330, 52, 17); g.fillCircle(352, 44, 22);
      g.fillCircle(374, 50, 18);
      // Cloud 3 (right, doesn't overlap sun)
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(575, 80, 19); g.fillCircle(600, 70, 25);
      g.fillCircle(626, 76, 21); g.fillCircle(648, 83, 14);

      // Distant hills — drawn before grass so grass overlaps the bases
      g.fillStyle(0x5a8c3a, 0.5);
      g.fillEllipse(155, GROUND_Y + 18, 290, 110);
      g.fillStyle(0x4e7e32, 0.45);
      g.fillEllipse(430, GROUND_Y + 22, 350, 95);
      g.fillStyle(0x558b2f, 0.5);
      g.fillEllipse(672, GROUND_Y + 16, 260, 105);

      // Grass strip
      g.fillStyle(0x4caf50);
      g.fillRect(0, GROUND_Y, W, 10);

      // Dirt
      g.fillStyle(0x795548);
      g.fillRect(0, GROUND_Y + 10, W, H - GROUND_Y - 10);

      // Fence — two horizontal rails then posts on top
      g.fillStyle(0xbcaaa4, 0.75);
      g.fillRect(0, GROUND_Y - 20, W, 4); // top rail
      g.fillRect(0, GROUND_Y - 10, W, 3); // bottom rail
      g.fillStyle(0x8d6e63);
      for (var fx = 28; fx < W; fx += 68) {
        g.fillRect(fx - 3, GROUND_Y - 28, 6, 32);
      }

      // Trees at the edges (outside target spawn zone 100–700)
      var treesX = [35, 78, W - 78, W - 35];
      treesX.forEach(function (tx) {
        // Trunk
        g.fillStyle(0x6d4c41);
        g.fillRect(tx - 4, GROUND_Y - 42, 8, 44);
        // Shadow canopy
        g.fillStyle(0x2e7d32, 0.5);
        g.fillCircle(tx + 4, GROUND_Y - 52, 22);
        // Main canopy
        g.fillStyle(0x388e3c);
        g.fillCircle(tx, GROUND_Y - 54, 20);
        g.fillStyle(0x43a047);
        g.fillCircle(tx - 6, GROUND_Y - 62, 13);
      });
    },

    // ── Spawn a new target ────────────────────────────────────────
    spawnTarget: function () {
      if (this.isPaused || !words.length) return;
      var active = this.targets.filter(function (t) { return !t.done && !t.expired; }).length;
      if (active >= MAX_TARGETS) return;

      var word = words[this.wordIdx++ % words.length];
      var tries = 0, angle, tx, ty;

      do {
        angle = -Math.PI + Math.random() * Math.PI;
        var dist = 320 + Math.random() * 110;
        tx = CANNON_X + Math.cos(angle) * dist;
        ty = CANNON_Y + Math.sin(angle) * dist;
        tries++;
      } while (
        (ty < 50 || ty > GROUND_Y - 20 || tx < 100 || tx > W - 100 ||
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
        x: tx, y: ty,
        baseX: tx,                             // oscillation centre
        moveAmp:   15 + Math.random() * 25,    // oscillation half-width (px)
        moveSpeed: 0.6 + Math.random() * 0.6,  // oscillation speed multiplier
        movePhase: Math.random() * Math.PI * 2,// random start phase so targets desync
        angle: angle, word: word,
        hit: false, done: false, expired: false,
        born: this.time.now, s: 0,
        label: label, emoji: emoji
      });
    },

    // ── Fire the cannon ───────────────────────────────────────────
    fire: function () {
      if (this.time.now < this.reloadUntil) return;

      this.sfxCannon.play();
      this.reloadUntil = this.time.now + RELOAD_MS;
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

    // ── Spawn break particles at the hit position ─────────────────
    spawnBreakParticles: function (cx, cy) {
      for (var i = 0; i < 14; i++) {
        var spd = 80 + Math.random() * 140;
        var ang = Math.random() * Math.PI * 2;
        this.particles.push({
          x: cx, y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 50, // slight upward bias
          life: 1.0,
          color: BREAK_COLORS[Math.floor(Math.random() * BREAK_COLORS.length)],
          r: 3 + Math.random() * 4
        });
      }
    },

    // ── Per-frame update ──────────────────────────────────────────
    update: function (time, delta) {
      var g    = this.gfx;
      var self = this;
      var dt   = delta / 1000;
      g.clear();

      // Update and draw break particles even while paused so the effect completes
      this.particles = this.particles.filter(function (p) {
        p.x  += p.vx * dt;
        p.y  += p.vy * dt;
        p.vy += 260 * dt; // gravity pulls pieces down
        p.life -= dt * 1.6;
        if (p.life <= 0) return false;
        g.fillStyle(p.color, p.life * 0.9);
        g.fillCircle(p.x, p.y, p.r * Math.max(0.3, p.life));
        return true;
      });

      if (this.isPaused) return;

      // Update oscillating target x-positions before collision checks
      this.targets.forEach(function (t) {
        if (!t.hit && !t.expired) {
          t.x = t.baseX + Math.sin(time * 0.001 * t.moveSpeed + t.movePhase) * t.moveAmp;
        }
      });

      // Sweep aim angle back and forth
      this.aimAngle += this.aimDir * AIM_SPEED * dt;
      if (this.aimAngle > -0.05)           { this.aimAngle = -0.05;           this.aimDir = -1; }
      if (this.aimAngle < -Math.PI + 0.05) { this.aimAngle = -Math.PI + 0.05; this.aimDir =  1; }

      // Fade shot trail
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

      // Move projectiles and check collisions
      this.projectiles = this.projectiles.filter(function (proj) {
        proj.x += proj.vx;
        proj.y += proj.vy;

        if (proj.x < -20 || proj.x > W + 20 || proj.y < -20 || proj.y > H + 20) return false;

        for (var i = 0; i < self.targets.length; i++) {
          var tgt = self.targets[i];
          if (tgt.hit || tgt.expired || tgt.s < 0.4) continue;
          var dx = proj.x - tgt.x, dy = proj.y - tgt.y;
          if (dx * dx + dy * dy < PROJ_HIT_R * PROJ_HIT_R) {
            tgt.hit = true;
            self.sfxBreak.play();
            self.spawnBreakParticles(tgt.x, tgt.y);
            callbacks.onPoints(10);
            self.showPop(tgt.x, tgt.y - 48, '+10 ⭐');
            // Brief delay before pausing so the break particles are visible
            var ref = tgt;
            self.time.delayedCall(280, function () {
              self.isPaused = true;
              callbacks.onPractice(ref.word, null, function () {
                self.sfxCongrat.play();
                self.isPaused = false;
                ref.done = true;
                self.time.delayedCall(500, function () { self.spawnTarget(); });
              });
            });
            return false;
          }
        }
        return true;
      });

      // Draw projectiles (cannonball + smoke trail)
      this.projectiles.forEach(function (proj) {
        g.lineStyle(4, 0x999999, 0.45);
        g.lineBetween(proj.x, proj.y,
                      proj.x - proj.vx * 4, proj.y - proj.vy * 4);
        g.lineStyle(2, 0xcccccc, 0.22);
        g.lineBetween(proj.x - proj.vx * 4, proj.y - proj.vy * 4,
                      proj.x - proj.vx * 9, proj.y - proj.vy * 9);
        g.fillStyle(0x1a1a2e);
        g.fillCircle(proj.x, proj.y, 7);
        g.lineStyle(2, 0x3a3a5e);
        g.strokeCircle(proj.x, proj.y, 7);
        g.fillStyle(0x5a5a8e, 0.4);
        g.fillCircle(proj.x - 2, proj.y - 2, 3);
      });

      // Reload state
      var reloading  = time < this.reloadUntil;
      var reloadFrac = reloading
        ? Math.min(1, (time - (this.reloadUntil - RELOAD_MS)) / RELOAD_MS)
        : 1;

      // Dashed aim line (dimmed while reloading)
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

      // Crosshair (grey while reloading, red when ready)
      var chColor = reloading ? 0x888888 : 0xff4444;
      var chAlpha = reloading ? 0.4 : 0.92;
      g.lineStyle(2.5, chColor, chAlpha);
      g.lineBetween(aex - 10, aey, aex + 10, aey);
      g.lineBetween(aex, aey - 10, aex, aey + 10);
      g.fillStyle(chColor, reloading ? 0.12 : 0.3);
      g.fillCircle(aex, aey, 8);

      this.drawCannon(g);

      // Reload arc around cannon base (fills as reload progresses)
      if (reloading) {
        g.lineStyle(5, 0x444444, 0.35);
        g.strokeCircle(CANNON_X, CANNON_Y, 28);
        g.lineStyle(5, 0xff9900, 0.9);
        g.beginPath();
        g.arc(CANNON_X, CANNON_Y, 28,
              -Math.PI / 2,
              -Math.PI / 2 + reloadFrac * Math.PI * 2,
              false, 0.02);
        g.strokePath();
      }

      // Update and draw targets
      var toRemove = [];
      this.targets.forEach(function (tgt) {
        var elapsed = time - tgt.born;

        if (!tgt.hit && !tgt.expired) {
          tgt.s = Math.min(1, tgt.s + 0.05); // pop-in scale
          if (elapsed >= TIMEOUT_MS) {
            tgt.expired = true;
            self.showPop(tgt.x, tgt.y - 48, '⌛');
            self.time.delayedCall(400, function () { self.spawnTarget(); });
          }
        } else if (tgt.done || tgt.expired) {
          tgt.s = Math.max(0, tgt.s - 0.1); // pop-out scale
        }

        if (tgt.s > 0) {
          self.drawTarget(g, tgt, time, elapsed);
          var ly = tgt.y - 58 * tgt.s;
          tgt.label.setPosition(tgt.x, ly).setAlpha(tgt.hit ? 0.4 : tgt.s);
          tgt.emoji.setPosition(tgt.x, ly - tgt.label.height - 2).setAlpha(tgt.hit ? 0.4 : tgt.s);
        } else if (tgt.done || tgt.expired) {
          tgt.label.destroy(); tgt.emoji.destroy();
          toRemove.push(tgt);
        }
      });
      toRemove.forEach(function (tgt) {
        self.targets = self.targets.filter(function (u) { return u !== tgt; });
      });
    },

    // ── [CANNON] Draw the rotating cannon ────────────────────────
    drawCannon: function (g) {
      g.fillStyle(0x795548);
      g.fillRect(CANNON_X - 30, CANNON_Y + 14, 60, 14);
      g.fillStyle(0x5d4037);
      g.fillCircle(CANNON_X, CANNON_Y, 22);
      g.lineStyle(3, 0x3e2723);
      g.strokeCircle(CANNON_X, CANNON_Y, 22);

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
      g.fillStyle(0x212121);
      g.fillCircle(CANNON_X + cos * len, CANNON_Y + sin * len, 9);
    },

    // ── Draw one bullseye target ──────────────────────────────────
    drawTarget: function (g, tgt, time, elapsed) {
      var frac  = tgt.hit ? 1 : Math.max(0, (TIMEOUT_MS - elapsed) / TIMEOUT_MS);
      var shake = (!tgt.hit && !tgt.expired && elapsed > TIMEOUT_MS - 1200)
        ? Math.sin(time * 0.04) * 4 : 0;
      var cx = tgt.x + shake, cy = tgt.y;

      if (tgt.hit && !tgt.done) g.setAlpha(0.45);

      // Pole from target down to ground
      g.fillStyle(0x7d6b5a);
      g.fillRect(cx - 4, cy, 8, (GROUND_Y - cy) * tgt.s);

      // Bullseye rings outer → inner
      for (var ri = 0; ri < RING_R.length; ri++) {
        g.fillStyle(RING_C[ri]);
        g.fillCircle(cx, cy, RING_R[ri] * tgt.s);
      }
      g.lineStyle(1, 0x00000022);
      g.lineBetween(cx - 32 * tgt.s, cy, cx + 32 * tgt.s, cy);
      g.lineBetween(cx, cy - 32 * tgt.s, cx, cy + 32 * tgt.s);

      // Countdown arc (green → yellow → red) just outside the outermost ring
      if (!tgt.hit && !tgt.expired && tgt.s > 0.3) {
        var arcColor = frac > 0.5 ? 0x27ae60 : frac > 0.25 ? 0xf39c12 : 0xe74c3c;
        g.lineStyle(4 * tgt.s, arcColor);
        g.beginPath();
        g.arc(cx, cy, 40 * tgt.s, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false, 0.02);
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
