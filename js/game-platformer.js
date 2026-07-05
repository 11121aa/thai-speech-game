// ============================================================
//  PLATFORMER GAME — Phaser 3  (Jump & Slide side-scroller)
// ============================================================
//  POLISH GUIDE (search for the label):
//    [TUNE]      Speed, gravity, jump strength      (~line 18)
//    [OBSTACLES] Obstacle size, spawn rate          (~spawnObstacle)
//    [PLAYER]    Character art                      (~drawCharacter)
//    [COINS]     Coin colour, time bonus            (~spawnCoin / update)
//    [WORDS]     Word-bubble style                  (~spawnWordItem)
//    [PLATFORM]  Platform colours                   (~spawnPlatform)
//    [SKY]       Sky / hill colours                 (~create bg)
//    [POP]       Score pop style                    (~showPop)
// ============================================================
//  Timer = health bar.
//  Coins      → +3 s and +5 pts  (callbacks.onTime + onPoints)
//  Obstacles  → -5 s             (callbacks.onTime, if provided)
//  Words      → practice modal
// ============================================================

function createPlatformerGame(words, callbacks) {

  // ── [TUNE] Difficulty knobs ────────────────────────────────
  var SCROLL_SPD = 3.8;     // world scroll speed (px/frame)
  var GRAVITY    = 0.52;    // downward acceleration per frame
  var JUMP_VY    = -13.5;   // jump velocity
  var W = 800, H = 400;
  var GROUND_Y = H - 55;    // y of ground surface
  var PLAYER_X = 110;       // fixed horizontal position
  var PW = 32, PH = 62;     // player width & height (standing)
  var PH_SLIDE = 26;        // player height while sliding

  // ── Scene class ────────────────────────────────────────────
  var PlatScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'platformer' });
      this.isPaused   = false;
      this.scrollX    = 0;
      this.wordIdx    = 0;
      this.platforms  = [];  // { x, y, w }
      this.coins      = [];  // { x, y, collected, phase }
      this.words2     = [];  // { x, y, word, collected }
      this.obstacles  = [];  // { x, y, w, h, type }   ← NEW
      this.pops       = [];  // floating text items
      this.clouds     = [];
      this.player     = null;
      this.nextPlatX  = W + 180;
      this.nextCoinX  = W + 80;
      this.nextWordX  = W + 380;
      this.nextObsX   = W + 320;  // [OBSTACLES] first obstacle distance
    },

    create: function () {
      var self = this;

      // ── [SKY] Background layers (drawn once) ─────────────
      var bgGfx = this.add.graphics();
      var bands = 20;
      for (var i = 0; i < bands; i++) {
        var t  = i / bands;
        var r  = Math.round(Phaser.Math.Linear(91, 170, t));
        var gv = Math.round(Phaser.Math.Linear(163, 212, t));
        var bv = Math.round(Phaser.Math.Linear(224, 245, t));
        bgGfx.fillStyle(Phaser.Display.Color.GetColor(r, gv, bv));
        bgGfx.fillRect(0, i * (GROUND_Y / bands), W, GROUND_Y / bands + 1);
      }
      bgGfx.fillStyle(0x4caf50); bgGfx.fillRect(0, GROUND_Y,     W, 8);
      bgGfx.fillStyle(0x388e3c); bgGfx.fillRect(0, GROUND_Y + 2, W, 3);
      bgGfx.fillStyle(0x795548); bgGfx.fillRect(0, GROUND_Y + 8, W, H - GROUND_Y - 8);

      for (var c = 0; c < 4; c++) {
        this.clouds.push({ x: 100 + c * 190, y: 35 + Math.random() * 55, rw: 60 + Math.random() * 70 });
      }

      this.dynGfx  = this.add.graphics().setDepth(1);
      this.hillGfx = this.add.graphics().setDepth(0);

      // Player state — includes invincible counter for hit flash
      this.player = {
        y: GROUND_Y - PH, vy: 0, h: PH,
        onGround: true, sliding: false, slideTimer: 0, legPhase: 0,
        invincible: 0    // frames of hit-invincibility
      };

      // Initial coins
      for (var ci = 0; ci < 6; ci++) this.spawnCoin(W + 60 + ci * 130);

      // Keyboard
      this.keys = this.input.keyboard.addKeys({
        up:    Phaser.Input.Keyboard.KeyCodes.UP,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        down:  Phaser.Input.Keyboard.KeyCodes.DOWN
      });

      // DOM button controls (jump / slide)
      var bj = document.getElementById('pfBtnJump');
      var bs = document.getElementById('pfBtnSlide');
      this._jumpFn  = function () { self.doJump(); };
      this._slideFn = function () { self.doSlide(); };
      if (bj) { bj.addEventListener('mousedown', this._jumpFn); bj.addEventListener('touchstart', this._jumpFn, { passive: true }); }
      if (bs) { bs.addEventListener('mousedown', this._slideFn); bs.addEventListener('touchstart', this._slideFn, { passive: true }); }

      // HUD hint
      this.hint = this.add.text(W / 2, 26,
        '↑ กระโดด   ↙ สไลด์   เก็บเหรียญ 🪙 (+เวลา)   หลีกหิน 🪨 (-เวลา)', {
          fontFamily: 'Prompt, sans-serif', fontSize: '14px', color: '#2b2438',
          backgroundColor: '#ffffffaa', padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setDepth(10);
      this.time.delayedCall(4000, function () {
        self.tweens.add({ targets: self.hint, alpha: 0, duration: 600,
          onComplete: function () { self.hint.destroy(); self.hint = null; }
        });
      });
    },

    doJump: function () {
      if (this.isPaused) return;
      if (this.player.onGround) {
        this.player.vy      = JUMP_VY;
        this.player.onGround = false;
        this.player.sliding  = false;
        this.player.h        = PH;
      }
    },

    doSlide: function () {
      if (this.isPaused || !this.player.onGround) return;
      this.player.sliding    = true;
      this.player.h          = PH_SLIDE;
      this.player.slideTimer = 48;
    },

    // ── Spawn helpers ─────────────────────────────────────────
    spawnCoin: function (x, y) {
      this.coins.push({
        x: x,
        y: y !== undefined ? y : GROUND_Y - 22 - Math.random() * 55,
        collected: false,
        phase: Math.random() * Math.PI * 2
      });
    },

    spawnWordItem: function (x) {
      if (!words.length) return;
      var word = words[this.wordIdx++ % words.length];
      this.words2.push({ x: x, y: GROUND_Y - 90 - Math.random() * 70, word: word, collected: false });
    },

    spawnPlatform: function (x) {
      var py = GROUND_Y - 115 - Math.random() * 65;
      var pw = 110 + Math.random() * 100;
      this.platforms.push({ x: x, y: py, w: pw });
      var n = 2 + Math.floor(Math.random() * 3);
      for (var i = 0; i < n; i++) this.spawnCoin(x + 18 + i * 30, py - 25);
    },

    // ── [OBSTACLES] Spawn a ground obstacle ──────────────────
    // POLISH: change sizes or add new types here
    spawnObstacle: function (x) {
      var types = ['rock', 'cactus'];
      var type  = types[Math.floor(Math.random() * 2)];
      // rock: squat, must jump over
      // cactus: taller, must also jump (or slide if you add a low type)
      var w = type === 'rock' ? 36 : 20;
      var h = type === 'rock' ? 28 : 50;
      this.obstacles.push({
        x: x, y: GROUND_Y - h, w: w, h: h, type: type
      });
    },

    // ── Per-frame update ──────────────────────────────────────
    update: function (time) {
      if (this.isPaused) return;
      var p = this.player, self = this;

      // Keyboard input
      if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.space)) this.doJump();
      if (Phaser.Input.Keyboard.JustDown(this.keys.down)) this.doSlide();

      // World scroll
      this.scrollX += SCROLL_SPD;

      // Player physics
      p.vy += GRAVITY;
      p.y  += p.vy;
      if (p.sliding && --p.slideTimer <= 0) { p.sliding = false; p.h = PH; }
      if (p.invincible > 0) p.invincible--;

      // Ground collision
      if (p.y + p.h >= GROUND_Y) {
        p.y = GROUND_Y - p.h; p.vy = 0; p.onGround = true;
      } else {
        p.onGround = false;
      }

      // Platform collisions (land from above only)
      this.platforms.forEach(function (plat) {
        var sx = plat.x - self.scrollX;
        if (PLAYER_X + PW > sx && PLAYER_X < sx + plat.w) {
          var feet = p.y + p.h, prev = feet - p.vy;
          if (p.vy >= 0 && feet >= plat.y && prev <= plat.y + 4) {
            p.y = plat.y - p.h; p.vy = 0; p.onGround = true;
          }
        }
      });

      if (p.onGround && !p.sliding) p.legPhase += 0.26;

      // Cloud drift
      this.clouds.forEach(function (c) { c.x -= 0.5; if (c.x < -150) c.x = W + 100; });

      // Cull off-screen objects
      this.platforms  = this.platforms.filter(function (pl) { return pl.x - self.scrollX > -250; });
      this.coins      = this.coins.filter(function (c)      { return c.x  - self.scrollX > -80; });
      this.words2     = this.words2.filter(function (w)     { return w.x  - self.scrollX > -80; });
      this.obstacles  = this.obstacles.filter(function (ob) { return ob.x - self.scrollX > -100; });

      // Spawn new objects as world scrolls forward
      if (this.scrollX + W > this.nextPlatX) { this.spawnPlatform(this.nextPlatX); this.nextPlatX += 260 + Math.random() * 220; }
      if (this.scrollX + W > this.nextCoinX) { this.spawnCoin(this.nextCoinX);     this.nextCoinX += 85  + Math.random() * 90; }
      if (this.scrollX + W > this.nextWordX) { this.spawnWordItem(this.nextWordX); this.nextWordX += 300 + Math.random() * 260; }
      // [OBSTACLES] Obstacle spawn interval — POLISH: change the range for density
      if (this.scrollX + W > this.nextObsX)  { this.spawnObstacle(this.nextObsX); this.nextObsX  += 200 + Math.random() * 200; }

      // ── Coin collection ────────────────────────────────────
      var px = PLAYER_X, py = p.y, ph = p.h;
      this.coins.forEach(function (c) {
        if (c.collected) return;
        var cx = c.x - self.scrollX;
        var nx = Math.max(px, Math.min(cx, px + PW));
        var ny = Math.max(py, Math.min(c.y, py + ph));
        if ((cx - nx) * (cx - nx) + (c.y - ny) * (c.y - ny) < 13 * 13) {
          c.collected = true;
          callbacks.onPoints(5);              // [COINS] change point value
          if (callbacks.onTime) callbacks.onTime(3);  // [COINS] +3 s per coin
          self.showPop(cx, c.y - 14, '+3s ⏱');
        }
      });

      // ── Word item collection ───────────────────────────────
      this.words2.forEach(function (wi) {
        if (wi.collected) return;
        var cx = wi.x - self.scrollX, bw = 46;
        if (px < cx + bw && px + PW > cx - bw && py < wi.y + 28 && py + ph > wi.y - 28) {
          wi.collected = true;
          self.isPaused = true;
          callbacks.onPractice(wi.word, null, function () { self.isPaused = false; });
        }
      });

      // ── [OBSTACLES] Collision: hit = -5 s ─────────────────
      if (p.invincible === 0) {
        this.obstacles.forEach(function (ob) {
          var ox = ob.x - self.scrollX;
          // AABB check between player and obstacle
          if (px < ox + ob.w && px + PW > ox && py + ph > ob.y && py < ob.y + ob.h) {
            p.invincible = 80;   // ~1.3 s of invincibility
            if (callbacks.onTime) callbacks.onTime(-5);  // -5 s penalty
            self.showPop(px + PW / 2, py - 20, '-5s 💥');
          }
        });
      }

      // Advance pops
      this.pops.forEach(function (pp) { pp.vy -= 0.08; pp.y += pp.vy; pp.life -= 0.022; });
      this.pops = this.pops.filter(function (pp) { return pp.life > 0; });

      this.draw(time);
    },

    // ── Draw frame ────────────────────────────────────────────
    draw: function (time) {
      var g   = this.dynGfx;
      var hg  = this.hillGfx;
      var self = this;
      g.clear(); hg.clear();

      // [SKY] Parallax hills
      hg.fillStyle(0x81c784);
      var hoff = ((-this.scrollX * 0.15) % 200 + 200) % 200;
      for (var hx = hoff - 110; hx < W + 110; hx += 200) {
        hg.fillCircle(hx, GROUND_Y + 12, 100);
      }

      // Clouds
      this.clouds.forEach(function (c) {
        g.fillStyle(0xffffff, 0.88);
        g.fillEllipse(c.x,              c.y,     c.rw * 2, 44);
        g.fillEllipse(c.x - c.rw * 0.38, c.y + 9, c.rw * 1.16, 34);
        g.fillEllipse(c.x + c.rw * 0.32, c.y + 7, c.rw,         30);
      });

      // [PLATFORM] Platforms
      this.platforms.forEach(function (plat) {
        var sx = plat.x - self.scrollX;
        if (sx > W + 10 || sx + plat.w < -10) return;
        g.fillStyle(0x43a047); g.fillRect(sx, plat.y,      plat.w, 10);
        g.fillStyle(0x795548); g.fillRect(sx, plat.y + 10, plat.w, 12);
        g.lineStyle(1.5, 0x2e7d32);
        g.strokeRect(sx, plat.y, plat.w, 22);
      });

      // [COINS]
      var now = this.time.now;
      this.coins.forEach(function (c) {
        if (c.collected) return;
        var cx = c.x - self.scrollX;
        if (cx < -70 || cx > W + 70) return;
        var spin = Math.abs(Math.sin(now * 0.004 + (c.phase || 0)));
        g.fillStyle(0xFFD700);
        g.lineStyle(1.5, 0xc8a000);
        g.fillEllipse(cx, c.y, 22 * (0.15 + spin * 0.85), 22);
        g.strokeEllipse(cx, c.y, 22 * (0.15 + spin * 0.85), 22);
      });

      // [WORDS] Word item bubbles
      this.words2.forEach(function (wi) {
        if (wi.collected) return;
        var cx  = wi.x - self.scrollX;
        if (cx < -80 || cx > W + 80) return;
        var bob = Math.sin(now * 0.003 + cx * 0.01) * 5;
        var bw  = 80;
        g.fillStyle(0xa78bfa, 0.25);
        g.fillRoundedRect(cx - bw / 2 - 4, wi.y - 26 + bob, bw + 8, 52, 14);
        g.fillStyle(0xffffff);
        g.lineStyle(2.5, 0x8a5cf6);
        g.fillRoundedRect(cx - bw / 2, wi.y - 22 + bob, bw, 44, 10);
        g.strokeRoundedRect(cx - bw / 2, wi.y - 22 + bob, bw, 44, 10);
        // Emoji + word text (short-lived Text objects — POLISH: use a pool for performance)
        var et = self.add.text(cx, wi.y - 6 + bob, wi.word.emoji || '🔸', { fontSize: '16px' }).setOrigin(0.5, 1).setDepth(5);
        var wt = self.add.text(cx, wi.y + 8 + bob, wi.word.word, { fontFamily: 'Prompt', fontSize: '12px', fontStyle: 'bold', color: '#2b2438' }).setOrigin(0.5, 0).setDepth(5);
        self.time.delayedCall(16, function () { et.destroy(); wt.destroy(); });
      });

      // ── [OBSTACLES] Draw rocks and cacti ─────────────────
      this.obstacles.forEach(function (ob) {
        var ox = ob.x - self.scrollX;
        if (ox < -80 || ox > W + 80) return;

        if (ob.type === 'rock') {
          // POLISH: change colour (0x78909c) or corner radius (8) for different rock look
          g.fillStyle(0x78909c);
          g.fillRoundedRect(ox, ob.y, ob.w, ob.h, 8);
          g.lineStyle(2, 0x546e7a);
          g.strokeRoundedRect(ox, ob.y, ob.w, ob.h, 8);
          // Highlight crack line
          g.lineStyle(1, 0x90a4ae, 0.6);
          g.lineBetween(ox + ob.w * 0.3, ob.y + 4, ox + ob.w * 0.55, ob.y + ob.h - 4);
        } else {
          // Cactus — POLISH: change colour (0x388e3c) or arm positions
          g.fillStyle(0x388e3c);
          g.fillRect(ox,           ob.y + 14,  ob.w,      ob.h - 14);  // trunk
          g.fillRect(ox - 10,      ob.y + 18,  10,        16);           // left arm
          g.fillRect(ox + ob.w,    ob.y + 22,  10,        12);           // right arm
          g.fillRoundedRect(ox,    ob.y,       ob.w,      18, 4);        // top cap
          g.fillRoundedRect(ox - 10, ob.y + 10, 10, 6, 3);              // left arm top
          g.fillRoundedRect(ox + ob.w, ob.y + 14, 10, 6, 3);            // right arm top
          g.lineStyle(1.5, 0x2e7d32);
          g.strokeRoundedRect(ox, ob.y, ob.w, ob.h, 4);
        }
      });

      // Player (flash when invincible)
      var flash = this.player.invincible > 0 && Math.floor(this.player.invincible / 6) % 2 === 1;
      if (!flash) this.drawCharacter(g);

      // Score pops (handled by Phaser Text tweens via showPop)
    },

    // ── [PLAYER] Character art ────────────────────────────────
    drawCharacter: function (g) {
      var p  = this.player;
      var cx = PLAYER_X + PW / 2;
      var cy = p.y;

      if (p.sliding) {
        g.fillStyle(0xd63031); g.fillRect(cx - 16, cy, 32, 10);
        g.fillStyle(0xffba8a); g.fillEllipse(cx + 4, cy + 6, 20, 16);
        g.fillStyle(0x0984e3); g.fillRect(cx - 16, cy + 10, 32, p.h - 10);
        g.fillStyle(0x5d4037); g.fillRect(cx - 16, cy + p.h - 6, 32, 6);
      } else {
        var sw = p.onGround ? Math.sin(p.legPhase) * 7 : 4;
        g.fillStyle(0xd63031); g.fillRect(cx - 11, cy,     22, 8);
        g.fillRect(cx - 15, cy + 7, 30, 5);
        g.fillStyle(0xffba8a); g.fillEllipse(cx, cy + 19, 24, 24);
        g.fillStyle(0x2d3436); g.fillCircle(cx + 4, cy + 16, 2.5);
        g.fillStyle(0x5d4037);
        g.fillEllipse(cx - 4, cy + 23, 10, 6);
        g.fillEllipse(cx + 5, cy + 23, 10, 6);
        g.fillStyle(0x0984e3); g.fillRect(cx - 12, cy + 29, 24, 16);
        g.fillStyle(0xfdcb6e);
        g.fillRect(cx - 8, cy + 31, 5, 5);
        g.fillRect(cx + 4, cy + 31, 5, 5);
        g.fillStyle(0xd63031);
        g.fillRect(cx - 12, cy + 44, 10, 12 + sw);
        g.fillRect(cx + 2,  cy + 44, 10, 12 - sw);
        g.fillStyle(0x5d4037);
        g.fillRect(cx - 14, cy + 55 + sw, 13, 7);
        g.fillRect(cx,      cy + 55 - sw, 13, 7);
      }
    },

    // ── [POP] Floating score / time text ─────────────────────
    showPop: function (x, y, text) {
      var isNeg = text.charAt(0) === '-';
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif', fontSize: '18px', fontStyle: 'bold',
        color:  isNeg ? '#e74c3c' : '#ff9f1c',
        stroke: '#ffffff', strokeThickness: 3
      }).setOrigin(0.5).setDepth(12);
      this.tweens.add({
        targets: pop, y: y - 40, alpha: 0, duration: 800, ease: 'Power2',
        onComplete: function () { pop.destroy(); }
      });
    },

    // ── Cleanup ───────────────────────────────────────────────
    shutdown: function () {
      var bj = document.getElementById('pfBtnJump');
      var bs = document.getElementById('pfBtnSlide');
      if (bj && this._jumpFn)  { bj.removeEventListener('mousedown', this._jumpFn);  bj.removeEventListener('touchstart', this._jumpFn); }
      if (bs && this._slideFn) { bs.removeEventListener('mousedown', this._slideFn); bs.removeEventListener('touchstart', this._slideFn); }
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'platformerGame',
    width:  W,
    height: H,
    scale:  { mode: Phaser.Scale.NONE },
    scene:  PlatScene,
    audio:  { noAudio: true }
  });
}

// Public API
var PlatformerGame = (function () {
  var game = null;
  function start(words, cbs) {
    stop();
    setTimeout(function () { game = createPlatformerGame(words, cbs); }, 60);
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }
  return { start: start, stop: stop };
}());
