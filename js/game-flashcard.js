// ============================================================
//  FLASHCARD GAME — Phaser 3 Scene
// ============================================================
//  POLISH GUIDE (search for the label):
//    [TUNE]    Max cards, points per card          (~line 15)
//    [CARD]    Card colours and corner radius      (~drawCard)
//    [TEXT]    Emoji / reading / word font sizes   (~buildCard)
//    [BTN]     Button colours and labels           (~buildButtons)
//    [ANIM]    Card slide distance                 (~advanceCard)
// ============================================================

function createFlashcardGame(words, callbacks) {

  // ── [TUNE] ────────────────────────────────────────────────
  var MAX_CARDS   = 15;   // how many cards to show per session
  var PTS_PER_CARD = 10;  // [TUNE] points awarded per completed card
  var W = 800, H = 460;

  // ── [CARD] Card dimensions ────────────────────────────────
  var CARD_W  = 480;
  var CARD_H  = 240;
  var CARD_X  = W / 2;
  var CARD_Y  = 195;      // vertical centre of card
  var CARD_R  = 20;       // corner radius — POLISH: larger = rounder

  // ── Scene ─────────────────────────────────────────────────
  var FcScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'flashcard' });
      this.pool        = [];
      this.cardIdx     = 0;
      this.doneCount   = 0;
      this.currentWord = null;
      this.cardCont    = null;   // Phaser Container for the card
      this.progFill    = null;
      this.progText    = null;
      this.canInteract = true;
    },

    create: function () {
      var self = this;

      // Shuffle and cap word pool
      this.pool = words.slice();
      this.pool.sort(function () { return Math.random() - 0.5; });
      if (this.pool.length > MAX_CARDS) this.pool = this.pool.slice(0, MAX_CARDS);

      // Pastel background
      var bg = this.add.graphics();
      bg.fillStyle(0xf0fafa);
      bg.fillRect(0, 0, W, H);

      // Progress bar track
      var track = this.add.graphics();
      track.fillStyle(0xd1d5db);
      track.fillRoundedRect(40, 14, W - 80, 10, 5);

      // Progress fill (updated each card)
      this.progFill = this.add.graphics();
      this.progText = this.add.text(W / 2, 36, '', {
        fontFamily: 'Prompt, sans-serif',
        fontSize: '14px', color: '#6b7280'
      }).setOrigin(0.5);

      // Card container (starts off-screen right, slides in)
      this.cardCont = this.add.container(W + CARD_W, CARD_Y);
      this.buildCard(this.cardCont);

      // Buttons below card
      this.buildButtons();

      // Show first card
      this.showCard();
    },

    // ── Build card graphics + text inside a container ─────────
    // [TEXT] Adjust fontSize values here
    buildCard: function (cont) {
      var self = this;

      // [CARD] Card background
      var gfx = this.add.graphics();
      gfx.fillStyle(0xffffff);
      gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_R);
      gfx.lineStyle(3, 0x2ec4b6);
      gfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_R);
      gfx.fillStyle(0xf0fdfa);          // subtle teal tint at top half
      gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H / 2, CARD_R);
      // Re-draw border on top
      gfx.lineStyle(3, 0x2ec4b6);
      gfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_R);
      cont.add(gfx);
      cont.cardGfx = gfx;

      // Emoji — large, centred in top half
      var emojiTxt = this.add.text(0, -CARD_H / 2 + 56, '', {
        fontSize: '54px'      // POLISH: larger = more space for emoji
      }).setOrigin(0.5, 0.5);
      cont.add(emojiTxt);
      cont.emojiTxt = emojiTxt;

      // Reading (phonetic) text
      var readingTxt = this.add.text(0, 20, '', {
        fontFamily: 'Prompt, sans-serif',
        fontSize: '26px',     // POLISH: change reading font size
        color: '#374151', fontStyle: 'bold'
      }).setOrigin(0.5, 0.5);
      cont.add(readingTxt);
      cont.readingTxt = readingTxt;

      // Thai word — revealed after practice, starts hidden
      var wordTxt = this.add.text(0, 70, '', {
        fontFamily: 'Prompt, sans-serif',
        fontSize: '22px',
        color: '#2ec4b6', fontStyle: 'bold'
      }).setOrigin(0.5, 0.5).setAlpha(0);
      cont.add(wordTxt);
      cont.wordTxt = wordTxt;

      // Stack badge (remaining cards)
      var badgeTxt = this.add.text(CARD_W / 2 - 12, -CARD_H / 2 + 12, '', {
        fontFamily: 'Prompt, sans-serif',
        fontSize: '12px', color: '#9ca3af',
        backgroundColor: '#f3f4f6',
        padding: { x: 6, y: 3 }
      }).setOrigin(1, 0);
      cont.add(badgeTxt);
      cont.badgeTxt = badgeTxt;
    },

    // ── [BTN] Interactive buttons below the card ──────────────
    buildButtons: function () {
      var self = this;
      var BTN_Y = CARD_Y + CARD_H / 2 + 40;

      // Helper: draw a rounded button and attach pointer handlers
      function makeBtn(x, w, h, fillColor, strokeColor, label, onClick) {
        var gfx = self.add.graphics();
        gfx.fillStyle(fillColor);
        gfx.fillRoundedRect(x - w / 2, BTN_Y - h / 2, w, h, 10);
        gfx.lineStyle(2, strokeColor);
        gfx.strokeRoundedRect(x - w / 2, BTN_Y - h / 2, w, h, 10);

        var txt = self.add.text(x, BTN_Y, label, {
          fontFamily: 'Prompt, sans-serif',
          fontSize: '17px', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

        txt.on('pointerdown', function () {
          if (!self.canInteract) return;
          onClick();
        });
        txt.on('pointerover',  function () { gfx.setAlpha(0.85); });
        txt.on('pointerout',   function () { gfx.setAlpha(1); });

        return { gfx: gfx, txt: txt };
      }

      // [BTN] Listen button — calls SpeechTool TTS
      this.listenBtn = makeBtn(
        W / 2 - 110, 180, 50,
        0x64748b, 0x475569,          // POLISH: button colour
        '🔊  ฟังตัวอย่าง',
        function () {
          if (self.currentWord) SpeechTool.speak(self.currentWord.word);
        }
      );

      // [BTN] Practice button — opens practice modal
      this.practiceBtn = makeBtn(
        W / 2 + 110, 180, 50,
        0xf59e0b, 0xd97706,          // POLISH: button colour (warm amber)
        '🎤  พูดคำนี้!',
        function () {
          if (!self.currentWord) return;
          self.canInteract = false;
          callbacks.onPractice(self.currentWord, null, function () {
            self.canInteract = true;
            self.onPracticeDone();
          });
        }
      );
    },

    // ── Populate card with the current word ───────────────────
    showCard: function () {
      if (this.cardIdx >= this.pool.length) {
        callbacks.onFinish();
        return;
      }
      this.currentWord = this.pool[this.cardIdx];
      var cont = this.cardCont;

      cont.emojiTxt.setText(this.currentWord.emoji || '🔸');
      cont.readingTxt.setText(this.currentWord.reading || this.currentWord.word);
      cont.wordTxt.setText(this.currentWord.word).setAlpha(0);

      var remaining = this.pool.length - this.cardIdx - 1;
      cont.badgeTxt.setText(remaining > 0 ? remaining + ' ใบ' : 'ใบสุดท้าย!');

      this.updateProgress();
      this.canInteract = true;

      // [ANIM] Slide card in from right
      cont.x = W + CARD_W;
      this.tweens.add({
        targets: cont, x: CARD_X,
        duration: 340, ease: 'Power2'
      });
    },

    // ── Called after practice modal closes ────────────────────
    onPracticeDone: function () {
      var self = this;
      callbacks.onPoints(PTS_PER_CARD);
      this.doneCount++;
      this.cardIdx++;
      this.updateProgress();

      // Briefly reveal the Thai word, then advance
      this.cardCont.wordTxt.setAlpha(1);
      this.time.delayedCall(700, function () {
        self.advanceCard();
      });
    },

    // [ANIM] Slide current card out left, bring next in from right
    advanceCard: function () {
      var self = this;
      this.tweens.add({
        targets: this.cardCont, x: -CARD_W,
        duration: 280, ease: 'Power2',
        onComplete: function () { self.showCard(); }
      });
    },

    // ── Progress bar + counter ────────────────────────────────
    updateProgress: function () {
      var frac = this.pool.length > 0 ? this.doneCount / this.pool.length : 0;
      var fillW = Math.max(0, (W - 80) * frac);
      this.progFill.clear();
      this.progFill.fillStyle(0x2ec4b6);
      this.progFill.fillRoundedRect(40, 14, fillW, 10, 5);
      this.progText.setText(this.doneCount + ' / ' + this.pool.length);
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'flashcardGame',
    width:  W,
    height: H,
    scale:  { mode: Phaser.Scale.NONE },
    scene:  FcScene,
    audio:  { noAudio: true }
  });
}

// Public API
var FlashcardGame = (function () {
  var game = null;
  function start(words, cbs) {
    stop();
    setTimeout(function () { game = createFlashcardGame(words, cbs); }, 60);
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }
  return { start: start, stop: stop };
}());
