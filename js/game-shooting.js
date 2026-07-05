// ============================================================
//  SHOOTING GAME — Phaser 3 Scene
// ============================================================
//  POLISH GUIDE (search for the label to jump there):
//    [TUNE]   Timing / difficulty constants   (~line 15)
//    [RINGS]  Bullseye colours & ring sizes   (~line 21)
//    [SKY]    Sky / ground colours            (~drawBg)
//    [SPAWN]  Oscillation width & speed       (~spawnTarget)
//    [POP]    Score-pop text style            (~showPop)
//    [PLANE]  Point value per hit             (~onHit)
// ============================================================

function createShootingGame(words, callbacks) {

  // ── [TUNE] Difficulty knobs ────────────────────────────────
  var TIMEOUT_MS  = 5000;  // ms each target stays alive
  var MAX_TARGETS = 4;     // max targets visible at once
  var W = 800, H = 450;
  var GROUND_Y = H - 80;   // y of the grass line

  // ── [RINGS] Bullseye: largest ring first ───────────────────
  var RING_R = [46, 37, 27, 18, 10];
  var RING_C = [0xe74c3c, 0xffffff, 0x2980b9, 0xffffff, 0xf1c40f];

  // ── Scene class ────────────────────────────────────────────
  var ShootScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'shooting' });
      this.targets  = [];
      this.wordIdx  = 0;
      this.isPaused = false;
    },

    create: function () {
      var self = this;

      // Static background drawn once
      var bg = this.add.graphics();
      this.drawBg(bg);

      // Dynamic layer cleared every frame (targets, arcs)
      this.gfx = this.add.graphics();

      // Click / tap fires a shot
      this.input.on('pointerdown', function (ptr) {
        if (!self.isPaused) self.hitTest(ptr.x, ptr.y);
      });

      // Stagger the first four spawns so the screen fills gradually
      [0, 900, 1800, 2700].forEach(function (delay) {
        self.time.delayedCall(delay, function () { self.spawnTarget(); });
      });
    },

    // ── [SKY] Background ──────────────────────────────────────
    // Change the colour stops here for a different look
    drawBg: function (g) {
      // Approximate sky gradient with horizontal bands
      var bands = 24;
      for (var i = 0; i < bands; i++) {
        var t  = i / bands;
        var r  = Math.round(Phaser.Math.Linear(135, 184, t));
        var gv = Math.round(Phaser.Math.Linear(206, 223, t));
        var b  = Math.round(Phaser.Math.Linear(235, 245, t));
        g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b));
        g.fillRect(0, i * (GROUND_Y / bands), W, GROUND_Y / bands + 1);
      }
      // Grass stripe + dirt below
      g.fillStyle(0x4caf50); g.fillRect(0, GROUND_Y,      W, 10);
      g.fillStyle(0x795548); g.fillRect(0, GROUND_Y + 10, W, H - GROUND_Y - 10);
    },

    // ── Spawn one target ──────────────────────────────────────
    spawnTarget: function () {
      if (this.isPaused || !words.length) return;
      var active = this.targets.filter(function (t) {
        return !t.done && !t.expired;
      }).length;
      if (active >= MAX_TARGETS) return;

      var word = words[this.wordIdx++ % words.length];

      // Pick an x that doesn't crowd existing targets
      var tries = 0, bx, existing = this.targets;
      do {
        bx = 90 + Math.random() * (W - 180);
        tries++;
      } while (tries < 20 && existing.some(function (t) {
        return Math.abs(t.baseX - bx) < 130;
      }));

      // Word label (Phaser Text, repositioned each frame)
      var label = this.add.text(bx, 0, word.word, {
        fontFamily: 'Prompt, sans-serif',
        fontSize:   '14px',
        fontStyle:  'bold',
        color:      '#2b2438',
        backgroundColor: '#ffffffcc',
        padding:    { x: 8, y: 3 }
      }).setOrigin(0.5, 1).setDepth(2);

      var emoji = this.add.text(bx, 0, word.emoji || '🔸', {
        fontSize: '20px'
      }).setOrigin(0.5, 1).setDepth(2);

      this.targets.push({
        x: bx, baseX: bx,
        s: 0,               // scale 0→1 as target rises
        hit: false, done: false, expired: false,
        born: this.time.now,
        // [SPAWN] Tune oscillation here
        oscPhase: Math.random() * Math.PI * 2,
        oscSpeed: 1.2 + Math.random() * 1.4,   // cycles per second
        oscAmp:   28  + Math.random() * 32,    // pixels of side-to-side swing
        word: word,
        label: label,
        emoji: emoji
      });
    },

    // ── Hit detection ─────────────────────────────────────────
    hitTest: function (mx, my) {
      for (var i = this.targets.length - 1; i >= 0; i--) {
        var t = this.targets[i];
        if (t.hit || t.expired) continue;
        var cy = GROUND_Y - 90 * t.s;
        var r  = 52 * t.s;
        var dx = mx - t.x, dy = my - cy;
        if (dx * dx + dy * dy < r * r) {
          this.onHit(t);
          return;
        }
      }
    },

    onHit: function (t) {
      var self = this;
      t.hit = true;

      // [PLANE] Change point value here
      callbacks.onPoints(10);
      this.showPop(t.x, GROUND_Y - 155, '+10 ⭐');

      // Pause game while practice modal is open
      this.isPaused = true;
      callbacks.onPractice(t.word, null, function () {
        self.isPaused = false;
        t.done = true;
        self.time.delayedCall(700, function () { self.spawnTarget(); });
      });
    },

    // ── [POP] Floating score text ─────────────────────────────
    // Change fontSize, color, or stroke for a different pop style
    showPop: function (x, y, text) {
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif',
        fontSize:   '22px',
        fontStyle:  'bold',
        color:      '#ff9f1c',
        stroke:     '#ffffff',
        strokeThickness: 4
      }).setOrigin(0.5).setDepth(10);

      this.tweens.add({
        targets:  pop,
        y:        y - 55,
        alpha:    0,
        duration: 900,
        ease:     'Power2',
        onComplete: function () { pop.destroy(); }
      });
    },

    // ── Per-frame update ──────────────────────────────────────
    update: function (time) {
      if (this.isPaused) return;
      var g = this.gfx;
      g.clear();
      var self = this;
      var toRemove = [];

      this.targets.forEach(function (t) {
        var elapsed = time - t.born;

        if (!t.hit && !t.expired) {
          // Rise animation (grows from scale 0 to 1)
          t.s = Math.min(1, t.s + 0.06);
          // Horizontal oscillation
          t.x = t.baseX + Math.sin(t.oscPhase + elapsed * 0.001 * t.oscSpeed) * t.oscAmp;
          // Time-out
          if (elapsed >= TIMEOUT_MS) {
            t.expired = true;
            self.showPop(t.x, GROUND_Y - 155, '⌛');
            self.time.delayedCall(400, function () { self.spawnTarget(); });
          }
        } else if (t.done || t.expired) {
          // Shrink away
          t.s = Math.max(0, t.s - 0.13);
        }

        if (t.s > 0) {
          self.drawTarget(g, t, time, elapsed);
          // Reposition labels (they follow the target)
          var labelY = GROUND_Y - 162 * t.s;
          t.label.setPosition(t.x, labelY).setAlpha(t.hit ? 0.4 : t.s);
          t.emoji.setPosition(t.x, labelY - t.label.height - 2).setAlpha(t.hit ? 0.4 : t.s);
        } else if (t.done || t.expired) {
          t.label.destroy();
          t.emoji.destroy();
          toRemove.push(t);
        }
      });

      toRemove.forEach(function (t) {
        self.targets = self.targets.filter(function (u) { return u !== t; });
      });
    },

    // ── Draw one target ───────────────────────────────────────
    drawTarget: function (g, t, time, elapsed) {
      var timeLeft = t.hit ? TIMEOUT_MS : Math.max(0, TIMEOUT_MS - elapsed);
      var frac = timeLeft / TIMEOUT_MS;
      // Shake when almost expired
      var shake = (!t.hit && !t.expired && timeLeft < 1000)
        ? Math.sin(time * 0.03) * 5 : 0;
      var cx = t.x + shake;
      var cy = GROUND_Y - 90 * t.s; // centre of bullseye

      if (t.hit && !t.done) g.setAlpha(0.45);

      // Stand
      g.fillStyle(0x7d6b5a);
      g.fillRect(cx - 5, cy, 10, 90 * t.s);

      // [RINGS] Bullseye rings (outer → inner)
      for (var ri = 0; ri < RING_R.length; ri++) {
        g.fillStyle(RING_C[ri]);
        g.fillCircle(cx, cy, RING_R[ri] * t.s);
      }

      // Crosshair lines
      g.lineStyle(1, 0x00000025);
      g.lineBetween(cx - 46 * t.s, cy, cx + 46 * t.s, cy);
      g.lineBetween(cx, cy - 46 * t.s, cx, cy + 46 * t.s);

      // Timer arc (green → yellow → red)
      if (!t.hit && !t.expired && t.s > 0.2) {
        var arcColor = frac > 0.5 ? 0x27ae60 : frac > 0.25 ? 0xf39c12 : 0xe74c3c;
        g.lineStyle(5 * t.s, arcColor);
        g.beginPath();
        g.arc(cx, cy, 58 * t.s, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false, 0.02);
        g.strokePath();
      }

      g.setAlpha(1);
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'shootingGame',   // Phaser creates canvas inside this div
    width:  W,
    height: H,
    scale:  { mode: Phaser.Scale.NONE },
    scene:  ShootScene,
    audio:  { noAudio: true }
  });
}

// Public API used by game.html
var ShootingGame = (function () {
  var game = null;
  function start(words, cbs) {
    stop();
    // Small delay lets Phaser finish tearing down the previous instance
    setTimeout(function () { game = createShootingGame(words, cbs); }, 60);
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }
  return { start: start, stop: stop };
}());
