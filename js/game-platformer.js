// ============================================================
//  PLATFORMER GAME — Phaser 3  (Jump & Slide side-scroller)
// ============================================================
//  [TUNE]      Speed, gravity, jump strength      (~line 18)
//  [WORDS]     Word spawn interval                (~line 30, WORD_INTERVAL_MIN/MAX)
//  [PATTERNS]  Hand-designed level chunks         (~PATTERNS array)
//  [PLAYER]    Sprite atlas + animation state machine   (~create, doJump, update)
//  [SKY]       Sky / hill colours                 (~create bg)
// ============================================================
//  How the game works:
//    - The world scrolls left; the player stays in place
//    - JUMP (↑ / Space / Jump button)  SLIDE (↓ / Slide button)
//    - The level is built from fixed hand-designed "patterns" spawned back
//      to back (cycling through PATTERNS), instead of independently random
//      platforms/obstacles — every jump is guaranteed makeable
//    - Ground pits → fall through and it's game over
//    - Ground spikes → touch one and it's game over (unless shielded)
//    - Ceiling spike rows → must SLIDE under (or jump over, if timed well)
//    - A word bubble spawns every 5-10s (randomized) → pronunciation practice
//      modal; succeeding grants a brief shield (p.invincible) that lets you
//      pass through the next hazard safely
//    - No countdown timer — the run only ends on death. +1 point per
//      second survived, and scroll speed ramps up the longer you last
//      (SCROLL_SPD_BASE → SCROLL_SPD_MAX)
// ============================================================

// [DIFFICULTY] starting/cap scroll speed per tier — ง่าย (easy) < ธรรมดา (normal) < ยาก (hard).
// ง่าย is now what used to be ยาก; ธรรมดา/ยาก scale up harder from there.
var PLATFORMER_DIFFICULTIES = {
  'ง่าย':   { base: 3.6, max: 8    },
  'ธรรมดา': { base: 4.8, max: 10.5 },
  'ยาก':    { base: 6.2, max: 13.5 }
};

