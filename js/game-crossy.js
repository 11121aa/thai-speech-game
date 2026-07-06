// ============================================================
//  CROSSY ROAD GAME — Phaser 3  (Grid-hop frogger)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Grid dimensions, car speed         (~line 15)
//    [ROWS]    Row layout (road / grass / goal)   (~ROW_TYPES)
//    [CARS]    Car count, colours, width range    (~createCars)
//    [CHAR]    Character (frog) art               (~drawCharacter)
//    [COLORS]  Row background colours             (~drawBg)
//    [POP]     Hit/goal pop text style            (~showPop)
// ============================================================
//  How the game works:
//    - A frog hops on a grid (7 rows × 11 columns)
//    - The goal row is at the top; the start is at the bottom
//    - Cars scroll across the 4 road rows in alternating directions
//    - Hop forward with ↑; sidestep with ← →; hop back with ↓
//    - Reach the goal row → word practice → new word, reset to start
//    - Hit a car → -5 seconds timer penalty + reset to start
// ============================================================

// createCrossyGame is called with:
//   words     = array of word objects { word, emoji, reading, ... }
//   callbacks = { onPoints, onPractice, onFinish, onTime }
function createCrossyGame(words, callbacks) {

  // ── [TUNE] Grid and timing ────────────────────────────────────
  var W = 800, H = 400;                        // canvas size in pixels
  var COLS    = 11;                             // number of columns across the screen
  var ROWS    = 7;                              // number of rows from top to bottom
  var CELL_W  = Math.floor(W / COLS);          // width of each grid cell ≈ 72px
  var CELL_H  = Math.floor(H / ROWS);          // height of each grid cell ≈ 57px
  var HOP_MS  = 130;                           // duration of each hop animation (milliseconds)

  // ── [ROWS] Row layout — index 0 = top row, index 6 = bottom row ─
  // 'goal'  = safe cyan strip at the top — reaching it triggers word practice
  // 'road'  = dangerous car lane
  // 'grass' = safe green rest zone in the middle
  // 'start' = safe dark green spawn point at the bottom
  var ROW_TYPES = ['goal',  'road', 'road', 'grass', 'road', 'road', 'start'];

  // Car direction per road row: +1 = left-to-right, -1 = right-to-left
  var ROW_DIRS  = [0,  1,  -1,  0, -1,  1,  0];

  // Base speed of cars in each row (pixels per frame at 60fps)
  // Safe rows (goal/grass/start) have 0 speed since they have no cars
  var ROW_SPEED = [0, 2.2, 1.7,  0, 2.5, 1.5, 0];

  // ── [COLORS] Background colour for each row type ─────────────
  var ROW_COLOR = {
    goal:  0x00bcd4, // teal/cyan — the safe finish zone
    road:  0x616161, // dark grey — asphalt
    grass: 0x4caf50, // medium green — rest zone
    start: 0x388e3c  // darker green — starting position
  };

  // ── Scene class ───────────────────────────────────────────────
  var CrossyScene = new Phaser.Class({
    Extends: Phaser.Scene,

    // initialize() — set up starting values before the scene runs
    initialize: function () {
      Phaser.Scene.call(this, { key: 'crossy' }); // register scene

      this.charCol     = 5;     // starting column (0 = left edge, COLS-1 = right edge)
      this.charRow     = 6;     // starting row (6 = bottom start row)
      this.charX       = 0;     // visual X position of the frog (tweened smoothly between hops)
      this.charY       = 0;     // visual Y position of the frog (tweened smoothly)
      this.moving      = false; // true while a hop tween is in progress (blocks new input)
      this.isPaused    = false; // true while the practice modal is open
      this.invincible  = 0;     // frames of invincibility after being hit (counts down each frame)
      this.cars        = [];    // array of all car objects
      this.wordIdx     = 0;     // which word to show next (cycles through the words array)
      this.currentWord = null;  // the current word the player is trying to reach the goal for
    },

    // create() — runs once when the scene starts; sets everything up
    create: function () {
      var self = this;

      // ── Static background (row stripes, drawn once) ───────────────
      this.bgGfx = this.add.graphics();
      this.drawBg(); // fills the row stripes, road markings, goal pattern

      // Dynamic layer: cleared and redrawn every frame (cars + frog)
      this.dynGfx = this.add.graphics();

      // Set the frog's initial visual position to match its starting grid cell
      this.charX = this.charCol * CELL_W + CELL_W / 2; // centre of column 5
      this.charY = this.charRow * CELL_H + CELL_H / 2; // centre of row 6

      // ── Spawn cars for all road rows ──────────────────────────────
      this.createCars();

      // ── Goal label: shows the target word at the top of the screen ─
      this.goalLabel = this.add.text(W / 2, CELL_H / 2, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '15px', fontStyle: 'bold',
        color: '#ffffff', backgroundColor: '#0097a7cc',
        padding: { x: 12, y: 5 }
      }).setOrigin(0.5).setDepth(5);

      // Pick and display the first word
      if (words.length) {
        this.currentWord = words[this.wordIdx++ % words.length];
        this.updateGoalLabel(); // update the label text with the word
      }

      // ── Keyboard controls ─────────────────────────────────────────
      // Supports both arrow keys and WASD
      this.keys = this.input.keyboard.addKeys({
        up:    Phaser.Input.Keyboard.KeyCodes.UP,
        down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
        left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        w: Phaser.Input.Keyboard.KeyCodes.W, // W = up
        s: Phaser.Input.Keyboard.KeyCodes.S, // S = down
        a: Phaser.Input.Keyboard.KeyCodes.A, // A = left
        d: Phaser.Input.Keyboard.KeyCodes.D  // D = right
      });

      // ── DOM buttons (↑ ← ↓ → buttons in game.html) ──────────────
      // Save references to the handler functions so we can remove them in shutdown()
      var bUp    = document.getElementById('cryBtnUp');
      var bLeft  = document.getElementById('cryBtnLeft');
      var bRight = document.getElementById('cryBtnRight');
      var bDown  = document.getElementById('cryBtnDown');
      this._upFn    = function () { self.tryMove(0,  -1); }; // up = row decreases
      this._leftFn  = function () { self.tryMove(-1,  0); }; // left = col decreases
      this._rightFn = function () { self.tryMove(1,   0); }; // right = col increases
      this._downFn  = function () { self.tryMove(0,   1); }; // down = row increases

      // Attach both mouse (desktop) and touch (mobile) events
      function wire(el, fn) {
        if (!el) return;
        el.addEventListener('mousedown',  fn);
        el.addEventListener('touchstart', fn, { passive: true });
      }
      wire(bUp, this._upFn);
      wire(bLeft, this._leftFn);
      wire(bRight, this._rightFn);
      wire(bDown, this._downFn);

      // ── On-screen hint text (fades after 4 seconds) ────────────────
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

    // ── [CARS] Create cars for every road row ─────────────────────
    // Each road row gets 2–3 cars distributed evenly across the width
    createCars: function () {
      // [CARS] Change these colours for different car colours
      var CAR_COLORS = [0xff5252, 0xffb300, 0x2196f3, 0x9c27b0, 0x00bcd4, 0xff9800];

      for (var row = 0; row < ROWS; row++) {
        if (ROW_TYPES[row] !== 'road') continue; // only spawn cars on road rows

        var dir   = ROW_DIRS[row];  // +1 = left→right, -1 = right→left
        var spd   = ROW_SPEED[row]; // base speed for this row
        var nCars = 2 + Math.floor(Math.random() * 2); // [TUNE] 2 or 3 cars per lane

        for (var i = 0; i < nCars; i++) {
          var gap    = W / nCars;  // evenly divide the width among cars
          // Randomise within each gap to avoid perfectly uniform spacing
          var startX = i * gap + Math.random() * gap * 0.5;
          if (dir === -1) startX = W - startX; // right-to-left cars start on the right side

          var carW = 55 + Math.random() * 35; // [CARS] car width range: 55–90px

          this.cars.push({
            row:   row,                  // which row this car belongs to
            x:     startX,               // current X position
            w:     carW,                 // car width (height is fixed: CELL_H - 12)
            h:     CELL_H - 12,          // car height (slightly smaller than the cell)
            speed: spd * (0.75 + Math.random() * 0.5), // slight speed variation per car
            dir:   dir,                  // +1 or -1
            color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
          });
        }
      }
    },

    // ── Try to hop one step in a direction ─────────────────────────
    // dc = column change (-1 left, 0 stay, +1 right)
    // dr = row change    (-1 forward/up, 0 stay, +1 backward/down)
    tryMove: function (dc, dr) {
      if (this.moving || this.isPaused) return; // block input during tween or modal

      var newCol = this.charCol + dc;
      var newRow = this.charRow + dr;

      // Boundary check: don't allow moving off the grid edges
      if (newCol < 0 || newCol >= COLS) return;
      if (newRow < 0 || newRow > 6)    return;

      // Update the logical grid position immediately
      this.charCol = newCol;
      this.charRow = newRow;

      // Calculate the visual target position (centre of the new cell)
      var targetX = newCol * CELL_W + CELL_W / 2;
      var targetY = newRow * CELL_H + CELL_H / 2;

      this.moving = true; // lock input until the hop animation completes
      var self    = this;

      // ── Tween the visual position (charX, charY) to the new cell ──
      // Phaser can tween any numeric property of any object — here we tween
      // this.charX and this.charY directly on the scene object
      this.tweens.add({
        targets:  this,    // tween properties on the scene itself
        charX:    targetX, // smoothly move visual X to target
        charY:    targetY, // smoothly move visual Y to target
        duration: HOP_MS,
        ease:     'Power2Out', // fast start, decelerates at the end (snappy hop)
        onComplete: function () {
          self.moving = false; // unlock input
          if (self.charRow === 0) self.onReachGoal(); // check if player reached the goal row
        }
      });

      // Award a small bonus for hopping forward (toward the goal)
      if (dr < 0) callbacks.onPoints(3); // dr < 0 means moving up (toward row 0)
    },

    // ── Player reached the goal row (row 0) ───────────────────────
    // Triggered by tryMove's onComplete when charRow === 0
    onReachGoal: function () {
      var self = this;
      if (!this.currentWord) return;

      this.isPaused = true;            // freeze cars + input
      callbacks.onPoints(20);          // [TUNE] bonus points for a full crossing

      // Open the pronunciation practice modal
      callbacks.onPractice(this.currentWord, null, function () {
        self.isPaused = false; // unfreeze when modal closes

        // Teleport frog back to starting position
        self.charCol = 5; self.charRow = 6;
        self.charX   = self.charCol * CELL_W + CELL_W / 2;
        self.charY   = self.charRow * CELL_H + CELL_H / 2;

        // Give brief invincibility on respawn so the player doesn't immediately get hit
        self.invincible = 60; // ~1 second

        // Advance to the next word and update the goal label
        if (words.length) {
          self.currentWord = words[self.wordIdx++ % words.length];
          self.updateGoalLabel();
        }
      });
    },

    // ── Update the goal label text at the top of the screen ──────
    updateGoalLabel: function () {
      if (!this.currentWord || !this.goalLabel) return;
      this.goalLabel.setText(
        (this.currentWord.emoji || '🏁') +
        '  ข้ามถนน → ' + this.currentWord.reading +
        '  ' + (this.currentWord.emoji || '🏁')
      );
    },

    // ── Per-frame update ──────────────────────────────────────────
    // Handles keyboard input, car movement, collision, and drawing
    update: function (time, delta) {
      if (this.isPaused) return; // freeze everything while practice modal is open
      var self = this;

      // ── Keyboard input ─────────────────────────────────────────
      // JustDown() means "only true on the exact frame the key was first pressed"
      // This ensures one key press = one hop (not continuous movement)
      if (!this.moving) { // only accept input when the previous hop has finished
        if      (Phaser.Input.Keyboard.JustDown(this.keys.up)    ||
                 Phaser.Input.Keyboard.JustDown(this.keys.w))    { this.tryMove(0,  -1); }
        else if (Phaser.Input.Keyboard.JustDown(this.keys.down)  ||
                 Phaser.Input.Keyboard.JustDown(this.keys.s))    { this.tryMove(0,   1); }
        else if (Phaser.Input.Keyboard.JustDown(this.keys.left)  ||
                 Phaser.Input.Keyboard.JustDown(this.keys.a))    { this.tryMove(-1,  0); }
        else if (Phaser.Input.Keyboard.JustDown(this.keys.right) ||
                 Phaser.Input.Keyboard.JustDown(this.keys.d))    { this.tryMove(1,   0); }
      }

      // ── Move all cars ──────────────────────────────────────────
      // delta = milliseconds since last frame; normalise to 60fps so speed is consistent
      var dt = delta / 16;
      this.cars.forEach(function (car) {
        car.x += car.speed * car.dir * dt; // move the car in its direction
        // Wrap around: when a car goes off one edge, it reappears on the other
        if (car.dir ===  1 && car.x > W + car.w) car.x = -car.w;   // left-to-right wrap
        if (car.dir === -1 && car.x < -car.w)    car.x = W + car.w; // right-to-left wrap
      });

      // ── Car collision detection ────────────────────────────────
      if (this.invincible > 0) {
        this.invincible--; // count down invincibility frames (no collision check while active)
      } else if (ROW_TYPES[this.charRow] === 'road') {
        // Only check collisions when the frog is on a road row
        // Use the frog's visual position (charX/charY) for the hitbox
        // The hitbox is 76% of a cell in each direction (0.38 * CELL_W/H per side)
        var charLeft  = this.charX - CELL_W * 0.38;
        var charRight = this.charX + CELL_W * 0.38;
        var charTop   = this.charY - CELL_H * 0.38;
        var charBot   = this.charY + CELL_H * 0.38;
        var rowY      = this.charRow * CELL_H; // top Y of the current row

        this.cars.forEach(function (car) {
          if (car.row !== self.charRow) return; // skip cars in different rows

          // Car hitbox
          var carLeft  = car.x;
          var carRight = car.x + car.w;
          var carTop   = rowY + 5;
          var carBot   = rowY + car.h + 5;

          // AABB (Axis-Aligned Bounding Box) overlap test:
          // Two rectangles overlap only if NONE of these conditions is true:
          //   frog is completely to the left, right, above, or below the car
          if (charLeft < carRight && charRight > carLeft &&
              charTop  < carBot   && charBot   > carTop) {
            // ── HIT! ──────────────────────────────────────────────
            self.invincible = 90; // ~1.5 seconds of invincibility after the hit
            if (callbacks.onTime) callbacks.onTime(-5); // subtract 5 seconds from the timer
            self.showPop(self.charX, self.charY - 30, '-5s 💥');
            // Teleport frog back to start
            self.charCol = 5; self.charRow = 6;
            self.charX   = self.charCol * CELL_W + CELL_W / 2;
            self.charY   = self.charRow * CELL_H + CELL_H / 2;
          }
        });
      }

      // ── Redraw everything ──────────────────────────────────────
      this.draw(time);
    },

    // ── [COLORS] Draw static row backgrounds (called once in create) ─
    // Draws coloured stripes for each row type, plus road/goal decoration
    drawBg: function () {
      var g = this.bgGfx;
      for (var row = 0; row < ROWS; row++) {
        var y    = row * CELL_H;        // top Y of this row in pixels
        var type = ROW_TYPES[row];      // 'goal', 'road', 'grass', or 'start'
        g.fillStyle(ROW_COLOR[type]);
        g.fillRect(0, y, W, CELL_H);   // fill the entire row with its base colour

        if (type === 'road') {
          // White dashed centre line running horizontally through the row
          g.fillStyle(0xffffff, 0.35);
          for (var mx = 0; mx < W; mx += 40) {
            g.fillRect(mx, y + CELL_H / 2 - 1, 24, 2); // short white dash every 40px
          }
          // Dark kerb strips at the top and bottom edges of the road lane
          g.fillStyle(0x424242, 0.5);
          g.fillRect(0, y,              W, 4); // top kerb
          g.fillRect(0, y + CELL_H - 4, W, 4); // bottom kerb
        }

        if (type === 'goal') {
          // Alternating zebra-crossing pattern (every other column is lighter)
          g.fillStyle(0xffffff, 0.2);
          for (var zx = 0; zx < W; zx += CELL_W) {
            if (Math.floor(zx / CELL_W) % 2 === 0) { // every even column
              g.fillRect(zx, 0, CELL_W, CELL_H);
            }
          }
        }

        if (type === 'grass') {
          // Subtle vertical grass-blade texture (thin strips spaced 16px apart)
          g.fillStyle(0x43a047, 0.4);
          for (var gx = 0; gx < W; gx += 16) {
            g.fillRect(gx, y + 4, 4, CELL_H - 8); // small vertical rectangle
          }
        }
      }
    },

    // ── Draw all dynamic objects every frame (cars + frog) ────────
    draw: function (time) {
      var g    = this.dynGfx;
      var self = this;
      g.clear(); // erase everything from the previous frame

      // ── [CARS] Draw each car ──────────────────────────────────
      this.cars.forEach(function (car) {
        var y = car.row * CELL_H + 6; // top Y of the car (6px margin from row top)

        // Car body (rounded rectangle in the car's colour)
        g.fillStyle(car.color);
        g.fillRoundedRect(car.x, y, car.w, car.h, 7);

        // Two windows (light blue, proportional to car width)
        g.fillStyle(0xbbdefb, 0.85);
        var ww = car.w * 0.33; // each window is 33% of the car's width
        g.fillRoundedRect(car.x + 5,              y + 4, ww,  car.h * 0.52, 3); // front window
        g.fillRoundedRect(car.x + car.w - ww - 5, y + 4, ww,  car.h * 0.52, 3); // rear window

        // Two wheels (dark circles, slightly below the car body)
        g.fillStyle(0x212121);
        g.fillCircle(car.x + 10,         y + car.h + 2, 7); // front wheel
        g.fillCircle(car.x + car.w - 10, y + car.h + 2, 7); // rear wheel

        // Headlight on the leading end (direction-dependent)
        // car.dir === 1 means moving right, so headlight is on the right side
        g.fillStyle(0xfff176, 0.9);
        var lx = car.dir === 1 ? car.x + car.w - 4 : car.x; // right end or left end
        g.fillRect(lx, y + 4, 4, 8); // small yellow rectangle
      });

      // ── [CHAR] Draw the frog (flash on/off when invincible) ────
      // Every 6 frames the frog alternates between visible and invisible
      // Math.floor(invincible/6) % 2 === 1 is true on alternate 6-frame windows
      var flash = this.invincible > 0 && Math.floor(this.invincible / 6) % 2 === 1;
      if (!flash) this.drawCharacter(g, this.charX, this.charY, time);
    },

    // ── [CHAR] Draw the frog character at position (cx, cy) ──────
    // POLISH: change r for a bigger/smaller frog; change colours below
    drawCharacter: function (g, cx, cy, time) {
      var r = 17; // body radius — POLISH: larger = chubbier frog

      // Circular body
      g.fillStyle(0x66bb6a);          // POLISH: change for different frog colour (medium green)
      g.fillCircle(cx, cy, r);
      g.lineStyle(2, 0x388e3c);
      g.strokeCircle(cx, cy, r);     // darker green outline

      // White eyes (two circles on top of the head)
      g.fillStyle(0xffffff);
      g.fillCircle(cx - 7, cy - 8, 6); // left eye white
      g.fillCircle(cx + 7, cy - 8, 6); // right eye white

      // Dark pupils
      g.fillStyle(0x1a237e); // very dark blue
      g.fillCircle(cx - 6, cy - 8, 3); // left pupil
      g.fillCircle(cx + 6, cy - 8, 3); // right pupil

      // Small white eye-shine highlights
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(cx - 5, cy - 9, 1.2); // left shine
      g.fillCircle(cx + 7, cy - 9, 1.2); // right shine

      // Smile arc (curved line in the lower part of the face)
      g.lineStyle(2, 0x2e7d32);
      g.beginPath();
      // arc(centre_x, centre_y, radius, start_angle, end_angle, anticlockwise, step)
      // 0.1 to π-0.1 draws the lower half of a circle (a smile shape)
      g.arc(cx, cy + 5, 7, 0.1, Math.PI - 0.1, false, 0.02);
      g.strokePath();

      // Back feet: two ellipses splayed out to the sides
      // They bob up and down slightly using a sine wave for a "breathing" feel
      var bob = Math.sin(time * 0.008) * 2;
      g.fillStyle(0x4caf50);
      g.fillEllipse(cx - 21, cy + 8 + bob, 20, 10); // left foot
      g.fillEllipse(cx + 21, cy + 8 + bob, 20, 10); // right foot
    },

    // ── [POP] Floating feedback text ─────────────────────────────
    // Creates a Phaser Text that floats upward and fades out
    showPop: function (x, y, text) {
      var isNeg = text.charAt(0) === '-'; // penalty text starts with '-'
      var pop   = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif', fontSize: '20px', fontStyle: 'bold',
        color: isNeg ? '#ff5252' : '#00e676', // red for penalty, bright green for bonus
        stroke: '#ffffff', strokeThickness: 3
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({
        targets: pop, y: y - 45, alpha: 0, duration: 800, ease: 'Power2',
        onComplete: function () { pop.destroy(); } // clean up when animation ends
      });
    },

    // ── Cleanup DOM event listeners when the scene is stopped ────
    // IMPORTANT: must remove listeners to prevent them stacking up across game restarts
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

  // Create and return the Phaser.Game that runs CrossyScene
  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'crossyCanvas', // injects canvas INSIDE platformer-wrap so buttons overlay correctly
    width:  W, height: H,
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    scene:  CrossyScene,
    audio:  { noAudio: true }
  });
}

// ── Public API ────────────────────────────────────────────────────
// Wraps the game so it can be controlled with CrossyGame.start() / .stop()
var CrossyGame = (function () {
  var game = null; // holds the running Phaser.Game, or null if stopped

  function start(words, cbs) {
    stop(); // always destroy the previous game before starting a new one
    setTimeout(function () { game = createCrossyGame(words, cbs); }, 60);
  }

  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }

  return { start: start, stop: stop };
}());
