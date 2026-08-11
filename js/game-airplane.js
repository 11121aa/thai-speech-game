// ============================================================
//  FLYING GAME — Phaser 3  (top-down, 3-lane Subway-Surfers-style runner)
// ============================================================
//  [TUNE]      Scroll speed, spawn rates, lane geometry   (~constants)
//  [COINS]     Coin-string shape/points                   (~spawnCoinString)
//  [WORDS]     Word bubble spawn + appearance              (~spawnWordItem, drawBubble)
//  [OBSTACLE]  Hazard spawn/appearance/collision           (~spawnObstacle, drawObstacles, hitObstacle)
//  [PLANE]     Plane colours & shape                       (~drawPlane)
// ============================================================
//  How the game works:
//    - Tap the left/right half of the screen to swap the plane into the
//      lane on that side (3 fixed lanes) — same instant, forgiving
//      left/right control as Subway Surfers, just top-down instead of
//      third-person
//    - Everything scrolls toward the player from the top of the screen:
//      coin strings (+2 ⭐ each), golden word bubbles (pronunciation
//      practice → +5 ⭐ bonus, on top of the shared +20 for a correct
//      recording, and ramps the scroll speed up a notch on resume so it
//      reads as "next leg is faster" rather than a mid-run jolt), and
//      spiky hazards (hit = game over immediately). An obstacle spawn
//      always leaves at least one lane open.
//    - Otherwise the round ends when the shared HUD countdown timer runs out
// ============================================================

