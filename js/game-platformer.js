// ============================================================
//  PLATFORMER GAME — Phaser 3  (Jump & Slide side-scroller)
// ============================================================
//  [TUNE]      Speed, gravity, jump strength      (~line 18)
//  [WORDS]     Word spawn interval                (~line 21, WORD_INTERVAL)
//  [OBSTACLES] Obstacle spacing / types           (~spawnObstacle)
//  [PLAYER]    Player art (currently a placeholder cube) (~drawCharacter)
//  [SKY]       Sky / hill colours                 (~create bg)
// ============================================================
//  How the game works:
//    - The world scrolls left; the monkey stays in place
//    - JUMP (↑ / Space / Jump button)  SLIDE (↓ / Slide button)
//    - Obstacles → instant game over (unless shielded — see below)
//    - A word bubble spawns every WORD_INTERVAL ms → pronunciation practice
//      modal; succeeding grants a brief shield (p.invincible) that lets you
//      pass through the next obstacle safely
// ============================================================

function createPlatformerGame(words, callbacks) {

  // ── [TUNE] ────────────────────────────────────────────────────
  var SCROLL_SPD    = 3.8;
  var GRAVITY       = 0.52;
  var JUMP_VY       = -13.5;
  var WORD_INTERVAL = 5000; // [WORDS] ms between word-bubble spawns
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
      this.words2    = [];
      this.obstacles = [];
      this.clouds    = [];
      this.player    = null;
      this.nextPlatX = W + 200;
      this.wordTimer = 0; // [WORDS] ms accumulated since the last word spawn
      this.nextObsX  = W + 520; // first obstacle further away
    },

    preload: function () {
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

      this.sfxJump   = this.sound.add('PixelJump',    { volume: 0.6 });
      this.sfxDamage = this.sound.add('PixelDamage',  { volume: 0.8 });

      this.hint = this.add.text(W / 2, 26,
        '🐒 กระโดด: ↑ / Space   สไลด์: ↓   ชนสิ่งกีดขวาง 🪨 = จบเกม!', {
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
    },

    // [OBSTACLES] 3 types; more y-position variety coming from varied h values
    spawnObstacle: function (x) {
      var roll = Math.random();
      var type = roll < 0.38 ? 'rock' : roll < 0.72 ? 'cactus' : 'bigrock';
      var w = type === 'rock' ? 36 : type === 'cactus' ? 20 : 52;
      var h = type === 'rock' ? 28 : type === 'cactus' ? 50 : 34;
      this.obstacles.push({ x: x, y: GROUND_Y - h, w: w, h: h, type: type });
    },

    update: function (time, delta) {
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
      this.words2    = this.words2.filter(function (w)     { return w.x  - self.scrollX > -80; });
      this.obstacles = this.obstacles.filter(function (ob) { return ob.x - self.scrollX > -100; });

      // Spawn new objects — wider gaps for obstacles and platforms
      if (this.scrollX + W > this.nextPlatX) {
        this.spawnPlatform(this.nextPlatX);
        this.nextPlatX += 320 + Math.random() * 280;
      }
      // [WORDS] Time-based spawn — one word bubble every WORD_INTERVAL ms,
      // regardless of scroll distance. Only accumulates while not paused,
      // so it naturally waits out the practice modal like everything else.
      this.wordTimer += delta;
      if (this.wordTimer >= WORD_INTERVAL) {
        this.wordTimer -= WORD_INTERVAL;
        this.spawnWordItem(this.scrollX + W + 60);
      }
      // [OBSTACLES] 380–700px between each — much more breathing room
      if (this.scrollX + W > this.nextObsX) {
        this.spawnObstacle(this.nextObsX);
        this.nextObsX += 380 + Math.random() * 320;
      }

      var px = PLAYER_X, py = p.y, ph = p.h;

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

      // Obstacle collision — instant game over
      if (p.invincible === 0 && !this.isPaused) {
        this.obstacles.forEach(function (ob) {
          if (self.isPaused) return; // already game-overed this frame
          var ox = ob.x - self.scrollX;
          if (px < ox + ob.w && px + PW > ox && py + ph > ob.y && py < ob.y + ob.h) {
            self.isPaused = true;
            if (self.sfxDamage) self.sfxDamage.play();
            self.showPop(px + PW / 2, py - 20, '💥 Game Over');
            self.time.delayedCall(900, function () { callbacks.onFinish(); });
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

      var now = this.time.now;

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

    // ── [PLAYER] Placeholder cube — swap back to a drawn character later.
    // Drawn as a plain rounded rect exactly matching the collision hitbox
    // (PLAYER_X, p.y, PW, p.h), so what you see is exactly what you hit.
    drawCharacter: function (g) {
      var p = this.player;
      g.fillStyle(0x8d6e63);
      g.fillRoundedRect(PLAYER_X, p.y, PW, p.h, 6);
      g.lineStyle(2, 0x5d4037);
      g.strokeRoundedRect(PLAYER_X, p.y, PW, p.h, 6);
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
