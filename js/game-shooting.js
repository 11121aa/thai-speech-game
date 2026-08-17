// ============================================================
//  SHOOTING GAME — Phaser 3  (Rotating-cannon mechanic)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Speed, tolerance, timeouts           (~line 22)
//    [PROJ]    Projectile speed & hit radius        (~line 26)
//    [CANNON]  Cannon position & barrel size        (~drawCannon)
//    [RINGS]   Bullseye ring colours                (~line 37)
//    [SKY]     Sky & ground colours                 (~drawBg)
//    [POP]     Score pop style                      (~showPop)
// ============================================================
//  How the game works:
//    - A cannon sits at the bottom; drag anywhere and pull AWAY from
//      your target, slingshot-style, then release to launch
//    - A dotted arc previews exactly where the ball will fly, and the
//      shot obeys gravity, so lobbing over/short is the core skill
//    - Hit a bullseye → break effect + pronunciation practice modal
//    - Each target has a countdown timer — miss it and it expires
//    - Targets oscillate left-right so the game never feels static
//  Sound effects:
//    - CannonFire  → plays when the cannon fires
//    - TargetBreak → plays on impact
//    - CongratSFX  → plays when the player finishes pronouncing a word
// ============================================================

// Tracks the currently-attached #shootBtnTimeStop listener across restarts.
// NOT cleaned up via the scene's own 'shutdown' event -- confirmed live
// that Phaser's game.destroy(true) does not fire it here (tested with a
// one-off 'shutdown' listener that never logged), so relying on it would
// leak a listener (and the wrap div) on every restart. ShootingGame.stop()
// below does this cleanup directly and unconditionally instead.
var _shootTimeStopBtnFn = null;

