// ============================================================
//  FLYING GAME — Phaser 3  (top-down, 3-lane Subway-Surfers-style runner)
// ============================================================
//  [TUNE]      Scroll speed, spawn rates, lane geometry   (~constants)
//  [COINS]     Coin-string shape/points                   (~spawnCoinString)
//  [WORDS]     Word bubble spawn + appearance              (~spawnWordItem, drawBubble)
//  [ISLAND]    Tropical-island score-boost pickup          (~spawnIsland, drawIslands)
//  [OBSTACLE]  Hazard spawn/appearance/collision           (~spawnObstacle, drawObstacles, hitObstacle)
//  [PLANE]     Plane colours & shape                       (~drawPlane)
// ============================================================
//  How the game works:
//    - Press and drag anywhere to fly the plane -- it follows your
//      finger/cursor across the 3 fixed lanes for as long as you hold,
//      snapping to whichever lane you're over (still Subway-Surfers-style
//      lane switching under the hood, just drag-controlled instead of a
//      tap-per-lane), top-down instead of third-person, flying low over
//      open ocean.
//    - Everything scrolls toward the player from the top of the screen:
//      coin strings (+2 ⭐ each), golden word bubbles (pronunciation
//      practice → +5 ⭐ bonus, on top of the shared +20 for a correct
//      recording, and ramps the scroll speed up a notch on resume so it
//      reads as "next leg is faster" rather than a mid-run jolt), rare
//      tropical islands (an instant +15 ⭐ score-boost pickup, no
//      practice gate, PLUS a temporary obstacle-immune shield -- longer
//      with owned air_shield_* upgrades), and three hazard types --
//      jagged reef rocks, diving birds, and rising tentacles -- any of
//      which ends the run immediately on contact (unless shielded). An
//      obstacle spawn always leaves at least one lane open. Two more
//      upgrade-gated pickups can also appear: a bomb (clears obstacles
//      in a radius) and a magnet (auto-collects coins from any lane for
//      a few seconds) -- neither spawns at all without its shop unlock.
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
  var ISLAND_INTERVAL_MIN = 9000, ISLAND_INTERVAL_MAX = 15000; // ms range between tropical-island pickups (rare)
  var OBSTACLE_INTERVAL_MIN = 1600, OBSTACLE_INTERVAL_MAX = 2600; // ms range between hazard rows
  var DOUBLE_BLOCK_CHANCE = 0.3;              // chance a hazard row blocks 2 lanes instead of 1 (always leaves >=1 open)
  var COIN_PTS = 2, WORD_BONUS_PTS = 5, ISLAND_BONUS_PTS = 15;
  var PLANE_Y = H - 190;    // fixed vertical position of the plane
  var PLANE_R = 22;         // plane hitbox radius
  var COIN_R = 11;          // smaller + styled with a two-tone rim (see drawCoinsAndWords) to read as an actual coin
  var ISLAND_R = 34;        // island pickup hitbox radius
  var OBSTACLE_R = 22;
  var SPAWN_Y = -50;        // items spawn just above the visible area
  var TOP_FADE = 90;        // items fade in over this many px of travel after spawning

  // ── Shop upgrades (supabase/024_game_upgrades_migration.sql) --
  // window.__airLoadout is set by game.html just before start(); empty
  // for a guest/no-purchase player, giving the original baseline
  // (base shield, no bomb/magnet pickups) unchanged. ──────────────
  var loadout = window.__airLoadout || {};
  var BASE_SHIELD_MS = 2500;                         // the island's shield is a base feature, not gated behind a purchase
  var SHIELD_MS = BASE_SHIELD_MS + (loadout.shieldExtraMs || 0);
  var HAS_BOMB = !!loadout.hasBomb;                  // bomb pickup doesn't spawn at all until air_bomb_1 is owned
  var BOMB_RADIUS = loadout.bombRadius || 0;
  var HAS_MAGNET = !!loadout.hasMagnet;              // same for the magnet pickup
  var MAGNET_MS = loadout.magnetMs || 0;
  var MAGNET_RADIUS = 220;                           // how far a coin can be from the plane and still get auto-pulled in while active
  var BOMB_INTERVAL_MIN = 10000, BOMB_INTERVAL_MAX = 16000;
  var MAGNET_INTERVAL_MIN = 11000, MAGNET_INTERVAL_MAX = 17000;
  var BOMB_R = 26, MAGNET_R = 26; // pickup hitbox radius (same scale as ISLAND_R)

  var FlapScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'flappy' });
      this.laneIdx        = 1;                 // 0=left, 1=middle, 2=right
      this.planeX          = LANE_X[1];
      this.planeVX          = 0; // purely cosmetic (drives the bank tilt in drawPlane)
      this.coins          = [];
      this.wordItems      = [];
      this.islands        = [];
      this.obstacles      = [];
      this.clouds        = [];
      this.bombs          = [];   // bomb pickups (only spawn if HAS_BOMB)
      this.magnets        = [];   // magnet pickups (only spawn if HAS_MAGNET)
      this.score         = 0;
      this.scrollOff      = 0;
      this.coinTimer      = 0;
      this.wordTimer      = 0;
      this.islandTimer    = 0;
      this.obstacleTimer  = 0;
      this.bombTimer      = 0;
      this.magnetTimer    = 0;
      this.nextWordDelay  = WORD_INTERVAL_MIN + Math.random() * (WORD_INTERVAL_MAX - WORD_INTERVAL_MIN);
      this.nextIslandDelay = ISLAND_INTERVAL_MIN + Math.random() * (ISLAND_INTERVAL_MAX - ISLAND_INTERVAL_MIN);
      this.nextObstacleDelay = OBSTACLE_INTERVAL_MIN + Math.random() * (OBSTACLE_INTERVAL_MAX - OBSTACLE_INTERVAL_MIN);
      this.nextBombDelay = BOMB_INTERVAL_MIN + Math.random() * (BOMB_INTERVAL_MAX - BOMB_INTERVAL_MIN);
      this.nextMagnetDelay = MAGNET_INTERVAL_MIN + Math.random() * (MAGNET_INTERVAL_MAX - MAGNET_INTERVAL_MIN);
      this.speedLevel     = 0;    // +1 per word collected — ramps curSpeed()
      this.isPaused       = false; // true while the practice modal is open
      this.dead           = false; // true once an obstacle is hit — freezes play, then finishes
      this.shieldUntil    = 0;    // obstacle-immune until this timestamp (island pickup)
      this.magnetUntil    = 0;    // wide-radius auto-coin-collect until this timestamp
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
        '👈👉 กดค้างแล้วลากเพื่อบังคับเครื่องบิน — เก็บเหรียญ 🪙 คำ 💬 และเกาะโบนัส 🏝️ หลบหิน/นก/หนวดปลาหมึก 💥', {
          fontFamily: 'Prompt, sans-serif', fontSize: '13px', color: '#2b2438',
          backgroundColor: '#ffffffaa', padding: { x: 8, y: 4 }, align: 'center',
          wordWrap: { width: W - 24 }
        }).setOrigin(0.5, 1).setDepth(10);
      this.time.delayedCall(4000, function () {
        self.tweens.add({ targets: self.hint, alpha: 0, duration: 600,
          onComplete: function () { self.hint.destroy(); self.hint = null; }
        });
      });

      // ── Input: press and drag anywhere to fly the plane -- the target
      // lane continuously tracks the pointer's x position while held
      // (nearestLane below), instead of a one-time tap-left/tap-right
      // shift, so the plane follows your finger as you drag it across
      // lanes rather than needing a separate tap per lane. Collision/
      // spawn logic is still lane-based under the hood (laneIdx), but
      // planeX's existing easing toward LANE_X[laneIdx] (see update())
      // already makes that read as smooth free movement while dragging.
      function nearestLane(x) {
        var best = 0, bestD = Infinity;
        for (var i = 0; i < LANE_COUNT; i++) {
          var d = Math.abs(x - LANE_X[i]);
          if (d < bestD) { bestD = d; best = i; }
        }
        return best;
      }
      this.input.on('pointerdown', function (ptr) {
        if (self.dead || self.isPaused) return;
        self.laneIdx = nearestLane(ptr.x);
      });
      this.input.on('pointermove', function (ptr) {
        if (self.dead || self.isPaused || !ptr.isDown) return;
        self.laneIdx = nearestLane(ptr.x);
      });
      // Optional keyboard support (desktop testing/accessibility)
      this.input.keyboard && this.input.keyboard.on('keydown', function (e) {
        if (self.dead || self.isPaused) return;
        if (e.key === 'ArrowLeft')  self.laneIdx = Math.max(0, self.laneIdx - 1);
        if (e.key === 'ArrowRight') self.laneIdx = Math.min(LANE_COUNT - 1, self.laneIdx + 1);
      });
    },

    // ── [SKY] Static background — a top-down view over open ocean, so
    // it's a deep-to-lighter blue depth gradient rather than a horizon;
    // lane dividers + scrolling wave streaks are drawn per-frame since
    // they need to scroll (see drawLanes/drawWaves). ────────────────
    drawBg: function () {
      var g = this.bgGfx;
      var bands = 24;
      for (var i = 0; i < bands; i++) {
        var t  = i / bands;
        var r  = Math.round(Phaser.Math.Linear(11, 79, t));
        var gv = Math.round(Phaser.Math.Linear(85, 173, t));
        var b  = Math.round(Phaser.Math.Linear(133, 196, t));
        g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b));
        g.fillRect(0, i * (H / bands), W, H / bands + 1);
      }
    },

    // Short scrolling wave-crest streaks, offset from the lane dividers'
    // own scroll cadence so the two don't line up into a rigid grid —
    // purely decorative "this is moving water" texture.
    drawWaves: function (g) {
      var off = (this.scrollOff * 1.3 % 60 + 60) % 60;
      g.lineStyle(2, 0xffffff, 0.14);
      for (var y = -60 + off; y < H + 60; y += 60) {
        for (var wx = -20; wx < W; wx += 95) {
          g.beginPath();
          g.moveTo(wx, y);
          g.lineTo(wx + 42, y);
          g.strokePath();
        }
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

    // ── [ISLAND] A rare tropical-island score-boost pickup in a random
    // lane -- unlike a word bubble, grabbing it is an instant bonus with
    // no practice popup gating it. ──────────────────────────────────
    spawnIsland: function () {
      this.islands.push({ lane: Math.floor(Math.random() * LANE_COUNT), y: SPAWN_Y, collected: false });
    },

    // ── Bomb pickup (air_bomb_1+ upgrade) -- on collection, destroys
    // every obstacle within BOMB_RADIUS of the plane. Never spawns
    // without HAS_BOMB, but the call site still schedules the next timer
    // regardless so no special-casing is needed there. ────────────────
    spawnBomb: function () {
      if (!HAS_BOMB) return;
      this.bombs.push({ lane: Math.floor(Math.random() * LANE_COUNT), y: SPAWN_Y, collected: false });
    },

    // ── Magnet pickup (air_magnet_1+ upgrade) -- on collection, widens
    // coin collection to any lane within MAGNET_RADIUS for MAGNET_MS. ──
    spawnMagnet: function () {
      if (!HAS_MAGNET) return;
      this.magnets.push({ lane: Math.floor(Math.random() * LANE_COUNT), y: SPAWN_Y, collected: false });
    },

    // ── [OBSTACLE] A row of 1-2 hazards — always leaves at least one
    // lane open so every row has a safe path through. Three visual/flavor
    // kinds (jagged reef rock, diving bird, rising tentacle) share the
    // exact same spawn/move/collision handling below -- only drawObstacles
    // branches on `kind` to render them differently. ──────────────────
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
        var roll = Math.random();
        var kind = roll < 0.6 ? 'rock' : roll < 0.85 ? 'bird' : 'tentacle';
        self.obstacles.push({ lane: lane, y: SPAWN_Y, hit: false, kind: kind, seed: Math.random() * 1000 });
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
        this.drawWaves(g);
        this.drawLanes(g);
        this.drawIslands(g);
        this.drawBombs(g);
        this.drawMagnets(g);
        this.drawCoinsAndWords(g);
        this.drawObstacles(g, time);
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
      this.islandTimer += delta;
      if (this.islandTimer >= this.nextIslandDelay) {
        this.islandTimer -= this.nextIslandDelay;
        this.nextIslandDelay = ISLAND_INTERVAL_MIN + Math.random() * (ISLAND_INTERVAL_MAX - ISLAND_INTERVAL_MIN);
        this.spawnIsland();
      }
      this.obstacleTimer += delta;
      if (this.obstacleTimer >= this.nextObstacleDelay) {
        this.obstacleTimer -= this.nextObstacleDelay;
        this.nextObstacleDelay = OBSTACLE_INTERVAL_MIN + Math.random() * (OBSTACLE_INTERVAL_MAX - OBSTACLE_INTERVAL_MIN);
        this.spawnObstacle();
      }
      this.bombTimer += delta;
      if (this.bombTimer >= this.nextBombDelay) {
        this.bombTimer -= this.nextBombDelay;
        this.nextBombDelay = BOMB_INTERVAL_MIN + Math.random() * (BOMB_INTERVAL_MAX - BOMB_INTERVAL_MIN);
        this.spawnBomb();
      }
      this.magnetTimer += delta;
      if (this.magnetTimer >= this.nextMagnetDelay) {
        this.magnetTimer -= this.nextMagnetDelay;
        this.nextMagnetDelay = MAGNET_INTERVAL_MIN + Math.random() * (MAGNET_INTERVAL_MAX - MAGNET_INTERVAL_MIN);
        this.spawnMagnet();
      }

      // Move + cull coins (downward -- toward the fixed-position plane)
      this.coins.forEach(function (c) { c.y += speed * dt; });
      this.coins = this.coins.filter(function (c) { return c.y < H + 30; });

      // Move + cull word bubbles
      this.wordItems.forEach(function (w) { w.y += speed * dt; });
      this.wordItems = this.wordItems.filter(function (w) { return w.y < H + 80; });

      // Move + cull islands
      this.islands.forEach(function (isl) { isl.y += speed * dt; });
      this.islands = this.islands.filter(function (isl) { return isl.y < H + 60; });

      // Move + cull obstacles
      this.obstacles.forEach(function (o) { o.y += speed * dt; });
      this.obstacles = this.obstacles.filter(function (o) { return o.y < H + 30; });

      // Move + cull bombs/magnets
      this.bombs.forEach(function (b) { b.y += speed * dt; });
      this.bombs = this.bombs.filter(function (b) { return b.y < H + 30; });
      this.magnets.forEach(function (m) { m.y += speed * dt; });
      this.magnets = this.magnets.filter(function (m) { return m.y < H + 30; });

      // Coin collection — normally same lane and close enough vertically;
      // while a magnet buff is active, any lane within MAGNET_RADIUS
      // counts too (checked with a real 2D distance, since the plane
      // could be mid-lane-switch), so coins read as getting pulled in
      // from other lanes instead of needing to line up first.
      var magnetActive = time < this.magnetUntil;
      this.coins.forEach(function (c) {
        if (c.collected) return;
        var inRange;
        if (magnetActive) {
          var mdx = LANE_X[c.lane] - self.planeX, mdy = PLANE_Y - c.y;
          inRange = mdx * mdx + mdy * mdy < MAGNET_RADIUS * MAGNET_RADIUS;
        } else {
          var dy = PLANE_Y - c.y;
          inRange = c.lane === self.laneIdx && dy * dy < (PLANE_R + COIN_R) * (PLANE_R + COIN_R);
        }
        if (inRange) {
          c.collected = true;
          self.score += COIN_PTS;
          self.scoreTxt.setText('' + self.score);
          callbacks.onPoints(COIN_PTS);
          if (self.sfxCoin) self.sfxCoin.play();
          self.showPop(LANE_X[c.lane], c.y - 16, '+' + COIN_PTS);
        }
      });
      this.coins = this.coins.filter(function (c) { return !c.collected; });

      // Island collection — instant score boost (no practice gate, that's
      // what the word bubbles are for) plus a temporary obstacle-immune
      // shield -- SHIELD_MS already includes any owned air_shield_*
      // duration-extension tiers.
      this.islands.forEach(function (isl) {
        if (isl.collected || isl.lane !== self.laneIdx) return;
        var idy = PLANE_Y - isl.y;
        if (idy * idy < (PLANE_R + ISLAND_R) * (PLANE_R + ISLAND_R)) {
          isl.collected = true;
          self.score += ISLAND_BONUS_PTS;
          self.scoreTxt.setText('' + self.score);
          callbacks.onPoints(ISLAND_BONUS_PTS);
          if (self.sfxCoin) self.sfxCoin.play();
          self.shieldUntil = time + SHIELD_MS;
          self.showPop(LANE_X[isl.lane], isl.y - 24, '+' + ISLAND_BONUS_PTS + ' 🏝️ โล่ป้องกัน!');
        }
      });
      this.islands = this.islands.filter(function (isl) { return !isl.collected; });

      // Bomb collection — destroys every obstacle within BOMB_RADIUS of
      // the plane (a real 2D distance, so it reaches into other lanes,
      // not just the plane's own lane).
      this.bombs.forEach(function (b) {
        if (b.collected || b.lane !== self.laneIdx) return;
        var bdy = PLANE_Y - b.y;
        if (bdy * bdy < (PLANE_R + BOMB_R) * (PLANE_R + BOMB_R)) {
          b.collected = true;
          var cleared = 0;
          self.obstacles.forEach(function (o) {
            if (o.hit) return;
            var odx = LANE_X[o.lane] - self.planeX, ody2 = o.y - PLANE_Y;
            if (odx * odx + ody2 * ody2 < BOMB_RADIUS * BOMB_RADIUS) { o.hit = true; cleared++; }
          });
          if (self.sfxHit) self.sfxHit.play();
          self.showPop(LANE_X[b.lane], b.y - 24, '💣 ระเบิด! เคลียร์ ' + cleared + ' จุด');
        }
      });
      this.obstacles = this.obstacles.filter(function (o) { return !o.hit; });
      this.bombs = this.bombs.filter(function (b) { return !b.collected; });

      // Magnet collection — activates the wide-radius coin auto-collect
      // used by the coin-collection block above.
      this.magnets.forEach(function (m) {
        if (m.collected || m.lane !== self.laneIdx) return;
        var mdy2 = PLANE_Y - m.y;
        if (mdy2 * mdy2 < (PLANE_R + MAGNET_R) * (PLANE_R + MAGNET_R)) {
          m.collected = true;
          self.magnetUntil = time + MAGNET_MS;
          if (self.sfxCoin) self.sfxCoin.play();
          self.showPop(LANE_X[m.lane], m.y - 24, '🧲 แม่เหล็ก!');
        }
      });
      this.magnets = this.magnets.filter(function (m) { return !m.collected; });

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
      // the practice modal is opening. Also skipped entirely while
      // shielded (island pickup) -- the plane just flies through.
      var shielded = time < this.shieldUntil;
      for (var i = 0; i < this.obstacles.length && !this.isPaused && !shielded; i++) {
        var o = this.obstacles[i];
        if (o.hit || o.lane !== this.laneIdx) continue;
        var ody = PLANE_Y - o.y;
        if (ody * ody < (PLANE_R + OBSTACLE_R) * (PLANE_R + OBSTACLE_R)) {
          o.hit = true;
          this.hitObstacle();
          break;
        }
      }

      this.drawWaves(g);
      this.drawLanes(g);
      this.drawIslands(g);
      this.drawBombs(g);
      this.drawMagnets(g);
      this.drawCoinsAndWords(g);
      this.drawObstacles(g, time);
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
        var cy = c.y + bob;
        var a = self.fadeFor(c.y);
        // Two-tone rim (darker outer edge + brighter inner face) plus a
        // small highlight, so a small circle actually reads as a coin
        // instead of a flat dot.
        g.fillStyle(0xB8860B, a);
        g.fillCircle(cx, cy, COIN_R);
        g.fillStyle(0xFFD700, a);
        g.fillCircle(cx, cy, COIN_R - 2.5);
        g.lineStyle(1, 0xE8A400, a);
        g.strokeCircle(cx, cy, COIN_R - 2.5);
        g.fillStyle(0xfff2a8, 0.9 * a);
        g.fillCircle(cx - COIN_R * 0.25, cy - COIN_R * 0.25, COIN_R * 0.28);
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

    // ── [ISLAND] Small palm-tree-on-sand pickup, drawn like the coins/
    // words above (fade-in near spawn, culled off both edges). ───────
    drawIslands: function (g) {
      var self = this;
      this.islands.forEach(function (isl) {
        if (isl.collected || isl.y < -60 || isl.y > H + 60) return;
        var ix0 = LANE_X[isl.lane];
        var a = self.fadeFor(isl.y);
        // water ripple ring
        g.fillStyle(0xffffff, 0.2 * a);
        g.fillEllipse(ix0, isl.y + 20, 62, 20);
        // sand mound
        g.fillStyle(0xE9C46A, a);
        g.fillEllipse(ix0, isl.y + 8, 48, 28);
        g.fillStyle(0xD4A94A, 0.6 * a);
        g.fillEllipse(ix0, isl.y + 14, 48, 15);
        // palm trunk
        g.lineStyle(4, 0x8B5A2B, a);
        g.beginPath();
        g.moveTo(ix0, isl.y + 2);
        g.lineTo(ix0 + 4, isl.y - 20);
        g.strokePath();
        // palm leaves
        g.fillStyle(0x2E9E5B, a);
        [[-1, -0.3], [1, -0.3], [-0.6, -1], [0.6, -1], [0, -0.7]].forEach(function (d) {
          g.fillEllipse(ix0 + 4 + d[0] * 14, isl.y - 20 + d[1] * 10, 18, 7);
        });
      });
    },

    // Bomb pickup -- a simple round bomb with a lit fuse spark, styled to
    // read instantly as "explosive" against the ocean background.
    drawBombs: function (g) {
      var self = this;
      this.bombs.forEach(function (b) {
        if (b.collected || b.y < -40 || b.y > H + 40) return;
        var x = LANE_X[b.lane], a = self.fadeFor(b.y);
        g.fillStyle(0xffffff, 0.2 * a);
        g.fillEllipse(x, b.y + 14, 46, 16);
        g.fillStyle(0x2b2438, a);
        g.fillCircle(x, b.y, 18);
        g.fillStyle(0x4a4458, 0.7 * a);
        g.fillCircle(x - 5, b.y - 5, 6);
        g.lineStyle(3, 0x8a5a2b, a);
        g.beginPath();
        g.moveTo(x + 8, b.y - 14);
        g.lineTo(x + 14, b.y - 24);
        g.strokePath();
        var spark = 0.6 + 0.4 * Math.sin(self.time.now * 0.02);
        g.fillStyle(0xffc107, spark * a);
        g.fillCircle(x + 14, b.y - 24, 4);
      });
    },

    // Magnet pickup -- a red-and-white horseshoe magnet.
    drawMagnets: function (g) {
      var self = this;
      this.magnets.forEach(function (m) {
        if (m.collected || m.y < -40 || m.y > H + 40) return;
        var x = LANE_X[m.lane], a = self.fadeFor(m.y);
        g.fillStyle(0xffffff, 0.2 * a);
        g.fillEllipse(x, m.y + 14, 46, 16);
        g.lineStyle(9, 0xe74c3c, a);
        g.beginPath();
        g.arc(x, m.y, 14, Math.PI * 0.15, Math.PI * 0.85, false, 0.05);
        g.strokePath();
        g.fillStyle(0xecf0f1, a);
        g.fillRect(x - 17, m.y - 4, 8, 12);
        g.fillRect(x + 9, m.y - 4, 8, 12);
      });
    },

    // ── [OBSTACLE] Dispatches to one of three hazard visuals by kind --
    // collision/spawn/movement is identical for all three (see spawnObstacle
    // and the update() collision loop), only the drawing differs. ───────
    drawObstacles: function (g, time) {
      var self = this;
      this.obstacles.forEach(function (o) {
        if (o.hit || o.y < -40 || o.y > H + 40) return;
        var ox0 = LANE_X[o.lane];
        var a = self.fadeFor(o.y);
        if (o.kind === 'bird') self.drawBird(g, ox0, o.y, a, time, o.seed);
        else if (o.kind === 'tentacle') self.drawTentacle(g, ox0, o.y, a, time, o.seed);
        else self.drawRock(g, ox0, o.y, a);
      });
    },

    // Jagged reef rock jutting out of the water, with a foam ring at its base.
    drawRock: function (g, x, y, a) {
      g.fillStyle(0xffffff, 0.3 * a);
      g.fillEllipse(x, y + 10, 46, 16);
      var n = 7, pts = [];
      for (var i = 0; i < n; i++) {
        var ang = (i / n) * Math.PI * 2;
        var rad = OBSTACLE_R * (0.7 + (i % 2) * 0.4);
        pts.push({ x: x + Math.cos(ang) * rad, y: y + Math.sin(ang) * rad * 0.85 });
      }
      g.fillStyle(0x6b5847, a);
      g.fillPoints(pts, true);
      g.lineStyle(2, 0x4a3c2f, a);
      g.strokePoints(pts, true, true);
      g.fillStyle(0x8a7460, 0.6 * a);
      g.fillCircle(x - 6, y - 6, 8);
    },

    // Diving bird, wings flapping (angle animated per-instance via `seed`
    // so a row of birds doesn't flap in lockstep).
    drawBird: function (g, x, y, a, time, seed) {
      var flap = Math.abs(Math.sin(time * 0.01 + seed)) * 14;
      g.fillStyle(0x2b2438, a);
      g.fillEllipse(x, y, 10, 18);
      g.fillTriangle(x, y - 4, x - 22, y - flap, x - 2, y + 6);
      g.fillTriangle(x, y - 4, x + 22, y - flap, x + 2, y + 6);
      g.fillStyle(0xF0A500, a);
      g.fillTriangle(x - 3, y - 10, x + 3, y - 10, x, y - 16);
    },

    // Rising tentacle, swaying toward its tip -- built from short straight
    // segments (Phaser Graphics has no quadratic-curve primitive) rather
    // than a single smooth curve.
    drawTentacle: function (g, x, y, a, time, seed) {
      var sway = Math.sin(time * 0.004 + seed) * 16;
      var segs = 4, baseY = y + 30;
      g.lineStyle(11, 0x5B2C6F, a);
      g.beginPath();
      g.moveTo(x, baseY);
      var px = x, py = baseY;
      for (var i = 1; i <= segs; i++) {
        var t = i / segs;
        var sx = x + sway * t * t, sy = baseY - t * 36;
        g.lineTo(sx, sy);
        px = sx; py = sy;
      }
      g.strokePath();
      g.fillStyle(0x8E44AD, a);
      for (var s = 1; s < segs; s++) {
        var t2 = s / segs;
        g.fillCircle(x + sway * t2 * t2, baseY - t2 * 36, 3);
      }
      g.fillStyle(0x5B2C6F, a);
      g.fillCircle(px, py, 7);
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

      // Shield glow (island pickup) -- a soft pulsing ring around the
      // plane for as long as this.shieldUntil is in the future.
      if (time < this.shieldUntil) {
        var sPulse = 0.35 + 0.15 * Math.sin(time * 0.012);
        g.fillStyle(0x2ec4b6, sPulse * 0.4);
        g.fillCircle(x, y, PLANE_R + 14);
        g.lineStyle(3, 0x2ec4b6, sPulse + 0.3);
        g.strokeCircle(x, y, PLANE_R + 14);
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