function createAirplaneGame(words, callbacks) {

  // ── [TUNE] ──────────────────────────────────────────────────
  var W = 480, H = 800;
  var LANE_COUNT = 3;
  var LANE_MARGIN = 90;                       // side margin so lanes aren't flush to the edges
  var LANE_W = (W - LANE_MARGIN * 2) / LANE_COUNT;
  var LANE_X = [0, 1, 2].map(function (i) { return LANE_MARGIN + LANE_W * (i + 0.5); });
  var LANE_SWITCH_RATE = 0.34;                // how quickly the plane eases into its new lane (per 60fps frame)
  var SCROLL_SPD_BASE = 6.5;                  // starting world scroll speed (px/frame at 60fps)
  var SCROLL_SPD_MAX  = 15;                   // speed cap so it never becomes unplayable
  var SPEED_STEP = 1.3;                       // scroll speed added per word collected — applied while
                                               // paused for the practice modal, so resuming feels like a
                                               // fresh, faster leg rather than a jolt mid-run
  var COIN_INTERVAL = 750;                    // ms between coin-string spawns
  var COIN_STRING_LEN = 5, COIN_GAP = 62;     // coins per string, vertical spacing within a string
  var WORD_INTERVAL_MIN = 3500, WORD_INTERVAL_MAX = 6000; // ms range between word bubbles
  var OBSTACLE_INTERVAL_MIN = 1600, OBSTACLE_INTERVAL_MAX = 2600; // ms range between hazard rows
  var DOUBLE_BLOCK_CHANCE = 0.3;              // chance a hazard row blocks 2 lanes instead of 1 (always leaves >=1 open)
  var COIN_PTS = 2, WORD_BONUS_PTS = 5;
  var PLANE_Y = H - 190;    // fixed vertical position of the plane
  var PLANE_R = 22;         // plane hitbox radius
  var COIN_R = 14;
  var OBSTACLE_R = 22;
  var SPAWN_Y = -50;        // items spawn just above the visible area
  var TOP_FADE = 90;        // items fade in over this many px of travel after spawning

  var FlapScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'flappy' });
      this.laneIdx        = 1;                 // 0=left, 1=middle, 2=right
      this.planeX          = LANE_X[1];
      this.planeVX          = 0; // purely cosmetic (drives the bank tilt in drawPlane)
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

      // Cloud layer — seen from above, so puffs drift slowly downward
      // (parallax with the main scroll) plus a little sideways for feel.
      this.cloudGfx = this.add.graphics().setDepth(1);
      for (var i = 0; i < 6; i++) {
        this.clouds.push({
          x:   Math.random() * W,
          y:   Math.random() * H,
          rw:  40 + Math.random() * 45,
          spd: 0.25 + Math.random() * 0.35,
          drift: (Math.random() - 0.5) * 0.3
        });
      }

      // Main dynamic layer (coins, words, plane, lanes)
      this.gfx = this.add.graphics().setDepth(2);

      // Score (top centre)
      this.scoreTxt = this.add.text(W / 2, 18, '0', {
        fontFamily: 'Prompt, sans-serif',
        fontSize: '46px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#1a1a2e', strokeThickness: 6
      }).setOrigin(0.5, 0).setDepth(10);

      // Fading instructional hint
      this.hint = this.add.text(W / 2, H - 16,
        '👈👉 แตะซ้าย-ขวาเพื่อสลับเลน — เก็บเหรียญ 🪙 และคำ 💬 หลบหนาม 💥', {
          fontFamily: 'Prompt, sans-serif', fontSize: '13px', color: '#2b2438',
          backgroundColor: '#ffffffaa', padding: { x: 8, y: 4 }, align: 'center',
          wordWrap: { width: W - 24 }
        }).setOrigin(0.5, 1).setDepth(10);
      this.time.delayedCall(4000, function () {
        self.tweens.add({ targets: self.hint, alpha: 0, duration: 600,
          onComplete: function () { self.hint.destroy(); self.hint = null; }
        });
      });

      // ── Input: tap the left/right half of the screen to shift lane ──
      this.input.on('pointerdown', function (ptr) {
        if (self.dead || self.isPaused) return;
        if (ptr.x < W / 2) self.laneIdx = Math.max(0, self.laneIdx - 1);
        else self.laneIdx = Math.min(LANE_COUNT - 1, self.laneIdx + 1);
      });
      // Optional keyboard support (desktop testing/accessibility)
      this.input.keyboard && this.input.keyboard.on('keydown', function (e) {
        if (self.dead || self.isPaused) return;
        if (e.key === 'ArrowLeft')  self.laneIdx = Math.max(0, self.laneIdx - 1);
        if (e.key === 'ArrowRight') self.laneIdx = Math.min(LANE_COUNT - 1, self.laneIdx + 1);
      });
    },

    // ── [SKY] Static background — a top-down view, so it's mostly an
    // even sky/cloud tone rather than a horizon; lane dividers are drawn
    // per-frame in drawLanes() since they need to scroll. ────────────
    drawBg: function () {
      var g = this.bgGfx;
      var bands = 24;
      for (var i = 0; i < bands; i++) {
        var t  = i / bands;
        var r  = Math.round(Phaser.Math.Linear(120, 176, t));
        var gv = Math.round(Phaser.Math.Linear(188, 222, t));
        var b  = Math.round(Phaser.Math.Linear(236, 248, t));
        g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b));
        g.fillRect(0, i * (H / bands), W, H / bands + 1);
      }
    },

    // ── [COINS] A short string of coins running down a single lane ──
    spawnCoinString: function () {
      var lane = Math.floor(Math.random() * LANE_COUNT);
      for (var i = 0; i < COIN_STRING_LEN; i++) {
        this.coins.push({ lane: lane, y: SPAWN_Y - i * COIN_GAP, collected: false });
      }
    },

    // ── [WORDS] A single golden word bubble in a random lane ──────
    spawnWordItem: function () {
      if (!words.length) return;
      this.wordIdx = (this.wordIdx || 0);
      var word = words[this.wordIdx++ % words.length];
      this.wordItems.push({
        lane: Math.floor(Math.random() * LANE_COUNT),
        y: SPAWN_Y, word: word, collected: false
      });
    },

    // ── [OBSTACLE] A row of 1-2 hazard mines — always leaves at least
    // one lane open so every row has a safe path through. ──────────
    spawnObstacle: function () {
      var self = this;
      var blockLanes;
      if (Math.random() < DOUBLE_BLOCK_CHANCE) {
        var openLane = Math.floor(Math.random() * LANE_COUNT);
        blockLanes = [0, 1, 2].filter(function (l) { return l !== openLane; });
      } else {
        blockLanes = [Math.floor(Math.random() * LANE_COUNT)];
      }
      blockLanes.forEach(function (lane) {
        self.obstacles.push({ lane: lane, y: SPAWN_Y, hit: false });
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
      var speed = this.curSpeed();

      // Clouds always drift, even while paused for the practice modal
      this.clouds.forEach(function (c) {
        c.y += c.spd * dt * (self.isPaused || self.dead ? 0.3 : 1);
        c.x += c.drift * dt;
        if (c.y > H + c.rw) { c.y = -c.rw; c.x = Math.random() * W; }
        if (c.x < -c.rw) c.x = W + c.rw; else if (c.x > W + c.rw) c.x = -c.rw;
        cg.fillStyle(0xffffff, 0.75);
        cg.fillEllipse(c.x,               c.y,     c.rw * 2,   c.rw * 1.3);
        cg.fillEllipse(c.x - c.rw * 0.4,  c.y + 6, c.rw * 1.1, c.rw * 0.9);
        cg.fillEllipse(c.x + c.rw * 0.35, c.y - 4, c.rw,       c.rw * 0.8);
      });

      if (this.dead || this.isPaused) {
        this.drawLanes(g);
        this.drawCoinsAndWords(g);
        this.drawObstacles(g);
        this.drawPlane(g, time);
        return;
      }

      // ── Lane switch: ease the plane's X toward the target lane ─────
      var prevX = this.planeX;
      var targetX = LANE_X[this.laneIdx];
      this.planeX += (targetX - this.planeX) * Math.min(1, LANE_SWITCH_RATE * dt);
      this.planeVX = this.planeX - prevX; // cosmetic — drives the bank tilt only

      this.scrollOff = (this.scrollOff + speed * dt) % 80;

      // Spawn coin strings + word bubbles + obstacle rows on real-time intervals
      this.coinTimer += delta;
      if (this.coinTimer >= COIN_INTERVAL) {
        this.coinTimer -= COIN_INTERVAL;
        this.spawnCoinString();
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

      // Move + cull coins (downward -- toward the fixed-position plane)
      this.coins.forEach(function (c) { c.y += speed * dt; });
      this.coins = this.coins.filter(function (c) { return c.y < H + 30; });

      // Move + cull word bubbles
      this.wordItems.forEach(function (w) { w.y += speed * dt; });
      this.wordItems = this.wordItems.filter(function (w) { return w.y < H + 80; });

      // Move + cull obstacles
      this.obstacles.forEach(function (o) { o.y += speed * dt; });
      this.obstacles = this.obstacles.filter(function (o) { return o.y < H + 30; });

      // Coin collection — same lane and close enough vertically
      this.coins.forEach(function (c) {
        if (c.collected || c.lane !== self.laneIdx) return;
        var dy = PLANE_Y - c.y;
        if (dy * dy < (PLANE_R + COIN_R) * (PLANE_R + COIN_R)) {
          c.collected = true;
          self.score += COIN_PTS;
          self.scoreTxt.setText('' + self.score);
          callbacks.onPoints(COIN_PTS);
          if (self.sfxCoin) self.sfxCoin.play();
          self.showPop(LANE_X[c.lane], c.y - 16, '+' + COIN_PTS);
        }
      });
      this.coins = this.coins.filter(function (c) { return !c.collected; });

      // Word bubble collection → pronunciation practice. The speed ramp is
      // applied only once paused/resumed here, not mid-run, so it reads
      // as "catch your breath, next leg is faster" rather than a sudden jolt.
      this.wordItems.forEach(function (w) {
        if (w.collected || self.isPaused || w.lane !== self.laneIdx) return;
        var dy = PLANE_Y - w.y;
        if (dy * dy < 40 * 40) {
          w.collected = true;
          self.isPaused = true;
          callbacks.onPractice(w.word, null, function () {
            self.isPaused = false;
            self.speedLevel++;
            self.score += WORD_BONUS_PTS;
            self.scoreTxt.setText('' + self.score);
            callbacks.onPoints(WORD_BONUS_PTS);
            self.showPop(self.planeX, PLANE_Y - 34, '+' + WORD_BONUS_PTS + ' ⭐ เร็วขึ้น!');
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
        if (o.hit || o.lane !== this.laneIdx) continue;
        var ody = PLANE_Y - o.y;
        if (ody * ody < (PLANE_R + OBSTACLE_R) * (PLANE_R + OBSTACLE_R)) {
          o.hit = true;
          this.hitObstacle();
          break;
        }
      }

      this.drawLanes(g);
      this.drawCoinsAndWords(g);
      this.drawObstacles(g);
      this.drawPlane(g, time);
    },

    // ── Obstacle hit — freeze play, flash/pop, then end the round ───
    hitObstacle: function () {
      var self = this;
      this.dead = true;
      if (this.sfxHit) this.sfxHit.play();
      this.showPop(this.planeX, PLANE_Y - 34, '💥 ชนแล้ว!');
      var flash = this.add.rectangle(W / 2, H / 2, W, H, 0xff0000, 0.35).setDepth(20);
      this.tweens.add({ targets: flash, alpha: 0, duration: 500, onComplete: function () { flash.destroy(); } });
      this.time.delayedCall(700, function () { callbacks.onFinish(); });
    },

    // Scrolling lane dividers — dashed lines between each pair of lanes,
    // moving downward so standing still still visibly reads as motion.
    drawLanes: function (g) {
      var off = (this.scrollOff % 40 + 40) % 40;
      for (var li = 1; li < LANE_COUNT; li++) {
        var lx = LANE_MARGIN + LANE_W * li;
        g.lineStyle(4, 0xffffff, 0.55);
        for (var y = -40 + off; y < H + 40; y += 40) {
          g.beginPath();
          g.moveTo(lx, y);
          g.lineTo(lx, y + 22);
          g.strokePath();
        }
      }
      // Soft highlight under the plane's current lane
      g.fillStyle(0xffffff, 0.08);
      g.fillRect(LANE_MARGIN + LANE_W * this.laneIdx, 0, LANE_W, H);
    },

    // Fade factor for an item that just spawned, so it eases into view
    // instead of popping in abruptly at the top edge.
    fadeFor: function (y) {
      return Phaser.Math.Clamp((y - SPAWN_Y) / TOP_FADE, 0, 1);
    },

    // ── [COINS]/[WORDS] Draw coins + word bubbles ──────────────────
    drawCoinsAndWords: function (g) {
      var self = this;
      var now = this.time.now;

      this.coins.forEach(function (c) {
        if (c.y < -30 || c.y > H + 30) return;
        var cx = LANE_X[c.lane];
        var bob = Math.sin(now * 0.004 + c.y * 0.02) * 3;
        var a = self.fadeFor(c.y);
        g.fillStyle(0xffd700, a);
        g.lineStyle(2, 0xb8860b, a);
        g.fillCircle(cx, c.y + bob, COIN_R);
        g.strokeCircle(cx, c.y + bob, COIN_R);
        g.fillStyle(0xfff2a8, a);
        g.fillCircle(cx - 3, c.y + bob - 3, COIN_R * 0.35);
      });

      this.wordItems.forEach(function (w) {
        if (w.collected || w.y < -80 || w.y > H + 80) return;
        var wx = LANE_X[w.lane];
        self.drawBubble(g, wx, w.y, self.fadeFor(w.y));
        // A word's emoji field can be auto-set equal to its own word text
        // when it has no picture — the word label right below already
        // shows that text, so skip the icon line entirely rather than
        // printing the same word twice stacked in this small bubble.
        var wEmoji = (w.word.emoji && w.word.emoji !== w.word.word) ? w.word.emoji : '';
        var et = wEmoji ? self.add.text(wx, w.y - 6, wEmoji,
          { fontSize: '16px' }).setOrigin(0.5, 1).setDepth(5) : null;
        var wt = self.add.text(wx, w.y + 8, w.word.word,
          { fontFamily: 'Prompt', fontSize: '12px', fontStyle: 'bold', color: '#2b2438' })
          .setOrigin(0.5, 0).setDepth(5);
        self.time.delayedCall(16, function () { if (et) et.destroy(); wt.destroy(); });
      });
    },

    // ── [OBSTACLE] Spiky dark mine — clearly distinct from coins/words
    drawObstacles: function (g) {
      var self = this;
      this.obstacles.forEach(function (o) {
        if (o.hit || o.y < -30 || o.y > H + 30) return;
        var ox0 = LANE_X[o.lane];
        var a = self.fadeFor(o.y);
        g.fillStyle(0xe74c3c, 0.25 * a);
        g.fillCircle(ox0, o.y, OBSTACLE_R + 6);
        g.fillStyle(0x2b2438, a);
        g.fillCircle(ox0, o.y, OBSTACLE_R);
        g.lineStyle(3, 0xe74c3c, a);
        for (var s = 0; s < 8; s++) {
          var ang = (s / 8) * Math.PI * 2;
          var ix = ox0 + Math.cos(ang) * OBSTACLE_R;
          var iy = o.y + Math.sin(ang) * OBSTACLE_R;
          var ox = ox0 + Math.cos(ang) * (OBSTACLE_R + 8);
          var oy = o.y + Math.sin(ang) * (OBSTACLE_R + 8);
          g.beginPath();
          g.moveTo(ix, iy);
          g.lineTo(ox, oy);
          g.strokePath();
        }
      });
    },

    // ── [WORDS] Word bubble ─────────────────────────────────────
    drawBubble: function (g, x, y, a) {
      a = a === undefined ? 1 : a;
      g.fillStyle(0xffd700, 0.28 * a);
      g.fillCircle(x, y, 38);
      g.fillStyle(0xfffde7, 0.95 * a);
      g.lineStyle(3, 0xf39c12, a);
      g.fillCircle(x, y, 30);
      g.strokeCircle(x, y, 30);
      g.fillStyle(0xffec6e, 0.45 * a);
      g.fillCircle(x, y, 20);
    },

    // ── [PLANE] Red-and-white cartoon airplane, top-down view ─────
    // Nose points up the screen (away from the player, the direction of
    // travel); banks left/right visually when switching lanes.
    drawPlane: function (g, time) {
      var x  = this.planeX;
      var y  = PLANE_Y;
      var vx = this.planeVX;

      // Bank: rolls into the direction it's currently easing toward
      var bank = Phaser.Math.Clamp(vx * 0.05, -0.4, 0.4);
      var cos  = Math.cos(bank);
      var sin  = Math.sin(bank);

      function rPt(lx, ly) {
        return { x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos };
      }

      // Shadow — offset down/right, sells "flying above the lane"
      g.fillStyle(0x000000, 0.16);
      g.fillEllipse(x + 5, y + 10, 30, 40);

      // Speed lines trailing behind (below, since forward is up)
      for (var s = 0; s < 3; s++) {
        var sp = rPt(-6 + s * 6, 28 + s * 9);
        g.lineStyle(2.5, 0xffffff, 0.5 - s * 0.13);
        g.beginPath();
        g.moveTo(sp.x, sp.y);
        g.lineTo(sp.x, sp.y + 16);
        g.strokePath();
      }

      // Horizontal tail stabilizer (small flat fins near the back)
      var hstabPts = [rPt(-2, 24), rPt(-14, 30), rPt(14, 30), rPt(2, 24)];
      g.fillStyle(0xc0392b);
      g.fillPoints(hstabPts, true);

      // Vertical tail fin — edge-on from directly above, drawn as a small sliver
      var finPts = [rPt(-1, 22), rPt(0, 34), rPt(1, 22)];
      g.fillStyle(0xe74c3c);
      g.fillPoints(finPts, true);

      // Main wings (diamond silhouette crossing the fuselage, swept back)
      var wingPts = [rPt(0, -6), rPt(34, 14), rPt(0, 6), rPt(-34, 14)];
      g.fillStyle(0xd32f2f);
      g.fillPoints(wingPts, true);

      // Fuselage (tapered capsule, nose pointing up)
      var bodyPts = [
        rPt(0, -32), rPt(6, -18), rPt(7, 12), rPt(4, 24),
        rPt(-4, 24), rPt(-7, 12), rPt(-6, -18)
      ];
      g.fillStyle(0xe74c3c);
      g.fillPoints(bodyPts, true);

      // White stripe down the spine
      var stripePts = [rPt(-2.5, -14), rPt(-3, 20), rPt(3, 20), rPt(2.5, -14)];
      g.fillStyle(0xffffff);
      g.fillPoints(stripePts, true);

      // Cockpit window
      var cp = rPt(0, -10);
      g.fillStyle(0x81d4fa);
      g.lineStyle(1.5, 0x0277bd);
      g.fillCircle(cp.x, cp.y, 5);
      g.strokeCircle(cp.x, cp.y, 5);

      // Spinning propeller blur at the nose
      var noseP = rPt(0, -32);
      var blur = 6 + Math.sin(time * 0.09) * 2;
      g.fillStyle(0x555555, 0.55);
      g.fillEllipse(noseP.x, noseP.y, 16, blur);
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
