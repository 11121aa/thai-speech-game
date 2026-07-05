// ============================================================
//  AIRPLANE GAME — Phaser 3  (Flappy-Bird style)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Gravity, flap strength, speed   (~line 18)
//    [SKY]     Sky / ground colours            (~drawBg)
//    [CLOUDS]  Cloud count & shape             (~create / drawCloud)
//    [PLANE]   Plane colours & shape           (~drawPlane)
//    [BUBBLE]  Bubble size, colours            (~spawnBubble / drawBubble)
//    [POP]     Score pop style                 (~showPop)
// ============================================================
//  How the game works:
//    - The plane falls due to gravity every frame
//    - Tap (click / touch) to flap upward
//    - Word bubbles float from right to left
//    - Fly into a bubble → pronunciation practice modal opens
//    - Complete all words (fill the progress bar) → game ends
// ============================================================

// createAirplaneGame is called with:
//   words     = array of word objects { word, emoji, reading, ... }
//   callbacks = { onPoints, onPractice, onFinish, onTime }
function createAirplaneGame(words, callbacks) {

  // ── [TUNE] Numbers you can change to adjust feel ─────────────
  var GRAVITY     =  0.19;  // downward pull each frame — higher = heavier plane
  var FLAP_VY     = -7.5;   // upward speed boost when the player taps — more negative = stronger flap
  var BUBBLE_SPD  =  2.4;   // how fast bubbles scroll left (px per frame)
  var TOTAL_PROG  = 2400;   // total "distance" to travel before the game ends (finish condition)
  var CLOUD_COUNT =  5;     // how many clouds are on screen at once
  var W = 800, H = 380;     // canvas size in pixels
  var GROUND_Y = H - 50;    // Y position of the ground strip (measured from top)
  var PLANE_X  = 130;       // fixed horizontal position of the plane (world scrolls, plane stays)

  // ── Scene class ───────────────────────────────────────────────
  var AirScene = new Phaser.Class({
    Extends: Phaser.Scene, // inherit all standard Phaser scene behaviour

    // initialize() — sets up starting values before the scene runs
    initialize: function () {
      Phaser.Scene.call(this, { key: 'airplane' }); // register this scene

      this.isPaused = false;  // true when the practice modal is open (game freezes)
      this.planeY   = H / 2;  // plane starts vertically centred
      this.planeVY  = 0;      // vertical velocity (positive = falling down)
      this.progress = 0;      // how far the player has flown (increases every frame)
      this.wordIdx  = 0;      // index into the words array — cycles through all words
      this.bubbles  = [];     // array of active bubble objects on screen
      this.clouds   = [];     // array of cloud objects in the background
    },

    // create() — runs once when the scene starts; sets up everything
    create: function () {
      var self = this; // save reference so inner callbacks can access the scene

      // ── Graphics layers ─────────────────────────────────────────
      // bgGfx is drawn once (static sky + ground)
      // dynGfx is cleared and redrawn every frame (plane, bubbles, clouds)
      this.bgGfx  = this.add.graphics();
      this.dynGfx = this.add.graphics();

      this.drawBg(); // paint the static sky gradient and ground

      // ── Progress bar at the bottom of the screen ─────────────────
      // The bar fills from left to right as the player flies forward
      this.progTrack = this.add.graphics(); // the grey background track
      this.progFill  = this.add.graphics(); // the teal fill that grows over time
      this.progTrack.fillStyle(0xcccccc);
      this.progTrack.fillRect(20, H - 14, W - 40, 7); // draw the grey track once
      // A flag emoji marks the end of the bar (the goal)
      this.progFlagText = this.add.text(20, H - 6, '🏁', { fontSize: '14px' }).setOrigin(0, 1);

      // ── [CLOUDS] Create background clouds with random properties ──
      for (var i = 0; i < CLOUD_COUNT; i++) {
        this.clouds.push({
          x:   60 + Math.random() * W * 1.8,          // random starting X across the screen
          y:   25 + Math.random() * 110,               // random height in the upper sky
          rw:  65 + Math.random() * 70,                // random half-width (bigger = fluffier)
          spd: 0.55 + Math.random() * 0.6              // random drift speed (clouds move at different rates)
        });
      }

      // ── Tap / click to flap ──────────────────────────────────────
      // Every time the player clicks or taps, apply the flap velocity upward
      this.input.on('pointerdown', function () {
        if (!self.isPaused) {
          self.planeVY = FLAP_VY; // set upward speed (negative Y = up)
        }
      });

      // ── On-screen hint text (auto-fades after 3 seconds) ─────────
      this.hintText = this.add.text(W / 2, 45, 'แตะหน้าจอเพื่อบินขึ้น! ✈️', {
        fontFamily: 'Prompt, sans-serif',
        fontSize:   '18px',
        fontStyle:  'bold',
        color:      '#2b2438',
        backgroundColor: '#ffffffaa',
        padding:    { x: 10, y: 5 }
      }).setOrigin(0.5).setDepth(10);
      this.time.delayedCall(3000, function () { // after 3 seconds...
        self.tweens.add({ targets: self.hintText, alpha: 0, duration: 600,
          onComplete: function () { self.hintText.destroy(); self.hintText = null; }
        });
      });

      // Pre-spawn 2 bubbles so the player isn't greeted with an empty screen
      this.spawnBubble();
      this.spawnBubble();
    },

    // ── [SKY] Draw the static background ─────────────────────────
    // Called once in create() — sky gradient bands + solid ground strip
    drawBg: function () {
      var g     = this.bgGfx;
      var bands = 20; // divide the sky into 20 horizontal colour bands for a smooth gradient
      for (var i = 0; i < bands; i++) {
        var t  = i / bands; // t = 0.0 at the top, ~1.0 at the bottom
        // Mix from a lighter top colour to a slightly darker/whiter bottom colour
        var r  = Math.round(Phaser.Math.Linear(135, 197, t));
        var gv = Math.round(Phaser.Math.Linear(206, 232, t));
        var b  = Math.round(Phaser.Math.Linear(235, 247, t));
        g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b));
        g.fillRect(0, i * (GROUND_Y / bands), W, GROUND_Y / bands + 1);
      }
      // Green ground strip at the bottom
      g.fillStyle(0x5dba5d);
      g.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    },

    // ── Spawn a word bubble ────────────────────────────────────────
    // [BUBBLE] Change the radius (32) or shift the Y range to adjust placement
    spawnBubble: function () {
      if (!words.length) return; // do nothing if there are no words to practice

      // Pick the next word (cycles back to start when all words are used)
      var word = words[this.wordIdx++ % words.length];

      // Place the bubble at a random height within the safe flying zone
      var y = 70 + Math.random() * (GROUND_Y - 150);

      // Create the word text label (positioned below the bubble centre)
      var label = this.add.text(W + 60, y + 16, word.word, {
        fontFamily: 'Prompt, sans-serif',
        fontSize:   '11px',
        fontStyle:  'bold',
        color:      '#2b2438'
      }).setOrigin(0.5, 0).setDepth(3);

      // Create the emoji label (positioned above the word text)
      var emojiTxt = this.add.text(W + 60, y - 6, word.emoji || '🔸', {
        fontSize: '17px'
      }).setOrigin(0.5, 1).setDepth(3);

      // Store the bubble as an object in the bubbles array
      this.bubbles.push({
        x:     W + 60,    // start just off the right edge of the screen
        y:     y,         // vertical centre of the bubble
        hit:   false,     // true once the plane has touched this bubble
        word:  word,      // the word object (used when opening the practice modal)
        label: label,     // reference to the Phaser Text for the word
        emoji: emojiTxt   // reference to the Phaser Text for the emoji
      });
    },

    // ── Per-frame update ──────────────────────────────────────────
    // Runs ~60 times per second; handles all movement and collision
    update: function () {
      if (this.isPaused) return; // freeze everything when modal is open
      var self = this;

      // ── Apply gravity and update the plane's vertical position ───
      this.planeVY += GRAVITY;       // gravity increases downward speed each frame
      this.planeY  += this.planeVY;  // move the plane by its current vertical velocity

      // Clamp the plane to stay within the screen (bounce off ceiling and ground)
      if (this.planeY > GROUND_Y - 28) { this.planeY = GROUND_Y - 28; this.planeVY = 0; }
      if (this.planeY < 18)            { this.planeY = 18;            this.planeVY = 0; }

      // ── Advance the progress counter ─────────────────────────────
      this.progress += 2; // progress increases by 2 units each frame
      if (this.progress >= TOTAL_PROG) {
        callbacks.onFinish(); // player has reached the end of the level
        return;               // stop further updates this frame
      }

      // ── Move clouds slowly to the left ───────────────────────────
      this.clouds.forEach(function (c) {
        c.x -= c.spd; // each cloud has its own random speed
        if (c.x < -c.rw - 40) c.x = W + c.rw; // wrap back to the right when off-screen
      });

      // ── Scroll all bubbles left and auto-spawn new ones ──────────
      var activeBubbles = this.bubbles.filter(function (b) { return !b.hit; }); // count unhit bubbles
      this.bubbles.forEach(function (b) {
        if (!b.hit) {
          b.x       -= BUBBLE_SPD; // move the bubble data leftward
          b.label.x  = b.x;        // sync the word text position
          b.emoji.x  = b.x;        // sync the emoji position
        }
      });

      // Remove bubbles that have scrolled fully off the left side
      this.bubbles = this.bubbles.filter(function (b) {
        if (b.x < -80) {
          b.label.destroy(); // clean up Phaser Text objects to avoid memory leaks
          b.emoji.destroy();
          return false; // remove from array
        }
        return true; // keep
      });

      // Keep at least 3 active bubbles on screen at all times
      if (activeBubbles.length < 3) this.spawnBubble();

      // ── Collision: check if the plane has flown into a bubble ────
      for (var i = this.bubbles.length - 1; i >= 0; i--) {
        var b = this.bubbles[i];
        if (b.hit) continue; // skip bubbles that were already collected

        // Calculate distance between plane centre and bubble centre
        var dx = PLANE_X - b.x;
        var dy = this.planeY - b.y;
        // If distance < 46px (circle radius check: dx²+dy² < r²), it's a hit
        if (dx * dx + dy * dy < 46 * 46) {
          b.hit = true;
          b.label.destroy(); // remove the label from screen immediately on hit
          b.emoji.destroy();

          this.isPaused = true; // freeze the game while the modal is open
          var bRef = b; // save bubble reference for the callback closure
          callbacks.onPractice(b.word, null, function () {
            self.isPaused = false; // unfreeze when player closes the modal
            // Remove the collected bubble from the array
            self.bubbles = self.bubbles.filter(function (u) { return u !== bRef; });
            self.spawnBubble(); // immediately add a new bubble to replace it
          });
          break; // only process one collision per frame
        }
      }

      // ── Redraw everything and update the progress bar ─────────────
      this.draw();
      this.updateProgress();
    },

    // ── Redraw the progress bar fill based on current progress ─────
    updateProgress: function () {
      // Calculate how wide the fill should be (0 = empty, W-40 = full)
      var pw = Math.min(1, this.progress / TOTAL_PROG) * (W - 40);
      this.progFill.clear();
      this.progFill.fillStyle(0x2ec4b6); // teal fill colour
      this.progFill.fillRect(20, H - 14, pw, 7);
      this.progFlagText.x = 20 + pw; // flag emoji follows the tip of the bar
    },

    // ── Draw every visible game object ─────────────────────────────
    draw: function () {
      var g = this.dynGfx;
      g.clear(); // erase everything drawn last frame

      // Draw clouds first (furthest back visually)
      this.clouds.forEach(function (c) { this.drawCloud(g, c); }, this);

      // Draw unhit bubbles
      this.bubbles.forEach(function (b) { if (!b.hit) this.drawBubble(g, b); }, this);

      // Draw the plane on top of everything
      this.drawPlane(g, PLANE_X, this.planeY, this.planeVY);
    },

    // ── [CLOUDS] Draw one fluffy cloud ─────────────────────────────
    // Each cloud is 3 overlapping ellipses for a layered, puffy look
    drawCloud: function (g, c) {
      g.fillStyle(0xffffff, 0.85); // white, slightly transparent
      g.fillEllipse(c.x,               c.y,      c.rw * 2,    50); // main body
      g.fillEllipse(c.x - c.rw * 0.36, c.y + 10, c.rw * 1.1, 40); // left bump
      g.fillEllipse(c.x + c.rw * 0.3,  c.y + 8,  c.rw,       36); // right bump
    },

    // ── [BUBBLE] Draw one word bubble ──────────────────────────────
    // White circle with a teal border — POLISH: change fillStyle or radius (32)
    drawBubble: function (g, b) {
      g.fillStyle(0xffffff, 0.93);   // nearly opaque white fill
      g.lineStyle(2.5, 0x2ec4b6);    // teal border
      g.fillCircle(  b.x, b.y, 32); // filled circle, radius 32
      g.strokeCircle(b.x, b.y, 32); // outline on top
    },

    // ── [PLANE] Draw the airplane ─────────────────────────────────
    // The plane tilts up/down based on its current vertical velocity (vy)
    // Because Phaser Graphics can't rotate-around-a-point natively,
    // we rotate each part manually using cos/sin math
    drawPlane: function (g, x, y, vy) {
      // tilt angle: positive vy (falling) tilts nose down, negative (rising) tilts up
      // Phaser.Math.Clamp limits the angle to ±0.45 radians so it doesn't over-rotate
      var tilt = Phaser.Math.Clamp(vy * 0.05, -0.45, 0.45);
      var cos  = Math.cos(tilt); // pre-calculate rotation values
      var sin  = Math.sin(tilt);

      // Helper function: draw a rotated rectangle relative to the plane's centre (x, y)
      // rx, ry = offset from plane centre; rw, rh = rectangle size; color = fill colour
      function rRect(rx, ry, rw, rh, color) {
        g.fillStyle(color);
        // Rotate each of the 4 corners using 2D rotation formula:
        //   new_x = rx*cos - ry*sin + x
        //   new_y = rx*sin + ry*cos + y
        var corners = [
          [rx,      ry     ],
          [rx + rw, ry     ],
          [rx + rw, ry + rh],
          [rx,      ry + rh]
        ].map(function (p) {
          return { x: x + p[0]*cos - p[1]*sin,
                   y: y + p[0]*sin + p[1]*cos };
        });
        g.fillPoints(corners, true); // draw as a filled polygon
      }

      // White oval fuselage (the main body of the plane)
      g.fillStyle(0xffffff);
      g.fillEllipse(
        x + -0 * cos - 0 * sin, // centre x (no offset)
        y + -0 * sin + 0 * cos, // centre y (no offset)
        84, 28
      );

      rRect(5, -2, -17, -24, 0x2ec4b6);   // upper wing (teal) — POLISH: change first colour arg
      rRect(-30, 2, -12, -14, 0x2ec4b6);  // tail fin (teal)

      // Round window
      g.fillStyle(0x87ceeb); // light blue (sky colour)
      g.fillEllipse(x + 12*cos, y + 12*sin, 16, 12);

      rRect(42, -8, 12, 8, 0xff9f1c); // engine nozzle (orange) — POLISH: change for engine colour
    },

    // ── [POP] Floating score text ─────────────────────────────────
    // Creates a Phaser Text that floats upward and fades out
    showPop: function (x, y, text) {
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif',
        fontSize:   '20px',
        fontStyle:  'bold',
        color:      '#ff9f1c',
        stroke:     '#ffffff',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(10);
      // Tween: move upward 45px while fading to invisible, then destroy
      this.tweens.add({
        targets: pop, y: y - 45, alpha: 0, duration: 800, ease: 'Power2',
        onComplete: function () { pop.destroy(); }
      });
    }
  });

  // Create and return the Phaser.Game that runs AirScene
  return new Phaser.Game({
    type:   Phaser.AUTO,       // use WebGL if available, otherwise Canvas
    parent: 'airplaneGame',    // HTML div id to inject the canvas into
    width:  W,
    height: H,
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    scene:  AirScene,
    audio:  { noAudio: true }  // no sound effects
  });
}

// ── Public API ────────────────────────────────────────────────────
// Wraps the game so it can be controlled with AirplaneGame.start() / .stop()
// The IIFE keeps `game` private — nothing outside can accidentally overwrite it
var AirplaneGame = (function () {
  var game = null; // holds the running Phaser.Game, or null if stopped

  function start(words, cbs) {
    stop(); // destroy any previous game before starting a new one
    // 60ms delay lets the browser finish DOM cleanup before Phaser creates the canvas
    setTimeout(function () { game = createAirplaneGame(words, cbs); }, 60);
  }

  function stop() {
    if (game) {
      try { game.destroy(true); } catch (e) {} // true = also remove the canvas from the DOM
      game = null;
    }
  }

  return { start: start, stop: stop };
}());
