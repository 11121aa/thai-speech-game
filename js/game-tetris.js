// ============================================================
//  TETRIS GAME — Phaser 3  (falling blocks, line-clear scoring)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Board size, gravity speed, points/thresholds  (~line 15)
//    [PIECES]  Shapes + colours                              (~PIECES)
//    [DRAW]    Cell/board/piece rendering                    (~drawCell)
//    [POP]     Score pop style                                (~showPop)
// ============================================================
//  How the game works:
//    - Standard 7-bag falling-block board (10 wide). Pieces fall on
//      their own; ◀/▶ move a column, ↻ rotates, ▼ drops the piece
//      straight to the bottom instantly (no separate soft-drop).
//    - Clearing a row scores POINTS_PER_LINE (200) — clearing several
//      rows in one drop scores that many times over (e.g. 4 rows = 800).
//    - Every time total score crosses a multiple of PRACTICE_EVERY_PTS
//      (1000), a pronunciation practice popup opens before play resumes.
//    - Game ends the moment a new piece has nowhere to spawn (stack
//      topped out) — no countdown timer, same as platformer/tower defense.
// ============================================================

function createTetrisGame(words, callbacks) {

  // ── [TUNE] Numbers you can change ────────────────────────────
  var COLS = 10, ROWS = 18;
  var CELL = 32;                 // board cell size in pixels
  var W = 480, H = 800;          // canvas size in pixels (portrait, like the airplane/cooking games)
  var BOARD_X = 24, BOARD_Y = 76;
  var BOARD_W = COLS * CELL, BOARD_H = ROWS * CELL;
  var POINTS_PER_LINE = 200;     // per cleared row, multiplied by however many clear in one drop
  var PRACTICE_EVERY_PTS = 1000; // practice popup every time cumulative score crosses a multiple of this
  var GRAVITY_BASE_MS = 800;     // starting time between automatic falls
  var GRAVITY_MIN_MS  = 220;     // fastest gravity ever ramps to
  var GRAVITY_STEP_MS = 30;      // gravity speeds up by this much per line cleared (reaches GRAVITY_MIN_MS after ~19 lines)
  var LINE_FLASH_MS = 180;       // how long a cleared row flashes before rows shift down

  // ── [PIECES] Shapes (as NxN boolean grids, rotated via rotateCW) + colours ──
  var PIECES = {
    I: { matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: 0x2EC4B6 },
    O: { matrix: [[1,1],[1,1]],                             color: 0xF0A500 },
    T: { matrix: [[0,1,0],[1,1,1],[0,0,0]],                 color: 0x8A5CF6 },
    S: { matrix: [[0,1,1],[1,1,0],[0,0,0]],                 color: 0x27AE60 },
    Z: { matrix: [[1,1,0],[0,1,1],[0,0,0]],                 color: 0xE53935 },
    J: { matrix: [[1,0,0],[1,1,1],[0,0,0]],                 color: 0x2196F3 },
    L: { matrix: [[0,0,1],[1,1,1],[0,0,0]],                 color: 0xFF9F1C }
  };
  var PIECE_KEYS = Object.keys(PIECES);

  // Rotates an NxN boolean matrix 90° clockwise. Generic over size so it
  // works unchanged for O (2x2), T/S/Z/J/L (3x3) and I (4x4).
  function rotateCW(m) {
    var n = m.length, res = [];
    for (var i = 0; i < n; i++) res.push(new Array(n).fill(0));
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) res[x][n - 1 - y] = m[y][x];
    return res;
  }

  var TetScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'tetris' });
      this.grid = [];
      for (var r = 0; r < ROWS; r++) this.grid.push(new Array(COLS).fill(null));
      this.bag = [];
      this.cur = null;
      this.nextKey = null;
      this.gravityAcc = 0;
      this.linesCleared = 0;
      this.score = 0;          // local running total — drives the 1000-pt practice threshold
      this.wordIdx = 0;
      this.isPaused = false;   // true during line-clear flash and while a practice popup is open
      this.over = false;
      this.flashingRows = null;
    },

    preload: function () {
      this.load.audio('tetMove',  'soundeffect/Click.mp3');
      this.load.audio('tetRotate','soundeffect/FlipCard.mp3');
      this.load.audio('tetClear', 'soundeffect/TargetBreak.mp3');
      this.load.audio('tetDrop',  'soundeffect/swoosh.mp3');
      this.load.audio('tetOver',  'soundeffect/PixelDamage.mp3');
    },

    create: function () {
      var self = this;
      var ca = this.cache.audio;
      this.sfxMove   = ca.exists('tetMove')   ? this.sound.add('tetMove',   { volume: 0.35 }) : null;
      this.sfxRotate = ca.exists('tetRotate') ? this.sound.add('tetRotate', { volume: 0.5  }) : null;
      this.sfxClear  = ca.exists('tetClear')  ? this.sound.add('tetClear',  { volume: 0.6  }) : null;
      this.sfxDrop   = ca.exists('tetDrop')   ? this.sound.add('tetDrop',   { volume: 0.5  }) : null;
      this.sfxOver   = ca.exists('tetOver')   ? this.sound.add('tetOver',   { volume: 0.7  }) : null;

      this.g = this.add.graphics();

      this.hint = this.add.text(W / 2, 26,
        'ต่อบล็อกให้เต็มแถว — ◀ ▶ เลื่อน   ↻ หมุน   ▼ ตกทันที', {
          fontFamily: 'Prompt, sans-serif', fontSize: '14px', fontStyle: 'bold',
          color: '#2b2438', backgroundColor: '#ffffffcc', padding: { x: 8, y: 4 }
        }).setOrigin(0.5, 0).setDepth(10);
      this.time.delayedCall(4000, function () {
        self.tweens.add({ targets: self.hint, alpha: 0, duration: 500, onComplete: function () { self.hint.destroy(); self.hint = null; } });
      });

      this.linesTxt = this.add.text(0, 0, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#374151'
      }).setDepth(10);
      this.nextLabelTxt = this.add.text(0, 0, 'ต่อไป', {
        fontFamily: 'Prompt, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#374151'
      }).setDepth(10);

      this.keys = {};
      this.input.keyboard.on('keydown-LEFT',  function () { self.moveLeft(); });
      this.input.keyboard.on('keydown-A',     function () { self.moveLeft(); });
      this.input.keyboard.on('keydown-RIGHT', function () { self.moveRight(); });
      this.input.keyboard.on('keydown-D',     function () { self.moveRight(); });
      this.input.keyboard.on('keydown-UP',    function () { self.rotate(); });
      this.input.keyboard.on('keydown-W',     function () { self.rotate(); });
      this.input.keyboard.on('keydown-DOWN',  function () { self.hardDrop(); });
      this.input.keyboard.on('keydown-S',     function () { self.hardDrop(); });
      this.input.keyboard.on('keydown-SPACE', function () { self.hardDrop(); });

      var bRot   = document.getElementById('tetBtnRotate');
      var bLeft  = document.getElementById('tetBtnLeft');
      var bRight = document.getElementById('tetBtnRight');
      var bDrop  = document.getElementById('tetBtnDrop');
      this._rotFn   = function () { self.rotate(); };
      this._leftFn  = function () { self.moveLeft(); };
      this._rightFn = function () { self.moveRight(); };
      this._dropFn  = function () { self.hardDrop(); };
      // touchstart AND mousedown both firing fn() per tap would double-count
      // every button press on touch devices (a real touch fires touchstart,
      // then the browser follows up with a synthesized mousedown/click for
      // the same tap unless something suppresses it). preventDefault() on
      // touchstart suppresses that synthetic follow-up, so exactly one of
      // the two listeners fires per interaction -- touchstart on touch
      // devices, mousedown on mouse-only ones. Requires passive:false since
      // a passive listener can't call preventDefault().
      function wire(el, fn) {
        if (!el) return;
        el.addEventListener('mousedown',  fn);
        el.addEventListener('touchstart', function (e) { e.preventDefault(); fn(); }, { passive: false });
      }
      wire(bRot, this._rotFn);
      wire(bLeft, this._leftFn);
      wire(bRight, this._rightFn);
      wire(bDrop, this._dropFn);

      this.events.on('shutdown', this.shutdown, this);

      this.nextKey = this.drawFromBag();
      this.spawnPiece();
    },

    // ── Bag randomizer: shuffles the 7 piece keys, hands them out one at a
    // time, reshuffles once exhausted — same piece can't reappear more
    // than every 7 draws, matching how real Tetris pieces feel fair.
    drawFromBag: function () {
      if (!this.bag.length) {
        this.bag = PIECE_KEYS.slice();
        for (var i = this.bag.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = this.bag[i]; this.bag[i] = this.bag[j]; this.bag[j] = t;
        }
      }
      return this.bag.pop();
    },

    spawnPiece: function () {
      var key = this.nextKey || this.drawFromBag();
      this.nextKey = this.drawFromBag();
      var def = PIECES[key];
      var matrix = def.matrix.map(function (row) { return row.slice(); });
      var n = matrix.length;
      var x = Math.floor((COLS - n) / 2);
      var y = 0;
      this.cur = { key: key, matrix: matrix, x: x, y: y, color: def.color };
      this.gravityAcc = 0;
      if (!this.canPlace(matrix, x, y)) this.gameOver();
    },

    // True if every filled cell of `matrix` placed at board offset (gx,gy)
    // is inside the board and not already occupied. Cells above row 0
    // (gy+my < 0) are allowed — that's the piece still emerging at spawn.
    canPlace: function (matrix, gx, gy) {
      var n = matrix.length;
      for (var my = 0; my < n; my++) {
        for (var mx = 0; mx < n; mx++) {
          if (!matrix[my][mx]) continue;
          var bx = gx + mx, by = gy + my;
          if (bx < 0 || bx >= COLS || by >= ROWS) return false;
          if (by >= 0 && this.grid[by][bx]) return false;
        }
      }
      return true;
    },

    moveLeft: function () {
      if (this.isPaused || this.over || !this.cur) return;
      if (this.canPlace(this.cur.matrix, this.cur.x - 1, this.cur.y)) {
        this.cur.x--;
        if (this.sfxMove) this.sfxMove.play();
      }
    },
    moveRight: function () {
      if (this.isPaused || this.over || !this.cur) return;
      if (this.canPlace(this.cur.matrix, this.cur.x + 1, this.cur.y)) {
        this.cur.x++;
        if (this.sfxMove) this.sfxMove.play();
      }
    },

    // Rotates clockwise, trying a few horizontal nudges ("wall kicks") if
    // the raw rotation would overlap the walls or a locked block, so
    // rotating near an edge doesn't just silently fail most of the time.
    rotate: function () {
      if (this.isPaused || this.over || !this.cur) return;
      var rotated = rotateCW(this.cur.matrix);
      var kicks = [0, -1, 1, -2, 2];
      for (var i = 0; i < kicks.length; i++) {
        if (this.canPlace(rotated, this.cur.x + kicks[i], this.cur.y)) {
          this.cur.matrix = rotated;
          this.cur.x += kicks[i];
          if (this.sfxRotate) this.sfxRotate.play();
          return;
        }
      }
    },

    hardDrop: function () {
      if (this.isPaused || this.over || !this.cur) return;
      while (this.canPlace(this.cur.matrix, this.cur.x, this.cur.y + 1)) this.cur.y++;
      if (this.sfxDrop) this.sfxDrop.play();
      this.lockAndProceed();
    },

    softFallStep: function () {
      if (this.canPlace(this.cur.matrix, this.cur.x, this.cur.y + 1)) {
        this.cur.y++;
      } else {
        this.lockAndProceed();
      }
    },

    writeToGrid: function () {
      var cur = this.cur, n = cur.matrix.length;
      for (var my = 0; my < n; my++) {
        for (var mx = 0; mx < n; mx++) {
          if (!cur.matrix[my][mx]) continue;
          var by = cur.y + my, bx = cur.x + mx;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) this.grid[by][bx] = cur.color;
        }
      }
    },

    findFullRows: function () {
      var rows = [];
      for (var r = 0; r < ROWS; r++) {
        if (this.grid[r].every(function (c) { return c; })) rows.push(r);
      }
      return rows;
    },

    // Locks the piece into the grid, then either flashes+clears any full
    // rows (pausing briefly for the flash) or moves straight to spawning
    // the next piece.
    lockAndProceed: function () {
      var self = this;
      this.writeToGrid();
      this.cur = null;
      var fullRows = this.findFullRows();
      if (fullRows.length) {
        this.flashingRows = fullRows;
        this.isPaused = true;
        this.time.delayedCall(LINE_FLASH_MS, function () { self.resolveLineClear(fullRows); });
      } else {
        this.spawnPiece();
      }
    },

    resolveLineClear: function (fullRows) {
      var self = this;
      // Remove every full row first (highest index first, so removing one
      // doesn't shift the still-pending indices out from under the next
      // one), THEN backfill that many empty rows at the top in one go.
      // Interleaving a splice+unshift per row instead (removing one row,
      // immediately re-adding one at the top, repeat) is wrong the moment
      // more than one row clears in the same drop: each unshift shifts
      // every remaining original row's index down by one, so the next
      // splice(r) not only no longer targets the row it originally meant
      // to remove, it deletes real board content and leaves stale cells
      // behind after the shift.
      fullRows.slice().sort(function (a, b) { return b - a; }).forEach(function (r) {
        self.grid.splice(r, 1);
      });
      for (var i = 0; i < fullRows.length; i++) self.grid.unshift(new Array(COLS).fill(null));
      this.flashingRows = null;

      var pts = fullRows.length * POINTS_PER_LINE;
      var beforeScore = this.score;
      this.linesCleared += fullRows.length;
      this.score += pts;
      callbacks.onPoints(pts);
      this.showPop(BOARD_X + BOARD_W / 2, BOARD_Y + 40, '+' + pts + ' ⭐');
      if (this.sfxClear) this.sfxClear.play();

      var crossedThreshold = Math.floor(beforeScore / PRACTICE_EVERY_PTS) < Math.floor(this.score / PRACTICE_EVERY_PTS);

      this.isPaused = false;
      this.spawnPiece();
      if (this.over) return;
      if (crossedThreshold) this.triggerPractice();
    },

    triggerPractice: function () {
      if (!words.length) return;
      var self = this;
      this.isPaused = true;
      var word = words[this.wordIdx++ % words.length];
      callbacks.onPractice(word, null, function () {
        if (!self.over) self.isPaused = false;
      });
    },

    gameOver: function () {
      this.over = true;
      this.isPaused = true;
      this.cur = null;
      if (this.sfxOver) this.sfxOver.play();
      this.showPop(BOARD_X + BOARD_W / 2, BOARD_Y + BOARD_H / 2, '💥 เกมจบ!');
      var self = this;
      this.time.delayedCall(1100, function () { callbacks.onFinish(); });
    },

    update: function (time, delta) {
      if (!this.over && !this.isPaused) {
        this.gravityAcc += delta;
        var interval = Math.max(GRAVITY_MIN_MS, GRAVITY_BASE_MS - this.linesCleared * GRAVITY_STEP_MS);
        if (this.gravityAcc >= interval) {
          this.gravityAcc -= interval;
          this.softFallStep();
        }
      }
      this.draw(time);
    },

    // ── [DRAW] ──────────────────────────────────────────────────
    draw: function (time) {
      var g = this.g;
      g.clear();

      // Soft gradient background, same band technique the other games use
      var bands = 20;
      for (var i = 0; i < bands; i++) {
        var t = i / bands;
        var r = Math.round(Phaser.Math.Linear(240, 250, t));
        var gv = Math.round(Phaser.Math.Linear(244, 248, t));
        var bv = Math.round(Phaser.Math.Linear(255, 252, t));
        g.fillStyle(Phaser.Display.Color.GetColor(r, gv, bv));
        g.fillRect(0, i * (H / bands), W, H / bands + 1);
      }

      // Board frame
      g.fillStyle(0x1e2a40);
      g.fillRoundedRect(BOARD_X - 6, BOARD_Y - 6, BOARD_W + 12, BOARD_H + 12, 10);
      g.fillStyle(0x0f1626);
      g.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);

      // Faint grid lines
      g.lineStyle(1, 0xffffff, 0.05);
      for (var cx = 1; cx < COLS; cx++) {
        g.lineBetween(BOARD_X + cx * CELL, BOARD_Y, BOARD_X + cx * CELL, BOARD_Y + BOARD_H);
      }
      for (var cy = 1; cy < ROWS; cy++) {
        g.lineBetween(BOARD_X, BOARD_Y + cy * CELL, BOARD_X + BOARD_W, BOARD_Y + cy * CELL);
      }

      // Locked cells (flashing ones drawn bright white during the clear delay)
      var flashing = this.flashingRows;
      for (var ry = 0; ry < ROWS; ry++) {
        var isFlash = flashing && flashing.indexOf(ry) !== -1;
        for (var rx = 0; rx < COLS; rx++) {
          var cell = this.grid[ry][rx];
          if (!cell) continue;
          this.drawCell(g, BOARD_X + rx * CELL, BOARD_Y + ry * CELL, isFlash ? 0xffffff : cell, 1);
        }
      }

      if (this.cur && !this.over) {
        this.drawGhost(g);
        this.drawPieceMatrix(g, this.cur.matrix, BOARD_X + this.cur.x * CELL, BOARD_Y + this.cur.y * CELL, this.cur.color, 1);
      }

      this.drawSidePanel(g, time);
    },

    // Outline-only preview of where the current piece will land on a hard drop
    drawGhost: function (g) {
      var gy = this.cur.y;
      while (this.canPlace(this.cur.matrix, this.cur.x, gy + 1)) gy++;
      if (gy === this.cur.y) return;
      var n = this.cur.matrix.length;
      for (var my = 0; my < n; my++) {
        for (var mx = 0; mx < n; mx++) {
          if (!this.cur.matrix[my][mx]) continue;
          var px = BOARD_X + (this.cur.x + mx) * CELL, py = BOARD_Y + (gy + my) * CELL;
          g.lineStyle(2, this.cur.color, 0.35);
          g.strokeRoundedRect(px + 2, py + 2, CELL - 4, CELL - 4, 4);
        }
      }
    },

    drawPieceMatrix: function (g, matrix, px0, py0, color, alpha) {
      var n = matrix.length;
      for (var my = 0; my < n; my++) {
        for (var mx = 0; mx < n; mx++) {
          if (!matrix[my][mx]) continue;
          this.drawCell(g, px0 + mx * CELL, py0 + my * CELL, color, alpha);
        }
      }
    },

    // One filled block: base colour + a light top-left highlight so blocks
    // read as small tiles rather than flat squares (kept subtle).
    drawCell: function (g, px, py, color, alpha) {
      g.fillStyle(color, alpha);
      g.fillRoundedRect(px + 1, py + 1, CELL - 2, CELL - 2, 5);
      g.fillStyle(0xffffff, 0.22 * alpha);
      g.fillRoundedRect(px + 3, py + 3, CELL - 10, (CELL - 10) * 0.4, 3);
    },

    drawSidePanel: function (g, time) {
      var panelX = BOARD_X + BOARD_W + 20;
      this.linesTxt.setText('แถว: ' + this.linesCleared).setPosition(panelX, BOARD_Y + BOARD_H - 24);
      this.nextLabelTxt.setPosition(panelX, BOARD_Y);

      // Next-piece preview box
      var boxSize = 88, boxX = panelX, boxY = BOARD_Y + 24;
      g.fillStyle(0x1e2a40);
      g.fillRoundedRect(boxX, boxY, boxSize, boxSize, 10);
      if (this.nextKey) {
        var def = PIECES[this.nextKey];
        var n = def.matrix.length;
        var cell = Math.floor((boxSize - 16) / n);
        var offX = boxX + (boxSize - n * cell) / 2, offY = boxY + (boxSize - n * cell) / 2;
        for (var my = 0; my < n; my++) {
          for (var mx = 0; mx < n; mx++) {
            if (!def.matrix[my][mx]) continue;
            g.fillStyle(def.color, 1);
            g.fillRoundedRect(offX + mx * cell + 1, offY + my * cell + 1, cell - 2, cell - 2, 3);
          }
        }
      }
    },

    // ── [POP] Floating score text ─────────────────────────────
    showPop: function (x, y, text) {
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif', fontSize: '22px', fontStyle: 'bold',
        color: '#F0A500', stroke: '#ffffff', strokeThickness: 4
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({
        targets: pop, y: y - 46, alpha: 0, duration: 850, ease: 'Power2',
        onComplete: function () { pop.destroy(); }
      });
    },

    // ── Cleanup DOM event listeners when the scene is stopped ────
    shutdown: function () {
      var ids = ['tetBtnRotate', 'tetBtnLeft', 'tetBtnRight', 'tetBtnDrop'];
      var fns = [this._rotFn, this._leftFn, this._rightFn, this._dropFn];
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
    parent: 'tetrisCanvas',
    width:  W, height: H,
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, autoRound: true },
    scene:  TetScene,
    audio:  { noAudio: false }
  });
}

// ── Public API ────────────────────────────────────────────────────
var TetrisGame = (function () {
  var game = null;

  function start(words, cbs) {
    stop();
    setTimeout(function () { game = createTetrisGame(words, cbs); }, 60);
  }

  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }

  return { start: start, stop: stop };
}());
