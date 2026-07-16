// ============================================================
//  FLYING GAME — Phaser 3  (Subway-Surfers-style jetpack flight)
// ============================================================
//  [TUNE]    Follow speed, scroll speed, spawn rates   (~constants)
//  [COINS]   Coin trail shape/points                   (~spawnCoinTrail)
//  [WORDS]   Word bubble spawn + appearance             (~spawnWordItem, drawBubble)
//  [BIRD]    Bird colours & shape                       (~drawBird)
// ============================================================
//  How the game works:
//    - Hold a finger/mouse button down anywhere on the canvas and drag
//      up/down — the bird eases toward the pointer's height, jetpack-style
//    - No obstacles, no death — just fly and collect
//    - Winding coin trails give +2 ⭐ each
//    - A golden word bubble every so often → pronunciation practice
//      modal → +5 ⭐ bonus (on top of the shared +20 for a correct
//      recording)
//    - The round ends when the shared HUD countdown timer runs out
// ============================================================

function createAirplaneGame(words, callbacks) {

  // ── [TUNE] ──────────────────────────────────────────────────
  var FOLLOW_RATE = 0.22;  // how quickly the bird eases toward the held pointer (per 60fps frame)
  var SCROLL_SPD  = 2.4;   // world scroll speed (px/frame at 60fps)
  var COIN_INTERVAL = 1500;                 // ms between coin-trail spawns
  var WORD_INTERVAL_MIN = 5000, WORD_INTERVAL_MAX = 9000; // ms range between word bubbles
  var COIN_PTS = 2, WORD_BONUS_PTS = 5;
  var BIRD_X = 140;    // fixed horizontal position of the bird
  var BIRD_R = 13;     // bird hitbox radius
  var COIN_R = 12;
  var W = 800, H = 480;
  var GROUND_Y = H - 58;
  var TOP_MARGIN = 70; // keeps the bird clear of the big score text

  var FlapScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'flappy' });
      this.birdY        = H / 2;
      this.targetY       = H / 2;
      this.birdVY        = 0; // purely cosmetic (drives the tilt/lean in drawBird)
      this.isHolding      = false;
      this.coins          = [];
      this.wordItems      = [];
      this.clouds        = [];
      this.score         = 0;
      this.scrollOff      = 0;
      this.coinTimer      = 0;
      this.wordTimer      = 0;
      this.nextWordDelay  = WORD_INTERVAL_MIN + Math.random() * (WORD_INTERVAL_MAX - WORD_INTERVAL_MIN);
      this.isPaused       = false; // true while the practice modal is open
    },

    preload: function () {
      this.load.audio('CoinSFX', 'soundeffect/CoinSFX.mp3');
    },

    create: function () {
      var self = this;

      // Static background drawn once
      this.bgGfx = this.add.graphics().setDepth(0);
      this.drawBg();

      var ca = this.cache.audio;
      this.sfxCoin = ca.exists('CoinSFX') ? this.sound.add('CoinSFX', { volume: 0.6 }) : null;

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

      // Main dynamic layer (coins, words, bird, ground)
      this.gfx = this.add.graphics().setDepth(2);

      // Score (top centre)
      this.scoreTxt = this.add.text(W / 2, 18, '0', {
        fontFamily: 'Prompt, sans-serif',
        fontSize: '46px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#1a1a2e', strokeThickness: 6
      }).setOrigin(0.5, 0).setDepth(10);

      // Fading instructional hint
      this.hint = this.add.text(W / 2, H - 16,
        '👆 กดค้างแล้วลากขึ้น-ลง เพื่อบิน — เก็บเหรียญ 🪙 และคำ 💬', {
          fontFamily: 'Prompt, sans-serif', fontSize: '14px', color: '#2b2438',
          backgroundColor: '#ffffffaa', padding: { x: 8, y: 4 }
        }).setOrigin(0.5, 1).setDepth(10);
      this.time.delayedCall(4000, function () {
        self.tweens.add({ targets: self.hint, alpha: 0, duration: 600,
          onComplete: function () { self.hint.destroy(); self.hint = null; }
        });
      });

      // ── Input: hold + drag to set the bird's target height ─────────
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

      if (this.isPaused) {
        this.drawGround(g);
        this.drawCoinsAndWords(g);
        this.drawBird(g, time);
        return;
      }

      // ── Flight: ease the bird toward the held pointer's height ─────
      var prevY = this.birdY;
      this.birdY += (this.targetY - this.birdY) * Math.min(1, FOLLOW_RATE * dt);
      this.birdY  = Phaser.Math.Clamp(this.birdY, TOP_MARGIN, GROUND_Y - BIRD_R);
      this.birdVY = this.birdY - prevY; // cosmetic — drives the tilt/lean only

      this.scrollOff = (this.scrollOff + SCROLL_SPD * dt) % 80;

      // Spawn coin trails + word bubbles on real-time intervals
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

      // Move + cull coins
      this.coins.forEach(function (c) { c.x -= SCROLL_SPD * dt; });
      this.coins = this.coins.filter(function (c) { return c.x > -30; });

      // Move + cull word bubbles
      this.wordItems.forEach(function (w) { w.x -= SCROLL_SPD * dt; });
      this.wordItems = this.wordItems.filter(function (w) { return w.x > -80; });

      // Coin collection
      this.coins.forEach(function (c) {
        if (c.collected) return;
        var dx = BIRD_X - c.x, dy = self.birdY - c.y;
        if (dx * dx + dy * dy < (BIRD_R + COIN_R) * (BIRD_R + COIN_R)) {
          c.collected = true;
          self.score += COIN_PTS;
          self.scoreTxt.setText('' + self.score);
          callbacks.onPoints(COIN_PTS);
          if (self.sfxCoin) self.sfxCoin.play();
          self.showPop(c.x, c.y - 16, '+' + COIN_PTS);
        }
      });
      this.coins = this.coins.filter(function (c) { return !c.collected; });

      // Word bubble collection → pronunciation practice
      this.wordItems.forEach(function (w) {
        if (w.collected || self.isPaused) return;
        var dx = BIRD_X - w.x, dy = self.birdY - w.y;
        if (dx * dx + dy * dy < 34 * 34) {
          w.collected = true;
          self.isPaused = true;
          callbacks.onPractice(w.word, null, function () {
            self.isPaused = false;
            self.score += WORD_BONUS_PTS;
            self.scoreTxt.setText('' + self.score);
            callbacks.onPoints(WORD_BONUS_PTS);
            self.showPop(BIRD_X, self.birdY - 30, '+' + WORD_BONUS_PTS + ' ⭐ ออกเสียงได้!');
          });
        }
      });
      this.wordItems = this.wordItems.filter(function (w) { return !w.collected; });

      this.drawGround(g);
      this.drawCoinsAndWords(g);
      this.drawBird(g, time);
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

    // ── [BIRD] Yellow cartoon bird ───────────────────────────────
    drawBird: function (g, time) {
      var x  = BIRD_X;
      var y  = this.birdY;
      var vy = this.birdVY;

      // Tilt: leans in the direction it's currently easing toward
      var tilt     = Phaser.Math.Clamp(vy * 0.12, -0.5, 0.5);
      var cos      = Math.cos(tilt);
      var sin      = Math.sin(tilt);
      var wingFlap = Math.sin(time * 0.018) * 9;

      function rPt(lx, ly) {
        return { x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos };
      }

      // Shadow (only when near ground)
      var shadowAlpha = Math.max(0, 1 - (GROUND_Y - y) / (H * 0.6));
      if (shadowAlpha > 0.05) {
        g.fillStyle(0x000000, shadowAlpha * 0.18);
        g.fillEllipse(x, GROUND_Y - 4, 30, 8);
      }

      // Tail feathers
      var tailPts = [
        rPt(-16, -3),
        rPt(-28, -11 + tilt * 6),
        rPt(-26,  0),
        rPt(-30,  7 - tilt * 6),
        rPt(-16,  6)
      ];
      g.fillStyle(0xf9a825);
      g.fillPoints(tailPts, true);

      // Wing (flaps up/down with time)
      var wingPts = [
        rPt(-5,  -5 - wingFlap),
        rPt(-20, -18 - wingFlap),
        rPt(-24, -9  - wingFlap * 0.5),
        rPt(-7,   5)
      ];
      g.fillStyle(0xfbc02d);
      g.fillPoints(wingPts, true);

      // Body (14-point ellipse, rotated)
      var bodyPts = [];
      for (var a = 0; a < 14; a++) {
        var ang = (a / 14) * Math.PI * 2;
        bodyPts.push(rPt(Math.cos(ang) * 19, Math.sin(ang) * 14));
      }
      g.fillStyle(0xffd600);
      g.fillPoints(bodyPts, true);

      // White belly patch
      var bellyPts = [];
      for (var a2 = 0; a2 < 10; a2++) {
        var ang2 = (a2 / 10) * Math.PI * 2;
        bellyPts.push(rPt(5 + Math.cos(ang2) * 10, 2 + Math.sin(ang2) * 9));
      }
      g.fillStyle(0xfff9c4);
      g.fillPoints(bellyPts, true);

      // Beak (orange triangle)
      var beakPts = [
        rPt(15, -4),
        rPt(28,  1),
        rPt(15,  5)
      ];
      g.fillStyle(0xff6d00);
      g.fillPoints(beakPts, true);

      // Eye
      var ep = rPt(10, -7);
      g.fillStyle(0xffffff);
      g.fillCircle(ep.x, ep.y, 6.5);
      var pp = rPt(12, -6);
      g.fillStyle(0x1a1a2e);
      g.fillCircle(pp.x, pp.y, 3.8);
      var hp = rPt(13.5, -7.5);
      g.fillStyle(0xffffff);
      g.fillCircle(hp.x, hp.y, 1.5);
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
