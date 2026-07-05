// ============================================================
//  FLYING GAME — Phaser 3  (Flappy Bird style)
// ============================================================
//  [TUNE]    Gravity, flap, pipe speed & gap       (~constants)
//  [PIPES]   Pipe colours, cap size                (~drawPipe)
//  [BIRD]    Bird colours & shape                  (~drawBird)
//  [BUBBLE]  Word bubble appearance                (~drawBubble)
// ============================================================
//  How the game works:
//    - Tap / Space to flap upward; gravity pulls the bird down
//    - Fly through the gap between pipe pairs to score +1 ⭐
//    - Every 5th gap has a golden word bubble in the center
//    - Fly INTO the bubble → practice modal → +5 ⭐ bonus
//    - Hit a pipe, the ceiling, or the ground → die
//    - Tap again after death to restart
// ============================================================

function createAirplaneGame(words, callbacks) {

  // ── [TUNE] ──────────────────────────────────────────────────
  var GRAVITY    = 0.32;   // downward pull per frame
  var FLAP_VY    = -7.0;   // upward boost on tap
  var SCROLL_SPD = 2.4;    // pipe scroll speed (px/frame)
  var PIPE_GAP   = 150;    // vertical gap height (px)
  var PIPE_DIST  = 240;    // horizontal distance between pipe pairs (px)
  var PIPE_W     = 60;     // pipe width (px)
  var BIRD_X     = 140;    // fixed horizontal position of the bird
  var BIRD_R     = 13;     // bird hitbox radius
  var WORD_EVERY = 5;      // every Nth pipe has a word bubble
  var W = 800, H = 480;
  var GROUND_Y   = H - 58;

  var FlapScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'flappy' });
      // Raw game state (no Phaser objects here — those live in create/doRestart)
      this.state        = 'waiting'; // 'waiting' | 'playing' | 'dead'
      this.birdY        = H / 2;
      this.birdVY       = 0;
      this.pipes        = [];
      this.clouds       = [];
      this.score        = 0;
      this.pipeCount    = 0;
      this.wordIdx      = 0;
      this.frameCount   = 0;
      this.scrollOff    = 0;
      this.isPaused     = false;
      this.immuneFrames = 0; // >0 = invincible (flashes, can't die from pipes/ground)
    },

    create: function () {
      var self = this;
      this.birdY = H / 2;

      // Static background drawn once
      this.bgGfx = this.add.graphics().setDepth(0);
      this.drawBg();

      // Cloud layer
      this.cloudGfx = this.add.graphics().setDepth(1);
      for (var i = 0; i < 5; i++) {
        this.clouds.push({
          x:   Math.random() * W,
          y:   20 + Math.random() * 100,
          rw:  55 + Math.random() * 60,
          spd: 0.38 + Math.random() * 0.5
        });
      }

      // Main dynamic layer (pipes, bird, ground, bubbles)
      this.gfx = this.add.graphics().setDepth(2);

      // Score (top centre)
      this.scoreTxt = this.add.text(W / 2, 18, '0', {
        fontFamily: 'Prompt, sans-serif',
        fontSize: '46px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#1a1a2e', strokeThickness: 6
      }).setOrigin(0.5, 0).setDepth(10);

      // Wait screen
      this.waitTxt = this.add.text(W / 2, H / 2 - 18,
        '🐦  แตะเพื่อเริ่มเกม!', {
          fontFamily: 'Prompt, sans-serif', fontSize: '28px', fontStyle: 'bold',
          color: '#ffffff', stroke: '#2b2438', strokeThickness: 5,
          backgroundColor: '#00000044', padding: { x: 18, y: 10 }
        }).setOrigin(0.5).setDepth(10);

      // Dead screen elements (hidden until death)
      this.deadPanel   = this.add.graphics().setDepth(9);
      this.deadTitle   = this.add.text(W / 2, H / 2 - 58, '💀  เกมจบแล้ว!', {
        fontFamily: 'Prompt, sans-serif', fontSize: '38px', fontStyle: 'bold',
        color: '#e74c3c', stroke: '#ffffff', strokeThickness: 5
      }).setOrigin(0.5).setDepth(10).setVisible(false);
      this.deadScore   = this.add.text(W / 2, H / 2 + 2, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '26px', fontStyle: 'bold',
        color: '#2b2438', stroke: '#ffffff', strokeThickness: 4
      }).setOrigin(0.5).setDepth(10).setVisible(false);
      this.deadRestart = this.add.text(W / 2, H / 2 + 56, '🔄  แตะเพื่อเล่นใหม่', {
        fontFamily: 'Prompt, sans-serif', fontSize: '20px', fontStyle: 'bold',
        color: '#ffffff', stroke: '#2b2438', strokeThickness: 4,
        backgroundColor: '#2b243899', padding: { x: 16, y: 8 }
      }).setOrigin(0.5).setDepth(10).setVisible(false);

      // Input — tap to flap or restart
      this.input.on('pointerdown', function () { self.onTap(); });
      this.input.keyboard.on('keydown-SPACE', function () { self.onTap(); });
    },

    onTap: function () {
      if (this.isPaused) return;
      if (this.state === 'waiting') {
        this.state = 'playing';
        this.birdVY = FLAP_VY;
        this.waitTxt.setVisible(false);
      } else if (this.state === 'playing') {
        this.birdVY = FLAP_VY;
      } else if (this.state === 'dead') {
        this.doRestart();
      }
    },

    doRestart: function () {
      // Destroy any live pipe labels
      this.pipes.forEach(function (p) {
        if (p.wordLabel)  p.wordLabel.destroy();
        if (p.emojiLabel) p.emojiLabel.destroy();
      });
      // Reset all state
      this.state        = 'waiting';
      this.birdY        = H / 2;
      this.birdVY       = 0;
      this.pipes        = [];
      this.score        = 0;
      this.pipeCount    = 0;
      this.wordIdx      = 0;
      this.frameCount   = 0;
      this.scrollOff    = 0;
      this.immuneFrames = 0;
      // Reset UI
      this.scoreTxt.setText('0');
      this.waitTxt.setVisible(true);
      this.deadPanel.clear();
      this.deadTitle.setVisible(false);
      this.deadScore.setVisible(false);
      this.deadRestart.setVisible(false);
    },

    // ── [SKY] Static background ──────────────────────────────────
    drawBg: function () {
      var g = this.bgGfx;
      var bands = 24;
      for (var i = 0; i < bands; i++) {
        var t  = i / bands;
        var r  = Math.round(Phaser.Math.Linear(80,  172, t));
        var gv = Math.round(Phaser.Math.Linear(168, 220, t));
        var b  = Math.round(Phaser.Math.Linear(230, 246, t));
        g.fillStyle(Phaser.Display.Color.GetColor(r, gv, b));
        g.fillRect(0, i * (GROUND_Y / bands), W, GROUND_Y / bands + 1);
      }
      // Ground — brown dirt base + grass top
      g.fillStyle(0x8d6e40); g.fillRect(0, GROUND_Y,     W, H - GROUND_Y);
      g.fillStyle(0x5cb85c); g.fillRect(0, GROUND_Y,     W, 12);
      g.fillStyle(0x4aaa4a); g.fillRect(0, GROUND_Y + 2, W, 5);
    },

    spawnPipe: function () {
      this.pipeCount++;
      var isWord = (this.pipeCount % WORD_EVERY === 0) && words.length > 0;

      var minY = PIPE_GAP / 2 + 48;
      var maxY = GROUND_Y - PIPE_GAP / 2 - 28;
      var gapY = minY + Math.random() * (maxY - minY);

      var wordObj = null, wordLabel = null, emojiLabel = null;
      if (isWord) {
        wordObj = words[this.wordIdx++ % words.length];
        wordLabel = this.add.text(W + 90, gapY + 14, wordObj.word, {
          fontFamily: 'Prompt, sans-serif', fontSize: '13px', fontStyle: 'bold',
          color: '#2b2438'
        }).setOrigin(0.5, 0).setDepth(5);
        emojiLabel = this.add.text(W + 90, gapY - 12, wordObj.emoji || '🔸', {
          fontSize: '20px'
        }).setOrigin(0.5, 1).setDepth(5);
      }

      this.pipes.push({
        x: W + 90,
        gapY: gapY,
        passed: false,
        wordObj: wordObj,
        wordLabel: wordLabel,
        emojiLabel: emojiLabel,
        wordHit: false
      });
    },

    killBird: function () {
      if (this.state === 'dead') return;
      this.state  = 'dead';
      this.birdVY = -3; // small bounce before falling

      // Show game-over panel
      var px = W / 2 - 195, pw = 390, py = H / 2 - 80, ph = 158;
      this.deadPanel.fillStyle(0x000000, 0.45);
      this.deadPanel.fillRect(0, 0, W, H);
      this.deadPanel.fillStyle(0xffffff, 0.94);
      this.deadPanel.fillRoundedRect(px, py, pw, ph, 18);

      this.deadTitle.setVisible(true);
      this.deadScore.setText('คะแนน: ' + this.score + ' ⭐').setVisible(true);
      this.deadRestart.setVisible(true);
    },

    update: function (time) {
      if (this.isPaused) return;
      var self = this;
      var g    = this.gfx;
      var cg   = this.cloudGfx;
      g.clear();
      cg.clear();

      // Clouds (all states)
      this.clouds.forEach(function (c) {
        c.x -= c.spd;
        if (c.x < -c.rw - 40) c.x = W + c.rw;
        cg.fillStyle(0xffffff, 0.82);
        cg.fillEllipse(c.x,               c.y,     c.rw * 2,    46);
        cg.fillEllipse(c.x - c.rw * 0.38, c.y + 9, c.rw * 1.1, 34);
        cg.fillEllipse(c.x + c.rw * 0.3,  c.y + 7, c.rw,       28);
      });

      // ── WAITING ──────────────────────────────────────────────────
      if (this.state === 'waiting') {
        this.birdY = H / 2 + Math.sin(time * 0.003) * 14;
        this.drawBird(g, time);
        this.drawGround(g);
        return;
      }

      // ── DEAD ─────────────────────────────────────────────────────
      if (this.state === 'dead') {
        this.birdVY += GRAVITY;
        this.birdY  += this.birdVY;
        if (this.birdY + BIRD_R > GROUND_Y) { this.birdY = GROUND_Y - BIRD_R; this.birdVY = 0; }
        this.pipes.forEach(function (p) { self.drawPipe(g, p); });
        this.pipes.forEach(function (p) {
          if (p.wordObj && !p.wordHit && p.wordLabel) self.drawBubble(g, p.x, p.gapY);
        });
        this.drawGround(g);
        this.drawBird(g, time);
        return;
      }

      // ── PLAYING ──────────────────────────────────────────────────

      // Spawn pipes on a regular interval
      this.frameCount++;
      var spawnEvery = Math.round(PIPE_DIST / SCROLL_SPD); // frames between pipes
      if (this.frameCount % spawnEvery === 1) this.spawnPipe();

      // Physics
      this.birdVY += GRAVITY;
      this.birdY  += this.birdVY;
      this.scrollOff    = (this.scrollOff + SCROLL_SPD) % 80;
      if (this.immuneFrames > 0) this.immuneFrames--;

      // Ceiling: bounce off gently (don't die)
      if (this.birdY - BIRD_R < 0) { this.birdY = BIRD_R; this.birdVY = 0; }

      // Ground — immune: bounce back up; not immune: die
      if (this.birdY + BIRD_R > GROUND_Y) {
        if (this.immuneFrames > 0) {
          this.birdY  = GROUND_Y - BIRD_R;
          this.birdVY = FLAP_VY * 0.55; // auto-flap when immune
        } else {
          this.killBird(); return;
        }
      }

      // Move pipes + detect score
      this.pipes.forEach(function (p) {
        p.x -= SCROLL_SPD;
        if (p.wordLabel)  p.wordLabel.x  = p.x;
        if (p.emojiLabel) p.emojiLabel.x = p.x;

        if (!p.passed && p.x + PIPE_W / 2 < BIRD_X) {
          p.passed = true;
          self.score++;
          callbacks.onPoints(1);
          self.scoreTxt.setText('' + self.score);
          self.showPop(BIRD_X, self.birdY - 34, '+1 ⭐');
        }
      });

      // Cull off-screen pipes
      this.pipes = this.pipes.filter(function (p) {
        if (p.x + PIPE_W < -10) {
          if (p.wordLabel)  p.wordLabel.destroy();
          if (p.emojiLabel) p.emojiLabel.destroy();
          return false;
        }
        return true;
      });

      // Collision
      var dead = false;
      for (var i = 0; i < this.pipes.length; i++) {
        var p  = this.pipes[i];
        var hW = PIPE_W / 2 + 2;      // horizontal half-width with small buffer
        var hG = PIPE_GAP / 2 - 3;    // vertical half-gap (shrink hitbox slightly)

        if (this.birdY + BIRD_R < p.x - hW) continue; // pipe not reached yet (wrong axis?)
        // Check horizontal overlap
        if (BIRD_X + BIRD_R > p.x - hW && BIRD_X - BIRD_R < p.x + hW) {
          // Check vertical: hit top or bottom pipe? (skip when immune)
          if (this.immuneFrames === 0 &&
              (this.birdY - BIRD_R < p.gapY - hG ||
               this.birdY + BIRD_R > p.gapY + hG)) {
            this.killBird();
            dead = true;
            break;
          }
          // Check word bubble hit (only if word pipe and not yet collected)
          if (p.wordObj && !p.wordHit) {
            var dx = BIRD_X - p.x;
            var dy = this.birdY - p.gapY;
            if (dx * dx + dy * dy < 32 * 32) {
              p.wordHit = true;
              if (p.wordLabel)  { p.wordLabel.destroy();  p.wordLabel  = null; }
              if (p.emojiLabel) { p.emojiLabel.destroy(); p.emojiLabel = null; }
              this.isPaused = true;
              callbacks.onPractice(p.wordObj, null, function () {
                self.isPaused     = false;
                self.immuneFrames = 120; // 2 s immunity after word practice
                callbacks.onPoints(5);
                self.showPop(BIRD_X, self.birdY - 50, '+5 ⭐ ออกเสียงได้!');
                self.showPop(BIRD_X, self.birdY - 20, '🛡️ คุ้มกัน!');
              });
            }
          }
        }
      }
      if (dead) return;

      // Draw
      this.pipes.forEach(function (p) { self.drawPipe(g, p); });
      this.pipes.forEach(function (p) {
        if (p.wordObj && !p.wordHit && p.wordLabel) self.drawBubble(g, p.x, p.gapY);
      });
      this.drawGround(g);
      this.drawBird(g, time);
    },

    // Scrolling ground tile pattern drawn over the static base
    drawGround: function (g) {
      var off = (this.scrollOff % 80 + 80) % 80;
      for (var gx = -off; gx < W + 80; gx += 80) {
        g.fillStyle(0x4aaa4a, 0.65);
        g.fillRect(gx,      GROUND_Y, 40, 12);
        g.fillStyle(0x5cb85c, 0.65);
        g.fillRect(gx + 40, GROUND_Y, 40, 12);
      }
    },

    // ── [PIPES] ──────────────────────────────────────────────────
    drawPipe: function (g, p) {
      var x      = p.x;
      var gapY   = p.gapY;
      var halfG  = PIPE_GAP / 2;
      var halfW  = PIPE_W / 2;
      var topH   = gapY - halfG;     // height of top pipe
      var botY   = gapY + halfG;     // top of bottom pipe
      var botH   = GROUND_Y - botY;  // height of bottom pipe

      // Word pipes are golden, regular pipes are green
      var pc  = p.wordObj ? 0xe67e22 : 0x27ae60;
      var pcd = p.wordObj ? 0xc0392b : 0x1e8449;

      // Top pipe body
      if (topH > 0) {
        g.fillStyle(pc);
        g.fillRect(x - halfW, 0, PIPE_W, topH - 15);
        g.fillStyle(pcd);
        g.fillRect(x - halfW - 7, topH - 18, PIPE_W + 14, 20); // cap
        g.fillStyle(0xffffff, 0.18);
        g.fillRect(x - halfW + 4, 0, 11, topH - 15); // highlight
      }
      // Bottom pipe body
      if (botH > 0) {
        g.fillStyle(pc);
        g.fillRect(x - halfW, botY + 15, PIPE_W, botH - 15);
        g.fillStyle(pcd);
        g.fillRect(x - halfW - 7, botY, PIPE_W + 14, 20); // cap
        g.fillStyle(0xffffff, 0.18);
        g.fillRect(x - halfW + 4, botY + 15, 11, botH - 15); // highlight
      }
    },

    // ── [BUBBLE] Word bubble in the gap center ───────────────────
    drawBubble: function (g, x, y) {
      // Outer glow
      g.fillStyle(0xffd700, 0.28);
      g.fillCircle(x, y, 38);
      // White fill with golden border
      g.fillStyle(0xfffde7, 0.95);
      g.lineStyle(3, 0xf39c12);
      g.fillCircle(x, y, 30);
      g.strokeCircle(x, y, 30);
      // Inner shimmer
      g.fillStyle(0xffec6e, 0.45);
      g.fillCircle(x, y, 20);
    },

    // ── [BIRD] Yellow cartoon bird ───────────────────────────────
    drawBird: function (g, time) {
      var x  = BIRD_X;
      var y  = this.birdY;
      var vy = this.birdVY;

      // Flash every 6 frames during immunity (same pattern as platformer)
      if (this.immuneFrames > 0 && Math.floor(this.immuneFrames / 6) % 2 === 1) return;

      // Golden shield glow when immune
      if (this.immuneFrames > 0) {
        var sa = 0.55 * (this.immuneFrames / 120);
        g.fillStyle(0xffd700, sa);
        g.fillCircle(x, y, BIRD_R + 14);
        g.lineStyle(2.5, 0xffd700, Math.min(1, sa * 2));
        g.strokeCircle(x, y, BIRD_R + 14);
      }

      // Tilt: nose down when falling, nose up briefly after flap
      var tilt     = Phaser.Math.Clamp(vy * 0.065, -0.55, 0.7);
      var cos      = Math.cos(tilt);
      var sin      = Math.sin(tilt);
      var wingFlap = Math.sin(time * 0.018) * 9;

      function rPt(lx, ly) {
        return { x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos };
      }

      // Shadow (only when near ground)
      var shadowAlpha = Math.max(0, 1 - (GROUND_Y - y) / (H * 0.6));
      if (shadowAlpha > 0.05) {
        g.fillStyle(0x000000, shadowAlpha * 0.18);
        g.fillEllipse(x, GROUND_Y - 4, 30, 8);
      }

      // Tail feathers
      var tailPts = [
        rPt(-16, -3),
        rPt(-28, -11 + tilt * 6),
        rPt(-26,  0),
        rPt(-30,  7 - tilt * 6),
        rPt(-16,  6)
      ];
      g.fillStyle(0xf9a825);
      g.fillPoints(tailPts, true);

      // Wing (flaps up/down with time)
      var wingPts = [
        rPt(-5,  -5 - wingFlap),
        rPt(-20, -18 - wingFlap),
        rPt(-24, -9  - wingFlap * 0.5),
        rPt(-7,   5)
      ];
      g.fillStyle(0xfbc02d);
      g.fillPoints(wingPts, true);

      // Body (14-point ellipse, rotated)
      var bodyPts = [];
      for (var a = 0; a < 14; a++) {
        var ang = (a / 14) * Math.PI * 2;
        bodyPts.push(rPt(Math.cos(ang) * 19, Math.sin(ang) * 14));
      }
      g.fillStyle(0xffd600);
      g.fillPoints(bodyPts, true);

      // White belly patch
      var bellyPts = [];
      for (var a2 = 0; a2 < 10; a2++) {
        var ang2 = (a2 / 10) * Math.PI * 2;
        bellyPts.push(rPt(5 + Math.cos(ang2) * 10, 2 + Math.sin(ang2) * 9));
      }
      g.fillStyle(0xfff9c4);
      g.fillPoints(bellyPts, true);

      // Beak (orange triangle)
      var beakPts = [
        rPt(15, -4),
        rPt(28,  1),
        rPt(15,  5)
      ];
      g.fillStyle(0xff6d00);
      g.fillPoints(beakPts, true);

      // Eye
      var ep = rPt(10, -7);
      g.fillStyle(0xffffff);
      g.fillCircle(ep.x, ep.y, 6.5);
      var pp = rPt(12, -6);
      g.fillStyle(0x1a1a2e);
      g.fillCircle(pp.x, pp.y, 3.8);
      var hp = rPt(13.5, -7.5);
      g.fillStyle(0xffffff);
      g.fillCircle(hp.x, hp.y, 1.5);
    },

    // ── [POP] Floating score popup ───────────────────────────────
    showPop: function (x, y, text) {
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif', fontSize: '20px', fontStyle: 'bold',
        color: '#ff9f1c', stroke: '#ffffff', strokeThickness: 3
      }).setOrigin(0.5).setDepth(15);
      this.tweens.add({
        targets: pop, y: y - 48, alpha: 0, duration: 900, ease: 'Power2',
        onComplete: function () { pop.destroy(); }
      });
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'airplaneGame',
    width:  W,
    height: H,
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    scene:  FlapScene,
    audio:  { noAudio: true }
  });
}

var AirplaneGame = (function () {
  var game = null;
  function start(words, cbs) {
    stop();
    setTimeout(function () { game = createAirplaneGame(words, cbs); }, 60);
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }
  return { start: start, stop: stop };
}());
