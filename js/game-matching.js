// ============================================================
//  MATCHING GAME — Phaser 3 Scene
// ============================================================
//  POLISH GUIDE (search for the label):
//    [TUNE]    Max pairs, canvas size              (~line 15)
//    [LAYOUT]  Card size, padding, grid offsets    (~line 20)
//    [BACK]    Card back colour                    (~drawBack)
//    [FRONT]   Card front colour per type          (~drawFront)
//    [MATCH]   Match / mismatch highlight colour   (~checkMatch)
//    [POP]     Score pop style                     (~showPop)
// ============================================================

function createMatchingGame(words, callbacks) {

  // ── [TUNE] ────────────────────────────────────────────────
  var MAX_PAIRS = 8;      // maximum word pairs on the grid
  var W = 800, H = 500;

  // ── [LAYOUT] Card grid ────────────────────────────────────
  var COLS     = 4;
  var CARD_W   = 170;     // card width  — POLISH: wider = more readable
  var CARD_H   = 105;     // card height — POLISH: taller = bigger emoji
  var PAD      = 12;      // gap between cards
  var OFFSET_X = (W - COLS * (CARD_W + PAD) + PAD) / 2;
  var OFFSET_Y = 24;

  // ── Scene ─────────────────────────────────────────────────
  var MatchScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'matching' });
      this.cards        = [];
      this.flipped      = [];
      this.matchedPairs = 0;
      this.totalPairs   = 0;
      this.locked       = false;
    },

    create: function () {
      var self = this;

      // Build deck: each word → one 'emoji' card + one 'word' card
      var n     = Math.min(MAX_PAIRS, words.length);
      var pool  = words.slice(0, n);
      this.totalPairs = pool.length;

      var deck = [];
      pool.forEach(function (w) {
        deck.push({ type: 'emoji', w: w });
        deck.push({ type: 'word',  w: w });
      });
      for (var i = deck.length - 1; i > 0; i--) { // Fisher-Yates shuffle
        var j = Math.floor(Math.random() * (i + 1));
        var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
      }

      // Background gradient bands
      var bg = this.add.graphics();
      for (var b = 0; b < 20; b++) {
        var tb = b / 20;
        var r = Math.round(Phaser.Math.Linear(240, 255, tb));
        var g = Math.round(Phaser.Math.Linear(244, 248, tb));
        var bv = Math.round(Phaser.Math.Linear(248, 252, tb));
        bg.fillStyle(Phaser.Display.Color.GetColor(r, g, bv));
        bg.fillRect(0, b * (H / 20), W, H / 20 + 1);
      }

      // Build Phaser containers (one per card)
      deck.forEach(function (cardData, i) {
        var col = i % COLS;
        var row = Math.floor(i / COLS);
        var cx  = OFFSET_X + col * (CARD_W + PAD) + CARD_W / 2;
        var cy  = OFFSET_Y + row * (CARD_H + PAD) + CARD_H / 2;

        var container = self.add.container(cx, cy);

        // Graphics layer (card shape drawn relative to container centre)
        var gfx = self.add.graphics();
        container.add(gfx);

        // Label text (hidden until face-up)
        var isBig = cardData.type === 'emoji';
        var label = self.add.text(0, isBig ? 8 : 2,
          isBig ? (cardData.w.emoji || '🔸') : cardData.w.word,
          {
            fontFamily: 'Prompt, sans-serif',
            fontSize:   isBig ? '34px' : '17px',
            fontStyle:  'bold',
            color:      '#2b2438'
          }
        ).setOrigin(0.5, 0.5).setVisible(false);
        container.add(label);

        // Permanent ❓ text shown while face-down
        var qmark = self.add.text(0, 0, '❓', { fontSize: '30px' })
          .setOrigin(0.5, 0.5);
        container.add(qmark);

        var card = {
          data: cardData,
          container: container,
          gfx: gfx,
          label: label,
          qmark: qmark,
          faceUp: false,
          matched: false
        };
        self.drawBack(card);
        self.cards.push(card);
      });

      // Tap handler — check which card was hit
      this.input.on('pointerdown', function (ptr) {
        if (self.locked) return;
        self.handleTap(ptr.x, ptr.y);
      });

      // Hint text at bottom
      this.add.text(W / 2, H - 16, 'แตะไพ่เพื่อพลิก — จับคู่ภาพ 🖼️ กับ คำ 📝', {
        fontFamily: 'Prompt, sans-serif',
        fontSize: '13px', color: '#999'
      }).setOrigin(0.5, 1);
    },

    // ── [BACK] Card back ──────────────────────────────────────
    drawBack: function (card) {
      var g = card.gfx;
      g.clear();
      g.fillStyle(0x2ec4b6);           // POLISH: change for different back colour
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
      g.lineStyle(2.5, 0x13726a);
      g.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
      card.qmark.setVisible(true);
      card.label.setVisible(false);
    },

    // ── [FRONT] Card front ────────────────────────────────────
    drawFront: function (card) {
      var g = card.gfx;
      g.clear();
      // POLISH: change colours — emoji cards are warm yellow, word cards are cool blue
      var fill   = card.data.type === 'emoji' ? 0xfef3c7 : 0xe0f2fe;
      var stroke = card.data.type === 'emoji' ? 0xf59e0b : 0x0ea5e9;
      g.fillStyle(fill);
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
      g.lineStyle(2.5, stroke);
      g.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
      card.qmark.setVisible(false);
      card.label.setVisible(true);
    },

    // ── Hit test ─────────────────────────────────────────────
    handleTap: function (mx, my) {
      for (var i = 0; i < this.cards.length; i++) {
        var card = this.cards[i];
        if (card.faceUp || card.matched) continue;
        var dx = mx - card.container.x, dy = my - card.container.y;
        if (Math.abs(dx) < CARD_W / 2 && Math.abs(dy) < CARD_H / 2) {
          this.flipCard(card, true);
          return;
        }
      }
    },

    // ── Flip animation ────────────────────────────────────────
    flipCard: function (card, toFront) {
      var self = this;
      card.faceUp = toFront;
      if (toFront) this.flipped.push(card);

      this.tweens.add({
        targets:  card.container,
        scaleX:   0,
        duration: 110,
        ease:     'Linear',
        onComplete: function () {
          if (toFront) self.drawFront(card);
          else         self.drawBack(card);
          self.tweens.add({
            targets:  card.container,
            scaleX:   1,
            duration: 110,
            ease:     'Linear',
            onComplete: function () {
              if (toFront && self.flipped.length === 2) self.checkMatch();
            }
          });
        }
      });
    },

    // ── [MATCH] Match / mismatch logic ───────────────────────
    checkMatch: function () {
      var self = this;
      var a = this.flipped[0], b = this.flipped[1];
      this.flipped = [];
      this.locked = true;

      var isMatch = a.data.w.id === b.data.w.id && a.data.type !== b.data.type;

      if (isMatch) {
        a.matched = b.matched = true;
        // POLISH: change tint for matched highlight
        this.tweens.add({ targets: [a.container, b.container], alpha: 0.55, duration: 280 });
        callbacks.onPoints(10);   // [TUNE] points per match
        this.showPop((a.container.x + b.container.x) / 2,
                     Math.min(a.container.y, b.container.y) - CARD_H / 2 - 10, '+10 ✨');
        this.matchedPairs++;
        callbacks.onPractice(a.data.w, null, function () {
          self.locked = false;
          if (self.matchedPairs >= self.totalPairs) callbacks.onFinish();
        });
      } else {
        // Brief delay then flip both back and practice first card
        this.time.delayedCall(500, function () {
          self.flipCard(a, false);
          self.flipCard(b, false);
          callbacks.onPractice(a.data.w, null, function () {
            self.locked = false;
          });
        });
      }
    },

    // ── [POP] Floating score text ─────────────────────────────
    showPop: function (x, y, text) {
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif',
        fontSize:   '22px', fontStyle: 'bold',
        color:      '#ff9f1c', stroke: '#ffffff', strokeThickness: 4
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({
        targets: pop, y: y - 50, alpha: 0, duration: 900, ease: 'Power2',
        onComplete: function () { pop.destroy(); }
      });
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'matchingGame',
    width:  W,
    height: H,
    scale:  { mode: Phaser.Scale.NONE },
    scene:  MatchScene,
    audio:  { noAudio: true }
  });
}

// Public API
var MatchingGame = (function () {
  var game = null;
  function start(words, cbs) {
    stop();
    setTimeout(function () { game = createMatchingGame(words, cbs); }, 60);
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }
  return { start: start, stop: stop };
}());
