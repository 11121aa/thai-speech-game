// ============================================================
//  PLATFORMER GAME — Phaser 3  (Jump & Slide side-scroller)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]      Speed, gravity, jump strength      (~line 18)
//    [OBSTACLES] Obstacle size, spawn rate          (~spawnObstacle)
//    [PLAYER]    Character art                      (~drawCharacter)
//    [COINS]     Coin colour, sound effect           (~spawnCoin / update)
//    [WORDS]     Word-bubble style                  (~spawnWordItem)
//    [PLATFORM]  Platform colours                   (~spawnPlatform)
//    [SKY]       Sky / hill colours                 (~create bg)
//    [POP]       Score pop style                    (~showPop)
// ============================================================
//  How the game works:
//    - The world scrolls left automatically — the player stays in place
//    - Player can JUMP (↑ or Space) and SLIDE (↓)
//    - Coins    → +5 points
//    - Obstacles → -5 seconds on the timer (rock 🪨 or cactus 🌵)
//    - Word bubbles → opens the pronunciation practice modal
//    - Timer = health bar: when it hits 0, the game ends
// ============================================================

// createPlatformerGame is called with:
//   words     = array of word objects { word, emoji, reading, ... }
//   callbacks = { onPoints, onPractice, onFinish, onTime }
function createPlatformerGame(words, callbacks) {

  // ── [TUNE] Numbers you can change to adjust difficulty ────────
  var SCROLL_SPD = 3.8;   // how fast the world scrolls (pixels per frame). Higher = faster game
  var GRAVITY    = 0.52;  // how fast the player falls down each frame. Higher = heavier
  var JUMP_VY    = -13.5; // upward speed when jumping. More negative = higher jump
  var W = 800, H = 400;   // canvas size in pixels (width × height)
  var GROUND_Y = H - 55;  // Y position of the ground surface (measured from top of canvas)
  var PLAYER_X = 110;     // horizontal position of the player (fixed — the world moves, not the player)
  var PW = 32, PH = 62;   // player bounding box: width 32px, height 62px when standing
  var PH_SLIDE = 26;      // player height while sliding (shorter so they duck under obstacles)

  // ── Scene ─────────────────────────────────────────────────────
  // Phaser.Class creates a custom Phaser scene (like a "game world")
  var PlatScene = new Phaser.Class({
    Extends: Phaser.Scene, // inherit all standard Phaser scene features

    // initialize() runs once when the scene object is first created
    initialize: function () {
      Phaser.Scene.call(this, { key: 'platformer' }); // register scene with a unique name

      // --- Game state variables ---
      this.isPaused   = false;  // true when the practice modal is open (game freezes)
      this.scrollX    = 0;      // how far the world has scrolled (increases every frame)
      this.wordIdx    = 0;      // which word to show next (cycles through the words array)

      // Arrays that hold all currently active objects on screen
      this.platforms  = [];  // floating platforms: each item = { x, y, w }
      this.coins      = [];  // collectible coins: each item = { x, y, collected, phase }
      this.words2     = [];  // word bubbles: each item = { x, y, word, collected }
      this.obstacles  = [];  // rocks/cacti: each item = { x, y, w, h, type }
      this.pops       = [];  // floating "+3s" or "-5s" text items
      this.clouds     = [];  // decorative clouds in the background

      this.player     = null; // will be set up in create()

      // These "nextX" values track where the NEXT object should spawn.
      // When scrollX + W > nextX, a new object spawns and nextX jumps forward.
      this.nextPlatX  = W + 180;  // X position to spawn the next platform
      this.nextCoinX  = W + 80;   // X position to spawn the next coin
      this.nextWordX  = W + 380;  // X position to spawn the next word bubble
      this.nextObsX   = W + 320;  // X position to spawn the next obstacle
    },

    // preload() runs before create() — load audio files here
    preload: function () {
      this.load.audio('CoinSFX',   'soundeffect/CoinSFX.mp3');
      this.load.audio('PixelJump', 'soundeffect/PixelJump.mp3');
    },

    // create() runs once when the scene starts — set up the background, player, input, etc.
    create: function () {
      var self = this; // save reference to the scene so inner functions can access it

      // ── [SKY] Draw the static background (drawn once, never redrawn) ──────
      var bgGfx = this.add.graphics(); // create a graphics object for the background
      var bands = 20; // divide the sky into 20 horizontal colour bands for a gradient effect
      for (var i = 0; i < bands; i++) {
        var t  = i / bands; // t goes from 0.0 (top) to ~1.0 (ground) — used for colour mixing
        // Phaser.Math.Linear(a, b, t) mixes between colour a and b based on t
        var r  = Math.round(Phaser.Math.Linear(91,  170, t)); // red channel
        var gv = Math.round(Phaser.Math.Linear(163, 212, t)); // green channel
        var bv = Math.round(Phaser.Math.Linear(224, 245, t)); // blue channel
        bgGfx.fillStyle(Phaser.Display.Color.GetColor(r, gv, bv)); // set the fill colour
        bgGfx.fillRect(0, i * (GROUND_Y / bands), W, GROUND_Y / bands + 1); // draw one band
      }
      // Draw the ground layers (grass on top, dirt below)
      bgGfx.fillStyle(0x4caf50); bgGfx.fillRect(0, GROUND_Y,     W, 8); // bright green grass strip
      bgGfx.fillStyle(0x388e3c); bgGfx.fillRect(0, GROUND_Y + 2, W, 3); // darker green edge line
      bgGfx.fillStyle(0x795548); bgGfx.fillRect(0, GROUND_Y + 8, W, H - GROUND_Y - 8); // brown dirt

      // Create 4 clouds at random heights, spaced evenly across the screen
      for (var c = 0; c < 4; c++) {
        this.clouds.push({
          x:  100 + c * 190,              // horizontal starting position
          y:  35 + Math.random() * 55,    // random height in the sky
          rw: 60 + Math.random() * 70     // random width (half-width of the ellipse)
        });
      }

      // dynGfx = graphics layer redrawn every frame (player, coins, obstacles, etc.)
      // hillGfx = background hills layer (behind everything)
      // setDepth() controls drawing order: higher depth = drawn on top
      this.dynGfx  = this.add.graphics().setDepth(1);
      this.hillGfx = this.add.graphics().setDepth(0);

      // ── Set up the player object ────────────────────────────────
      this.player = {
        y:          GROUND_Y - PH, // starting Y position (just above the ground)
        vy:         0,             // vertical velocity (positive = moving down)
        h:          PH,            // current height (changes when sliding)
        onGround:   true,          // true when the player is touching the ground or a platform
        sliding:    false,         // true while the player is in a slide
        slideTimer: 0,             // countdown frames until the slide ends
        legPhase:   0,             // angle used to animate the walking legs (goes up over time)
        invincible: 0              // frames of invincibility after being hit (counts down to 0)
      };

      // Pre-spawn 6 coins spread across the starting visible area
      for (var ci = 0; ci < 6; ci++) this.spawnCoin(W + 60 + ci * 130);

      // ── Keyboard input setup ────────────────────────────────────
      // addKeys() maps named actions to key codes
      this.keys = this.input.keyboard.addKeys({
        up:    Phaser.Input.Keyboard.KeyCodes.UP,    // ↑ arrow = jump
        space: Phaser.Input.Keyboard.KeyCodes.SPACE, // Space = also jump
        down:  Phaser.Input.Keyboard.KeyCodes.DOWN   // ↓ arrow = slide
      });

      // ── DOM button controls (for mobile touchscreen) ────────────
      var bj = document.getElementById('pfBtnJump');  // the Jump button element
      var bs = document.getElementById('pfBtnSlide'); // the Slide button element
      // Save references to the functions so we can remove them later in shutdown()
      this._jumpFn  = function () { self.doJump(); };
      this._slideFn = function () { self.doSlide(); };
      // Attach both mousedown (desktop click) and touchstart (mobile tap)
      if (bj) {
        bj.addEventListener('mousedown',  this._jumpFn);
        bj.addEventListener('touchstart', this._jumpFn, { passive: true }); // passive = no scroll blocking
      }
      if (bs) {
        bs.addEventListener('mousedown',  this._slideFn);
        bs.addEventListener('touchstart', this._slideFn, { passive: true });
      }

      // ── Sound instances (created after audio files are loaded in preload) ──
      this.sfxCoin = this.sound.add('CoinSFX',   { volume: 0.7 });
      this.sfxJump = this.sound.add('PixelJump',  { volume: 0.6 });

      // ── On-screen hint text (fades out after 4 seconds) ─────────
      this.hint = this.add.text(W / 2, 26,
        '↑ กระโดด   ↙ สไลด์   เก็บเหรียญ 🪙 (+เวลา)   หลีกหิน 🪨 (-เวลา)', {
          fontFamily: 'Prompt, sans-serif', fontSize: '14px', color: '#2b2438',
          backgroundColor: '#ffffffaa', padding: { x: 8, y: 4 }
        }).setOrigin(0.5).setDepth(10);
      this.time.delayedCall(4000, function () { // after 4000 ms (4 seconds)...
        self.tweens.add({ targets: self.hint, alpha: 0, duration: 600, // fade out over 0.6 seconds
          onComplete: function () { self.hint.destroy(); self.hint = null; } // then remove it
        });
      });
    },

    // doJump() is called when the player presses ↑, Space, or the Jump button
    doJump: function () {
      if (this.isPaused) return;            // ignore input during practice modal
      if (this.player.onGround) {           // can only jump when touching the ground
        this.player.vy       = JUMP_VY;     // apply upward velocity (negative Y = upward)
        this.player.onGround = false;       // player is now in the air
        this.player.sliding  = false;       // cancel any active slide
        this.player.h        = PH;          // restore full standing height
        if (this.sfxJump) this.sfxJump.play();
      }
    },

    // doSlide() is called when the player presses ↓ or the Slide button
    doSlide: function () {
      if (this.isPaused || !this.player.onGround) return; // must be on ground to slide
      this.player.sliding    = true;
      this.player.h          = PH_SLIDE; // shrink hitbox height while sliding
      this.player.slideTimer = 48;       // slide lasts 48 frames (~0.8 seconds)
    },

    // ── Spawn helper functions ─────────────────────────────────────

    // spawnCoin(x, y) — creates a new coin at position x
    // y is optional; if omitted, the coin appears at a random height above the ground
    spawnCoin: function (x, y) {
      this.coins.push({
        x:         x,
        y:         y !== undefined ? y : GROUND_Y - 22 - Math.random() * 55, // random height if not given
        collected: false,
        phase:     Math.random() * Math.PI * 2  // random starting angle for the spinning animation
      });
    },

    // spawnWordItem(x) — places a word bubble at position x
    // When the player touches it, the practice modal opens
    spawnWordItem: function (x) {
      if (!words.length) return; // don't spawn if there are no words
      var word = words[this.wordIdx++ % words.length]; // pick the next word, cycling back to start
      this.words2.push({
        x:         x,
        y:         GROUND_Y - 90 - Math.random() * 70, // float it above ground level
        word:      word,
        collected: false
      });
    },

    // spawnPlatform(x) — creates a floating platform at position x
    // Also places 2–4 coins on top of the platform as a reward for jumping up
    spawnPlatform: function (x) {
      var py = GROUND_Y - 115 - Math.random() * 65; // random height above ground
      var pw = 110 + Math.random() * 100;           // random platform width
      this.platforms.push({ x: x, y: py, w: pw });
      var n = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4 coins on this platform
      for (var i = 0; i < n; i++) this.spawnCoin(x + 18 + i * 30, py - 25); // place coins above platform
    },

    // spawnObstacle(x) — creates a rock or cactus at position x
    // [OBSTACLES] Change sizes below or add new types
    spawnObstacle: function (x) {
      var types = ['rock', 'cactus'];
      var type  = types[Math.floor(Math.random() * 2)]; // randomly pick rock or cactus
      // Rock is wide and short — player must jump over it
      // Cactus is narrow and tall — player must also jump (can't slide under it)
      var w = type === 'rock' ? 36 : 20; // width in pixels
      var h = type === 'rock' ? 28 : 50; // height in pixels
      this.obstacles.push({
        x:    x,
        y:    GROUND_Y - h, // position so the bottom of the obstacle sits on the ground
        w:    w,
        h:    h,
        type: type
      });
    },

    // ── update() runs every frame (about 60 times per second) ─────
    // This is the main game loop: handle input, move things, check collisions, draw
    update: function (time) {
      if (this.isPaused) return; // stop all logic while practice modal is open
      var p    = this.player;
      var self = this;

      // ── Handle keyboard input ───────────────────────────────────
      // JustDown() is true only on the first frame the key is pressed (not held)
      if (Phaser.Input.Keyboard.JustDown(this.keys.up) ||
          Phaser.Input.Keyboard.JustDown(this.keys.space)) this.doJump();
      if (Phaser.Input.Keyboard.JustDown(this.keys.down)) this.doSlide();

      // ── Scroll the world ────────────────────────────────────────
      this.scrollX += SCROLL_SPD; // increase scrollX every frame — everything moves left

      // ── Apply physics to the player ─────────────────────────────
      p.vy += GRAVITY;  // gravity pulls the player down each frame (vy increases)
      p.y  += p.vy;     // move the player by their current vertical velocity

      // Slide timer countdown — end the slide when it expires
      if (p.sliding && --p.slideTimer <= 0) {
        p.sliding = false;
        p.h       = PH; // restore full standing height when slide ends
      }

      // Invincibility countdown — player flashes after hitting an obstacle
      if (p.invincible > 0) p.invincible--;

      // ── Ground collision check ───────────────────────────────────
      // If the player's feet (p.y + p.h) have gone below the ground surface...
      if (p.y + p.h >= GROUND_Y) {
        p.y       = GROUND_Y - p.h; // push the player back up to ground level
        p.vy      = 0;              // stop falling
        p.onGround = true;
      } else {
        p.onGround = false; // player is in the air
      }

      // ── Platform collision (landing on top of a platform) ────────
      this.platforms.forEach(function (plat) {
        var sx = plat.x - self.scrollX; // screen X position of this platform (adjusts for scroll)
        // Check if the player is horizontally over the platform
        if (PLAYER_X + PW > sx && PLAYER_X < sx + plat.w) {
          var feet = p.y + p.h;      // Y position of the player's feet
          var prev = feet - p.vy;    // where the feet were last frame (before moving)
          // Only land if the player is falling (vy >= 0) and just crossed the platform surface
          if (p.vy >= 0 && feet >= plat.y && prev <= plat.y + 4) {
            p.y       = plat.y - p.h; // snap to standing on the platform
            p.vy      = 0;
            p.onGround = true;
          }
        }
      });

      // Advance the leg animation angle when the player is walking on the ground
      if (p.onGround && !p.sliding) p.legPhase += 0.26;

      // ── Move clouds slowly to the left (parallax atmosphere) ────
      this.clouds.forEach(function (c) {
        c.x -= 0.5; // clouds drift left at half the scroll speed
        if (c.x < -150) c.x = W + 100; // wrap back to the right when off-screen
      });

      // ── Remove objects that have scrolled far off the left edge ──
      // filter() keeps only items where the condition is true
      this.platforms  = this.platforms.filter(function (pl) { return pl.x - self.scrollX > -250; });
      this.coins      = this.coins.filter(function (c)      { return c.x  - self.scrollX > -80; });
      this.words2     = this.words2.filter(function (w)     { return w.x  - self.scrollX > -80; });
      this.obstacles  = this.obstacles.filter(function (ob) { return ob.x - self.scrollX > -100; });

      // ── Spawn new objects when the visible area reaches the next spawn point ──
      // scrollX + W = the X coordinate of the right edge of the screen
      if (this.scrollX + W > this.nextPlatX) {
        this.spawnPlatform(this.nextPlatX);
        this.nextPlatX += 260 + Math.random() * 220; // next platform appears 260–480px further
      }
      if (this.scrollX + W > this.nextCoinX) {
        this.spawnCoin(this.nextCoinX);
        this.nextCoinX += 85 + Math.random() * 90;   // next coin appears 85–175px further
      }
      if (this.scrollX + W > this.nextWordX) {
        this.spawnWordItem(this.nextWordX);
        this.nextWordX += 300 + Math.random() * 260;  // next word bubble 300–560px further
      }
      // [OBSTACLES] Change the range (200 + random*200) to control obstacle density
      if (this.scrollX + W > this.nextObsX) {
        this.spawnObstacle(this.nextObsX);
        this.nextObsX += 200 + Math.random() * 200;   // next obstacle 200–400px further
      }

      // ── Coin collection ──────────────────────────────────────────
      // Use the player's current position for all collision checks this frame
      var px = PLAYER_X, py = p.y, ph = p.h;
      this.coins.forEach(function (c) {
        if (c.collected) return; // skip already-collected coins
        var cx = c.x - self.scrollX; // coin's screen position
        // Find the closest point on the player's rectangle to the coin's centre
        var nx = Math.max(px, Math.min(cx, px + PW));
        var ny = Math.max(py, Math.min(c.y, py + ph));
        // If that closest point is within 13px of the coin centre — it's a collection!
        if ((cx - nx) * (cx - nx) + (c.y - ny) * (c.y - ny) < 13 * 13) {
          c.collected = true;
          callbacks.onPoints(5);                    // award 5 points
          if (self.sfxCoin) self.sfxCoin.play();    // play coin sound effect
          self.showPop(cx, c.y - 14, '+5 ⭐');      // show floating "+5" text
        }
      });

      // ── Word bubble collection ───────────────────────────────────
      this.words2.forEach(function (wi) {
        if (wi.collected) return;
        var cx = wi.x - self.scrollX; // word bubble's screen position
        var bw = 46; // half-width of the collision box for the word bubble
        // Simple rectangle overlap check (AABB)
        if (px < cx + bw && px + PW > cx - bw &&
            py < wi.y + 28 && py + ph > wi.y - 28) {
          wi.collected = true;
          self.isPaused = true; // freeze the game while the modal is open
          callbacks.onPractice(wi.word, null, function () {
            self.isPaused = false; // unfreeze when the player closes the modal
          });
        }
      });

      // ── Obstacle collision (rock / cactus) ──────────────────────
      // Only check if the player is NOT currently invincible
      if (p.invincible === 0) {
        this.obstacles.forEach(function (ob) {
          var ox = ob.x - self.scrollX; // obstacle's screen position
          // AABB (Axis-Aligned Bounding Box) overlap test:
          // Two rectangles overlap if neither is fully to the left, right, above, or below the other
          if (px < ox + ob.w &&        // player's left < obstacle's right
              px + PW > ox &&          // player's right > obstacle's left
              py + ph > ob.y &&        // player's bottom > obstacle's top
              py < ob.y + ob.h) {      // player's top < obstacle's bottom
            p.invincible = 80;                        // grant ~1.3s of invincibility (80 frames)
            if (callbacks.onTime) callbacks.onTime(-5); // subtract 5 seconds from timer
            self.showPop(px + PW / 2, py - 20, '-5s 💥'); // show floating "-5s" text
          }
        });
      }

      // ── Update floating score-pop text positions ─────────────────
      // Each pop floats upward and fades out over time
      this.pops.forEach(function (pp) {
        pp.vy   -= 0.08; // gradually slow the upward drift
        pp.y    += pp.vy;
        pp.life -= 0.022; // reduce lifespan each frame
      });
      this.pops = this.pops.filter(function (pp) { return pp.life > 0; }); // remove dead pops

      // ── Draw everything ──────────────────────────────────────────
      this.draw(time);
    },

    // draw() clears and redraws all game objects every frame
    draw: function (time) {
      var g    = this.dynGfx;  // dynamic graphics layer (redrawn each frame)
      var hg   = this.hillGfx; // hill layer (behind the main graphics)
      var self = this;
      g.clear();  // erase everything from last frame
      hg.clear();

      // ── [SKY] Parallax scrolling hills in the background ─────────
      hg.fillStyle(0x81c784); // medium green hills
      // hoff = offset so the hills appear to scroll slower than the foreground (parallax)
      // multiplying by 0.15 means hills move at 15% of the main scroll speed
      var hoff = ((-this.scrollX * 0.15) % 200 + 200) % 200;
      for (var hx = hoff - 110; hx < W + 110; hx += 200) {
        hg.fillCircle(hx, GROUND_Y + 12, 100); // draw each hill as a large circle
      }

      // ── Draw clouds ───────────────────────────────────────────────
      // Each cloud is made of 3 overlapping ellipses for a fluffy look
      this.clouds.forEach(function (c) {
        g.fillStyle(0xffffff, 0.88); // white, slightly transparent
        g.fillEllipse(c.x,               c.y,     c.rw * 2,    44); // main body
        g.fillEllipse(c.x - c.rw * 0.38, c.y + 9, c.rw * 1.16, 34); // left bump
        g.fillEllipse(c.x + c.rw * 0.32, c.y + 7, c.rw,         30); // right bump
      });

      // ── [PLATFORM] Draw floating platforms ───────────────────────
      this.platforms.forEach(function (plat) {
        var sx = plat.x - self.scrollX; // convert world X to screen X
        if (sx > W + 10 || sx + plat.w < -10) return; // skip if off-screen
        g.fillStyle(0x43a047); g.fillRect(sx, plat.y,      plat.w, 10); // green grass top
        g.fillStyle(0x795548); g.fillRect(sx, plat.y + 10, plat.w, 12); // brown dirt body
        g.lineStyle(1.5, 0x2e7d32);
        g.strokeRect(sx, plat.y, plat.w, 22); // dark green border
      });

      // ── [COINS] Draw spinning coins ───────────────────────────────
      var now = this.time.now; // current time in milliseconds (used for animations)
      this.coins.forEach(function (c) {
        if (c.collected) return; // don't draw coins that have been picked up
        var cx = c.x - self.scrollX;
        if (cx < -70 || cx > W + 70) return; // skip off-screen coins
        // Math.sin creates a value that goes between -1 and 1 cyclically
        // Math.abs makes it go 0→1→0 which looks like a coin spinning on its axis
        var spin = Math.abs(Math.sin(now * 0.004 + (c.phase || 0)));
        g.fillStyle(0xFFD700); // gold colour
        g.lineStyle(1.5, 0xc8a000);
        // Draw a thin ellipse when spin≈0 (edge-on) and a circle when spin≈1 (face-on)
        g.fillEllipse(  cx, c.y, 22 * (0.15 + spin * 0.85), 22);
        g.strokeEllipse(cx, c.y, 22 * (0.15 + spin * 0.85), 22);
      });

      // ── [WORDS] Draw word bubbles ─────────────────────────────────
      this.words2.forEach(function (wi) {
        if (wi.collected) return;
        var cx  = wi.x - self.scrollX;
        if (cx < -80 || cx > W + 80) return;
        // Bob up and down using a sine wave based on time and position
        var bob = Math.sin(now * 0.003 + cx * 0.01) * 5;
        var bw  = 80; // half-width of the bubble box
        // Soft purple shadow behind the bubble
        g.fillStyle(0xa78bfa, 0.25);
        g.fillRoundedRect(cx - bw / 2 - 4, wi.y - 26 + bob, bw + 8, 52, 14);
        // White bubble with purple border
        g.fillStyle(0xffffff);
        g.lineStyle(2.5, 0x8a5cf6);
        g.fillRoundedRect(  cx - bw / 2, wi.y - 22 + bob, bw, 44, 10);
        g.strokeRoundedRect(cx - bw / 2, wi.y - 22 + bob, bw, 44, 10);
        // Draw emoji and word text inside the bubble
        // These Text objects are created fresh each frame and destroyed 16ms later
        // (This is a simple but slightly expensive approach — see POLISH note for alternative)
        var et = self.add.text(cx, wi.y - 6 + bob, wi.word.emoji || '🔸',
          { fontSize: '16px' }).setOrigin(0.5, 1).setDepth(5);
        var wt = self.add.text(cx, wi.y + 8 + bob, wi.word.word,
          { fontFamily: 'Prompt', fontSize: '12px', fontStyle: 'bold', color: '#2b2438' })
          .setOrigin(0.5, 0).setDepth(5);
        self.time.delayedCall(16, function () { et.destroy(); wt.destroy(); }); // remove after 1 frame
      });

      // ── [OBSTACLES] Draw rocks and cacti ─────────────────────────
      this.obstacles.forEach(function (ob) {
        var ox = ob.x - self.scrollX; // obstacle's screen position
        if (ox < -80 || ox > W + 80) return; // skip off-screen obstacles

        if (ob.type === 'rock') {
          // Rock: blue-grey rounded rectangle with a crack line
          g.fillStyle(0x78909c);             // blue-grey fill
          g.fillRoundedRect(ox, ob.y, ob.w, ob.h, 8); // rounded corners
          g.lineStyle(2, 0x546e7a);
          g.strokeRoundedRect(ox, ob.y, ob.w, ob.h, 8); // dark border
          // Decorative crack line across the rock
          g.lineStyle(1, 0x90a4ae, 0.6);
          g.lineBetween(ox + ob.w * 0.3, ob.y + 4,         // crack starts at 30% width, near top
                        ox + ob.w * 0.55, ob.y + ob.h - 4); // ends at 55% width, near bottom
        } else {
          // Cactus: green trunk + arms + rounded caps
          g.fillStyle(0x388e3c); // dark green
          g.fillRect(ox,        ob.y + 14, ob.w,    ob.h - 14); // main trunk
          g.fillRect(ox - 10,   ob.y + 18, 10,      16);         // left arm (horizontal stick)
          g.fillRect(ox + ob.w, ob.y + 22, 10,      12);         // right arm
          g.fillRoundedRect(ox, ob.y,       ob.w,   18, 4);      // rounded top of trunk
          g.fillRoundedRect(ox - 10,   ob.y + 10, 10, 6, 3);    // rounded tip of left arm
          g.fillRoundedRect(ox + ob.w, ob.y + 14, 10, 6, 3);    // rounded tip of right arm
          g.lineStyle(1.5, 0x2e7d32);
          g.strokeRoundedRect(ox, ob.y, ob.w, ob.h, 4); // outline
        }
      });

      // ── Draw the player ───────────────────────────────────────────
      // When invincible, the player flashes on and off every 6 frames
      // Math.floor(invincible/6) % 2 === 1 alternates between true and false
      var flash = this.player.invincible > 0 && Math.floor(this.player.invincible / 6) % 2 === 1;
      if (!flash) this.drawCharacter(g); // skip drawing to create a flashing effect
    },

    // ── [PLAYER] Draw the character using simple shapes ───────────
    // The player is drawn differently when sliding vs standing/running
    drawCharacter: function (g) {
      var p  = this.player;
      var cx = PLAYER_X + PW / 2; // horizontal centre of the player
      var cy = p.y;                // top of the player

      if (p.sliding) {
        // ── Sliding pose: flat, compressed body ──────────────────
        g.fillStyle(0xd63031); g.fillRect(cx - 16, cy, 32, 10);          // red hat/hair
        g.fillStyle(0xffba8a); g.fillEllipse(cx + 4, cy + 6, 20, 16);    // skin (face)
        g.fillStyle(0x0984e3); g.fillRect(cx - 16, cy + 10, 32, p.h - 10); // blue body/shirt
        g.fillStyle(0x5d4037); g.fillRect(cx - 16, cy + p.h - 6, 32, 6); // brown shoes
      } else {
        // ── Standing / running pose ───────────────────────────────
        // sw = how far each leg extends; it swings back and forth using sine wave while running
        var sw = p.onGround ? Math.sin(p.legPhase) * 7 : 4; // legs swing while on ground; fixed angle in air

        g.fillStyle(0xd63031);
        g.fillRect(cx - 11, cy,     22, 8); // top of hat/hair
        g.fillRect(cx - 15, cy + 7, 30, 5); // brim of hat

        g.fillStyle(0xffba8a);
        g.fillEllipse(cx, cy + 19, 24, 24); // face (round skin-colour ellipse)

        g.fillStyle(0x2d3436);
        g.fillCircle(cx + 4, cy + 16, 2.5); // eye dot

        g.fillStyle(0x5d4037);
        g.fillEllipse(cx - 4, cy + 23, 10, 6); // left ear
        g.fillEllipse(cx + 5, cy + 23, 10, 6); // right ear

        g.fillStyle(0x0984e3);
        g.fillRect(cx - 12, cy + 29, 24, 16); // shirt/torso (blue)

        g.fillStyle(0xfdcb6e);
        g.fillRect(cx - 8, cy + 31, 5, 5); // left sleeve detail
        g.fillRect(cx + 4, cy + 31, 5, 5); // right sleeve detail

        g.fillStyle(0xd63031);
        g.fillRect(cx - 12, cy + 44, 10, 12 + sw); // left leg (extends down by sw)
        g.fillRect(cx + 2,  cy + 44, 10, 12 - sw); // right leg (swings opposite direction)

        g.fillStyle(0x5d4037);
        g.fillRect(cx - 14, cy + 55 + sw, 13, 7); // left shoe (moves with left leg)
        g.fillRect(cx,      cy + 55 - sw, 13, 7); // right shoe
      }
    },

    // ── [POP] Show a floating reward/penalty message ──────────────
    // Creates a Phaser Text object that floats upward and fades out
    showPop: function (x, y, text) {
      var isNeg = text.charAt(0) === '-'; // check if message starts with '-' (negative = penalty)
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif', fontSize: '18px', fontStyle: 'bold',
        color:  isNeg ? '#e74c3c' : '#ff9f1c', // red for penalty, orange for reward
        stroke: '#ffffff', strokeThickness: 3   // white outline for readability
      }).setOrigin(0.5).setDepth(12);
      // Tween = animated transition: move y up by 40px and fade alpha to 0 over 0.8 seconds
      this.tweens.add({
        targets:  pop,
        y:        y - 40, // float upward
        alpha:    0,       // fade out
        duration: 800,
        ease:     'Power2', // ease out — starts fast, slows down
        onComplete: function () { pop.destroy(); } // remove when animation finishes
      });
    },

    // ── shutdown() runs when the game scene is stopped ─────────────
    // IMPORTANT: remove all DOM event listeners to prevent memory leaks
    // If we don't do this, the old listeners pile up every time a new game starts
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

  // Create and return a Phaser.Game instance that runs the PlatScene above
  return new Phaser.Game({
    type:   Phaser.AUTO,         // AUTO = use WebGL if available, fall back to Canvas
    parent: 'platformerGame',    // ID of the HTML div to inject the canvas into
    width:  W,                   // canvas width in pixels
    height: H,                   // canvas height in pixels
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    scene:  PlatScene,           // the scene class defined above
    audio:  { noAudio: false }   // audio enabled — PixelJump and CoinSFX are used
  });
}

// ── Public API ────────────────────────────────────────────────────
// This wraps createPlatformerGame() so it can be called as PlatformerGame.start() / .stop()
// The IIFE (immediately invoked function expression) keeps `game` private — nothing outside can access it
var PlatformerGame = (function () {
  var game = null; // holds the current Phaser.Game instance (or null if not running)

  function start(words, cbs) {
    stop(); // always stop any existing game first before starting a new one
    // setTimeout with 60ms gives the browser time to finish cleanup before creating a new game
    setTimeout(function () { game = createPlatformerGame(words, cbs); }, 60);
  }

  function stop() {
    if (game) {
      try { game.destroy(true); } catch (e) {} // true = remove the canvas element from the DOM
      game = null;
    }
  }

  return { start: start, stop: stop }; // expose only start and stop — everything else is hidden
}());
