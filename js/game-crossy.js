// ============================================================
//  CROSSY ROAD GAME — Phaser 3  (Grid-hop frogger, endless forward scroll)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Grid dimensions, car speed              (~line 15)
//    [ROWS]    Row generation (goal spacing, filler)   (~rowDefAt)
//    [CARS]    Car count, colours, width range          (~generateCarsForRow)
//    [CHAR]    Character (frog) art                     (~drawCharacter)
//    [COLORS]  Row background colours                   (~ROW_COLOR)
//    [POP]     Hit/goal pop text style                  (~showPop)
// ============================================================
//  How the game works:
//    - A frog hops on a grid (7 visible rows x 11 columns) that scrolls
//      endlessly forward -- there is no fixed end, and no reset to a
//      start position. The frog stays visually anchored near the bottom
//      of the screen; the world scrolls past it as it advances.
//    - Cars scroll across road rows in alternating directions.
//    - Hop forward with UP; sidestep with LEFT/RIGHT; hop back with DOWN.
//    - Every GOAL_SPACING rows, a safe "goal" row triggers word practice,
//      then scrolling continues -- no teleport back to a start cell.
//    - Hit a car -> -5 seconds timer penalty + knocked back a few rows
//      (not reset to the absolute start).
// ============================================================

function createCrossyGame(words, callbacks) {

  // ── [TUNE] Grid and timing ────────────────────────────────────
  var W = 800, H = 400;
  var COLS    = 11;
  var ROWS    = 7;                              // visible rows on screen at once
  var CELL_W  = Math.floor(W / COLS);
  var CELL_H  = Math.floor(H / ROWS);
  var HOP_MS  = 130;

  // ── [ROWS] Endless row generation ───────────────────────────────
  // Row type is a pure function of worldRow: every GOAL_SPACING rows is a
  // safe 'goal' checkpoint (triggers word practice); the rows between two
  // checkpoints cycle through the same hand-tuned filler rhythm the
  // original fixed board used (road, road, grass, road, road) so the
  // moment-to-moment feel is unchanged -- only "does it reset" changed.
  var GOAL_SPACING       = 6;
  var KNOCKBACK_ROWS     = 2;   // rows knocked back on a car hit
  var ANCHOR_ROW_SLOT    = 6;   // frog's fixed screen row-slot (matches the old start row's position)
  var GEN_BUFFER_ROWS    = 2;   // rows generated beyond each visible edge so scrolling never reveals a gap
  var CLEANUP_MARGIN     = 2;   // rows kept beyond the visible window before being discarded
  // Because the camera re-settles the frog at ANCHOR_ROW_SLOT after every
  // hop, a backward cap measured from the current camera position always
  // equals the frog's own row -- there is no way to bound backward travel
  // relative to the camera. MAX_BACKWARD_SLACK instead bounds it relative
  // to the furthest-forward row ever reached (this.furthestWorldRow), which
  // is a real, monotonically-improving reference point.
  var MAX_BACKWARD_SLACK = 4;

  var FILLER_TEMPLATE = [
    { type: 'road',  dir:  1, speed: 2.2 },
    { type: 'road',  dir: -1, speed: 1.7 },
    { type: 'grass', dir:  0, speed: 0   },
    { type: 'road',  dir: -1, speed: 2.5 },
    { type: 'road',  dir:  1, speed: 1.5 }
  ];

  // ── [COLORS] Background colour for each row type ─────────────
  var ROW_COLOR = {
    goal:  0x00bcd4,
    road:  0x616161,
    grass: 0x4caf50
  };

  // Always-positive modulo (JS's % can return negative results for
  // negative operands, and worldRow goes negative as the frog advances
  // past the first several checkpoints).
  function mod(n, m) { return ((n % m) + m) % m; }

  // Pure function: given any worldRow (positive, zero, or negative),
  // returns its {type, dir, speed}. No memory of past rows needed --
  // this is what lets rows be generated lazily in any order.
  function rowDefAt(worldRow) {
    var offset = mod(worldRow, GOAL_SPACING);
    if (offset === 0) return { type: 'goal', dir: 0, speed: 0 };
    return FILLER_TEMPLATE[offset - 1];
  }

  var CrossyScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'crossy' });

      this.charCol         = 5;                          // starting column
      this.worldRow        = ANCHOR_ROW_SLOT;             // logical row position, unbounded
      this.charX           = 0;                          // visual X (tweened smoothly between hops)
      this.scrollWorldRow  = this.worldRow - ANCHOR_ROW_SLOT; // camera position (tweened)
      this.moving          = false;
      this.isPaused        = false;
      this.invincible      = 0;
      this.rows            = {};   // worldRow (int) -> { worldRow, type, dir, speed, cars: [] }
      this.wordIdx         = 0;
      this.currentWord     = null;
      this.goalReached     = ANCHOR_ROW_SLOT; // lowest worldRow whose goal has already triggered practice
      this.furthestWorldRow = ANCHOR_ROW_SLOT; // lowest worldRow ever reached (monotonic; bounds backward travel)
    },

    create: function () {
      var self = this;

      this.dynGfx = this.add.graphics().setDepth(1);
      this.bgGfx  = this.add.graphics().setDepth(0);

      this.charX = this.charCol * CELL_W + CELL_W / 2;

      this.ensureRowsGenerated();

      this.goalLabel = this.add.text(W / 2, CELL_H / 2, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '15px', fontStyle: 'bold',
        color: '#ffffff', backgroundColor: '#0097a7cc',
        padding: { x: 12, y: 5 }
      }).setOrigin(0.5).setDepth(5);

      if (words.length) {
        this.currentWord = words[this.wordIdx++ % words.length];
        this.updateGoalLabel();
      }

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
      wire(bUp, this._upFn);
      wire(bLeft, this._leftFn);
      wire(bRight, this._rightFn);
      wire(bDown, this._downFn);

      this.events.on('shutdown', this.shutdown, this);

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

    // ── [ROWS] Get (or lazily create) the row at worldRow ──────────
    getOrCreateRow: function (worldRow) {
      var row = this.rows[worldRow];
      if (row) return row;
      var def = rowDefAt(worldRow);
      row = { worldRow: worldRow, type: def.type, dir: def.dir, speed: def.speed, cars: [] };
      if (def.type === 'road') row.cars = this.generateCarsForRow(def);
      this.rows[worldRow] = row;
      return row;
    },

    // ── [CARS] Generate cars for one road row (same logic the original
    // fixed-board version used for all 4 road rows upfront, just now
    // called lazily as each new row is generated) ──────────────────
    generateCarsForRow: function (def) {
      var CAR_COLORS = [0xff5252, 0xffb300, 0x2196f3, 0x9c27b0, 0x00bcd4, 0xff9800];
      var cars = [];
      var nCars = 2 + Math.floor(Math.random() * 2); // [TUNE] 2 or 3 cars per lane
      for (var i = 0; i < nCars; i++) {
        var gap    = W / nCars;
        var startX = i * gap + Math.random() * gap * 0.5;
        if (def.dir === -1) startX = W - startX;
        var carW = 55 + Math.random() * 35; // [CARS] car width range: 55-90px
        cars.push({
          x:     startX,
          w:     carW,
          h:     CELL_H - 12,
          speed: def.speed * (0.75 + Math.random() * 0.5),
          dir:   def.dir,
          color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
        });
      }
      return cars;
    },

    // ── [ROWS] Ensure every row currently needed on screen (plus a
    // small buffer) exists in the registry, and discard rows that have
    // scrolled well past the bottom edge so memory stays flat over an
    // arbitrarily long run ───────────────────────────────────────────
    ensureRowsGenerated: function () {
      var top    = Math.floor(this.scrollWorldRow) - GEN_BUFFER_ROWS;
      var bottom = Math.floor(this.scrollWorldRow) + ROWS - 1 + GEN_BUFFER_ROWS;
      for (var r = top; r <= bottom; r++) this.getOrCreateRow(r);

      var cleanupBelow = bottom + CLEANUP_MARGIN;
      for (var key in this.rows) {
        if (this.rows[key].worldRow > cleanupBelow) delete this.rows[key];
      }
    },

    // ── Try to hop one step in a direction ─────────────────────────
    // dc = column change (-1 left, 0 stay, +1 right)
    // dr = row change    (-1 forward/up, 0 stay, +1 backward/down)
    tryMove: function (dc, dr) {
      if (this.moving || this.isPaused) return;

      var newCol = this.charCol + dc;
      var newRow = this.worldRow + dr;

      if (newCol < 0 || newCol >= COLS) return;
      // Forward (smaller worldRow) is unlimited. Backward is capped
      // relative to furthestWorldRow (the best forward progress made so
      // far), not the camera -- the camera re-settles the frog at
      // ANCHOR_ROW_SLOT after every hop, so a cap measured from the
      // camera's own position always equals the frog's current row and
      // would block backward movement entirely.
      if (newRow > this.furthestWorldRow + MAX_BACKWARD_SLACK) return;

      this.charCol  = newCol;
      this.worldRow = newRow;
      if (newRow < this.furthestWorldRow) this.furthestWorldRow = newRow;

      var targetX         = newCol * CELL_W + CELL_W / 2;
      var targetScrollRow = newRow - ANCHOR_ROW_SLOT;

      this.moving = true;
      var self    = this;

      // Both the frog's column slide AND the camera's row scroll are
      // driven by this single tween, so they always move in lockstep.
      this.tweens.add({
        targets:  this,
        charX:          targetX,
        scrollWorldRow: targetScrollRow,
        duration: HOP_MS,
        ease:     'Power2Out',
        onComplete: function () {
          self.moving = false;
          self.ensureRowsGenerated();
          // Only trigger on an actual row change (dr !== 0) onto a goal
          // row that hasn't already triggered practice (worldRow <
          // goalReached) -- onReachGoal() no longer moves the frog off
          // the goal row, so without both guards a sidestep, or a
          // down-then-up shuffle back onto the same checkpoint, would
          // reopen the practice modal and re-award points indefinitely.
          if (dr !== 0 && self.worldRow < self.goalReached && rowDefAt(self.worldRow).type === 'goal') {
            self.goalReached = self.worldRow;
            self.onReachGoal();
          }
        }
      });

      if (dr < 0) callbacks.onPoints(3);
    },

    // ── Player reached a goal/checkpoint row ───────────────────────
    onReachGoal: function () {
      var self = this;
      if (!this.currentWord) return;

      this.isPaused = true;
      callbacks.onPoints(20);

      callbacks.onPractice(this.currentWord, null, function () {
        self.isPaused = false;
        // No teleport -- the frog stays exactly where it is and
        // scrolling continues toward the next checkpoint.
        if (words.length) {
          self.currentWord = words[self.wordIdx++ % words.length];
          self.updateGoalLabel();
        }
      });
    },

    updateGoalLabel: function () {
      if (!this.currentWord || !this.goalLabel) return;
      var wEmoji = (this.currentWord.emoji && this.currentWord.emoji !== this.currentWord.word) ? this.currentWord.emoji : this.currentWord.word;
      this.goalLabel.setText(
        wEmoji + '  ข้ามถนน → ' + this.currentWord.reading + '  ' + wEmoji
      );
    },

    // ── Per-frame update ──────────────────────────────────────────
    update: function (time, delta) {
      if (this.isPaused) return;
      var self = this;

      if (!this.moving) {
        if      (Phaser.Input.Keyboard.JustDown(this.keys.up)    ||
                 Phaser.Input.Keyboard.JustDown(this.keys.w))    { this.tryMove(0,  -1); }
        else if (Phaser.Input.Keyboard.JustDown(this.keys.down)  ||
                 Phaser.Input.Keyboard.JustDown(this.keys.s))    { this.tryMove(0,   1); }
        else if (Phaser.Input.Keyboard.JustDown(this.keys.left)  ||
                 Phaser.Input.Keyboard.JustDown(this.keys.a))    { this.tryMove(-1,  0); }
        else if (Phaser.Input.Keyboard.JustDown(this.keys.right) ||
                 Phaser.Input.Keyboard.JustDown(this.keys.d))    { this.tryMove(1,   0); }
      }

      this.ensureRowsGenerated();

      // ── Move all cars in every currently-generated road row ──────
      var dt = delta / 16;
      for (var key in this.rows) {
        var row = this.rows[key];
        if (row.type !== 'road') continue;
        row.cars.forEach(function (car) {
          car.x += car.speed * car.dir * dt;
          if (car.dir ===  1 && car.x > W + car.w) car.x = -car.w;
          if (car.dir === -1 && car.x < -car.w)    car.x = W + car.w;
        });
      }

      // ── Car collision detection (current row only) ────────────────
      if (this.invincible > 0) {
        this.invincible--;
      } else {
        var currentRow = this.rows[this.worldRow];
        if (currentRow && currentRow.type === 'road') {
          var charLeft   = this.charX - CELL_W * 0.38;
          var charRight  = this.charX + CELL_W * 0.38;
          var rowScreenY = (currentRow.worldRow - this.scrollWorldRow) * CELL_H;
          var charTop    = rowScreenY + CELL_H / 2 - CELL_H * 0.38;
          var charBot    = rowScreenY + CELL_H / 2 + CELL_H * 0.38;

          currentRow.cars.forEach(function (car) {
            if (self.invincible > 0) return; // one hit per frame even if two cars overlap the frog at once

            var carLeft  = car.x;
            var carRight = car.x + car.w;
            var carTop   = rowScreenY + 5;
            var carBot   = rowScreenY + car.h + 5;

            if (charLeft < carRight && charRight > carLeft &&
                charTop  < carBot   && charBot   > carTop) {
              self.invincible = 90; // ~1.5 seconds of invincibility after the hit
              if (callbacks.onTime) callbacks.onTime(-5);
              self.showPop(self.charX, ANCHOR_ROW_SLOT * CELL_H + CELL_H / 2 - 30, '-5s 💥');

              // A hit can land mid-hop (collision is checked every frame,
              // not just when settled). The in-flight hop tween must be
              // killed before applying knockback -- otherwise Phaser keeps
              // interpolating scrollWorldRow toward its pre-hit target on
              // every following frame, silently undoing the assignment
              // below the instant it's made. Resettle charX to the current
              // column's centre so the frog isn't left half-tweened.
              self.tweens.killTweensOf(self);
              self.moving = false;
              self.charX  = self.charCol * CELL_W + CELL_W / 2;

              // Knock back a few rows instead of resetting to the start --
              // clamped relative to furthestWorldRow (see MAX_BACKWARD_SLACK),
              // the same real, camera-independent bound tryMove() uses.
              var maxBackRow = self.furthestWorldRow + MAX_BACKWARD_SLACK;
              self.worldRow  = Math.min(self.worldRow + KNOCKBACK_ROWS, maxBackRow);

              // Tween the camera to the knockback position instead of
              // snapping, matching the smooth scroll of a normal hop.
              // Held under the same `moving` lock a normal hop uses, so
              // an input within HOP_MS of a knockback can't start a
              // second tween on scrollWorldRow while this one is still
              // animating (both would write it every frame, jittering
              // the camera until the first one finished).
              self.moving = true;
              self.tweens.add({
                targets: self,
                scrollWorldRow: self.worldRow - ANCHOR_ROW_SLOT,
                duration: HOP_MS,
                ease:     'Power2Out',
                onComplete: function () { self.moving = false; }
              });
            }
          });
        }
      }

      this.draw(time);
    },

    // ── [COLORS] Draw row backgrounds for every currently-visible row.
    // Rows scroll now, so unlike the original fixed board this can no
    // longer be a one-time static draw -- it redraws each frame. ─────
    drawBg: function () {
      var g = this.bgGfx;
      g.clear();
      var top    = Math.floor(this.scrollWorldRow) - 1;
      var bottom = Math.floor(this.scrollWorldRow) + ROWS;
      for (var r = top; r <= bottom; r++) {
        var row = this.rows[r];
        if (!row) continue;
        var y = (row.worldRow - this.scrollWorldRow) * CELL_H;
        g.fillStyle(ROW_COLOR[row.type]);
        g.fillRect(0, y, W, CELL_H);

        if (row.type === 'road') {
          g.fillStyle(0xffffff, 0.35);
          for (var mx = 0; mx < W; mx += 40) g.fillRect(mx, y + CELL_H / 2 - 1, 24, 2);
          g.fillStyle(0x424242, 0.5);
          g.fillRect(0, y,              W, 4);
          g.fillRect(0, y + CELL_H - 4, W, 4);
        }
        if (row.type === 'goal') {
          g.fillStyle(0xffffff, 0.2);
          for (var zx = 0; zx < W; zx += CELL_W) {
            if (Math.floor(zx / CELL_W) % 2 === 0) g.fillRect(zx, y, CELL_W, CELL_H);
          }
        }
        if (row.type === 'grass') {
          g.fillStyle(0x43a047, 0.4);
          for (var gx = 0; gx < W; gx += 16) g.fillRect(gx, y + 4, 4, CELL_H - 8);
        }
      }
    },

    // ── Draw all dynamic objects every frame (cars + frog) ────────
    draw: function (time) {
      this.drawBg();
      var g    = this.dynGfx;
      var self = this;
      g.clear();

      var top    = Math.floor(this.scrollWorldRow) - 1;
      var bottom = Math.floor(this.scrollWorldRow) + ROWS;
      for (var r = top; r <= bottom; r++) {
        var row = this.rows[r];
        if (!row || row.type !== 'road') continue;
        var y = (row.worldRow - this.scrollWorldRow) * CELL_H + 6;
        row.cars.forEach(function (car) {
          g.fillStyle(car.color);
          g.fillRoundedRect(car.x, y, car.w, car.h, 7);
          g.fillStyle(0xbbdefb, 0.85);
          var ww = car.w * 0.33;
          g.fillRoundedRect(car.x + 5,              y + 4, ww,  car.h * 0.52, 3);
          g.fillRoundedRect(car.x + car.w - ww - 5, y + 4, ww,  car.h * 0.52, 3);
          g.fillStyle(0x212121);
          g.fillCircle(car.x + 10,         y + car.h + 2, 7);
          g.fillCircle(car.x + car.w - 10, y + car.h + 2, 7);
          g.fillStyle(0xfff176, 0.9);
          var lx = car.dir === 1 ? car.x + car.w - 4 : car.x;
          g.fillRect(lx, y + 4, 4, 8);
        });
      }

      var frogY = ANCHOR_ROW_SLOT * CELL_H + CELL_H / 2;
      var flash = this.invincible > 0 && Math.floor(this.invincible / 6) % 2 === 1;
      if (!flash) this.drawCharacter(g, this.charX, frogY, time);
    },

    // ── [CHAR] Draw the frog character at position (cx, cy) ──────
    drawCharacter: function (g, cx, cy, time) {
      var r = 17;
      g.fillStyle(0x66bb6a);
      g.fillCircle(cx, cy, r);
      g.lineStyle(2, 0x388e3c);
      g.strokeCircle(cx, cy, r);
      g.fillStyle(0xffffff);
      g.fillCircle(cx - 7, cy - 8, 6);
      g.fillCircle(cx + 7, cy - 8, 6);
      g.fillStyle(0x1a237e);
      g.fillCircle(cx - 6, cy - 8, 3);
      g.fillCircle(cx + 6, cy - 8, 3);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(cx - 5, cy - 9, 1.2);
      g.fillCircle(cx + 7, cy - 9, 1.2);
      g.lineStyle(2, 0x2e7d32);
      g.beginPath();
      g.arc(cx, cy + 5, 7, 0.1, Math.PI - 0.1, false, 0.02);
      g.strokePath();
      var bob = Math.sin(time * 0.008) * 2;
      g.fillStyle(0x4caf50);
      g.fillEllipse(cx - 21, cy + 8 + bob, 20, 10);
      g.fillEllipse(cx + 21, cy + 8 + bob, 20, 10);
    },

    // ── [POP] Floating feedback text ─────────────────────────────
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

    // ── Cleanup DOM event listeners when the scene is stopped ────
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
    parent: 'crossyCanvas',
    width:  W, height: H,
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, autoRound: true },
    scene:  CrossyScene,
    audio:  { noAudio: true }
  });
}

// ── Public API ────────────────────────────────────────────────────
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
