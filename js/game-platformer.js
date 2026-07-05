// ============================================================
//  PLATFORMER GAME — Phaser 3  (Arcade Physics side-scroller)
// ============================================================
//  POLISH GUIDE (search for the label):
//    [TUNE]     Speed, gravity, jump strength  (~line 18)
//    [PLAYER]   Character art                  (~drawCharacter)
//    [COINS]    Coin colour & size             (~spawnCoin / drawCoins)
//    [WORDS]    Word-item bubble style         (~spawnWordItem)
//    [PLATFORM] Platform colours               (~spawnPlatform)
//    [SKY]      Sky / hill colours             (~create → bg graphics)
//    [POP]      Score pop style                (~showPop)
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
      this.isPaused  = false;
      this.scrollX   = 0;
      this.wordIdx   = 0;
      this.platforms = [];  // { x, y, w }
      this.coins     = [];  // { x, y, collected, phase }
      this.words2    = [];  // { x, y, word, collected }
      this.pops      = [];  // floating +pts text items
      this.clouds    = [];
      this.player    = null;
      this.nextPlatX = W + 180;
      this.nextCoinX = W + 80;
      this.nextWordX = W + 380;
    },

    create: function () {
      var self = this;

      // ── [SKY] Background layers (drawn once) ─────────────
      var bgGfx = this.add.graphics();
      // Sky gradient
      var bands = 20;
      for (var i = 0; i < bands; i++) {
        var t  = i / bands;
        var r  = Math.round(Phaser.Math.Linear(91, 170, t));
        var gv = Math.round(Phaser.Math.Linear(163, 212, t));
        var bv = Math.round(Phaser.Math.Linear(224, 245, t));
        bgGfx.fillStyle(Phaser.Display.Color.GetColor(r, gv, bv));
        bgGfx.fillRect(0, i * (GROUND_Y / bands), W, GROUND_Y / bands + 1);
      }

      // Ground surface
      bgGfx.fillStyle(0x4caf50); bgGfx.fillRect(0, GROUND_Y, W, 8);
      bgGfx.fillStyle(0x388e3c); bgGfx.fillRect(0, GROUND_Y + 2, W, 3);
      bgGfx.fillStyle(0x795548); bgGfx.fillRect(0, GROUND_Y + 8, W, H - GROUND_Y - 8);

      // Clouds
      for (var c = 0; c < 4; c++) {
        this.clouds.push({ x: 100 + c * 190, y: 35 + Math.random() * 55, rw: 60 + Math.random() * 70 });
      }

      // Dynamic layer for everything that moves
      this.dynGfx = this.add.graphics().setDepth(1);

      // Parallax hill graphics (scrolls slower than world)
      this.hillGfx = this.add.graphics().setDepth(0);

      // Player state
      this.player = {
        y: GROUND_Y - PH, vy: 0, h: PH,
        onGround: true, sliding: false, slideTimer: 0, legPhase: 0
      };

      // Initial coins
      for (var ci = 0; ci < 6; ci++) this.spawnCoin(W + 60 + ci * 130);

      // Keyboard input
      this.keys = this.input.keyboard.addKeys({
        up:    Phaser.Input.Keyboard.KeyCodes.UP,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        down:  Phaser.Input.Keyboard.KeyCodes.DOWN
      });

      // Touch / button controls wired up in game.html via DOM buttons
      // POLISH: swap these for on-screen Phaser buttons if you go fully canvas
      var bj = document.getElementById('pfBtnJump');
      var bs = document.getElementById('pfBtnSlide');
      this._jumpFn  = function () { self.doJump(); };
      this._slideFn = function () { self.doSlide(); };
      if (bj) { bj.addEventListener('mousedown', this._jumpFn); bj.addEventListener('touchstart', this._jumpFn, { passive: true }); }
      if (bs) { bs.addEventListener('mousedown', this._slideFn); bs.addEventListener('touchstart', this._slideFn, { passive: true }); }

      // HUD hint
      this.hint = this.add.text(W / 2, 26, '↑ กระโดด   ↙ สไลด์   เก็บเหรียญ 🪙 และพูดคำศัพท์ 💬', {
        fontFamily: 'Prompt, sans-serif', fontSize: '15px', color: '#2b2438',
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
        this.player.vy = JUMP_VY;
        this.player.onGround = false;
        this.player.sliding  = false;
        this.player.h = PH;
      }
    },

    doSlide: function () {
      if (this.isPaused || !this.player.onGround) return;
      this.player.sliding    = true;
      this.player.h          = PH_SLIDE;
      this.player.slideTimer = 48; // frames
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
      var y = GROUND_Y - 90 - Math.random() * 70;

      // [WORDS] Word bubble container: text + background drawn by dynGfx each frame
      this.words2.push({ x: x, y: y, word: word, collected: false });
    },

    spawnPlatform: function (x) {
      var py = GROUND_Y - 115 - Math.random() * 65;
      var pw = 110 + Math.random() * 100;
      this.platforms.push({ x: x, y: py, w: pw });
      // Place coins on top of platform
      var n = 2 + Math.floor(Math.random() * 3);
      for (var i = 0; i < n; i++) this.spawnCoin(x + 18 + i * 30, py - 25);
    },

    // ── Per-frame update ──────────────────────────────────────
    update: function (time) {
      if (this.isPaused) return;
      var p = this.player, self = this;

      // Keyboard
      if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.space)) {
        this.doJump();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
        this.doSlide();
      }

      // World scroll
      this.scrollX += SCROLL_SPD;

      // Player physics
      p.vy += GRAVITY;
      p.y  += p.vy;
      if (p.sliding && --p.slideTimer <= 0) { p.sliding = false; p.h = PH; }

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

      // Leg animation while running
      if (p.onGround && !p.sliding) p.legPhase += 0.26;

      // Cloud drift
      this.clouds.forEach(function (c) { c.x -= 0.5; if (c.x < -150) c.x = W + 100; });

      // Cull off-screen objects
      this.platforms = this.platforms.filter(function (pl) { return pl.x - self.scrollX > -250; });
      this.coins     = this.coins.filter(function (c)      { return c.x   - self.scrollX > -80; });
      this.words2    = this.words2.filter(function (w)     { return w.x   - self.scrollX > -80; });

      // Spawn new objects as scroll advances
      if (this.scrollX + W > this.nextPlatX) {
        this.spawnPlatform(this.nextPlatX);
        this.nextPlatX += 260 + Math.random() * 220;
      }
      if (this.scrollX + W > this.nextCoinX) {
        this.spawnCoin(this.nextCoinX);
        this.nextCoinX += 85 + Math.random() * 90;
      }
      if (this.scrollX + W > this.nextWordX) {
        this.spawnWordItem(this.nextWordX);
        this.nextWordX += 300 + Math.random() * 260;
      }

      // Coin collection
      var px = PLAYER_X, py = p.y, ph = p.h;
      this.coins.forEach(function (c) {
        if (c.collected) return;
        var cx = c.x - self.scrollX;
        var nx = Math.max(px, Math.min(cx, px + PW));
        var ny = Math.max(py, Math.min(c.y, py + ph));
        if ((cx-nx)*(cx-nx)+(c.y-ny)*(c.y-ny) < 13*13) {
          c.collected = true;
          callbacks.onPoints(5);   // [COINS] change coin value here
          self.showPop(cx, c.y, '+5');
        }
      });

      // Word item collection
      this.words2.forEach(function (wi) {
        if (wi.collected) return;
        var cx = wi.x - self.scrollX;
        var bw = 46;
        if (px < cx + bw && px + PW > cx - bw && py < wi.y + 28 && py + ph > wi.y - 28) {
          wi.collected = true;
          self.isPaused = true;
          callbacks.onPractice(wi.word, null, function () {
            self.isPaused = false;
          });
        }
      });

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

      // [SKY] Parallax hills (scroll at 15% of world speed)
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

      // [PLATFORM] Platforms ──────────────────────────────────
      // POLISH: change fillStyle colours for different platform look
      this.platforms.forEach(function (plat) {
        var sx = plat.x - self.scrollX;
        if (sx > W + 10 || sx + plat.w < -10) return;
        g.fillStyle(0x43a047); g.fillRect(sx, plat.y,      plat.w, 10);
        g.fillStyle(0x795548); g.fillRect(sx, plat.y + 10, plat.w, 12);
        g.lineStyle(1.5, 0x2e7d32);
        g.strokeRect(sx, plat.y, plat.w, 22);
      });

      // [COINS] ─────────────────────────────────────────────
      // POLISH: change coin colour (0xFFD700) or size (11) here
      var now = this.time.now;
      this.coins.forEach(function (c) {
        if (c.collected) return;
        var cx  = c.x - self.scrollX;
        if (cx < -70 || cx > W + 70) return;
        var spin = Math.abs(Math.sin(now * 0.004 + (c.phase || 0)));
        g.fillStyle(0xFFD700);
        g.lineStyle(1.5, 0xc8a000);
        g.fillEllipse(cx, c.y, 22 * (0.15 + spin * 0.85), 22);
        g.strokeEllipse(cx, c.y, 22 * (0.15 + spin * 0.85), 22);
      });

      // [WORDS] Word item bubbles ────────────────────────────
      // POLISH: change bubble colour, border, or font size here
      this.words2.forEach(function (wi) {
        if (wi.collected) return;
        var cx  = wi.x - self.scrollX;
        if (cx < -80 || cx > W + 80) return;
        var bob = Math.sin(now * 0.003 + cx * 0.01) * 5; // gentle bobbing
        var bw  = 80;
        // Shadow glow
        g.fillStyle(0xa78bfa, 0.25);
        g.fillRoundedRect(cx - bw / 2 - 4, wi.y - 26 + bob, bw + 8, 52, 14);
        // White card
        g.fillStyle(0xffffff);
        g.lineStyle(2.5, 0x8a5cf6);
        g.fillRoundedRect(cx - bw / 2, wi.y - 22 + bob, bw, 44, 10);
        g.strokeRoundedRect(cx - bw / 2, wi.y - 22 + bob, bw, 44, 10);

        // Emoji & word drawn as Phaser Text objects would be better,
        // but to keep all drawing in one place we use Graphics + Text via a temporary approach:
        // (These texts are created & destroyed each frame if done naively; a pool is better for performance)
        // POLISH: replace with a pooled Text approach for better performance
        var eTxt = self.add.text(cx, wi.y - 6 + bob, wi.word.emoji || '🔸', { fontSize: '16px' }).setOrigin(0.5, 1).setDepth(5);
        var wTxt = self.add.text(cx, wi.y + 8 + bob, wi.word.word, { fontFamily: 'Prompt', fontSize: '12px', fontStyle: 'bold', color: '#2b2438' }).setOrigin(0.5, 0).setDepth(5);
        self.time.delayedCall(16, function () { eTxt.destroy(); wTxt.destroy(); });
      });

      // Player
      this.drawCharacter(g);

      // Score pops
      this.pops.forEach(function (pp) {
        g.fillStyle(0xff9f1c, pp.life);
        // (Using Graphics text is limited; a real Text tween is nicer — see showPop)
      });
    },

    // ── [PLAYER] Character art ────────────────────────────────
    // POLISH: Edit the colours and shapes below to restyle the character
    drawCharacter: function (g) {
      var p  = this.player;
      var cx = PLAYER_X + PW / 2;
      var cy = p.y;

      if (p.sliding) {
        // Sliding pose: flattened body
        g.fillStyle(0xd63031); g.fillRect(cx - 16, cy, 32, 10);          // body top
        g.fillStyle(0xffba8a); g.fillEllipse(cx + 4, cy + 6, 20, 16);    // head
        g.fillStyle(0x0984e3); g.fillRect(cx - 16, cy + 10, 32, p.h - 10); // legs/body
        g.fillStyle(0x5d4037); g.fillRect(cx - 16, cy + p.h - 6, 32, 6); // feet
      } else {
        var sw = p.onGround ? Math.sin(p.legPhase) * 7 : 4; // leg swing

        // Hat (red)
        g.fillStyle(0xd63031);
        g.fillRect(cx - 11, cy,     22, 8);   // hat top
        g.fillRect(cx - 15, cy + 7, 30, 5);   // hat brim

        // Face (skin)
        g.fillStyle(0xffba8a);
        g.fillEllipse(cx, cy + 19, 24, 24);

        // Eye (dark)
        g.fillStyle(0x2d3436);
        g.fillCircle(cx + 4, cy + 16, 2.5);

        // Moustache
        g.fillStyle(0x5d4037);
        g.fillEllipse(cx - 4, cy + 23, 10, 6);
        g.fillEllipse(cx + 5, cy + 23, 10, 6);

        // Overalls (blue)
        g.fillStyle(0x0984e3);
        g.fillRect(cx - 12, cy + 29, 24, 16);

        // Overall clips (gold)
        g.fillStyle(0xfdcb6e);
        g.fillRect(cx - 8, cy + 31, 5, 5);
        g.fillRect(cx + 4, cy + 31, 5, 5);

        // Legs (red trousers)
        g.fillStyle(0xd63031);
        g.fillRect(cx - 12, cy + 44, 10, 12 + sw);  // left
        g.fillRect(cx + 2,  cy + 44, 10, 12 - sw);  // right

        // Boots (dark brown)
        g.fillStyle(0x5d4037);
        g.fillRect(cx - 14, cy + 55 + sw, 13, 7);
        g.fillRect(cx,      cy + 55 - sw, 13, 7);
      }
    },

    // ── [POP] Floating score text ─────────────────────────────
    showPop: function (x, y, text) {
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif',
        fontSize:   '18px',
        fontStyle:  'bold',
        color:      '#ff9f1c',
        stroke:     '#ffffff',
        strokeThickness: 3
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
      if (bj && this._jumpFn)  { bj.removeEventListener('mousedown', this._jumpFn); bj.removeEventListener('touchstart', this._jumpFn); }
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
