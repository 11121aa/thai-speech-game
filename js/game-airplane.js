// ============================================================
//  FLYING GAME — Phaser 3  (Subway-Surfers-style jetpack flight)
// ============================================================
//  [TUNE]      Follow speed, scroll speed, spawn rates   (~constants)
//  [COINS]     Coin trail shape/points                   (~spawnCoinTrail)
//  [WORDS]     Word bubble spawn + appearance             (~spawnWordItem, drawBubble)
//  [OBSTACLE]  Hazard spawn/appearance/collision          (~spawnObstacle, drawObstacles, hitObstacle)
//  [PLANE]     Plane colours & shape                      (~drawPlane)
// ============================================================
//  How the game works:
//    - Hold a finger/mouse button down anywhere on the canvas and drag
//      up/down — the plane eases toward the pointer's height, jetpack-style
//    - Winding coin trails give +2 ⭐ each
//    - A golden word bubble every so often → pronunciation practice
//      modal → +5 ⭐ bonus (on top of the shared +20 for a correct
//      recording) — each one collected also ramps the scroll speed up
//      a notch, so resuming after the modal feels like the start of a
//      faster leg rather than a random mid-flight jolt
//    - Hit a spiky hazard mine → game over immediately
//    - Otherwise the round ends when the shared HUD countdown timer runs out
// ============================================================

