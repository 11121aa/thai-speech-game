// ============================================================
//  CROSSY ROAD GAME — Phaser 3 Scene
// ============================================================
//  POLISH GUIDE (search for the label):
//    [TUNE]    Grid dimensions, car speed         (~line 15)
//    [ROWS]    Row layout (road / grass / goal)   (~ROW_TYPES)
//    [CARS]    Car count, colours, width range    (~createCars)
//    [CHAR]    Character (frog) art               (~drawCharacter)
//    [COLORS]  Row background colours             (~drawBg)
//    [POP]     Hit/goal pop text style            (~showPop)
// ============================================================
//  Controls: Arrow keys or DOM buttons (↑ ← → ↓)
//  Hop forward to dodge cars and reach the goal row.
//  Reaching the goal → word practice → reset to start.
//  Hit a car → -5 s timer penalty + reset.
// ============================================================

function createCrossyGame(words, callbacks) {

  // ── [TUNE] Grid and speed ──────────────────────────────────
  var W = 800, H = 400;
  var COLS = 11;           // columns across the screen
  var ROWS = 7;            // visible rows (top = 0, bottom = 6)
  var CELL_W = Math.floor(W / COLS);   // ≈ 72 px
  var CELL_H = Math.floor(H / ROWS);   // ≈ 57 px
  var HOP_MS = 130;        // tween duration for each hop (ms)

  // ── [ROWS] Row layout — top (index 0) to bottom (index 6) ─
  // 'goal'  = safe top strip  → triggers word practice
  // 'grass' = safe middle      → rest zone
  // 'road'  = cars, dangerous
  // 'start' = safe bottom      → spawn point
  var ROW_TYPES = ['goal',  'road', 'road', 'grass', 'road', 'road', 'start'];
  var ROW_DIRS  = [0,        1,     -1,      0,       -1,     1,      0];   // 1=right, -1=left
  var ROW_SPEED = [0,       2.2,    1.7,     0,       2.5,    1.5,    0];   // base px/frame

  // ── [COLORS] Row background colours ──────────────────────
  var ROW_COLOR = {
    goal:  0x00bcd4,   // teal/cyan
    road:  0x616161,   // dark grey asphalt
    grass: 0x4caf50,   // mid green
    start: 0x388e3c    // darker green
  };

  // ── Scene ─────────────────────────────────────────────────
  var CrossyScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'crossy' });
      this.charCol    = 5;          // column (0 = left, COLS-1 = right)
      this.charRow    = 6;          // row    (0 = top goal, 6 = bottom start)
      this.charX      = 0;          // visual x — tweened
      this.charY      = 0;          // visual y — tweened
      this.moving     = false;      // hop tween in progress
      this.isPaused   = false;
      this.invincible = 0;          // frames of hit-invincibility
      this.cars       = [];
      this.wordIdx    = 0;
      this.currentWord = null;
    },

    create: function () {
      var self = this;

      // Static background (row stripes)
      this.bgGfx = this.add.graphics();
      this.drawBg();

      // Dynamic layer: cars + character
      this.dynGfx = this.add.graphics();

      // Initial character position
      this.charX = this.charCol * CELL_W + CELL_W / 2;
      this.charY = this.charRow * CELL_H + CELL_H / 2;

      // [CARS] Spawn cars for road rows
      this.createCars();

      // Word hint above goal row
      this.goalLabel = this.add.text(W / 2, CELL_H / 2, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '15px', fontStyle: 'bold',
        color: '#ffffff', backgroundColor: '#0097a7cc', padding: { x: 12, y: 5 }
      }).setOrigin(0.5).setDepth(5);

      // Pick first word
      if (words.length) {
        this.currentWord = words[this.wordIdx++ % words.length];
        this.updateGoalLabel();
      }

      // Keyboard controls
      this.keys = this.input.keyboard.addKeys({
        up:    Phaser.Input.Keyboard.KeyCodes.UP,
        down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
        left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        w: Phaser.Input.Keyboard.KeyCodes.W,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        d: Phaser.Input.Keyboard.KeyCodes.D
      });

      // DOM buttons (wired in game.html — ↑ ← → ↓)
      var bUp    = document.getElementById('cryBtnUp');
      var bLeft  = document.getElementById('cryBtnLeft');
      var bRight = document.getElementById('cryBtnRight');
      var bDown  = document.getElementById('cryBtnDown');
      this._upFn    = function () { self.tryMove(0,  -1); };
      this._leftFn  = function () { self.tryMove(-1,  0); };
      this._rightFn = function () { self.tryMove(1,   0); };
      this._downFn  = function () { self.tryMove(0,   1); };
      function wire(el, fn) {
        if (!el) return;
        el.addEventListener('mousedown',  fn);
        el.addEventListener('touchstart', fn, { passive: true });
      }
      wire(bUp, this._upFn); wire(bLeft, this._leftFn);
      wire(bRight, this._rightFn); wire(bDown, this._downFn);

      // Hint text
      var hint = this.add.text(W / 2, H - 14,
        '↑ เดินหน้า   ← → หลบซ้าย/ขวา   หลีกรถ 🚗', {
          fontFamily: 'Prompt, sans-serif', fontSize: '13px',
          color: '#eeeeee', backgroundColor: '#00000044',
          padding: { x: 8, y: 3 }
        }).setOrigin(0.5, 1).setDepth(5);
      this.time.delayedCall(4000, function () {
        self.tweens.add({ targets: hint, alpha: 0, duration: 600,
          onComplete: function () { hint.destroy(); }
        });
      });
    },

    // ── [CARS] Create cars for each road row ─────────────────
    // POLISH: change CAR_COLORS array or numCars per row here
    createCars: function () {
      var CAR_COLORS = [0xff5252, 0xffb300, 0x2196f3, 0x9c27b0, 0x00bcd4, 0xff9800];

      for (var row = 0; row < ROWS; row++) {
        if (ROW_TYPES[row] !== 'road') continue;
        var dir   = ROW_DIRS[row];
        var spd   = ROW_SPEED[row];
        var nCars = 2 + Math.floor(Math.random() * 2);  // [TUNE] 2–3 cars per lane

        for (var i = 0; i < nCars; i++) {
          var gap     = W / nCars;
          var startX  = i * gap + Math.random() * gap * 0.5;
          if (dir === -1) startX = W - startX;  // right-to-left cars start on right
          var carW    = 55 + Math.random() * 35; // [CARS] car width range
          this.cars.push({
            row:   row,
            x:     startX,
            w:     carW,
            h:     CELL_H - 12,
            speed: spd * (0.75 + Math.random() * 0.5),
            dir:   dir,
            color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
          });
        }
      }
    },

    // ── Try to hop one step ──────────────────────────────────
    tryMove: function (dc, dr) {
      if (this.moving || this.isPaused) return;
      var newCol = this.charCol + dc;
      var newRow = this.charRow + dr;
      if (newCol < 0 || newCol >= COLS) return;   // don't fall off sides
      if (newRow < 0 || newRow > 6)    return;   // don't go beyond grid

      this.charCol = newCol;
      this.charRow = newRow;

      var targetX = newCol * CELL_W + CELL_W / 2;
      var targetY = newRow * CELL_H + CELL_H / 2;
      this.moving = true;
      var self    = this;

      // Small jump arc on forward hops
      var arcY = (dr === -1) ? Math.min(this.charY, targetY) - 12 : null;

      this.tweens.add({
        targets:  this,
        charX:    targetX,
        charY:    targetY,
        duration: HOP_MS,
        ease:     'Power2Out',
        onComplete: function () {
          self.moving = false;
          if (self.charRow === 0) self.onReachGoal();
        }
      });

      // Award small points for each forward hop
      if (dr < 0) callbacks.onPoints(3);
    },

    // ── Reached the goal row ─────────────────────────────────
    onReachGoal: function () {
      var self = this;
      if (!this.currentWord) return;
      this.isPaused = true;
      callbacks.onPoints(20);  // [TUNE] points for crossing
      callbacks.onPractice(this.currentWord, null, function () {
        self.isPaused    = false;
        // Reset to start
        self.charCol = 5; self.charRow = 6;
        self.charX   = self.charCol * CELL_W + CELL_W / 2;
        self.charY   = self.charRow * CELL_H + CELL_H / 2;
        self.invincible = 60;  // brief invincibility on respawn
        // Advance to next word
        if (words.length) {
          self.currentWord = words[self.wordIdx++ % words.length];
          self.updateGoalLabel();
        }
      });
    },

    updateGoalLabel: function () {
      if (!this.currentWord || !this.goalLabel) return;
      this.goalLabel.setText(
        (this.currentWord.emoji || '🏁') + '  ข้ามถนน → ' + this.currentWord.reading +
        '  ' + (this.currentWord.emoji || '🏁')
      );
    },

    // ── Per-frame update ──────────────────────────────────────
    update: function (time, delta) {
      if (this.isPaused) return;
      var self = this;

      // Keyboard input (JustDown ensures single-step hops)
      if (!this.moving) {
        if (Phaser.Input.Keyboard.JustDown(this.keys.up)   || Phaser.Input.Keyboard.JustDown(this.keys.w)) { this.tryMove(0,  -1); }
        else if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) { this.tryMove(0,   1); }
        else if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a)) { this.tryMove(-1,  0); }
        else if (Phaser.Input.Keyboard.JustDown(this.keys.right)|| Phaser.Input.Keyboard.JustDown(this.keys.d)) { this.tryMove(1,   0); }
      }

      // Move cars
      var dt = delta / 16;   // normalize to 60 fps
      this.cars.forEach(function (car) {
        car.x += car.speed * car.dir * dt;
        if (car.dir ===  1 && car.x > W + car.w) car.x = -car.w;   // wrap right→left
        if (car.dir === -1 && car.x < -car.w)    car.x = W + car.w; // wrap left→right
      });

      // Car collision (only on road rows, not while invincible)
      if (this.invincible > 0) {
        this.invincible--;
      } else if (ROW_TYPES[this.charRow] === 'road') {
        var charLeft  = this.charX - CELL_W * 0.38;
        var charRight = this.charX + CELL_W * 0.38;
        var charTop   = this.charY - CELL_H * 0.38;
        var charBot   = this.charY + CELL_H * 0.38;
        var rowY      = this.charRow * CELL_H;

        this.cars.forEach(function (car) {
          if (car.row !== self.charRow) return;
          var carLeft  = car.x;
          var carRight = car.x + car.w;
          var carTop2  = rowY + 5;
          var carBot2  = rowY + car.h + 5;

          if (charLeft < carRight && charRight > carLeft &&
              charTop  < carBot2  && charBot   > carTop2) {
            // HIT!
            self.invincible = 90;  // ~1.5 s
            if (callbacks.onTime) callbacks.onTime(-5);
            self.showPop(self.charX, self.charY - 30, '-5s 💥');
            // Reset to start row
            self.charCol = 5; self.charRow = 6;
            self.charX   = self.charCol * CELL_W + CELL_W / 2;
            self.charY   = self.charRow * CELL_H + CELL_H / 2;
          }
        });
      }

      this.draw(time);
    },

    // ── [COLORS] Draw static row backgrounds ─────────────────
    drawBg: function () {
      var g = this.bgGfx;
      for (var row = 0; row < ROWS; row++) {
        var y    = row * CELL_H;
        var type = ROW_TYPES[row];
        g.fillStyle(ROW_COLOR[type]);
        g.fillRect(0, y, W, CELL_H);

        if (type === 'road') {
          // Dashed white centre line
          g.fillStyle(0xffffff, 0.35);
          for (var mx = 0; mx < W; mx += 40) {
            g.fillRect(mx, y + CELL_H / 2 - 1, 24, 2);
          }
          // Kerb lines
          g.fillStyle(0x424242, 0.5);
          g.fillRect(0, y, W, 4);
          g.fillRect(0, y + CELL_H - 4, W, 4);
        }

        if (type === 'goal') {
          // Zebra crossing pattern
          g.fillStyle(0xffffff, 0.2);
          for (var zx = 0; zx < W; zx += CELL_W) {
            if (Math.floor(zx / CELL_W) % 2 === 0) g.fillRect(zx, 0, CELL_W, CELL_H);
          }
        }

        if (type === 'grass') {
          // Subtle grass texture lines
          g.fillStyle(0x43a047, 0.4);
          for (var gx = 0; gx < W; gx += 16) {
            g.fillRect(gx, y + 4, 4, CELL_H - 8);
          }
        }
      }
    },

    // ── Draw dynamic frame (cars + character) ─────────────────
    draw: function (time) {
      var g    = this.dynGfx;
      var self = this;
      g.clear();

      // [CARS] Draw all cars
      this.cars.forEach(function (car) {
        var y = car.row * CELL_H + 6;
        // Body
        g.fillStyle(car.color);
        g.fillRoundedRect(car.x, y, car.w, car.h, 7);
        // Windows
        g.fillStyle(0xbbdefb, 0.85);
        var ww = car.w * 0.33;
        g.fillRoundedRect(car.x + 5,         y + 4, ww, car.h * 0.52, 3);
        g.fillRoundedRect(car.x + car.w - ww - 5, y + 4, ww, car.h * 0.52, 3);
        // Wheels
        g.fillStyle(0x212121);
        g.fillCircle(car.x + 10,          y + car.h + 2, 7);
        g.fillCircle(car.x + car.w - 10, y + car.h + 2, 7);
        // Headlights (direction indicator)
        g.fillStyle(0xfff176, 0.9);
        var lx = car.dir === 1 ? car.x + car.w - 4 : car.x;
        g.fillRect(lx, y + 4, 4, 8);
      });

      // [CHAR] Character flash when invincible
      var flash = this.invincible > 0 && Math.floor(this.invincible / 6) % 2 === 1;
      if (!flash) this.drawCharacter(g, this.charX, this.charY, time);
    },

    // ── [CHAR] Frog / character art ───────────────────────────
    // POLISH: recolour or reshape the frog body, eyes, or feet here
    drawCharacter: function (g, cx, cy, time) {
      var r = 17;   // body radius — POLISH: larger = chubbier frog

      // Body
      g.fillStyle(0x66bb6a);   // POLISH: change for different frog colour
      g.fillCircle(cx, cy, r);
      g.lineStyle(2, 0x388e3c);
      g.strokeCircle(cx, cy, r);

      // Eyes (bulging on top)
      g.fillStyle(0xffffff);
      g.fillCircle(cx - 7, cy - 8, 6);
      g.fillCircle(cx + 7, cy - 8, 6);
      g.fillStyle(0x1a237e);
      g.fillCircle(cx - 6, cy - 8, 3);
      g.fillCircle(cx + 6, cy - 8, 3);
      // Eye shine
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(cx - 5, cy - 9, 1.2);
      g.fillCircle(cx + 7, cy - 9, 1.2);

      // Mouth
      g.lineStyle(2, 0x2e7d32);
      g.beginPath();
      g.arc(cx, cy + 5, 7, 0.1, Math.PI - 0.1, false, 0.02);
      g.strokePath();

      // Back feet (splayed out sides)
      var bob = Math.sin(time * 0.008) * 2;  // subtle breathing
      g.fillStyle(0x4caf50);
      g.fillEllipse(cx - 21, cy + 8 + bob, 20, 10);
      g.fillEllipse(cx + 21, cy + 8 + bob, 20, 10);
    },

    // ── [POP] Floating feedback text ─────────────────────────
    showPop: function (x, y, text) {
      var isNeg = text.charAt(0) === '-';
      var pop   = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif', fontSize: '20px', fontStyle: 'bold',
        color: isNeg ? '#ff5252' : '#00e676',
        stroke: '#ffffff', strokeThickness: 3
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({
        targets: pop, y: y - 45, alpha: 0, duration: 800, ease: 'Power2',
        onComplete: function () { pop.destroy(); }
      });
    },

    // ── Cleanup DOM listeners ────────────────────────────────
    shutdown: function () {
      var ids = ['cryBtnUp', 'cryBtnLeft', 'cryBtnRight', 'cryBtnDown'];
      var fns = [this._upFn, this._leftFn, this._rightFn, this._downFn];
      ids.forEach(function (id, i) {
        var el = document.getElementById(id);
        if (el && fns[i]) {
          el.removeEventListener('mousedown',  fns[i]);
          el.removeEventListener('touchstart', fns[i]);
        }
      });
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'crossyGame',
    width:  W, height: H,
    scale:  { mode: Phaser.Scale.NONE },
    scene:  CrossyScene,
    audio:  { noAudio: true }
  });
}

// Public API
var CrossyGame = (function () {
  var game = null;
  function start(words, cbs) {
    stop();
    setTimeout(function () { game = createCrossyGame(words, cbs); }, 60);
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }
  return { start: start, stop: stop };
}());