function createPlatformerGame(words, callbacks, difficulty) {

  var diffCfg = PLATFORMER_DIFFICULTIES[difficulty] || PLATFORMER_DIFFICULTIES['ธรรมดา'];

  // ── [TUNE] ────────────────────────────────────────────────────
  var SCROLL_SPD_BASE = diffCfg.base;  // starting scroll speed
  var SCROLL_SPD_MAX  = diffCfg.max;  // speed cap so it never becomes unplayable
  var SPEED_RAMP      = 0.05; // +px/frame of scroll speed per second survived
  var GRAVITY       = 0.52;
  var JUMP_VY       = -13.5;
  var FAST_FALL     = 1.0; // extra downward accel while airborne + slide held
  var IMMORTAL_FRAMES = 180; // "อมตะ" (immortal) shield duration after a successful word practice
  var WORD_INTERVAL_MIN = 5000, WORD_INTERVAL_MAX = 10000; // [WORDS] random ms range between word-bubble spawns
  var W = 800, H = 400;
  var GROUND_Y   = H - 55;
  var PLAYER_X   = 110;
  var PW = 32, PH = 62;
  var PH_SLIDE   = 26;

  // ── [PATTERNS] Hand-designed level chunks ───────────────────────
  // Replaces independently-random platform/obstacle spawning so the level
  // is always fair — no more impossible-to-clear random combinations.
  // Each pattern's pieces use x offsets relative to the chunk's start x;
  // spawnPattern() shifts them into world space when the chunk is spawned.
  // Obstacle "type" is 'ground' (spike sitting on the ground — jump over)
  // or 'ceiling' (spike row hanging down — slide under, or jump if timed).
  // Widest pattern content only reaches ~790px in, so CHUNK_W leaves a
  // clear obstacle-free breather (~500-700px, roughly 2-3s of scrolling)
  // before the next pattern's first hazard.
  var CHUNK_W = 1300; // world-space width reserved per chunk

  var PATTERNS = [
    // 1) A pit in the ground, crossed via 3 ascending stair-step platforms
    {
      gaps: [ { x: 220, w: 480 } ],
      platforms: [
        { x: 250, y: GROUND_Y - 70,  w: 100 },
        { x: 470, y: GROUND_Y - 115, w: 100 },
        { x: 690, y: GROUND_Y - 160, w: 100 }
      ],
      obstacles: []
    },
    // 2) Overhead spike row (slide under), then two equal-height spikes
    // spaced further apart
    {
      gaps: [],
      platforms: [],
      obstacles: [
        { x: 200, y: GROUND_Y - 80, w: 240, h: 45, type: 'ceiling' },
        { x: 560, y: GROUND_Y - 55, w: 25,  h: 55, type: 'ground'  },
        { x: 820, y: GROUND_Y - 55, w: 25,  h: 55, type: 'ground'  }
      ]
    },
    // 3) A small spike, then a platform immediately followed by a spike so
    // tall (185 — taller than the ~175px max jump height, given
    // JUMP_VY/GRAVITY below) that it can't be jumped from the ground at
    // all. You're forced onto the platform first, then jump from its
    // raised height to clear it.
    {
      gaps: [],
      platforms: [ { x: 440, y: GROUND_Y - 110, w: 180 } ],
      // The big spike's hitbox (hw) is narrower than its drawn width (w) —
      // a triangle's actual danger is a thin sliver near the top, so a
      // full-width box there feels unfairly punishing when grazing past.
      obstacles: [
        { x: 180, y: GROUND_Y - 40,  w: 22, h: 40,  type: 'ground' },
        { x: 630, y: GROUND_Y - 185, w: 30, h: 185, type: 'ground', hw: 14 }
      ]
    }
  ];

  var PlatScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'platformer' });
      this.isPaused   = false;
      this.scrollX    = 0;
      this.wordIdx    = 0;
      this.platforms  = [];
      this.gaps       = [];
      this.words2     = [];
      this.obstacles  = [];
      this.clouds     = [];
      this.player     = null;
      this.nextChunkX = W + 300; // clear runway before the first pattern
      this.wordTimer  = 0; // [WORDS] ms accumulated since the last word spawn
      this.nextWordDelay = WORD_INTERVAL_MIN + Math.random() * (WORD_INTERVAL_MAX - WORD_INTERVAL_MIN);
      this.slideHeld  = false; // true while the mobile slide button is pressed
      this.surviveMs  = 0; // total time survived — drives the speed ramp
      this.pointTimer = 0; // ms accumulated since the last +1 survival point
    },

    preload: function () {
      this.load.audio('PixelJump',   'soundeffect/PixelJump.mp3');
      this.load.audio('PixelDamage', 'soundeffect/PixelDamage.mp3');
      this.load.audio('Swoosh',      'soundeffect/swoosh.mp3');
      this.load.atlas('playerAnim', 'img/player/player-anim.png', 'img/player/player-anim.json');
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
        onGround: true, sliding: false,
        legPhase: 0, invincible: 0
      };

      // [PLAYER] Sprite atlas + animation state machine — hand-drawn stick
      // figure frames (img/player/player-anim.png). Default is 'run'
      // (looping); jump plays once then hands off to a held 'airbound'
      // pose; sliding plays a transition once then loops the roll.
      this.anims.create({ key: 'run', frameRate: 12, repeat: -1,
        frames: this.anims.generateFrameNames('playerAnim', { prefix: 'run_', start: 0, end: 6 }) });
      this.anims.create({ key: 'jump', frameRate: 10, repeat: 0,
        frames: this.anims.generateFrameNames('playerAnim', { prefix: 'jump_', start: 0, end: 2 }) });
      this.anims.create({ key: 'airbound', frameRate: 1, repeat: -1,
        frames: [ { key: 'playerAnim', frame: 'airbound_0' } ] });
      this.anims.create({ key: 'slidein', frameRate: 14, repeat: 0,
        frames: this.anims.generateFrameNames('playerAnim', { prefix: 'slidein_', start: 0, end: 2 }) });
      this.anims.create({ key: 'slide', frameRate: 8, repeat: -1,
        frames: this.anims.generateFrameNames('playerAnim', { prefix: 'slide_', start: 0, end: 2 }) });

      // Anchored bottom-center at the hitbox's feet (PLAYER_X+PW/2, p.y+p.h)
      // so frames of differing native size never jitter vertically.
      this.playerSprite = this.add.sprite(PLAYER_X + PW / 2, GROUND_Y, 'playerAnim', 'run_0')
        .setOrigin(0.5, 1).setScale(0.5).setDepth(2);
      this.playerSprite.play('run');
      this.playerSprite.on('animationcomplete', function (anim) {
        if (anim.key === 'jump' && !self.player.onGround) {
          self.playerSprite.play('airbound', true);
        } else if (anim.key === 'slidein' && self.player.sliding) {
          self.playerSprite.play('slide', true);
        }
      });

      this.keys = this.input.keyboard.addKeys({
        up:    Phaser.Input.Keyboard.KeyCodes.UP,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        down:  Phaser.Input.Keyboard.KeyCodes.DOWN
      });

      // Mobile buttons — slide tracks press/release so it lasts exactly as
      // long as the button is held, same as the keyboard's key.isDown.
      var bj = document.getElementById('pfBtnJump');
      var bs = document.getElementById('pfBtnSlide');
      this._jumpFn      = function () { self.doJump(); };
      this._slideDownFn = function () { self.slideHeld = true; };
      this._slideUpFn   = function () { self.slideHeld = false; };
      if (bj) {
        bj.addEventListener('mousedown',  this._jumpFn);
        bj.addEventListener('touchstart', this._jumpFn, { passive: true });
      }
      if (bs) {
        bs.addEventListener('mousedown',   this._slideDownFn);
        bs.addEventListener('touchstart',  this._slideDownFn, { passive: true });
        bs.addEventListener('mouseup',     this._slideUpFn);
        bs.addEventListener('mouseleave',  this._slideUpFn);
        bs.addEventListener('touchend',    this._slideUpFn);
        bs.addEventListener('touchcancel', this._slideUpFn);
      }

      this.sfxJump   = this.sound.add('PixelJump',    { volume: 0.6 });
      this.sfxDamage = this.sound.add('PixelDamage',  { volume: 0.8 });
      this.sfxSwoosh = this.sound.add('Swoosh',       { volume: 0.6 });

      this.hint = this.add.text(W / 2, 26,
        '🐒 กระโดด: ↑ / Space   สไลด์: ↓   ชนหนาม/ตกหลุม = จบเกม!', {
          fontFamily: 'Prompt, sans-serif', fontSize: '13px', color: '#2b2438',
          backgroundColor: '#ffffffaa', padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setDepth(10);
      this.time.delayedCall(4000, function () {
        self.tweens.add({ targets: self.hint, alpha: 0, duration: 600,
          onComplete: function () { self.hint.destroy(); self.hint = null; }
        });
      });

      // "อมตะ" (immortal) shield duration bar — top-left, only visible
      // while the shield from a successful word practice is active.
      this.immortalTxt = this.add.text(10, 14, '🛡️ อมตะ', {
        fontFamily: 'Prompt, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#2ec4b6'
      }).setDepth(10).setVisible(false);
    },

    doJump: function () {
      if (this.isPaused) return;
      if (this.player.onGround) {
        this.player.vy = JUMP_VY;
        this.player.onGround = false;
        this.player.sliding  = false;
        this.player.h        = PH;
        if (this.sfxJump) this.sfxJump.play();
        if (this.playerSprite) this.playerSprite.play('jump', true);
      }
    },

    spawnWordItem: function (x) {
      if (!words.length) return;
      var word = words[this.wordIdx++ % words.length];
      this.words2.push({
        x: x, y: GROUND_Y - 90 - Math.random() * 70,
        word: word, collected: false
      });
    },

    // [PATTERNS] Spawns a random pattern at world-x startX, shifting every
    // piece's relative offset into world space. Fully random each time —
    // the same pattern can repeat back-to-back, no need to see all 3 first.
    spawnPattern: function (startX) {
      var pat = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
      var self = this;
      pat.gaps.forEach(function (gp) {
        self.gaps.push({ x: startX + gp.x, w: gp.w });
      });
      pat.platforms.forEach(function (pl) {
        self.platforms.push({ x: startX + pl.x, y: pl.y, w: pl.w });
      });
      pat.obstacles.forEach(function (ob) {
        self.obstacles.push({
          x: startX + ob.x, y: ob.y, w: ob.w, h: ob.h, type: ob.type, hw: ob.hw
        });
      });
    },

    // True if the player's x-span currently overlaps an open ground pit
    isOverGap: function () {
      var wx = PLAYER_X + this.scrollX;
      for (var i = 0; i < this.gaps.length; i++) {
        var gp = this.gaps[i];
        if (wx + PW > gp.x && wx < gp.x + gp.w) return true;
      }
      return false;
    },

    // Shared game-over flow — obstacles and falling in a pit both use this
    gameOver: function (msg) {
      if (this.isPaused) return;
      this.isPaused = true;
      if (this.sfxDamage) this.sfxDamage.play();
      this.showPop(PLAYER_X + PW / 2, this.player.y - 20, msg);
      var self = this;
      var cbs = callbacks;
      this.time.delayedCall(900, function () { self.showTipScreen(function () { cbs.onFinish(); }); });
    },

    // [TIPS] Shown every time the player dies, before handing off to the
    // finish screen — one random reminder that would have helped.
    showTipScreen: function (onDone) {
      var tips = [
        'กดไสลด์กลางอากาศเพื่อดิ่งลง',
        'ออกเสียงคําเพื่อเป็นอมตะ',
        'ระวังอย่าเหยียบหนาม'
      ];
      var tip = tips[Math.floor(Math.random() * tips.length)];
      var overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72).setDepth(20);
      var title = this.add.text(W / 2, H / 2 - 40, '💡 เคล็ดลับ', {
        fontFamily: 'Prompt, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#f0a500'
      }).setOrigin(0.5).setDepth(21);
      var tipTxt = this.add.text(W / 2, H / 2, tip, {
        fontFamily: 'Prompt, sans-serif', fontSize: '16px', color: '#ffffff'
      }).setOrigin(0.5).setDepth(21);
      this.time.delayedCall(2600, function () {
        overlay.destroy(); title.destroy(); tipTxt.destroy();
        onDone();
      });
    },

    update: function (time, delta) {
      if (this.isPaused) return;
      var p    = this.player;
      var self = this;

      // All [TUNE] constants below are defined as "per frame at 60fps" —
      // dt normalizes every frame's motion to that baseline so gameplay
      // speed stays consistent regardless of the browser's actual render
      // rate (which otherwise varies with device load, display refresh
      // rate, backgrounded-tab throttling, etc). Clamped so a big stall
      // (e.g. tab regaining focus) can't teleport the player through walls.
      var dt = Math.min(delta, 50) / (1000 / 60);

      if (Phaser.Input.Keyboard.JustDown(this.keys.up) ||
          Phaser.Input.Keyboard.JustDown(this.keys.space)) this.doJump();

      // Survival scoring + speed ramp — no countdown timer; the run only
      // ends on death. +1 point per second survived, and scroll speed
      // climbs the longer you last, capped at SCROLL_SPD_MAX.
      this.surviveMs  += delta;
      this.pointTimer += delta;
      if (this.pointTimer >= 1000) {
        this.pointTimer -= 1000;
        callbacks.onPoints(1);
      }
      var scrollSpd = Math.min(SCROLL_SPD_MAX, SCROLL_SPD_BASE + (this.surviveMs / 1000) * SPEED_RAMP);

      this.scrollX += scrollSpd * dt;

      // Slide held while airborne pulls the player toward the ground faster
      // (a fast-fall), on top of normal gravity — held on the ground it
      // still just crouches, handled further below once onGround is known.
      var slideHeld = this.keys.down.isDown || this.slideHeld;
      var wasOnGround = p.onGround;

      p.vy += GRAVITY * dt;
      if (slideHeld && !p.onGround) p.vy += FAST_FALL * dt;
      p.y  += p.vy * dt;

      // Clamp at 0 (not just >0) — dt is a float, so a plain -= would drift
      // past 0 into small negative values and never land on it exactly,
      // silently breaking the === 0 checks below that gate death/damage.
      if (p.invincible > 0) p.invincible = Math.max(0, p.invincible - dt);

      // Ground collision — skipped while over an open pit, unless shielded
      // (invincible), in which case the pit is safely walked/jumped over.
      if ((!this.isOverGap() || p.invincible > 0) && p.y + p.h >= GROUND_Y) {
        p.y = GROUND_Y - p.h; p.vy = 0; p.onGround = true;
      } else {
        p.onGround = false;
      }

      // Hold-to-slide — lasts exactly as long as the key/button is held,
      // rather than a fixed duration. Only takes effect on the ground.
      // These three cases are mutually exclusive: starting a slide (which
      // also covers landing while the button is already held), releasing
      // it, or landing normally without sliding — each resets the anim.
      if (slideHeld && p.onGround && !p.sliding) {
        p.sliding = true; p.h = PH_SLIDE;
        if (this.playerSprite) this.playerSprite.play('slidein', true);
        if (this.sfxSwoosh) this.sfxSwoosh.play();
      } else if (!slideHeld && p.sliding) {
        p.sliding = false; p.h = PH;
        if (this.playerSprite) this.playerSprite.play('run', true);
      } else if (!wasOnGround && p.onGround && !p.sliding && this.playerSprite) {
        this.playerSprite.play('run', true);
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

      // Fell through a pit and off the bottom of the screen
      if (p.y > H + 40 && p.invincible === 0) { this.gameOver('💀 ตกหลุม!'); return; }

      if (p.onGround && !p.sliding) p.legPhase += 0.26 * dt;

      this.clouds.forEach(function (c) {
        c.x -= 0.5 * dt;
        if (c.x < -150) c.x = W + 100;
      });

      // Cull off-screen objects
      this.platforms = this.platforms.filter(function (pl) { return pl.x - self.scrollX > -250; });
      this.words2    = this.words2.filter(function (w)     { return w.x  - self.scrollX > -80; });
      this.obstacles = this.obstacles.filter(function (ob) { return ob.x - self.scrollX > -100; });
      this.gaps      = this.gaps.filter(function (gp)      { return gp.x + gp.w - self.scrollX > -50; });

      // [PATTERNS] Spawn the next chunk once the previous one has scrolled
      // far enough onto screen — replaces the old independent random timers.
      if (this.scrollX + W > this.nextChunkX) {
        this.spawnPattern(this.nextChunkX);
        this.nextChunkX += CHUNK_W;
      }
      // [WORDS] Time-based spawn — a word bubble every 5-10s (randomized
      // fresh after each spawn), regardless of scroll distance. Only
      // accumulates while not paused, so it naturally waits out the
      // practice modal like everything else.
      this.wordTimer += delta;
      if (this.wordTimer >= this.nextWordDelay) {
        this.wordTimer -= this.nextWordDelay;
        this.nextWordDelay = WORD_INTERVAL_MIN + Math.random() * (WORD_INTERVAL_MAX - WORD_INTERVAL_MIN);
        this.spawnWordItem(this.scrollX + W + 60);
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
            p.invincible = IMMORTAL_FRAMES;
            self.showPop(PLAYER_X + PW / 2, p.y - 20, '🛡️ อมตะ!');
          });
        }
      });

      // Obstacle collision — instant game over. hw (if set) narrows the
      // hitbox below the drawn width, centered, for a fairer feel.
      if (p.invincible === 0 && !this.isPaused) {
        this.obstacles.forEach(function (ob) {
          if (self.isPaused) return; // already game-overed this frame
          var hw = ob.hw !== undefined ? ob.hw : ob.w;
          var hx = ob.x - self.scrollX + (ob.w - hw) / 2;
          if (px < hx + hw && px + PW > hx && py + ph > ob.y && py < ob.y + ob.h) {
            self.gameOver('💥 Game Over');
          }
        });
      }

      // Player sprite follows the physics hitbox each frame — anchored
      // bottom-center at the feet (PLAYER_X+PW/2, p.y+p.h) — and flashes
      // (hides on alternating frames) while the "อมตะ" shield is active.
      if (this.playerSprite) {
        this.playerSprite.setPosition(PLAYER_X + PW / 2, p.y + p.h);
        var flash = p.invincible > 0 && Math.floor(p.invincible / 6) % 2 === 1;
        this.playerSprite.setVisible(!flash);
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

      // Ground pits — punch a hole through the ground bar drawn above
      this.gaps.forEach(function (gp) {
        var gx2 = gp.x - self.scrollX;
        if (gx2 > W + 20 || gx2 + gp.w < -20) return;
        g.fillStyle(0x1b1425);
        g.fillRect(gx2, GROUND_Y, gp.w, H - GROUND_Y);
      });

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
        // A word's emoji field can be auto-set equal to its own word text
        // when it has no picture — the word label right below already
        // shows that text, so this guard stops it printing twice.
        var wEmoji = (wi.word.emoji && wi.word.emoji !== wi.word.word) ? wi.word.emoji : '🔸';
        var et = self.add.text(cx, wi.y - 6 + bob, wEmoji,
          { fontSize: '16px' }).setOrigin(0.5, 1).setDepth(5);
        var wt = self.add.text(cx, wi.y + 8 + bob, wi.word.word,
          { fontFamily: 'Prompt', fontSize: '12px', fontStyle: 'bold', color: '#2b2438' })
          .setOrigin(0.5, 0).setDepth(5);
        self.time.delayedCall(16, function () { et.destroy(); wt.destroy(); });
      });

      // Obstacles — triangular spikes. 'ground' points up, 'ceiling' hangs
      // down as a row of small teeth (must slide under, or jump over).
      this.obstacles.forEach(function (ob) {
        var ox = ob.x - self.scrollX;
        if (ox < -100 || ox > W + 100) return;
        g.fillStyle(0xd32f2f);
        g.lineStyle(1.5, 0x7f1010);
        if (ob.type === 'ceiling') {
          var n  = Math.max(3, Math.round(ob.w / 22));
          var tw = ob.w / n;
          for (var i = 0; i < n; i++) {
            var tx = ox + i * tw;
            g.beginPath();
            g.moveTo(tx,        ob.y);
            g.lineTo(tx + tw/2, ob.y + ob.h);
            g.lineTo(tx + tw,   ob.y);
            g.closePath();
            g.fillPath(); g.strokePath();
          }
        } else {
          g.beginPath();
          g.moveTo(ox,          ob.y + ob.h);
          g.lineTo(ox + ob.w/2, ob.y);
          g.lineTo(ox + ob.w,   ob.y + ob.h);
          g.closePath();
          g.fillPath(); g.strokePath();
        }
      });

      // "อมตะ" shield duration bar — top-left, counts down while active
      // (the player sprite itself is a real GameObject positioned/flashed
      // in update(), not drawn here like the rest of this Graphics layer)
      if (this.player.invincible > 0) {
        var frac = this.player.invincible / IMMORTAL_FRAMES;
        g.fillStyle(0x000000, 0.35);
        g.fillRoundedRect(10, 32, 130, 14, 6);
        g.fillStyle(0x2ec4b6);
        g.fillRoundedRect(12, 34, 126 * frac, 10, 4);
        this.immortalTxt.setVisible(true);
      } else {
        this.immortalTxt.setVisible(false);
      }
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
      if (bs && this._slideDownFn) {
        bs.removeEventListener('mousedown',   this._slideDownFn);
        bs.removeEventListener('touchstart',  this._slideDownFn);
        bs.removeEventListener('mouseup',     this._slideUpFn);
        bs.removeEventListener('mouseleave',  this._slideUpFn);
        bs.removeEventListener('touchend',    this._slideUpFn);
        bs.removeEventListener('touchcancel', this._slideUpFn);
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
  function start(words, cbs, difficulty) {
    stop();
    setTimeout(function () { game = createPlatformerGame(words, cbs, difficulty); }, 60);
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }
  return { start: start, stop: stop };
}());
