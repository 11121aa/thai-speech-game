// ============================================================
//  AIRPLANE GAME — Phaser 3 Scene  (Flappy-Bird style)
// ============================================================
//  POLISH GUIDE (search for the label):
//    [TUNE]    Gravity, flap strength, speed   (~line 18)
//    [SKY]     Sky / ground colours            (~drawBg)
//    [CLOUDS]  Cloud count & shape             (~create / drawCloud)
//    [PLANE]   Plane colours & shape           (~drawPlane)
//    [BUBBLE]  Bubble size, colours            (~spawnBubble / drawBubble)
//    [POP]     Score pop style                 (~showPop)
// ============================================================

function createAirplaneGame(words, callbacks) {

  // ── [TUNE] Difficulty knobs ────────────────────────────────
  var GRAVITY     =  0.19;   // downward acceleration per frame
  var FLAP_VY     = -7.5;    // velocity applied on tap
  var BUBBLE_SPD  =  2.4;    // bubble scroll speed (px/frame)
  var TOTAL_PROG  = 2400;    // world distance = level length
  var CLOUD_COUNT =  5;      // number of clouds
  var W = 800, H = 380;
  var GROUND_Y = H - 50;     // y where grass starts
  var PLANE_X  = 130;        // fixed horizontal position of plane

  // ── Scene class ────────────────────────────────────────────
  var AirScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'airplane' });
      this.isPaused = false;
      this.planeY   = H / 2;
      this.planeVY  = 0;
      this.progress = 0;
      this.wordIdx  = 0;
      this.bubbles  = [];
      this.clouds   = [];
    },

    create: function () {
      var self = this;

      // Graphics layers
      this.bgGfx  = this.add.graphics(); // sky + ground (static)
      this.dynGfx = this.add.graphics(); // plane + bubbles + clouds (redrawn each frame)

      this.drawBg();

      // Progress bar (teal fill, dark track)
      this.progTrack = this.add.graphics();
      this.progFill  = this.add.graphics();
      this.progTrack.fillStyle(0xcccccc);
      this.progTrack.fillRect(20, H - 14, W - 40, 7);
      this.progFlagText = this.add.text(20, H - 6, '🏁', { fontSize: '14px' }).setOrigin(0, 1);

      // [CLOUDS] Generate clouds with random positions & sizes
      for (var i = 0; i < CLOUD_COUNT; i++) {
        this.clouds.push({
          x:   60 + Math.random() * W * 1.8,
          y:   25 + Math.random() * 110,
          rw:  65 + Math.random() * 70,   // half-width  — POLISH: larger = fluffier
          spd: 0.55 + Math.random() * 0.6 // scroll speed — POLISH: faster = windier
        });
      }

      // Tap / click to flap
      this.input.on('pointerdown', function () {
        if (!self.isPaused) { self.planeVY = FLAP_VY; }
      });

      // Hint text (auto-hides after 3 s)
      this.hintText = this.add.text(W / 2, 45, 'แตะหน้าจอเพื่อบินขึ้น! ✈️', {
        fontFamily: 'Prompt, sans-serif',
        fontSize:   '18px',
        fontStyle:  'bold',
        color:      '#2b2438',
        backgroundColor: '#ffffffaa',
        padding:    { x: 10, y: 5 }
      }).setOrigin(0.5).setDepth(10);
      this.time.delayedCall(3000, function () {
        self.tweens.add({ targets: self.hintText, alpha: 0, duration: 600,
          onComplete: function () { self.hintText.destroy(); self.hintText = null; }
        });
      });

      // Spawn two bubbles at start
      this.spawnBubble();
      this.spawnBubble();
    },

    // ── [SKY] Background ──────────────────────────────────────
    drawBg: function () {
      var g = this.bgGfx;
      var bands = 20;
      for (var i = 0; i < bands; i++) {
        var t  = i / bands;
        var r  = Math.round(Phaser.Math.Linear(135, 197, t));
        var gv = Math.round(Phaser.Math.Linear(206, 232, t));
        var b  = Math.round(Phaser.Math.Linear(235, 247, t));
        g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b));
        g.fillRect(0, i * (GROUND_Y / bands), W, GROUND_Y / bands + 1);
      }
      g.fillStyle(0x5dba5d); g.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    },

    // ── Spawn one bubble ──────────────────────────────────────
    // [BUBBLE] Change radius (32) or bubble colour here
    spawnBubble: function () {
      if (!words.length) return;
      var word = words[this.wordIdx++ % words.length];
      var y    = 70 + Math.random() * (GROUND_Y - 150);

      var label = this.add.text(W + 60, y + 16, word.word, {
        fontFamily: 'Prompt, sans-serif',
        fontSize:   '11px',
        fontStyle:  'bold',
        color:      '#2b2438'
      }).setOrigin(0.5, 0).setDepth(3);

      var emojiTxt = this.add.text(W + 60, y - 6, word.emoji || '🔸', {
        fontSize: '17px'
      }).setOrigin(0.5, 1).setDepth(3);

      this.bubbles.push({
        x: W + 60, y: y,
        hit: false,
        word: word,
        label: label,
        emoji: emojiTxt
      });
    },

    // ── Per-frame update ──────────────────────────────────────
    update: function () {
      if (this.isPaused) return;
      var self = this;

      // Physics
      this.planeVY += GRAVITY;
      this.planeY  += this.planeVY;
      if (this.planeY > GROUND_Y - 28) { this.planeY = GROUND_Y - 28; this.planeVY = 0; }
      if (this.planeY < 18)            { this.planeY = 18;            this.planeVY = 0; }

      // Progress
      this.progress += 2;
      if (this.progress >= TOTAL_PROG) { callbacks.onFinish(); return; }

      // Clouds drift left
      this.clouds.forEach(function (c) {
        c.x -= c.spd;
        if (c.x < -c.rw - 40) c.x = W + c.rw;
      });

      // Bubbles scroll left; auto-spawn when screen is sparse
      var activeBubbles = this.bubbles.filter(function (b) { return !b.hit; });
      this.bubbles.forEach(function (b) {
        if (!b.hit) {
          b.x -= BUBBLE_SPD;
          b.label.x = b.x;
          b.emoji.x = b.x;
        }
      });

      // Remove off-screen bubbles
      this.bubbles = this.bubbles.filter(function (b) {
        if (b.x < -80) { b.label.destroy(); b.emoji.destroy(); return false; }
        return true;
      });
      if (activeBubbles.length < 3) this.spawnBubble();

      // Collision: plane touches bubble
      for (var i = this.bubbles.length - 1; i >= 0; i--) {
        var b = this.bubbles[i];
        if (b.hit) continue;
        var dx = PLANE_X - b.x, dy = this.planeY - b.y;
        if (dx * dx + dy * dy < 46 * 46) {
          b.hit = true;
          b.label.destroy();
          b.emoji.destroy();
          this.isPaused = true;
          var bRef = b, bIdx = i;
          callbacks.onPractice(b.word, null, function () {
            self.isPaused = false;
            self.bubbles = self.bubbles.filter(function (u) { return u !== bRef; });
            self.spawnBubble();
          });
          break;
        }
      }

      this.draw();
      this.updateProgress();
    },

    // ── Progress bar ─────────────────────────────────────────
    updateProgress: function () {
      var pw = Math.min(1, this.progress / TOTAL_PROG) * (W - 40);
      this.progFill.clear();
      this.progFill.fillStyle(0x2ec4b6);
      this.progFill.fillRect(20, H - 14, pw, 7);
      this.progFlagText.x = 20 + pw;
    },

    // ── Draw frame ────────────────────────────────────────────
    draw: function () {
      var g = this.dynGfx;
      g.clear();

      // [CLOUDS] Draw clouds
      this.clouds.forEach(function (c) { this.drawCloud(g, c); }, this);

      // [BUBBLE] Draw bubbles
      this.bubbles.forEach(function (b) { if (!b.hit) this.drawBubble(g, b); }, this);

      // [PLANE] Draw plane
      this.drawPlane(g, PLANE_X, this.planeY, this.planeVY);
    },

    // ── [CLOUDS] Cloud shape ──────────────────────────────────
    drawCloud: function (g, c) {
      g.fillStyle(0xffffff, 0.85);
      g.fillEllipse(c.x,              c.y,      c.rw * 2,        50);
      g.fillEllipse(c.x - c.rw * 0.36, c.y + 10, c.rw * 1.1,   40);
      g.fillEllipse(c.x + c.rw * 0.3,  c.y + 8,  c.rw,         36);
    },

    // ── [BUBBLE] Word bubble ──────────────────────────────────
    // Change fillStyle colour, radius (32), or lineStyle for a different look
    drawBubble: function (g, b) {
      g.fillStyle(0xffffff, 0.93);
      g.lineStyle(2.5, 0x2ec4b6);
      g.fillCircle(b.x, b.y, 32);
      g.strokeCircle(b.x, b.y, 32);
    },

    // ── [PLANE] Airplane ─────────────────────────────────────
    // Edit colours and shapes here — each comment marks a part
    drawPlane: function (g, x, y, vy) {
      var tilt = Phaser.Math.Clamp(vy * 0.05, -0.45, 0.45);
      // Phaser Graphics has no rotate-around-point, so we offset manually
      var cos = Math.cos(tilt), sin = Math.sin(tilt);

      // Helper: draw a rotated rect relative to (x,y)
      function rRect(rx, ry, rw, rh, color) {
        g.fillStyle(color);
        // Rotate corners and draw as polygon
        var corners = [
          [rx,      ry],
          [rx + rw, ry],
          [rx + rw, ry + rh],
          [rx,      ry + rh]
        ].map(function (p) {
          return { x: x + p[0]*cos - p[1]*sin, y: y + p[0]*sin + p[1]*cos };
        });
        g.fillPoints(corners, true);
      }

      // Body (white fuselage)
      g.fillStyle(0xffffff);
      g.fillEllipse(
        x + -0 * cos - 0 * sin,
        y + -0 * sin + 0 * cos,
        84, 28
      );
      // Left wing (top)
      rRect(5, -2, -17, -24, 0x2ec4b6);   // POLISH: change colour for wing colour
      // Tail fin
      rRect(-30, 2, -12, -14, 0x2ec4b6);
      // Window
      g.fillStyle(0x87ceeb);
      g.fillEllipse(x + 12*cos, y + 12*sin, 16, 12);
      // Engine nozzle
      rRect(42, -8, 12, 8, 0xff9f1c);      // POLISH: change colour for engine colour
    },

    // ── [POP] Floating text ───────────────────────────────────
    showPop: function (x, y, text) {
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif',
        fontSize:   '20px',
        fontStyle:  'bold',
        color:      '#ff9f1c',
        stroke:     '#ffffff',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(10);
      this.tweens.add({
        targets: pop, y: y - 45, alpha: 0, duration: 800, ease: 'Power2',
        onComplete: function () { pop.destroy(); }
      });
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'airplaneGame',
    width:  W,
    height: H,
    scale:  { mode: Phaser.Scale.NONE },
    scene:  AirScene,
    audio:  { noAudio: true }
  });
}

// Public API
var AirplaneGame = (function () {
  var game = null;
  function start(words, cbs) {
    stop();
    setTimeout(function () { game = createAirplaneGame(words, cbs); }, 60);
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }
  return { start: start, stop: stop };
}());