function createShootingGame(words, callbacks) {

  // ── [TUNE] Difficulty knobs ────────────────────────────────────
  var TIMEOUT_MS  = 7000;  // ms before a target expires
  var MAX_TARGETS = 3;     // max targets on screen at once
  var W = 800, H = 450;
  var GROUND_Y = H - 80;   // y-coordinate of the grass line

  // [CANNON] Fixed at the bottom-centre
  var CANNON_X = W / 2;
  var CANNON_Y = H - 30;
  var BARREL_LEN = 48;

  // ── [PROJ] Projectile settings -- speed/cooldown bonuses come from
  // shop.html's shoot_speed_*/shoot_cooldown_* upgrades (see
  // window.__shootLoadout, set by game.html just before start()); both
  // default to 0 for a guest/no-purchase player, giving the original
  // baseline numbers unchanged. ────────────────────────────────
  var loadout = window.__shootLoadout || {};
  var PROJ_SPD   = 9 * (1 + (loadout.speedBonus || 0));       // cannonball speed (px/frame at 60fps)
  var PROJ_HIT_R = 26;   // hit radius (px)

  // ── [AIM] Pull-back slingshot control ──────────────────────────
  // Drag anywhere and pull AWAY from where you want the ball to go, the
  // way a slingshot works; the shot fires on release. Aiming used to be
  // an automatic left-right sweep you tapped to interrupt, which meant
  // the only real input was timing -- young kids couldn't aim at all,
  // they just tapped and hoped. Pulling is direct: the arc you see is
  // the arc you get.
  var GRAVITY     = 0.26;  // px/frame^2, applied to shots AND the preview
  var MIN_PULL    = 18;    // shorter than this is a stray tap, not a shot
  var MAX_PULL    = 150;   // pulling further doesn't add power
  var MIN_SPD     = PROJ_SPD * 0.70;  // a barely-pulled shot still leaves the barrel
  var MAX_SPD     = PROJ_SPD * 1.85;  // upgrades scale both ends, so they still matter
  var AIM_MIN_ANG = -Math.PI + 0.05;  // clamp to the upward hemisphere so you
  var AIM_MAX_ANG = -0.05;            // can't fire into the ground at your feet

  var RELOAD_MS  = Math.max(500, 1500 - (loadout.cooldownReductionMs || 0)); // reload between shots
  var TIMESTOP_COOLDOWN_MS = 15000; // how often the time-stop ability can be reused, once owned

  // ── [RINGS] Bullseye colours outer → inner ─────────────────────
  var RING_R = [22, 17, 12, 8, 4];  // smaller target (~30% reduction)
  var RING_C = [0xe74c3c, 0xffffff, 0x2980b9, 0xffffff, 0xf1c40f];
  // Particle colours reuse ring colours for the break effect
  var BREAK_COLORS = [0xe74c3c, 0xffffff, 0x2980b9, 0xf1c40f, 0xff9900];

  // ── Scene ─────────────────────────────────────────────────────
  var ShootScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'shooting' });

      this.targets     = [];  // active bullseye targets
      this.projectiles = [];  // cannonballs in flight: { x, y, vx, vy }
      this.particles   = [];  // break effect particles: { x, y, vx, vy, life, color, r }
      this.wordIdx     = 0;
      this.aimAngle    = -Math.PI / 2; // barrel rests pointing straight up
      this.aimPower    = 1;            // 0..1, set by how far the last pull went
      this.drag        = null;         // { sx, sy, cx, cy } while a pull is in progress
      this.isPaused    = false;
      this.trail       = null;          // { angle, life } — fading shot line
      this.reloadUntil = 0;            // timestamp when reload finishes
      this.timeStopUntil  = 0;         // targets frozen (no movement, no expiry) until this timestamp
      this.timeStopReadyAt = 0;        // ability off cooldown once time.now passes this
    },

    preload: function () {
      this.load.audio('CannonFire',  'soundeffect/CannonFire.mp3');
      this.load.audio('CongratSFX',  'soundeffect/CongratSFX.mp3');
      this.load.audio('TargetBreak', 'soundeffect/TargetBreak.mp3');
    },

    create: function () {
      var self = this;

      this.sfxCannon  = this.sound.add('CannonFire',  { volume: 0.6 });
      this.sfxCongrat = this.sound.add('CongratSFX',  { volume: 0.8 });
      this.sfxBreak   = this.sound.add('TargetBreak', { volume: 0.75 });

      // Static background drawn once onto its own graphics layer
      var bgGfx = this.add.graphics();
      this.drawBg(bgGfx);

      // Dynamic layer cleared and redrawn every frame
      this.gfx = this.add.graphics();

      // ── Pull-back aiming ──
      // The pull is measured from wherever the finger went down, not from
      // the cannon: a child dragging from the middle of the screen still
      // aims, instead of having to find and grab a small barrel first.
      this.input.on('pointerdown', function (ptr) {
        if (self.isPaused) return;
        if (self.time.now < self.reloadUntil) return; // still reloading -- ignore so no half-aim sticks
        self.drag = { sx: ptr.x, sy: ptr.y, cx: ptr.x, cy: ptr.y };
      });
      this.input.on('pointermove', function (ptr) {
        if (!self.drag) return;
        self.drag.cx = ptr.x; self.drag.cy = ptr.y;
        var a = self.aimFromDrag();
        if (a) { self.aimAngle = a.angle; self.aimPower = a.power; }
      });
      var release = function () {
        if (!self.drag) return;
        var a = self.aimFromDrag();
        self.drag = null;
        // Too short to be a deliberate pull -- treat as a stray tap and
        // don't waste the shot (and the reload) on a random direction.
        if (!a) return;
        self.aimAngle = a.angle; self.aimPower = a.power;
        if (!self.isPaused) self.fire(a.angle, a.speed);
      };
      this.input.on('pointerup', release);
      this.input.on('pointerupoutside', release);
      // Keyboard keeps the old one-key behaviour for desktop: fires along
      // the barrel's current angle at whatever power was last pulled.
      this.input.keyboard.on('keydown-SPACE', function () {
        if (!self.isPaused) self.fire(self.aimAngle, MIN_SPD + (MAX_SPD - MIN_SPD) * self.aimPower);
      });

      // Time-stop ability -- a real DOM button (like the RPG game's skill
      // button) rather than a canvas tap zone, so it can't be confused
      // with (or accidentally trigger) the fire-on-tap-anywhere handler
      // above. Only shown once the shoot_timestop upgrade is owned.
      var wrap = document.getElementById('shootBtnWrap');
      var btn = document.getElementById('shootBtnTimeStop');
      if (loadout.hasTimeStop && wrap && btn) {
        wrap.style.display = 'flex';
        _shootTimeStopBtnFn = function (e) { e.preventDefault(); if (!self.isPaused) self.useTimeStop(); };
        btn.addEventListener('mousedown', _shootTimeStopBtnFn);
        btn.addEventListener('touchstart', _shootTimeStopBtnFn, { passive: false });
      } else if (wrap) {
        wrap.style.display = 'none';
      }

      var hint = this.add.text(W / 2, 22,
        '🎯 ลากถอยหลังแล้วปล่อยเพื่อยิง! — เล็งตามเส้นประ', {
          fontFamily: 'Prompt, sans-serif', fontSize: '15px', fontStyle: 'bold',
          color: '#2b2438', backgroundColor: '#ffffffbb',
          padding: { x: 10, y: 4 }
        }).setOrigin(0.5).setDepth(10);
      this.time.delayedCall(3000, function () {
        self.tweens.add({ targets: hint, alpha: 0, duration: 600,
          onComplete: function () { hint.destroy(); }
        });
      });

      // Stagger initial spawns at random offsets so targets appear one by one
      var delays = [
        0,
        500 + Math.floor(Math.random() * 600),
        1300 + Math.floor(Math.random() * 700)
      ];
      delays.forEach(function (ms) {
        self.time.delayedCall(ms, function () { self.spawnTarget(); });
      });
    },

    // ── [SKY] Static background ─────────────────────────────────────
    drawBg: function (g) {
      // Sky gradient (top of screen to ground line)
      var bands = 20;
      for (var i = 0; i < bands; i++) {
        var t  = i / bands;
        var r  = Math.round(Phaser.Math.Linear(100, 178, t));
        var gv = Math.round(Phaser.Math.Linear(180, 218, t));
        var b  = Math.round(Phaser.Math.Linear(230, 245, t));
        g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b));
        g.fillRect(0, i * (GROUND_Y / bands), W, GROUND_Y / bands + 1);
      }

      // Sun (upper right, with soft glow ring)
      g.fillStyle(0xffec6e, 0.45);
      g.fillCircle(718, 52, 52);
      g.fillStyle(0xffec6e);
      g.fillCircle(718, 52, 36);

      // Clouds — each is several overlapping circles
      g.fillStyle(0xffffff, 0.92);
      // Cloud 1 (left)
      g.fillCircle(95,  75, 22); g.fillCircle(122, 64, 28);
      g.fillCircle(150, 70, 22); g.fillCircle(172, 77, 15);
      // Cloud 2 (centre)
      g.fillCircle(330, 52, 17); g.fillCircle(352, 44, 22);
      g.fillCircle(374, 50, 18);
      // Cloud 3 (right, doesn't overlap sun)
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(575, 80, 19); g.fillCircle(600, 70, 25);
      g.fillCircle(626, 76, 21); g.fillCircle(648, 83, 14);

      // Distant hills — drawn before grass so grass overlaps the bases
      g.fillStyle(0x5a8c3a, 0.5);
      g.fillEllipse(155, GROUND_Y + 18, 290, 110);
      g.fillStyle(0x4e7e32, 0.45);
      g.fillEllipse(430, GROUND_Y + 22, 350, 95);
      g.fillStyle(0x558b2f, 0.5);
      g.fillEllipse(672, GROUND_Y + 16, 260, 105);

      // Grass strip
      g.fillStyle(0x4caf50);
      g.fillRect(0, GROUND_Y, W, 10);

      // Dirt
      g.fillStyle(0x795548);
      g.fillRect(0, GROUND_Y + 10, W, H - GROUND_Y - 10);

      // Fence — two horizontal rails then posts on top
      g.fillStyle(0xbcaaa4, 0.75);
      g.fillRect(0, GROUND_Y - 20, W, 4); // top rail
      g.fillRect(0, GROUND_Y - 10, W, 3); // bottom rail
      g.fillStyle(0x8d6e63);
      for (var fx = 28; fx < W; fx += 68) {
        g.fillRect(fx - 3, GROUND_Y - 28, 6, 32);
      }

      // Trees at the edges (outside target spawn zone 100–700)
      var treesX = [35, 78, W - 78, W - 35];
      treesX.forEach(function (tx) {
        // Trunk
        g.fillStyle(0x6d4c41);
        g.fillRect(tx - 4, GROUND_Y - 42, 8, 44);
        // Shadow canopy
        g.fillStyle(0x2e7d32, 0.5);
        g.fillCircle(tx + 4, GROUND_Y - 52, 22);
        // Main canopy
        g.fillStyle(0x388e3c);
        g.fillCircle(tx, GROUND_Y - 54, 20);
        g.fillStyle(0x43a047);
        g.fillCircle(tx - 6, GROUND_Y - 62, 13);
      });
    },

    // ── Spawn a new target ────────────────────────────────────────
    spawnTarget: function () {
      if (this.isPaused || !words.length) return;
      var active = this.targets.filter(function (t) { return !t.done && !t.expired; }).length;
      if (active >= MAX_TARGETS) return;

      var word = words[this.wordIdx++ % words.length];
      var tries = 0, angle, tx, ty;

      do {
        angle = -Math.PI + Math.random() * Math.PI;
        var dist = 320 + Math.random() * 110;
        tx = CANNON_X + Math.cos(angle) * dist;
        ty = CANNON_Y + Math.sin(angle) * dist;
        tries++;
      } while (
        (ty < 50 || ty > GROUND_Y - 20 || tx < 100 || tx > W - 100 ||
          this.targets.some(function (u) {
            return !u.done && !u.expired && Math.hypot(u.x - tx, u.y - ty) < 110;
          })) && tries < 30
      );

      var label = this.add.text(tx, ty - 40, word.word, {
        fontFamily: 'Prompt, sans-serif', fontSize: '13px', fontStyle: 'bold',
        color: '#2b2438', backgroundColor: '#ffffffcc', padding: { x: 6, y: 2 }
      }).setOrigin(0.5, 1).setDepth(2);

      // A word's emoji field can be auto-set equal to its own word text
      // when it has no picture — the label right below already shows that
      // text, so skip the icon line entirely rather than printing the
      // same word twice stacked right on top of each other.
      var wEmoji = (word.emoji && word.emoji !== word.word) ? word.emoji : '';
      var emoji = wEmoji ? this.add.text(tx, ty - 40 - label.height - 2,
        wEmoji, { fontSize: '16px' }).setOrigin(0.5, 1).setDepth(2) : null;

      this.targets.push({
        x: tx, y: ty,
        baseX: tx,
        moveAmp:   30 + Math.random() * 40,
        moveSpeed: 1.4 + Math.random() * 1.2,
        movePhase: Math.random() * Math.PI * 2,
        sizeScale: 0.55 + Math.random() * 0.95, // random size: 0.55× (tiny) → 1.5× (large)
        angle: angle, word: word,
        hit: false, done: false, expired: false,
        born: this.time.now, s: 0,
        label: label, emoji: emoji
      });
    },

    // ── Turn the current pull into an angle + launch speed ────────
    // Returns null for a pull too short to be deliberate. The ball flies
    // OPPOSITE the drag (pull down-left to lob up-right), which is the
    // slingshot convention kids already know from Angry Birds.
    aimFromDrag: function () {
      var d = this.drag;
      if (!d) return null;
      var pullX = d.sx - d.cx, pullY = d.sy - d.cy;
      var pull = Math.hypot(pullX, pullY);
      if (pull < MIN_PULL) return null;
      var angle = Math.atan2(pullY, pullX);
      // Normalise into (-PI, PI], then clamp to the upward hemisphere.
      if (angle > 0) angle = angle > Math.PI / 2 ? AIM_MIN_ANG : AIM_MAX_ANG;
      angle = Math.max(AIM_MIN_ANG, Math.min(AIM_MAX_ANG, angle));
      var power = Math.min(1, (pull - MIN_PULL) / (MAX_PULL - MIN_PULL));
      return { angle: angle, power: power, speed: MIN_SPD + (MAX_SPD - MIN_SPD) * power };
    },

    // Muzzle point for a given angle -- where a shot starts, and where
    // the preview arc must start so the two agree.
    muzzle: function (angle) {
      return {
        x: CANNON_X + Math.cos(angle) * (BARREL_LEN + 9),
        y: CANNON_Y + Math.sin(angle) * (BARREL_LEN + 9)
      };
    },

    // ── Fire the cannon ───────────────────────────────────────────
    fire: function (angle, speed) {
      if (this.time.now < this.reloadUntil) return;
      if (angle === undefined) angle = this.aimAngle;
      if (speed === undefined) speed = MAX_SPD;

      this.sfxCannon.play();
      this.reloadUntil = this.time.now + RELOAD_MS;
      this.trail = { angle: angle, life: 1.0 };

      var m = this.muzzle(angle);
      this.projectiles.push({
        x:  m.x,
        y:  m.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
      });
    },

    // ── Time-stop ability (shoot_timestop upgrade): freezes every active
    // target in place for loadout.timeStopMs -- their oscillation stops
    // and their expiry countdown pauses (implemented by pushing each
    // target's own `born` timestamp forward by the freeze duration,
    // rather than tracking a separate "frozen so far" offset per target)
    // -- while the player's own aim/fire/reload keep working normally,
    // so it's purely a breather for lining up shots, not a full pause. ──
    useTimeStop: function () {
      var now = this.time.now;
      if (now < this.timeStopReadyAt) return;
      var freezeMs = loadout.timeStopMs || 3000;
      this.timeStopReadyAt = now + TIMESTOP_COOLDOWN_MS;
      this.timeStopUntil = now + freezeMs;
      this.targets.forEach(function (t) { if (!t.hit && !t.expired) t.born += freezeMs; });
      this.showPop(CANNON_X, CANNON_Y - 60, '⏱ หยุดเวลา!');
    },

    // ── Spawn break particles at the hit position ─────────────────
    spawnBreakParticles: function (cx, cy) {
      for (var i = 0; i < 14; i++) {
        var spd = 80 + Math.random() * 140;
        var ang = Math.random() * Math.PI * 2;
        this.particles.push({
          x: cx, y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 50, // slight upward bias
          life: 1.0,
          color: BREAK_COLORS[Math.floor(Math.random() * BREAK_COLORS.length)],
          r: 3 + Math.random() * 4
        });
      }
    },

    // ── Per-frame update ──────────────────────────────────────────
    update: function (time, delta) {
      var g    = this.gfx;
      var self = this;
      var dt   = delta / 1000;
      g.clear();

      // Update and draw break particles even while paused so the effect completes
      this.particles = this.particles.filter(function (p) {
        p.x  += p.vx * dt;
        p.y  += p.vy * dt;
        p.vy += 260 * dt; // gravity pulls pieces down
        p.life -= dt * 1.6;
        if (p.life <= 0) return false;
        g.fillStyle(p.color, p.life * 0.9);
        g.fillCircle(p.x, p.y, p.r * Math.max(0.3, p.life));
        return true;
      });

      if (this.isPaused) return;

      // Update oscillating target x-positions before collision checks --
      // skipped while time-stop is active so frozen targets actually
      // hold still rather than just having their expiry paused.
      if (time >= this.timeStopUntil) {
        this.targets.forEach(function (t) {
          if (!t.hit && !t.expired) {
            t.x = t.baseX + Math.sin(time * 0.001 * t.moveSpeed + t.movePhase) * t.moveAmp;
          }
        });
      }

      // Fade shot trail
      if (this.trail) {
        this.trail.life -= dt * 3.5;
        if (this.trail.life <= 0) this.trail = null;
      }
      if (this.trail) {
        var tx2 = CANNON_X + Math.cos(this.trail.angle) * 400;
        var ty2 = CANNON_Y + Math.sin(this.trail.angle) * 400;
        g.lineStyle(5, 0xffd700, this.trail.life * 0.85);
        g.lineBetween(CANNON_X, CANNON_Y, tx2, ty2);
        g.fillStyle(0xffd700, this.trail.life);
        g.fillCircle(tx2, ty2, 7);
      }

      // Move projectiles and check collisions
      this.projectiles = this.projectiles.filter(function (proj) {
        // Same integration order the preview arc uses (see previewArc), so
        // the dotted path a player aims along is the path the ball takes.
        proj.vy += GRAVITY;
        proj.x  += proj.vx;
        proj.y  += proj.vy;

        // Only cull downward past the ground -- a high lob legitimately
        // leaves the top of the screen and must be allowed to fall back in.
        if (proj.x < -20 || proj.x > W + 20 || proj.y > H + 20) return false;

        for (var i = 0; i < self.targets.length; i++) {
          var tgt = self.targets[i];
          if (tgt.hit || tgt.expired || tgt.s < 0.4) continue;
          var dx = proj.x - tgt.x, dy = proj.y - tgt.y;
          var hr = PROJ_HIT_R * tgt.sizeScale;
          if (dx * dx + dy * dy < hr * hr) {
            tgt.hit = true;
            self.sfxBreak.play();
            self.spawnBreakParticles(tgt.x, tgt.y);
            callbacks.onPoints(10);
            self.showPop(tgt.x, tgt.y - 48, '+10 ⭐');
            // Brief delay before pausing so the break particles are visible
            var ref = tgt;
            self.time.delayedCall(280, function () {
              self.isPaused = true;
              callbacks.onPractice(ref.word, null, function () {
                self.sfxCongrat.play();
                self.isPaused = false;
                ref.done = true;
                self.time.delayedCall(500, function () { self.spawnTarget(); });
              });
            });
            return false;
          }
        }
        return true;
      });

      // Draw projectiles (cannonball + smoke trail)
      this.projectiles.forEach(function (proj) {
        g.lineStyle(4, 0x999999, 0.45);
        g.lineBetween(proj.x, proj.y,
                      proj.x - proj.vx * 4, proj.y - proj.vy * 4);
        g.lineStyle(2, 0xcccccc, 0.22);
        g.lineBetween(proj.x - proj.vx * 4, proj.y - proj.vy * 4,
                      proj.x - proj.vx * 9, proj.y - proj.vy * 9);
        g.fillStyle(0x1a1a2e);
        g.fillCircle(proj.x, proj.y, 7);
        g.lineStyle(2, 0x3a3a5e);
        g.strokeCircle(proj.x, proj.y, 7);
        g.fillStyle(0x5a5a8e, 0.4);
        g.fillCircle(proj.x - 2, proj.y - 2, 3);
      });

      // Reload state
      var reloading  = time < this.reloadUntil;
      var reloadFrac = reloading
        ? Math.min(1, (time - (this.reloadUntil - RELOAD_MS)) / RELOAD_MS)
        : 1;

      // Trajectory preview -- only while actually pulling, so the screen
      // stays clean the rest of the time. Dots thin out toward the end of
      // the arc so the near part (which the player is actually aiming
      // with) reads strongest.
      var aim = this.aimFromDrag();
      if (aim && !reloading) {
        var arc = this.previewArc(aim.angle, aim.speed);
        for (var i = 0; i < arc.length; i++) {
          var fade = 1 - (i / arc.length) * 0.75;
          g.fillStyle(0xffffff, 0.72 * fade);
          g.fillCircle(arc[i].x, arc[i].y, 4 * fade + 1);
        }
        // Landing marker at the arc's end
        if (arc.length) {
          var end = arc[arc.length - 1];
          g.lineStyle(2.5, 0xff4444, 0.85);
          g.strokeCircle(end.x, end.y, 11);
          g.lineBetween(end.x - 15, end.y, end.x + 15, end.y);
          g.lineBetween(end.x, end.y - 15, end.x, end.y + 15);
        }
        // Pull band from the cannon back to the finger, like a drawn sling
        g.lineStyle(5, 0x8d6e63, 0.75);
        g.lineBetween(CANNON_X, CANNON_Y, this.drag.cx, this.drag.cy);
        g.fillStyle(0x5d4037, 0.9);
        g.fillCircle(this.drag.cx, this.drag.cy, 9);

        // Power meter above the cannon
        var pw = 90, ph = 9, pxm = CANNON_X - pw / 2, pym = CANNON_Y - 62;
        g.fillStyle(0x000000, 0.35); g.fillRect(pxm, pym, pw, ph);
        var pcol = aim.power > 0.8 ? 0xe74c3c : aim.power > 0.45 ? 0xf1c40f : 0x2ecc71;
        g.fillStyle(pcol, 0.95); g.fillRect(pxm, pym, pw * aim.power, ph);
        g.lineStyle(1.5, 0xffffff, 0.7); g.strokeRect(pxm, pym, pw, ph);
      }

      this.drawCannon(g);

      // Reload arc around cannon base (fills as reload progresses)
      if (reloading) {
        g.lineStyle(5, 0x444444, 0.35);
        g.strokeCircle(CANNON_X, CANNON_Y, 28);
        g.lineStyle(5, 0xff9900, 0.9);
        g.beginPath();
        g.arc(CANNON_X, CANNON_Y, 28,
              -Math.PI / 2,
              -Math.PI / 2 + reloadFrac * Math.PI * 2,
              false, 0.02);
        g.strokePath();
      }

      // Update and draw targets
      var toRemove = [];
      this.targets.forEach(function (tgt) {
        var elapsed = time - tgt.born;

        if (!tgt.hit && !tgt.expired) {
          tgt.s = Math.min(1, tgt.s + 0.05); // pop-in scale
          if (elapsed >= TIMEOUT_MS) {
            tgt.expired = true;
            self.showPop(tgt.x, tgt.y - 48, '⌛');
            self.time.delayedCall(400, function () { self.spawnTarget(); });
          }
        } else if (tgt.done || tgt.expired) {
          tgt.s = Math.max(0, tgt.s - 0.1); // pop-out scale
        }

        if (tgt.s > 0) {
          self.drawTarget(g, tgt, time, elapsed);
          var ly = tgt.y - 58 * tgt.s;
          tgt.label.setPosition(tgt.x, ly).setAlpha(tgt.hit ? 0.4 : tgt.s);
          if (tgt.emoji) tgt.emoji.setPosition(tgt.x, ly - tgt.label.height - 2).setAlpha(tgt.hit ? 0.4 : tgt.s);
        } else if (tgt.done || tgt.expired) {
          tgt.label.destroy(); if (tgt.emoji) tgt.emoji.destroy();
          toRemove.push(tgt);
        }
      });
      toRemove.forEach(function (tgt) {
        self.targets = self.targets.filter(function (u) { return u !== tgt; });
      });
    },

    // ── [CANNON] Draw the rotating cannon ────────────────────────
    drawCannon: function (g) {
      g.fillStyle(0x795548);
      g.fillRect(CANNON_X - 30, CANNON_Y + 14, 60, 14);
      g.fillStyle(0x5d4037);
      g.fillCircle(CANNON_X, CANNON_Y, 22);
      g.lineStyle(3, 0x3e2723);
      g.strokeCircle(CANNON_X, CANNON_Y, 22);

      var len = BARREL_LEN, bw = 13;
      var cos = Math.cos(this.aimAngle), sin = Math.sin(this.aimAngle);
      var px  = -sin * bw / 2, py = cos * bw / 2;
      g.fillStyle(0x3e2723);
      g.fillPoints([
        { x: CANNON_X + px,             y: CANNON_Y + py             },
        { x: CANNON_X - px,             y: CANNON_Y - py             },
        { x: CANNON_X - px + cos * len, y: CANNON_Y - py + sin * len },
        { x: CANNON_X + px + cos * len, y: CANNON_Y + py + sin * len }
      ], true);
      g.fillStyle(0x212121);
      g.fillCircle(CANNON_X + cos * len, CANNON_Y + sin * len, 9);
    },

    // Steps the exact same physics the real projectile uses, sampling
    // every few frames, and stops at the ground/edges. Deliberately NOT a
    // closed-form parabola: reusing the integration is what guarantees
    // the dotted arc and the actual shot can't drift apart.
    previewArc: function (angle, speed) {
      var pts = [];
      var x = this.muzzle(angle).x, y = this.muzzle(angle).y;
      var vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
      for (var step = 0; step < 220; step++) {
        vy += GRAVITY; x += vx; y += vy;
        // Same cull bounds as the live projectile, NOT the grass line:
        // the cannon stands in front of the grass (CANNON_Y is below
        // GROUND_Y), so stopping at GROUND_Y aborted the arc on step one
        // and drew nothing at all.
        if (x < -20 || x > W + 20 || y > H + 20) break;
        if (step % 5 === 0 && y > 0) pts.push({ x: x, y: y });
        if (pts.length >= 26) break;
      }
      return pts;
    },

    // ── Draw one bullseye target ──────────────────────────────────
    drawTarget: function (g, tgt, time, elapsed) {
      var frac  = tgt.hit ? 1 : Math.max(0, (TIMEOUT_MS - elapsed) / TIMEOUT_MS);
      var shake = (!tgt.hit && !tgt.expired && elapsed > TIMEOUT_MS - 1200)
        ? Math.sin(time * 0.04) * 4 : 0;
      var cx = tgt.x + shake, cy = tgt.y;

      if (tgt.hit && !tgt.done) g.setAlpha(0.45);

      // Pole from target down to ground
      g.fillStyle(0x7d6b5a);
      g.fillRect(cx - 4, cy, 8, (GROUND_Y - cy) * tgt.s);

      // Bullseye rings outer → inner (scaled by both pop-in and random sizeScale)
      var ss = tgt.sizeScale;
      for (var ri = 0; ri < RING_R.length; ri++) {
        g.fillStyle(RING_C[ri]);
        g.fillCircle(cx, cy, RING_R[ri] * tgt.s * ss);
      }
      g.lineStyle(1, 0x00000022);
      g.lineBetween(cx - 32 * tgt.s * ss, cy, cx + 32 * tgt.s * ss, cy);
      g.lineBetween(cx, cy - 32 * tgt.s * ss, cx, cy + 32 * tgt.s * ss);

      // Countdown arc just outside the outermost ring
      if (!tgt.hit && !tgt.expired && tgt.s > 0.3) {
        var arcColor = frac > 0.5 ? 0x27ae60 : frac > 0.25 ? 0xf39c12 : 0xe74c3c;
        g.lineStyle(4 * tgt.s, arcColor);
        g.beginPath();
        g.arc(cx, cy, (RING_R[0] + 8) * tgt.s * ss, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false, 0.02);
        g.strokePath();
      }

      g.setAlpha(1);
    },

    // ── [POP] Floating score text ─────────────────────────────────
    showPop: function (x, y, text) {
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif', fontSize: '22px', fontStyle: 'bold',
        color: '#ff9f1c', stroke: '#ffffff', strokeThickness: 4
      }).setOrigin(0.5).setDepth(10);
      this.tweens.add({
        targets: pop, y: y - 55, alpha: 0, duration: 900, ease: 'Power2',
        onComplete: function () { pop.destroy(); }
      });
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'shootingCanvas',
    width:  W, height: H,
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, autoRound: true },
    scene:  ShootScene
  });
}

// Public API
var ShootingGame = (function () {
  var game = null;
  function start(words, cbs) {
    stop();
    setTimeout(function () { game = createShootingGame(words, cbs); }, 60);
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
    // Done here rather than the scene's own 'shutdown' event -- see the
    // comment on _shootTimeStopBtnFn above createShootingGame().
    var btn = document.getElementById('shootBtnTimeStop');
    if (btn && _shootTimeStopBtnFn) {
      btn.removeEventListener('mousedown', _shootTimeStopBtnFn);
      btn.removeEventListener('touchstart', _shootTimeStopBtnFn);
      _shootTimeStopBtnFn = null;
    }
    var wrap = document.getElementById('shootBtnWrap');
    if (wrap) wrap.style.display = 'none';
  }
  return { start: start, stop: stop };
}());
