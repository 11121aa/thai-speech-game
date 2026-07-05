// ============================================================
//  FLASHCARD GAME — Phaser 3  (Slide-through vocabulary cards)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Max cards, points per card          (~line 15)
//    [CARD]    Card colours and corner radius      (~drawCard)
//    [TEXT]    Emoji / reading / word font sizes   (~buildCard)
//    [BTN]     Button colours and labels           (~buildButtons)
//    [ANIM]    Card slide distance                 (~advanceCard)
// ============================================================
//  How the game works:
//    - Cards slide in from the right one by one
//    - Each card shows a large EMOJI and the PRONUNCIATION (reading)
//    - "🔊 ฟังตัวอย่าง" button → plays the word aloud using TTS
//    - "🎤 พูดคำนี้!" button → opens the pronunciation practice modal
//    - After practicing, the Thai word is briefly revealed, then the next card slides in
//    - A progress bar at the top fills as you complete cards
//    - Game ends when all MAX_CARDS cards have been shown
// ============================================================

// createFlashcardGame is called with:
//   words     = array of word objects { word, emoji, reading, ... }
//   callbacks = { onPoints, onPractice, onFinish, onTime }
function createFlashcardGame(words, callbacks) {

  // ── [TUNE] Numbers you can change ────────────────────────────
  var MAX_CARDS    = 15;  // how many cards to show per session
  var PTS_PER_CARD = 10;  // points awarded for completing one card
  var W = 800, H = 460;   // canvas size in pixels

  // ── [CARD] Card visual dimensions ─────────��──────────────────
  var CARD_W = 480;  // card width in pixels
  var CARD_H = 240;  // card height in pixels
  var CARD_X = W / 2; // horizontal centre of the card when it's on screen
  var CARD_Y = 195;   // vertical centre of the card
  var CARD_R = 20;    // corner rounding radius — POLISH: larger = rounder corners

  // ── Scene class ─────────────────────���─────────────────────────
  var FcScene = new Phaser.Class({
    Extends: Phaser.Scene,

    // initialize() — set up starting values before the scene runs
    initialize: function () {
      Phaser.Scene.call(this, { key: 'flashcard' }); // register scene

      this.pool        = [];    // shuffled list of words to show
      this.cardIdx     = 0;     // index of the current card in the pool
      this.doneCount   = 0;     // how many cards the player has completed
      this.currentWord = null;  // the word object currently shown on the card
      this.cardCont    = null;  // Phaser Container holding the card graphics + text
      this.progFill    = null;  // Graphics object for the filled part of the progress bar
      this.progText    = null;  // Text object showing "done / total" counter
      this.canInteract = true;  // false while the practice modal is open (blocks button presses)
    },

    // create() — runs once when the scene starts; sets up the card and buttons
    create: function () {
      var self = this;

      // ── Shuffle the word pool and cap at MAX_CARDS ───��───────────
      this.pool = words.slice(); // copy the words array so we don't modify the original
      this.pool.sort(function () { return Math.random() - 0.5; }); // random shuffle
      if (this.pool.length > MAX_CARDS) this.pool = this.pool.slice(0, MAX_CARDS); // cap

      // ── Pastel background ───────────────���──────────────────��──────
      var bg = this.add.graphics();
      bg.fillStyle(0xf0fafa);
      bg.fillRect(0, 0, W, H);

      // ── Progress bar track (grey background strip at the very top) ─
      var track = this.add.graphics();
      track.fillStyle(0xd1d5db);
      track.fillRoundedRect(40, 14, W - 80, 10, 5); // full-width grey track

      // ── Progress fill (teal, grows as cards are completed) ─────────
      // Redrawn each time a card is completed
      this.progFill = this.add.graphics();

      // ── "done / total" counter text below the bar ─────────────────
      this.progText = this.add.text(W / 2, 36, '', {
        fontFamily: 'Prompt, sans-serif',
        fontSize: '14px', color: '#6b7280'
      }).setOrigin(0.5);

      // ── Card container: starts off the right edge, then slides in ──
      // Using a Container means all the card's children (graphics + text) move together
      this.cardCont = this.add.container(W + CARD_W, CARD_Y); // starts right off-screen
      this.buildCard(this.cardCont); // add graphics + text objects to the container

      // ── Buttons below the card ────────────────��───────────────────
      this.buildButtons();

      // ── Show the first card ────────────────���──────────────────────
      this.showCard();
    },

    // ── Build all graphics and text objects inside the card container
    // All positions inside the container use (0,0) = container centre
    buildCard: function (cont) {
      var self = this;

      // ── [CARD] Card background graphic ────────────────────────────
      var gfx = this.add.graphics();
      // White card
      gfx.fillStyle(0xffffff);
      gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_R);
      // Teal border
      gfx.lineStyle(3, 0x2ec4b6);
      gfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_R);
      // Subtle teal tint on the top half (makes it feel like a two-tone card)
      gfx.fillStyle(0xf0fdfa);
      gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H / 2, CARD_R);
      // Redraw border on top so it covers the tint's edges
      gfx.lineStyle(3, 0x2ec4b6);
      gfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_R);
      cont.add(gfx);
      cont.cardGfx = gfx; // save reference in case we need to access it later

      // ── [TEXT] Emoji — large, displayed in the upper half of the card
      var emojiTxt = this.add.text(0, -CARD_H / 2 + 56, '', {
        fontSize: '54px' // POLISH: increase for larger emoji
      }).setOrigin(0.5, 0.5);
      cont.add(emojiTxt);
      cont.emojiTxt = emojiTxt; // save so showCard() can update its text

      // ── [TEXT] Pronunciation (reading) — shown in the lower half ──
      var readingTxt = this.add.text(0, 20, '', {
        fontFamily: 'Prompt, sans-serif',
        fontSize: '26px',   // POLISH: change reading size here
        color: '#374151', fontStyle: 'bold'
      }).setOrigin(0.5, 0.5);
      cont.add(readingTxt);
      cont.readingTxt = readingTxt;

      // ��─ [TEXT] Thai word — revealed after practice, starts invisible
      var wordTxt = this.add.text(0, 70, '', {
        fontFamily: 'Prompt, sans-serif',
        fontSize: '22px',
        color: '#2ec4b6', fontStyle: 'bold'
      }).setOrigin(0.5, 0.5).setAlpha(0); // alpha 0 = fully transparent (hidden)
      cont.add(wordTxt);
      cont.wordTxt = wordTxt;

      // ── Stack badge — shows "X ใบ" remaining in the top-right corner
      var badgeTxt = this.add.text(CARD_W / 2 - 12, -CARD_H / 2 + 12, '', {
        fontFamily: 'Prompt, sans-serif',
        fontSize: '12px', color: '#9ca3af',
        backgroundColor: '#f3f4f6',
        padding: { x: 6, y: 3 }
      }).setOrigin(1, 0); // anchored to the top-right
      cont.add(badgeTxt);
      cont.badgeTxt = badgeTxt;
    },

    // ── [BTN] Build the two interactive buttons below the card ────
    buildButtons: function () {
      var self  = this;
      var BTN_Y = CARD_Y + CARD_H / 2 + 40; // Y position for both buttons (below the card)

      // ── Helper: create a rounded button with a label ──────────────
      // x          = horizontal centre of the button
      // w, h       = width and height
      // fillColor  = background colour
      // strokeColor= border colour
      // label      = button text
      // onClick    = function called when the button is clicked/tapped
      function makeBtn(x, w, h, fillColor, strokeColor, label, onClick) {
        // Draw the button background
        var gfx = self.add.graphics();
        gfx.fillStyle(fillColor);
        gfx.fillRoundedRect(x - w / 2, BTN_Y - h / 2, w, h, 10);
        gfx.lineStyle(2, strokeColor);
        gfx.strokeRoundedRect(x - w / 2, BTN_Y - h / 2, w, h, 10);

        // Text label on top of the button — this is what receives the pointer events
        var txt = self.add.text(x, BTN_Y, label, {
          fontFamily: 'Prompt, sans-serif',
          fontSize: '17px', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true }); // enable mouse cursor change on hover

        // Pointer event handlers on the text object
        txt.on('pointerdown', function () {
          if (!self.canInteract) return; // ignore clicks while modal is open
          onClick();
        });
        txt.on('pointerover',  function () { gfx.setAlpha(0.85); }); // slightly dim on hover
        txt.on('pointerout',   function () { gfx.setAlpha(1);    }); // restore on mouse-out

        return { gfx: gfx, txt: txt };
      }

      // ── [BTN] Listen button — plays the word using text-to-speech ─
      // SpeechTool.speak() is defined in js/speech.js (loaded before this file)
      this.listenBtn = makeBtn(
        W / 2 - 110, 180, 50,
        0x64748b, 0x475569,  // POLISH: change these hex colours for a different button colour
        '🔊  ฟังตัวอย่าง',
        function () {
          if (self.currentWord) SpeechTool.speak(self.currentWord.word); // read word aloud
        }
      );

      // ── [BTN] Practice button — opens the pronunciation modal ─────
      this.practiceBtn = makeBtn(
        W / 2 + 110, 180, 50,
        0xf59e0b, 0xd97706,  // POLISH: warm amber — change for different colour
        '🎤  พูดคำนี���!',
        function () {
          if (!self.currentWord) return;
          self.canInteract = false; // disable buttons while modal is open
          callbacks.onPractice(self.currentWord, null, function () {
            self.canInteract = true; // re-enable buttons when modal closes
            self.onPracticeDone();   // then advance to the next card
          });
        }
      );
    },

    // ── Populate the card with the current word and slide it in ───
    showCard: function () {
      // If we've gone through all the words in the pool, the game is finished
      if (this.cardIdx >= this.pool.length) {
        callbacks.onFinish();
        return;
      }

      this.currentWord = this.pool[this.cardIdx]; // get the word for this card
      var cont = this.cardCont;

      // Update the card's text content
      cont.emojiTxt.setText(this.currentWord.emoji || '🔸');
      cont.readingTxt.setText(this.currentWord.reading || this.currentWord.word);
      cont.wordTxt.setText(this.currentWord.word).setAlpha(0); // hide Thai word initially

      // Update the "remaining cards" badge
      var remaining = this.pool.length - this.cardIdx - 1;
      cont.badgeTxt.setText(remaining > 0 ? remaining + ' ใบ' : 'ใบสุดท้าย!');

      this.updateProgress(); // refresh the progress bar
      this.canInteract = true; // make sure buttons are enabled for this new card

      // [ANIM] Card slide-in animation: starts from the right edge, tweens to centre
      cont.x = W + CARD_W; // reset to just off the right edge
      this.tweens.add({
        targets: cont,
        x: CARD_X,          // slide to the centre position
        duration: 340,       // 340ms slide
        ease: 'Power2'       // eases out — starts fast, slows down at the end
      });
    },

    // ── Called after the practice modal closes ────────────────────
    // Awards points, reveals the Thai word, then moves to the next card
    onPracticeDone: function () {
      var self = this;
      callbacks.onPoints(PTS_PER_CARD); // award points for completing this card
      this.doneCount++;                 // increment completed count
      this.cardIdx++;                   // advance to the next card in the pool
      this.updateProgress();

      // Briefly show the Thai word (alpha fades from 0 to 1)
      this.cardCont.wordTxt.setAlpha(1);

      // After 700ms, slide the card out and bring in the next one
      this.time.delayedCall(700, function () {
        self.advanceCard();
      });
    },

    // ── [ANIM] Slide the current card out to the left, then show the next one
    advanceCard: function () {
      var self = this;
      this.tweens.add({
        targets:  this.cardCont,
        x:        -CARD_W,  // slide off the left edge
        duration: 280,
        ease:     'Power2',
        onComplete: function () {
          self.showCard(); // when the slide is done, load and slide in the next card
        }
      });
    },

    // ── Redraw the progress bar and counter text ──────────────────
    updateProgress: function () {
      // frac = fraction of cards completed (0.0 = none, 1.0 = all done)
      var frac  = this.pool.length > 0 ? this.doneCount / this.pool.length : 0;
      var fillW = Math.max(0, (W - 80) * frac); // width of the filled portion
      this.progFill.clear();
      this.progFill.fillStyle(0x2ec4b6); // teal fill
      this.progFill.fillRoundedRect(40, 14, fillW, 10, 5);
      this.progText.setText(this.doneCount + ' / ' + this.pool.length); // e.g. "3 / 15"
    }
  });

  // Create and return the Phaser.Game that runs FcScene
  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'flashcardGame', // HTML div id to inject the canvas into
    width:  W,
    height: H,
    scale:  { mode: Phaser.Scale.NONE },
    scene:  FcScene,
    audio:  { noAudio: true }
  });
}

// ── Public API ──────��─────────────────────────────────────────────
// Wraps the game so it can be controlled with FlashcardGame.start() / .stop()
var FlashcardGame = (function () {
  var game = null; // holds the running Phaser.Game, or null if stopped

  function start(words, cbs) {
    stop(); // always destroy the previous game before starting a new one
    setTimeout(function () { game = createFlashcardGame(words, cbs); }, 60);
  }

  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }

  return { start: start, stop: stop };
}());