function createAirplaneGame(words, callbacks) {

  // ── [TUNE] ──────────────────────────────────────────────────
  var FOLLOW_RATE = 0.32;  // how quickly the plane eases toward the held pointer (per 60fps frame)
  var SCROLL_SPD_BASE = 6.5;  // starting world scroll speed (px/frame at 60fps) — fast!
  var SCROLL_SPD_MAX  = 15;   // speed cap so it never becomes unplayable
  var SPEED_STEP = 1.3;       // scroll speed added per word collected — applied while paused
                               // for the practice modal, so resuming feels like a fresh, faster
                               // leg of the flight rather than a jolt mid-flight
  var COIN_INTERVAL = 750;                  // ms between coin-trail spawns
  var WORD_INTERVAL_MIN = 3500, WORD_INTERVAL_MAX = 6000; // ms range between word bubbles
  var OBSTACLE_INTERVAL_MIN = 2200, OBSTACLE_INTERVAL_MAX = 3600; // ms range between hazards
  var COIN_PTS = 2, WORD_BONUS_PTS = 5;
  var PLANE_X = 140;   // fixed horizontal position of the plane
  var PLANE_R = 15;    // plane hitbox radius
  var COIN_R = 12;
  var OBSTACLE_R = 15;
  var W = 800, H = 480;
  var GROUND_Y = H - 58;
  var TOP_MARGIN = 70; // keeps the plane clear of the big score text

  var FlapScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'flappy' });
      this.planeY        = H / 2;
      this.targetY        = H / 2;
      this.planeVY        = 0; // purely cosmetic (drives the tilt/lean in drawPlane)
      this.isHolding      = false;
      this.coins          = [];
      this.wordItems      = [];
      this.obstacles      = [];
      this.clouds        = [];
      this.score         = 0;
      this.scrollOff      = 0;
      this.coinTimer      = 0;
      this.wordTimer      = 0;
      this.obstacleTimer  = 0;
      this.nextWordDelay  = WORD_INTERVAL_MIN + Math.random() * (WORD_INTERVAL_MAX - WORD_INTERVAL_MIN);
      this.nextObstacleDelay = OBSTACLE_INTERVAL_MIN + Math.random() * (OBSTACLE_INTERVAL_MAX - OBSTACLE_INTERVAL_MIN);
      this.speedLevel     = 0;    // +1 per word collected — ramps curSpeed()
      this.isPaused       = false; // true while the practice modal is open
      this.dead           = false; // true once an obstacle is hit — freezes play, then finishes
    },

    preload: function () {
      this.load.audio('CoinSFX', 'soundeffect/CoinSFX.mp3');
      this.load.audio('ExplosionSFX', 'soundeffect/ExplosionSFX.mp3');
    },

    create: function () {
      var self = this;

      // Static background drawn once
      this.bgGfx = this.add.graphics().setDepth(0);
      this.drawBg();

      var ca = this.cache.audio;
      this.sfxCoin = ca.exists('CoinSFX')      ? this.sound.add('CoinSFX',      { volume: 0.6  }) : null;
      this.sfxHit  = ca.exists('ExplosionSFX') ? this.sound.add('ExplosionSFX', { volume: 0.65 }) : null;

      // Cloud layer
      this.cloudGfx = this.add.graphics().setDepth(1);
      for (var i = 0; i < 5; i++) {
        this.clouds.push({
          x:   Math.random() * W,
          y:   20 + Math.random() * 100,
          rw:  55 + Math.random() * 60,
          spd: 0.38 + Math.random() * 0.5
        });
      }

      // Main dynamic layer (coins, words, plane, ground)
      this.gfx = this.add.graphics().setDepth(2);

      // Score (top centre)
      this.scoreTxt = this.add.text(W / 2, 18, '0', {
        fontFamily: 'Prompt, sans-serif',
        fontSize: '46px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#1a1a2e', strokeThickness: 6
      }).setOrigin(0.5, 0).setDepth(10);

      // Fading instructional hint
      this.hint = this.add.text(W / 2, H - 16,
        '👆 กดค้างแล้วลากขึ้น-ลง เพื่อบิน — เก็บเหรียญ 🪙 และคำ 💬 หลบหนาม 💥', {
          fontFamily: 'Prompt, sans-serif', fontSize: '14px', color: '#2b2438',
          backgroundColor: '#ffffffaa', padding: { x: 8, y: 4 }
        }).setOrigin(0.5, 1).setDepth(10);
      this.time.delayedCall(4000, function () {
        self.tweens.add({ targets: self.hint, alpha: 0, duration: 600,
          onComplete: function () { self.hint.destroy(); self.hint = null; }
        });
      });

      // ── Input: hold + drag to set the plane's target height ─────────
      this.input.on('pointerdown', function (ptr) {
        self.isHolding = true;
        self.targetY = ptr.y;
      });
      this.input.on('pointermove', function (ptr) {
        if (self.isHolding) self.targetY = ptr.y;
      });
      this.input.on('pointerup',        function () { self.isHolding = false; });
      this.input.on('pointerupoutside', function () { self.isHolding = false; });
    },

    // ── [SKY] Static background ──────────────────────────────────
    drawBg: function () {
      var g = this.bgGfx;
      var bands = 24;
      for (var i = 0; i < bands; i++) {
        var t  = i / bands;
        var r  = Math.round(Phaser.Math.Linear(80,  172, t));
        var gv = Math.round(Phaser.Math.Linear(168, 220, t));
        var b  = Math.round(Phaser.Math.Linear(230, 246, t));
        g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b));
        g.fillRect(0, i * (GROUND_Y / bands), W, GROUND_Y / bands + 1);
      }
      // Ground — brown dirt base + grass top
      g.fillStyle(0x8d6e40); g.fillRect(0, GROUND_Y,     W, H - GROUND_Y);
      g.fillStyle(0x5cb85c); g.fillRect(0, GROUND_Y,     W, 12);
      g.fillStyle(0x4aaa4a); g.fillRect(0, GROUND_Y + 2, W, 5);
    },

    // ── [COINS] A winding S-curve trail of coins to follow by dragging
    spawnCoinTrail: function () {
      var centerY = TOP_MARGIN + 40 + Math.random() * (GROUND_Y - TOP_MARGIN - 80);
      var amp = 50 + Math.random() * 50;
      var n = 7;
      for (var i = 0; i < n; i++) {
        var x = W + 40 + i * 42;
        var y = centerY + Math.sin((i / (n - 1)) * Math.PI * 2) * amp;
        y = Phaser.Math.Clamp(y, TOP_MARGIN, GROUND_Y - 20);
        this.coins.push({ x: x, y: y, collected: false });
      }
    },

    // ── [WORDS] A single golden word bubble
    spawnWordItem: function () {
      if (!words.length) return;
      this.wordIdx = (this.wordIdx || 0);
      var word = words[this.wordIdx++ % words.length];
      this.wordItems.push({
        x: W + 60,
        y: TOP_MARGIN + 30 + Math.random() * (GROUND_Y - TOP_MARGIN - 60),
        word: word, collected: false
      });
    },

    // ── [OBSTACLE] A single hazard mine — hitting it ends the round
    spawnObstacle: function () {
      this.obstacles.push({
        x: W + 60,
        y: TOP_MARGIN + 30 + Math.random() * (GROUND_Y - TOP_MARGIN - 60),
        hit: false
      });
    },

    // Current world scroll speed — ramps up by SPEED_STEP per word collected
    curSpeed: function () {
      return Math.min(SCROLL_SPD_MAX, SCROLL_SPD_BASE + this.speedLevel * SPEED_STEP);
    },

    update: function (time, delta) {
      var self = this;
      var g    = this.gfx;
      var cg   = this.cloudGfx;
      g.clear();
      cg.clear();

      var dt = Math.min(delta, 50) / (1000 / 60);

      // Clouds always drift, even while paused for the practice modal
      this.clouds.forEach(function (c) {
        c.x -= c.spd * dt;
        if (c.x < -c.rw - 40) c.x = W + c.rw;
        cg.fillStyle(0xffffff, 0.82);
        cg.fillEllipse(c.x,               c.y,     c.rw * 2,    46);
        cg.fillEllipse(c.x - c.rw * 0.38, c.y + 9, c.rw * 1.1, 34);
        cg.fillEllipse(c.x + c.rw * 0.3,  c.y + 7, c.rw,       28);
      });

      if (this.dead) {
        this.drawGround(g);
        this.drawCoinsAndWords(g);
      this.drawObstacles(g);
        this.drawPlane(g, time);
        return;
      }

      if (this.isPaused) {
        this.drawGround(g);
        this.drawCoinsAndWords(g);
      this.drawObstacles(g);
        this.drawPlane(g, time);
        return;
      }

      var speed = this.curSpeed();

      // ── Flight: ease the plane toward the held pointer's height ─────
      var prevY = this.planeY;
      this.planeY += (this.targetY - this.planeY) * Math.min(1, FOLLOW_RATE * dt);
      this.planeY  = Phaser.Math.Clamp(this.planeY, TOP_MARGIN, GROUND_Y - PLANE_R);
      this.planeVY = this.planeY - prevY; // cosmetic — drives the tilt/lean only

      this.scrollOff = (this.scrollOff + speed * dt) % 80;

      // Spawn coin trails + word bubbles + obstacles on real-time intervals
      this.coinTimer += delta;
      if (this.coinTimer >= COIN_INTERVAL) {
        this.coinTimer -= COIN_INTERVAL;
        this.spawnCoinTrail();
      }
      this.wordTimer += delta;
      if (this.wordTimer >= this.nextWordDelay) {
        this.wordTimer -= this.nextWordDelay;
        this.nextWordDelay = WORD_INTERVAL_MIN + Math.random() * (WORD_INTERVAL_MAX - WORD_INTERVAL_MIN);
        this.spawnWordItem();
      }
      this.obstacleTimer += delta;
      if (this.obstacleTimer >= this.nextObstacleDelay) {
        this.obstacleTimer -= this.nextObstacleDelay;
        this.nextObstacleDelay = OBSTACLE_INTERVAL_MIN + Math.random() * (OBSTACLE_INTERVAL_MAX - OBSTACLE_INTERVAL_MIN);
        this.spawnObstacle();
      }

      // Move + cull coins
      this.coins.forEach(function (c) { c.x -= speed * dt; });
      this.coins = this.coins.filter(function (c) { return c.x > -30; });

      // Move + cull word bubbles
      this.wordItems.forEach(function (w) { w.x -= speed * dt; });
      this.wordItems = this.wordItems.filter(function (w) { return w.x > -80; });

      // Move + cull obstacles
      this.obstacles.forEach(function (o) { o.x -= speed * dt; });
      this.obstacles = this.obstacles.filter(function (o) { return o.x > -30; });

      // Coin collection
      this.coins.forEach(function (c) {
        if (c.collected) return;
        var dx = PLANE_X - c.x, dy = self.planeY - c.y;
        if (dx * dx + dy * dy < (PLANE_R + COIN_R) * (PLANE_R + COIN_R)) {
          c.collected = true;
          self.score += COIN_PTS;
          self.scoreTxt.setText('' + self.score);
          callbacks.onPoints(COIN_PTS);
          if (self.sfxCoin) self.sfxCoin.play();
          self.showPop(c.x, c.y - 16, '+' + COIN_PTS);
        }
      });
      this.coins = this.coins.filter(function (c) { return !c.collected; });

      // Word bubble collection → pronunciation practice. The speed ramp is
      // applied only once paused/resumed here, not mid-flight, so it reads
      // as "catch your breath, next leg is faster" rather than a sudden jolt.
      this.wordItems.forEach(function (w) {
        if (w.collected || self.isPaused) return;
        var dx = PLANE_X - w.x, dy = self.planeY - w.y;
        if (dx * dx + dy * dy < 34 * 34) {
          w.collected = true;
          self.isPaused = true;
          callbacks.onPractice(w.word, null, function () {
            self.isPaused = false;
            self.speedLevel++;
            self.score += WORD_BONUS_PTS;
            self.scoreTxt.setText('' + self.score);
            callbacks.onPoints(WORD_BONUS_PTS);
            self.showPop(PLANE_X, self.planeY - 30, '+' + WORD_BONUS_PTS + ' ⭐ เร็วขึ้น!');
          });
        }
      });
      this.wordItems = this.wordItems.filter(function (w) { return !w.collected; });

      // Obstacle collision → game over. Skipped if a word bubble was just
      // collected this same frame (isPaused flips true above) — otherwise
      // an overlapping word+obstacle could trigger a game-over right as
      // the practice modal is opening.
      for (var i = 0; i < this.obstacles.length && !this.isPaused; i++) {
        var o = this.obstacles[i];
        if (o.hit) continue;
        var odx = PLANE_X - o.x, ody = self.planeY - o.y;
        if (odx * odx + ody * ody < (PLANE_R + OBSTACLE_R) * (PLANE_R + OBSTACLE_R)) {
          o.hit = true;
          this.hitObstacle();
          break;
        }
      }

      this.drawGround(g);
      this.drawCoinsAndWords(g);
      this.drawObstacles(g);
      this.drawPlane(g, time);
    },

    // ── Obstacle hit — freeze play, flash/pop, then end the round ───
    hitObstacle: function () {
      var self = this;
      this.dead = true;
      if (this.sfxHit) this.sfxHit.play();
      this.showPop(PLANE_X, this.planeY - 30, '💥 ชนแล้ว!');
      var flash = this.add.rectangle(W / 2, H / 2, W, H, 0xff0000, 0.35).setDepth(20);
      this.tweens.add({ targets: flash, alpha: 0, duration: 500, onComplete: function () { flash.destroy(); } });
      this.time.delayedCall(700, function () { callbacks.onFinish(); });
    },

    // Scrolling ground tile pattern drawn over the static base
    drawGround: function (g) {
      var off = (this.scrollOff % 80 + 80) % 80;
      for (var gx = -off; gx < W + 80; gx += 80) {
        g.fillStyle(0x4aaa4a, 0.65);
        g.fillRect(gx,      GROUND_Y, 40, 12);
        g.fillStyle(0x5cb85c, 0.65);
        g.fillRect(gx + 40, GROUND_Y, 40, 12);
      }
    },

    // ── [COINS]/[WORDS] Draw coins + word bubbles ──────────────────
    drawCoinsAndWords: function (g) {
      var self = this;
      var now = this.time.now;

      this.coins.forEach(function (c) {
        if (c.x < -30 || c.x > W + 30) return;
        var bob = Math.sin(now * 0.004 + c.x * 0.02) * 3;
        g.fillStyle(0xffd700);
        g.lineStyle(2, 0xb8860b);
        g.fillCircle(c.x, c.y + bob, COIN_R);
        g.strokeCircle(c.x, c.y + bob, COIN_R);
        g.fillStyle(0xfff2a8);
        g.fillCircle(c.x - 3, c.y + bob - 3, COIN_R * 0.35);
      });

      this.wordItems.forEach(function (w) {
        if (w.collected || w.x < -80 || w.x > W + 80) return;
        self.drawBubble(g, w.x, w.y);
        var et = self.add.text(w.x, w.y - 6, w.word.emoji || '🔸',
          { fontSize: '16px' }).setOrigin(0.5, 1).setDepth(5);
        var wt = self.add.text(w.x, w.y + 8, w.word.word,
          { fontFamily: 'Prompt', fontSize: '12px', fontStyle: 'bold', color: '#2b2438' })
          .setOrigin(0.5, 0).setDepth(5);
        self.time.delayedCall(16, function () { et.destroy(); wt.destroy(); });
      });
    },

    // ── [OBSTACLE] Spiky dark mine — clearly distinct from coins/words
    drawObstacles: function (g) {
      this.obstacles.forEach(function (o) {
        if (o.hit || o.x < -30 || o.x > W + 30) return;
        g.fillStyle(0xe74c3c, 0.25);
        g.fillCircle(o.x, o.y, OBSTACLE_R + 6);
        g.fillStyle(0x2b2438);
        g.fillCircle(o.x, o.y, OBSTACLE_R);
        g.lineStyle(3, 0xe74c3c);
        for (var s = 0; s < 8; s++) {
          var ang = (s / 8) * Math.PI * 2;
          var ix = o.x + Math.cos(ang) * OBSTACLE_R;
          var iy = o.y + Math.sin(ang) * OBSTACLE_R;
          var ox = o.x + Math.cos(ang) * (OBSTACLE_R + 8);
          var oy = o.y + Math.sin(ang) * (OBSTACLE_R + 8);
          g.beginPath();
          g.moveTo(ix, iy);
          g.lineTo(ox, oy);
          g.strokePath();
        }
      });
    },

    // ── [WORDS] Word bubble in the gap center ───────────────────
    drawBubble: function (g, x, y) {
      g.fillStyle(0xffd700, 0.28);
      g.fillCircle(x, y, 38);
      g.fillStyle(0xfffde7, 0.95);
      g.lineStyle(3, 0xf39c12);
      g.fillCircle(x, y, 30);
      g.strokeCircle(x, y, 30);
      g.fillStyle(0xffec6e, 0.45);
      g.fillCircle(x, y, 20);
    },

    // ── [PLANE] Red-and-white cartoon airplane, side view ─────────
    drawPlane: function (g, time) {
      var x  = PLANE_X;
      var y  = this.planeY;
      var vy = this.planeVY;

      // Tilt: leans in the direction it's currently easing toward
      var tilt = Phaser.Math.Clamp(vy * 0.1, -0.45, 0.45);
      var cos  = Math.cos(tilt);
      var sin  = Math.sin(tilt);

      function rPt(lx, ly) {
        return { x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos };
      }

      // Shadow (only when near ground)
      var shadowAlpha = Math.max(0, 1 - (GROUND_Y - y) / (H * 0.6));
      if (shadowAlpha > 0.05) {
        g.fillStyle(0x000000, shadowAlpha * 0.18);
        g.fillEllipse(x, GROUND_Y - 4, 34, 8);
      }

      // Speed lines trailing behind — sells "way faster"
      for (var s = 0; s < 3; s++) {
        var sp = rPt(-30 - s * 10, -6 + s * 6);
        g.lineStyle(2.5, 0xffffff, 0.5 - s * 0.13);
        g.beginPath();
        g.moveTo(sp.x, sp.y);
        g.lineTo(sp.x - 16, sp.y);
        g.strokePath();
      }

      // Horizontal tail stabilizer (small flat fins at the back)
      var hstabPts = [
        rPt(-16, -2),
        rPt(-27, -9),
        rPt(-27,  9),
        rPt(-16,  2)
      ];
      g.fillStyle(0xc0392b);
      g.fillPoints(hstabPts, true);

      // Vertical tail fin
      var finPts = [
        rPt(-14, -1),
        rPt(-24, -14),
        rPt(-17, -1)
      ];
      g.fillStyle(0xe74c3c);
      g.fillPoints(finPts, true);

      // Main wing (crosses the fuselage, swept slightly back)
      var wingPts = [
        rPt(6,  -3),
        rPt(-8, -28),
        rPt(-16, -26),
        rPt(-4,  -2)
      ];
      var wingPtsLo = [
        rPt(6,   3),
        rPt(-8,  28),
        rPt(-16, 26),
        rPt(-4,   2)
      ];
      g.fillStyle(0xd32f2f);
      g.fillPoints(wingPts, true);
      g.fillPoints(wingPtsLo, true);

      // Fuselage (tapered capsule, nose pointing right)
      var bodyPts = [
        rPt(26,  0),
        rPt(16, -7),
        rPt(-16, -8),
        rPt(-24, -3),
        rPt(-24,  3),
        rPt(-16,  8),
        rPt(16,   7)
      ];
      g.fillStyle(0xe74c3c);
      g.fillPoints(bodyPts, true);

      // White stripe along the belly
      var stripePts = [
        rPt(14, 4),
        rPt(-16, 5),
        rPt(-16, 7.5),
        rPt(14, 6.5)
      ];
      g.fillStyle(0xffffff);
      g.fillPoints(stripePts, true);

      // Cockpit window
      var cp = rPt(9, -3);
      g.fillStyle(0x81d4fa);
      g.lineStyle(1.5, 0x0277bd);
      g.fillCircle(cp.x, cp.y, 5);
      g.strokeCircle(cp.x, cp.y, 5);

      // Spinning propeller blur at the nose
      var noseP = rPt(27, 0);
      var blur = 6 + Math.sin(time * 0.09) * 2;
      g.fillStyle(0x555555, 0.55);
      g.fillEllipse(noseP.x, noseP.y, blur, 16);
      g.fillStyle(0xffc107);
      g.fillCircle(noseP.x, noseP.y, 2.5);
    },

    // ── [POP] Floating score popup ───────────────────────────────
    showPop: function (x, y, text) {
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif', fontSize: '20px', fontStyle: 'bold',
        color: '#ff9f1c', stroke: '#ffffff', strokeThickness: 3
      }).setOrigin(0.5).setDepth(15);
      this.tweens.add({
        targets: pop, y: y - 48, alpha: 0, duration: 900, ease: 'Power2',
        onComplete: function () { pop.destroy(); }
      });
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'airplaneGame',
    width:  W,
    height: H,
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, autoRound: true },
    scene:  FlapScene,
    audio:  { noAudio: false }
  });
}

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
