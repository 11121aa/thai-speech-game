// ============================================================
//  FLASHCARD GAME — Phaser 3  (Picture → pick-the-word quiz)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Max cards, points per card          (~line 15)
//    [CARD]    Card colours and corner radius      (~buildCard)
//    [CHOICE]  Answer-button layout/colours        (~buildChoices)
//    [ANIM]    Card slide distance                 (~advanceCard)
// ============================================================
//  How the game works:
//    - Cards slide in from the right one by one
//    - Each card shows a large picture/emoji and THREE word choices
//      below it — only one matches the picture
//    - Tap the correct word → pronunciation practice modal opens →
//      points awarded → next card slides in
//    - Tap a wrong word → it flashes red and locks out (try again)
//    - No hints, no "listen" button — the word itself is the answer
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

  // ── [CARD] Card visual dimensions ──────────────────────────────
  var CARD_W = 420;  // card width in pixels
  var CARD_H = 190;  // card height in pixels
  var CARD_X = W / 2; // horizontal centre of the card when it's on screen
  var CARD_Y = 140;   // vertical centre of the card
  var CARD_R = 20;    // corner rounding radius — POLISH: larger = rounder corners

  // ── [CHOICE] Answer-button layout ────────────────────────────
  var CHOICE_Y  = 320; // Y position of the row of 3 answer buttons
  var CHOICE_W  = 230; // each answer button's width
  var CHOICE_H  = 64;  // each answer button's height
  var CHOICE_GAP = 20; // horizontal gap between answer buttons

  // ── Scene class ─────────────────────────────────────────────────
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
      this.canInteract = true;  // false while an answer/practice modal is being resolved
      this.choiceBtns  = [];    // the 3 answer-button objects for the current card
    },

    // preload() — decide the pool here (not create()) so the exact same
    // shuffled/capped order can be used to preload illustrations for it
    preload: function () {
      this.load.audio('CorrectSFX', 'soundeffect/CorrectSFX.mp3');
      this.load.audio('WrongSFX',   'soundeffect/WrongSFX.mp3');

      this.pool = words.slice(); // copy the words array so we don't modify the original
      this.pool.sort(function () { return Math.random() - 0.5; }); // random shuffle
      if (this.pool.length > MAX_CARDS) this.pool = this.pool.slice(0, MAX_CARDS); // cap

      // [ILLUSTRATIONS] Preload a real picture for any pool word that has
      // one; words without one keep the emoji fallback (checked via
      // texture-existence in showCard()).
      this.pool.forEach(function (w) {
        var url = Illustrations.get(w.word);
        if (url) this.load.image('ill_' + w.word, url);
      }, this);
    },

    // create() — runs once when the scene starts; sets up the card and buttons
    create: function () {
      // this.pool was already shuffled + capped in preload()
      var ca = this.cache.audio;
      this.sfxCorrect = ca.exists('CorrectSFX') ? this.sound.add('CorrectSFX', { volume: 0.75 }) : null;
      this.sfxWrong   = ca.exists('WrongSFX')   ? this.sound.add('WrongSFX',   { volume: 0.7  }) : null;

      // ── Pastel background ──────────────────────────────────────────
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

      // ── The 3 answer buttons below the card ────────────────────────
      this.buildChoices();

      // ── Show the first card ─────────────────────────────────────────
      this.showCard();
    },

    // ── Build the picture card's graphics/text objects
    // All positions inside the container use (0,0) = container centre
    buildCard: function (cont) {
      // ── [CARD] Card background graphic ────────────────────────────
      var gfx = this.add.graphics();
      gfx.fillStyle(0xffffff);
      gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_R);
      gfx.lineStyle(3, 0x2ec4b6);
      gfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_R);
      cont.add(gfx);
      cont.cardGfx = gfx; // save reference in case we need to access it later

      // ── [TEXT] Emoji — large, fills most of the card
      var emojiTxt = this.add.text(0, 0, '', {
        fontSize: '72px' // POLISH: increase for larger emoji
      }).setOrigin(0.5, 0.5);
      cont.add(emojiTxt);
      cont.emojiTxt = emojiTxt; // save so showCard() can update its text
      cont.emojiImg = null; // [ILLUSTRATIONS] set/destroyed per-card in showCard()

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

    // ── [CHOICE] Build the 3 answer-button placeholders below the card.
    // Their fill/text are rewritten per-card in layoutChoices(); this just
    // creates the reusable Graphics + Text objects and click handling.
    buildChoices: function () {
      var self = this;
      var totalW = 3 * CHOICE_W + 2 * CHOICE_GAP;
      var startX = W / 2 - totalW / 2 + CHOICE_W / 2;

      this.choiceBtns = [0, 1, 2].map(function (i) {
        var x = startX + i * (CHOICE_W + CHOICE_GAP);
        var gfx = self.add.graphics();
        var txt = self.add.text(x, CHOICE_Y, '', {
          fontFamily: 'Prompt, sans-serif',
          fontSize: '20px', fontStyle: 'bold', color: '#2b2438'
        }).setOrigin(0.5, 0.5);

        // The actual tap target is a separate invisible Zone sized to the
        // full drawn button (CHOICE_W×CHOICE_H) rather than the text
        // object itself — a Text's default hit area is only its tight
        // glyph bounding box, which is much smaller than the visible
        // button and easy to miss, especially for short words.
        var zone = self.add.zone(x, CHOICE_Y, CHOICE_W, CHOICE_H)
          .setOrigin(0.5, 0.5)
          .setInteractive({ useHandCursor: true });

        var btn = { x: x, gfx: gfx, txt: txt, zone: zone, word: null, disabled: false };
        self.drawChoiceBtn(btn, 0xffffff, 0xd8d3e8); // default idle style

        zone.on('pointerdown', function () {
          if (!self.canInteract || btn.disabled) return;
          self.onChoicePicked(btn);
        });
        zone.on('pointerover', function () { if (!btn.disabled) self.drawChoiceBtn(btn, 0xf5f3ff, 0x8a5cf6); });
        zone.on('pointerout',  function () { if (!btn.disabled) self.drawChoiceBtn(btn, 0xffffff, 0xd8d3e8); });

        return btn;
      });
    },

    // Redraws one answer button's background in the given fill/stroke colour
    drawChoiceBtn: function (btn, fill, stroke) {
      btn.gfx.clear();
      btn.gfx.fillStyle(fill);
      btn.gfx.fillRoundedRect(btn.x - CHOICE_W / 2, CHOICE_Y - CHOICE_H / 2, CHOICE_W, CHOICE_H, 12);
      btn.gfx.lineStyle(3, stroke);
      btn.gfx.strokeRoundedRect(btn.x - CHOICE_W / 2, CHOICE_Y - CHOICE_H / 2, CHOICE_W, CHOICE_H, 12);
    },

    // ── Populate the card with the current word + 3 answer choices, slide it in
    showCard: function () {
      // If we've gone through all the words in the pool, the game is finished
      if (this.cardIdx >= this.pool.length) {
        callbacks.onFinish();
        return;
      }

      this.currentWord = this.pool[this.cardIdx]; // get the word for this card
      var cont = this.cardCont;

      // [ILLUSTRATIONS] Use the real picture if this word has one and it
      // loaded successfully; otherwise fall back to the emoji text.
      if (cont.emojiImg) { cont.emojiImg.destroy(); cont.emojiImg = null; }
      var illKey = 'ill_' + this.currentWord.word;
      if (this.textures.exists(illKey)) {
        cont.emojiTxt.setVisible(false);
        var img = this.add.image(0, 0, illKey).setOrigin(0.5, 0.5);
        var maxW = 220, maxH = 150;
        img.setScale(Math.min(maxW / img.width, maxH / img.height));
        cont.add(img);
        cont.emojiImg = img;
      } else {
        // A word's emoji field can be auto-set equal to its own word text
        // when it has no picture — showing that here would leak the
        // answer directly, since the choice buttons below show word text too.
        var wEmoji = (this.currentWord.emoji && this.currentWord.emoji !== this.currentWord.word) ? this.currentWord.emoji : '🔸';
        cont.emojiTxt.setVisible(true);
        cont.emojiTxt.setText(wEmoji);
      }

      // Update the "remaining cards" badge
      var remaining = this.pool.length - this.cardIdx - 1;
      cont.badgeTxt.setText(remaining > 0 ? remaining + ' ใบ' : 'ใบสุดท้าย!');

      this.layoutChoices(); // pick 3 words (1 correct + 2 distractors) and assign to buttons

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

    // ── [CHOICE] Picks 2 random distractor words (distinct from the
    // correct word and from each other), shuffles all 3 into the answer
    // buttons in a random order, and resets each button to its idle style.
    layoutChoices: function () {
      var self = this;
      var correct = this.currentWord;

      var others = words.filter(function (w) { return w.word !== correct.word; });
      others.sort(function () { return Math.random() - 0.5; });
      var distractors = others.slice(0, 2);

      var choices = [correct].concat(distractors);
      choices.sort(function () { return Math.random() - 0.5; }); // random button order

      this.choiceBtns.forEach(function (btn, i) {
        var w = choices[i];
        btn.word     = w || null;
        btn.disabled = !w; // fewer than 3 distinct words available — disable the spare slot
        btn.txt.setText(w ? w.word : '');
        btn.txt.setAlpha(w ? 1 : 0);
        self.drawChoiceBtn(btn, 0xffffff, 0xd8d3e8);
      });
    },

    // ── Called when the player taps one of the 3 answer buttons ───
    onChoicePicked: function (btn) {
      var self = this;
      var isCorrect = btn.word && btn.word.word === this.currentWord.word;

      if (!isCorrect) {
        // Wrong pick: flash red, lock this button out, let them try again
        if (this.sfxWrong) this.sfxWrong.play();
        this.drawChoiceBtn(btn, 0xfee2e2, 0xef4444);
        btn.disabled = true;
        btn.txt.setAlpha(0.5);
        this.tweens.add({
          targets: btn.txt, x: btn.x - 8, duration: 60, yoyo: true, repeat: 2
        });
        return;
      }

      // Correct pick: lock all buttons, flash green, then open the
      // pronunciation practice modal before awarding points and advancing.
      this.canInteract = false;
      if (this.sfxCorrect) this.sfxCorrect.play();
      this.drawChoiceBtn(btn, 0xdcfce7, 0x22c55e);

      callbacks.onPractice(this.currentWord, null, function () {
        self.onPracticeDone();
      });
    },

    // ── Called after the practice modal closes ────────────────────
    // Awards points, then moves to the next card
    onPracticeDone: function () {
      var self = this;
      callbacks.onPoints(PTS_PER_CARD); // award points for completing this card
      this.doneCount++;                 // increment completed count
      this.cardIdx++;                   // advance to the next card in the pool
      this.updateProgress();

      // Brief pause so the green "correct" flash is visible before advancing
      this.time.delayedCall(500, function () {
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
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, autoRound: true },
    scene:  FcScene,
    audio:  { noAudio: false }
  });
}

// ── Public API ──────────────────────────────────────────────────────
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
