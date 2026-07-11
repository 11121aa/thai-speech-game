// ============================================================
//  PLATFORMER GAME — Phaser 3  (Jump & Slide side-scroller)
// ============================================================
//  [TUNE]      Speed, gravity, jump strength      (~line 18)
//  [OBSTACLES] Obstacle spacing / types           (~spawnObstacle)
//  [PLAYER]    Monkey character art               (~drawCharacter)
//  [COINS]     Coin spawn rate                    (~update spawning)
//  [SKY]       Sky / hill colours                 (~create bg)
// ============================================================
//  How the game works:
//    - The world scrolls left; the monkey stays in place
//    - JUMP (↑ / Space / Jump button)  SLIDE (↓ / Slide button)
//    - Coins → +5 pts   |   Obstacles → -5s timer
//    - Word bubbles → pronunciation practice modal
// ============================================================

function createPlatformerGame(words, callbacks) {

  // ── [TUNE] ────────────────────────────────────────────────────
  var SCROLL_SPD = 3.8;
  var GRAVITY    = 0.52;
  var JUMP_VY    = -13.5;
  var W = 800, H = 400;
  var GROUND_Y   = H - 55;
  var PLAYER_X   = 110;
  var PW = 32, PH = 62;
  var PH_SLIDE   = 26;

  var PlatScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'platformer' });
      this.isPaused  = false;
      this.scrollX   = 0;
      this.wordIdx   = 0;
      this.platforms = [];
      this.coins     = [];
      this.words2    = [];
      this.obstacles = [];
      this.clouds    = [];
      this.player    = null;
      this.nextPlatX = W + 200;
      this.nextCoinX = W + 80;
      this.nextWordX = W + 400;
      this.nextObsX  = W + 520; // first obstacle further away
    },

    preload: function () {
      this.load.audio('CoinSFX',     'soundeffect/CoinSFX.mp3');
      this.load.audio('PixelJump',   'soundeffect/PixelJump.mp3');
      this.load.audio('PixelDamage', 'soundeffect/PixelDamage.mp3');
    },

    create: function () {
      var self = this;

      // Static sky gradient
      var bgGfx = this.add.graphics();
      var bands = 20;
      for (var i = 0; i < bands; i++) {
        var t  = i / bands;
        var r  = Math.round(Phaser.Math.Linear(91,  170, t));
        var gv = Math.round(Phaser.Math.Linear(163, 212, t));
        var bv = Math.round(Phaser.Math.Linear(224, 245, t));
        bgGfx.fillStyle(Phaser.Display.Color.GetColor(r, gv, bv));
        bgGfx.fillRect(0, i * (GROUND_Y / bands), W, GROUND_Y / bands + 1);
      }
      // Ground — thick and clearly visible
      bgGfx.fillStyle(0x4caf50); bgGfx.fillRect(0, GROUND_Y,      W, 10); // grass
      bgGfx.fillStyle(0x388e3c); bgGfx.fillRect(0, GROUND_Y + 2,  W, 3);  // dark edge
      bgGfx.fillStyle(0x795548); bgGfx.fillRect(0, GROUND_Y + 10, W, H - GROUND_Y - 10); // dirt
      // Static dirt texture bands
      bgGfx.fillStyle(0x6d4c41, 0.35);
      bgGfx.fillRect(0, GROUND_Y + 18, W, 2);
      bgGfx.fillRect(0, GROUND_Y + 30, W, 2);

      // Clouds
      for (var c = 0; c < 4; c++) {
        this.clouds.push({
          x:  100 + c * 190,
          y:  35 + Math.random() * 55,
          rw: 60 + Math.random() * 70
        });
      }

      this.dynGfx  = this.add.graphics().setDepth(1);
      this.hillGfx = this.add.graphics().setDepth(0);

      this.player = {
        y: GROUND_Y - PH, vy: 0, h: PH,
        onGround: true, sliding: false, slideTimer: 0,
        legPhase: 0, invincible: 0
      };

      // Pre-spawn 3 coins (fewer than before)
      for (var ci = 0; ci < 3; ci++) this.spawnCoin(W + 80 + ci * 180);

      this.keys = this.input.keyboard.addKeys({
        up:    Phaser.Input.Keyboard.KeyCodes.UP,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        down:  Phaser.Input.Keyboard.KeyCodes.DOWN
      });

      // Mobile buttons
      var bj = document.getElementById('pfBtnJump');
      var bs = document.getElementById('pfBtnSlide');
      this._jumpFn  = function () { self.doJump(); };
      this._slideFn = function () { self.doSlide(); };
      if (bj) {
        bj.addEventListener('mousedown',  this._jumpFn);
        bj.addEventListener('touchstart', this._jumpFn, { passive: true });
      }
      if (bs) {
        bs.addEventListener('mousedown',  this._slideFn);
        bs.addEventListener('touchstart', this._slideFn, { passive: true });
      }

      this.sfxCoin   = this.sound.add('CoinSFX',     { volume: 0.7 });
      this.sfxJump   = this.sound.add('PixelJump',    { volume: 0.6 });
      this.sfxDamage = this.sound.add('PixelDamage',  { volume: 0.8 });

      this.hint = this.add.text(W / 2, 26,
        '🐒 กระโดด: ↑ / Space   สไลด์: ↓   เก็บเหรียญ 🪙   หลีกสิ่งกีดขวาง 🪨', {
          fontFamily: 'Prompt, sans-serif', fontSize: '13px', color: '#2b2438',
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
        this.player.h        = PH;
        if (this.sfxJump) this.sfxJump.play();
      }
    },

    doSlide: function () {
      if (this.isPaused || !this.player.onGround) return;
      this.player.sliding    = true;
      this.player.h          = PH_SLIDE;
      this.player.slideTimer = 48;
    },

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
      this.words2.push({
        x: x, y: GROUND_Y - 90 - Math.random() * 70,
        word: word, collected: false
      });
    },

    spawnPlatform: function (x) {
      var py = GROUND_Y - 115 - Math.random() * 65;
      var pw = 110 + Math.random() * 100;
      this.platforms.push({ x: x, y: py, w: pw });
      var n = 2 + Math.floor(Math.random() * 3);
      for (var i = 0; i < n; i++) this.spawnCoin(x + 18 + i * 30, py - 25);
    },

    // [OBSTACLES] 3 types; more y-position variety coming from varied h values
    spawnObstacle: function (x) {
      var roll = Math.random();
      var type = roll < 0.38 ? 'rock' : roll < 0.72 ? 'cactus' : 'bigrock';
      var w = type === 'rock' ? 36 : type === 'cactus' ? 20 : 52;
      var h = type === 'rock' ? 28 : type === 'cactus' ? 50 : 34;
      this.obstacles.push({ x: x, y: GROUND_Y - h, w: w, h: h, type: type });
    },

    update: function (time) {
      if (this.isPaused) return;
      var p    = this.player;
      var self = this;

      if (Phaser.Input.Keyboard.JustDown(this.keys.up) ||
          Phaser.Input.Keyboard.JustDown(this.keys.space)) this.doJump();
      if (Phaser.Input.Keyboard.JustDown(this.keys.down)) this.doSlide();

      this.scrollX += SCROLL_SPD;
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

      // Platform landing
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

      this.clouds.forEach(function (c) {
        c.x -= 0.5;
        if (c.x < -150) c.x = W + 100;
      });

      // Cull off-screen objects
      this.platforms = this.platforms.filter(function (pl) { return pl.x - self.scrollX > -250; });
      this.coins     = this.coins.filter(function (c)      { return c.x  - self.scrollX > -80; });
      this.words2    = this.words2.filter(function (w)     { return w.x  - self.scrollX > -80; });
      this.obstacles = this.obstacles.filter(function (ob) { return ob.x - self.scrollX > -100; });

      // Spawn new objects — wider gaps for obstacles and platforms
      if (this.scrollX + W > this.nextPlatX) {
        this.spawnPlatform(this.nextPlatX);
        this.nextPlatX += 320 + Math.random() * 280;
      }
      if (this.scrollX + W > this.nextCoinX) {
        this.spawnCoin(this.nextCoinX);
        this.nextCoinX += 130 + Math.random() * 110;
      }
      if (this.scrollX + W > this.nextWordX) {
        this.spawnWordItem(this.nextWordX);
        this.nextWordX += 300 + Math.random() * 260;
      }
      // [OBSTACLES] 380–700px between each — much more breathing room
      if (this.scrollX + W > this.nextObsX) {
        this.spawnObstacle(this.nextObsX);
        this.nextObsX += 380 + Math.random() * 320;
      }

      // Coin collection
      var px = PLAYER_X, py = p.y, ph = p.h;
      this.coins.forEach(function (c) {
        if (c.collected) return;
        var cx = c.x - self.scrollX;
        var nx = Math.max(px, Math.min(cx, px + PW));
        var ny = Math.max(py, Math.min(c.y, py + ph));
        if ((cx - nx) * (cx - nx) + (c.y - ny) * (c.y - ny) < 13 * 13) {
          c.collected = true;
          callbacks.onPoints(5);
          if (self.sfxCoin) self.sfxCoin.play();
          self.showPop(cx, c.y - 14, '+5 ⭐');
        }
      });

      // Word bubble collection
      this.words2.forEach(function (wi) {
        if (wi.collected) return;
        var cx = wi.x - self.scrollX, bw = 46;
        if (px < cx + bw && px + PW > cx - bw && py < wi.y + 28 && py + ph > wi.y - 28) {
          wi.collected = true;
          self.isPaused = true;
          callbacks.onPractice(wi.word, null, function () {
            self.isPaused = false;
            p.invincible = 180; // 3 s immunity after word practice
            self.showPop(PLAYER_X + PW / 2, p.y - 20, '🛡️ คุ้มกัน!');
          });
        }
      });

      // Obstacle collision
      if (p.invincible === 0) {
        this.obstacles.forEach(function (ob) {
          var ox = ob.x - self.scrollX;
          if (px < ox + ob.w && px + PW > ox && py + ph > ob.y && py < ob.y + ob.h) {
            p.invincible = 80;
            if (self.sfxDamage) self.sfxDamage.play();
            if (callbacks.onTime) callbacks.onTime(-5);
            self.showPop(px + PW / 2, py - 20, '-5s 💥');
          }
        });
      }

      this.draw(time);
    },

    draw: function (time) {
      var g    = this.dynGfx;
      var hg   = this.hillGfx;
      var self = this;
      g.clear(); hg.clear();

      // Parallax hills
      hg.fillStyle(0x81c784);
      var hoff = ((-this.scrollX * 0.15) % 200 + 200) % 200;
      for (var hx = hoff - 110; hx < W + 110; hx += 200) {
        hg.fillCircle(hx, GROUND_Y + 12, 100);
      }

      // Clouds
      this.clouds.forEach(function (c) {
        g.fillStyle(0xffffff, 0.88);
        g.fillEllipse(c.x,               c.y,     c.rw * 2,    44);
        g.fillEllipse(c.x - c.rw * 0.38, c.y + 9, c.rw * 1.16, 34);
        g.fillEllipse(c.x + c.rw * 0.32, c.y + 7, c.rw,         30);
      });

      // Scrolling ground grass tufts (make ground feel alive)
      var goff = ((-this.scrollX) % 52 + 52) % 52;
      for (var gx = goff - 52; gx < W + 52; gx += 52) {
        g.fillStyle(0x1b5e20);
        g.fillRect(gx,      GROUND_Y - 5, 3, 5);
        g.fillRect(gx + 8,  GROUND_Y - 3, 2, 3);
        g.fillRect(gx + 15, GROUND_Y - 6, 3, 6);
        g.fillRect(gx + 23, GROUND_Y - 4, 2, 4);
        // Pebble in the dirt
        g.fillStyle(0x6d4c41);
        g.fillCircle(gx + 38, GROUND_Y + 15, 3);
      }

      // Platforms
      this.platforms.forEach(function (plat) {
        var sx = plat.x - self.scrollX;
        if (sx > W + 10 || sx + plat.w < -10) return;
        g.fillStyle(0x43a047); g.fillRect(sx, plat.y,      plat.w, 10);
        g.fillStyle(0x795548); g.fillRect(sx, plat.y + 10, plat.w, 12);
        g.lineStyle(1.5, 0x2e7d32);
        g.strokeRect(sx, plat.y, plat.w, 22);
      });

      // Coins (spinning)
      var now = this.time.now;
      this.coins.forEach(function (c) {
        if (c.collected) return;
        var cx = c.x - self.scrollX;
        if (cx < -70 || cx > W + 70) return;
        var spin = Math.abs(Math.sin(now * 0.004 + (c.phase || 0)));
        g.fillStyle(0xFFD700);
        g.lineStyle(1.5, 0xc8a000);
        g.fillEllipse(  cx, c.y, 22 * (0.15 + spin * 0.85), 22);
        g.strokeEllipse(cx, c.y, 22 * (0.15 + spin * 0.85), 22);
      });

      // Word bubbles
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
        g.fillRoundedRect(  cx - bw / 2, wi.y - 22 + bob, bw, 44, 10);
        g.strokeRoundedRect(cx - bw / 2, wi.y - 22 + bob, bw, 44, 10);
        var et = self.add.text(cx, wi.y - 6 + bob, wi.word.emoji || '🔸',
          { fontSize: '16px' }).setOrigin(0.5, 1).setDepth(5);
        var wt = self.add.text(cx, wi.y + 8 + bob, wi.word.word,
          { fontFamily: 'Prompt', fontSize: '12px', fontStyle: 'bold', color: '#2b2438' })
          .setOrigin(0.5, 0).setDepth(5);
        self.time.delayedCall(16, function () { et.destroy(); wt.destroy(); });
      });

      // Obstacles
      this.obstacles.forEach(function (ob) {
        var ox = ob.x - self.scrollX;
        if (ox < -80 || ox > W + 80) return;
        if (ob.type === 'cactus') {
          g.fillStyle(0x388e3c);
          g.fillRect(ox,        ob.y + 14, ob.w,    ob.h - 14);
          g.fillRect(ox - 10,   ob.y + 18, 10,      16);
          g.fillRect(ox + ob.w, ob.y + 22, 10,      12);
          g.fillRoundedRect(ox,           ob.y,      ob.w, 18, 4);
          g.fillRoundedRect(ox - 10,   ob.y + 10, 10,  6, 3);
          g.fillRoundedRect(ox + ob.w, ob.y + 14, 10,  6, 3);
          g.lineStyle(1.5, 0x2e7d32);
          g.strokeRoundedRect(ox, ob.y, ob.w, ob.h, 4);
        } else {
          // Rock / bigrock
          g.fillStyle(0x78909c);
          g.fillRoundedRect(ox, ob.y, ob.w, ob.h, 8);
          g.lineStyle(2, 0x546e7a);
          g.strokeRoundedRect(ox, ob.y, ob.w, ob.h, 8);
          g.lineStyle(1, 0x90a4ae, 0.6);
          g.lineBetween(ox + ob.w * 0.3, ob.y + 4, ox + ob.w * 0.55, ob.y + ob.h - 4);
          if (ob.type === 'bigrock') {
            g.lineBetween(ox + ob.w * 0.6, ob.y + 6, ox + ob.w * 0.78, ob.y + ob.h - 6);
          }
        }
      });

      // Player (flash during invincibility)
      var flash = this.player.invincible > 0 && Math.floor(this.player.invincible / 6) % 2 === 1;
      if (!flash) this.drawCharacter(g);
    },

    // ── Running monkey character ──────────────────────────────────
    drawCharacter: function (g) {
      var p  = this.player;
      var cx = PLAYER_X + PW / 2;
      var cy = p.y;

      var BROWN  = 0x8d6e63; // main body brown
      var DBROWN = 0x5d4037; // dark brown — tail, feet, nostrils
      var TAN    = 0xffcc80; // light tan — face, belly
      var CREAM  = 0xffe0b2; // muzzle
      var PINK   = 0xf48fb1; // inner ear
      var DARK   = 0x1a1a2e; // eyes

      if (p.sliding) {
        // Sliding pose: flat on belly, tail up, head peeking forward
        g.fillStyle(DBROWN);
        g.fillCircle(cx - 10, cy + 13, 4);
        g.fillCircle(cx - 17, cy + 7,  3.5);
        g.fillCircle(cx - 20, cy + 1,  3);
        g.fillCircle(cx - 18, cy - 3,  2.5);
        g.fillStyle(BROWN);
        g.fillEllipse(cx - 4, cy + 13, 30, PH_SLIDE - 2);
        g.fillStyle(TAN, 0.5);
        g.fillEllipse(cx - 4, cy + 14, 16, 10);
        g.fillStyle(BROWN);
        g.fillCircle(cx + 14, cy + 10, 10);
        g.fillStyle(TAN);
        g.fillCircle(cx + 15, cy + 11, 7);
        g.fillStyle(BROWN);
        g.fillCircle(cx + 13, cy + 2, 5);
        g.fillStyle(PINK);
        g.fillCircle(cx + 13, cy + 2, 3);
        g.fillStyle(DARK);
        g.fillCircle(cx + 17, cy + 10, 2.5);
        g.fillStyle(0xffffff);
        g.fillCircle(cx + 18, cy + 9, 1);
        g.fillStyle(CREAM);
        g.fillEllipse(cx + 20, cy + 14, 10, 7);
        return;
      }

      var sw = p.onGround ? Math.sin(p.legPhase) * 8 : 3;

      // TAIL — series of circles curving up from left hip
      g.fillStyle(DBROWN);
      g.fillCircle(cx - 7,  cy + 58, 4);
      g.fillCircle(cx - 15, cy + 49, 3.5);
      g.fillCircle(cx - 21, cy + 37, 3);
      g.fillCircle(cx - 22, cy + 24, 2.5);
      g.fillCircle(cx - 18, cy + 13, 2);
      g.fillCircle(cx - 12, cy + 8,  1.5);

      // ARMS — swing opposite to opposite leg
      g.fillStyle(BROWN);
      g.fillRect(cx - 20, cy + 32 - sw * 0.7, 10, 13);
      g.fillRect(cx + 10, cy + 32 + sw * 0.7, 10, 13);
      // Hands
      g.fillStyle(TAN);
      g.fillCircle(cx - 15, cy + 45 - sw * 0.7, 4);
      g.fillCircle(cx + 15, cy + 45 + sw * 0.7, 4);

      // BODY
      g.fillStyle(BROWN);
      g.fillEllipse(cx, cy + 44, 24, 22);
      // Belly patch
      g.fillStyle(TAN, 0.5);
      g.fillEllipse(cx, cy + 46, 13, 12);

      // HEAD outer (brown halo behind face)
      g.fillStyle(BROWN);
      g.fillCircle(cx, cy + 16, 14);

      // EARS
      g.fillStyle(BROWN);
      g.fillCircle(cx - 13, cy + 9, 7);
      g.fillCircle(cx + 13, cy + 9, 7);
      g.fillStyle(PINK);
      g.fillCircle(cx - 13, cy + 9, 4);
      g.fillCircle(cx + 13, cy + 9, 4);

      // FACE (inner lighter area)
      g.fillStyle(TAN);
      g.fillCircle(cx, cy + 17, 11);

      // MUZZLE
      g.fillStyle(CREAM);
      g.fillEllipse(cx, cy + 22, 13, 9);

      // EYES
      g.fillStyle(DARK);
      g.fillCircle(cx - 4, cy + 14, 2.5);
      g.fillCircle(cx + 4, cy + 14, 2.5);
      g.fillStyle(0xffffff);
      g.fillCircle(cx - 3, cy + 13, 1);
      g.fillCircle(cx + 5, cy + 13, 1);

      // NOSTRILS
      g.fillStyle(DBROWN);
      g.fillCircle(cx - 2, cy + 21, 1.2);
      g.fillCircle(cx + 2, cy + 21, 1.2);

      // LEGS
      g.fillStyle(BROWN);
      g.fillRect(cx - 10, cy + 54, 9, 12 + sw);
      g.fillRect(cx + 1,  cy + 54, 9, 12 - sw);

      // FEET (big monkey feet)
      g.fillStyle(DBROWN);
      g.fillEllipse(cx - 8, cy + 67 + sw, 15, 8);
      g.fillEllipse(cx + 4, cy + 67 - sw, 15, 8);
    },

    showPop: function (x, y, text) {
      var isNeg = text.charAt(0) === '-';
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif', fontSize: '18px', fontStyle: 'bold',
        color: isNeg ? '#e74c3c' : '#ff9f1c',
        stroke: '#ffffff', strokeThickness: 3
      }).setOrigin(0.5).setDepth(12);
      this.tweens.add({
        targets: pop, y: y - 40, alpha: 0, duration: 800, ease: 'Power2',
        onComplete: function () { pop.destroy(); }
      });
    },

    shutdown: function () {
      var bj = document.getElementById('pfBtnJump');
      var bs = document.getElementById('pfBtnSlide');
      if (bj && this._jumpFn) {
        bj.removeEventListener('mousedown',  this._jumpFn);
        bj.removeEventListener('touchstart', this._jumpFn);
      }
      if (bs && this._slideFn) {
        bs.removeEventListener('mousedown',  this._slideFn);
        bs.removeEventListener('touchstart', this._slideFn);
      }
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'platformerCanvas', // injects canvas INSIDE platformer-wrap so buttons overlay correctly
    width:  W,
    height: H,
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, autoRound: true },
    scene:  PlatScene,
    audio:  { noAudio: false }
  });
}

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
