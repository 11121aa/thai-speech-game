// ============================================================
//  MATCHING GAME — Phaser 3  (Flip-card memory game)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Max pairs, canvas size              (~line 16)
//    [LAYOUT]  Card size, padding, grid offsets    (~line 20)
//    [BACK]    Card back colour                    (~drawBack)
//    [FRONT]   Card front colour per type          (~drawFront)
//    [MATCH]   Match / mismatch highlight colour   (~checkMatch)
//    [POP]     Score pop style                     (~showPop)
// ============================================================
//  How the game works:
//    - Cards are laid out face-down on a grid
//    - Each word has TWO cards: one showing the EMOJI, one showing the THAI WORD
//    - Tap any face-down card to flip it over
//    - Tap a second card — if they belong to the same word → correct match!
//    - Correct match → pronunciation practice modal opens
//    - Wrong match → both cards flip back face-down
//    - A live stopwatch (HUD "⏱" pill) counts up from the moment the
//      round starts; match all pairs to finish — the goal is speed, not
//      points, so the final elapsed time is shown/saved instead of a score
// ============================================================

// createMatchingGame is called with:
//   words     = array of word objects { word, emoji, reading, id, ... }
//   callbacks = { onPractice, onFinish(elapsedMs), onElapsed(seconds) }
function createMatchingGame(words, callbacks) {

  // ── [TUNE] Numbers you can change ────────────────────────────
  var MAX_PAIRS = 8;     // maximum number of word pairs on the grid (≤ words.length)
  var W = 800, H = 500;  // canvas size in pixels

  // ── [LAYOUT] Card grid dimensions ────────────────────────────
  var COLS   = 4;    // how many cards per row
  var CARD_W = 170;  // card width in pixels  — POLISH: wider = easier to read
  var CARD_H = 105;  // card height in pixels — POLISH: taller = more room for emoji
  var PAD    = 12;   // gap between cards in pixels

  // Calculate the left offset so the entire grid is centred horizontally
  var OFFSET_X = (W - COLS * (CARD_W + PAD) + PAD) / 2;
  var OFFSET_Y = 24; // top margin before the first row of cards

  // ── Scene class ───────────────────────────────────────────────
  var MatchScene = new Phaser.Class({
    Extends: Phaser.Scene,

    // initialize() — set up starting values before the scene runs
    initialize: function () {
      Phaser.Scene.call(this, { key: 'matching' }); // register scene

      this.cards        = [];   // array of all card objects on the grid
      this.flipped      = [];   // cards currently face-up waiting for a pair check (max 2)
      this.matchedPairs = 0;    // how many pairs have been matched so far
      this.totalPairs   = 0;    // total pairs to match (set in create)
      this.locked       = false; // true while a flip animation is in progress (blocks new taps)
      this.startTime    = 0;    // this.time.now at round start — drives the live stopwatch
      this.lastSecShown  = -1;  // last whole-second value sent to the HUD (avoids redundant DOM writes)
      this.finished      = false; // true once all pairs are matched (stops the stopwatch)
    },

    preload: function () {
      this.load.audio('FlipCard',  'soundeffect/FlipCard.mp3');
      this.load.audio('WrongSFX',  'soundeffect/WrongSFX.mp3');
      this.load.audio('CorrectSFX','soundeffect/CorrectSFX.mp3');

      // [ILLUSTRATIONS] Preload a real picture for any word in this
      // session's pool that has one: the word's own uploaded image takes
      // priority (keyed by id — more correct than text, since word text
      // isn't guaranteed unique), falling back to the legacy generated-
      // illustration manifest (keyed by word text, for older words that
      // predate the upload feature). Words with neither keep the emoji
      // fallback (checked via texture-existence in create()).
      var n = Math.min(MAX_PAIRS, words.length);
      words.slice(0, n).forEach(function (w) {
        if (w.image_url) {
          this.load.image('img_' + w.id, w.image_url);
        } else {
          var url = Illustrations.get(w.word);
          if (url) this.load.image('ill_' + w.word, url);
        }
      }, this);
    },

    // create() — runs once when the scene starts; builds the card grid
    create: function () {
      var self = this;

      // ── Build the deck: cap the word list and create pairs ───────
      var n    = Math.min(MAX_PAIRS, words.length); // use at most MAX_PAIRS words
      var pool = words.slice(0, n);                  // take the first n words
      this.totalPairs = pool.length;

      // For each word, create TWO card data objects:
      //   type = 'emoji' → shows the picture side
      //   type = 'word'  → shows the Thai text side
      var deck = [];
      pool.forEach(function (w) {
        deck.push({ type: 'emoji', w: w });
        deck.push({ type: 'word',  w: w });
      });

      // Shuffle the deck using the Fisher-Yates algorithm
      // (swaps each card with a random earlier card, working backwards)
      for (var i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = deck[i]; deck[i] = deck[j]; deck[j] = t; // swap
      }

      // ── Draw the background ────────────��──────────────────────────
      // 20 horizontal gradient bands from off-white at the top to near-white at the bottom
      var ca = this.cache.audio;
      this.sfxFlip    = ca.exists('FlipCard')   ? this.sound.add('FlipCard',   { volume: 0.6  }) : null;
      this.sfxWrong   = ca.exists('WrongSFX')   ? this.sound.add('WrongSFX',   { volume: 0.7  }) : null;
      this.sfxCorrect = ca.exists('CorrectSFX') ? this.sound.add('CorrectSFX', { volume: 0.75 }) : null;

      var bg = this.add.graphics();
      for (var b = 0; b < 20; b++) {
        var tb = b / 20;
        var r  = Math.round(Phaser.Math.Linear(240, 255, tb));
        var g  = Math.round(Phaser.Math.Linear(244, 248, tb));
        var bv = Math.round(Phaser.Math.Linear(248, 252, tb));
        bg.fillStyle(Phaser.Display.Color.GetColor(r, g, bv));
        bg.fillRect(0, b * (H / 20), W, H / 20 + 1);
      }

      // ── Build one Phaser Container per card ───────────────────────
      // A Container is a Phaser group that can be scaled/moved as one unit.
      // By setting the container's position to the card centre, tweening
      // container.scaleX 1→0→1 creates a realistic flip animation around the centre axis.
      deck.forEach(function (cardData, i) {
        var col = i % COLS;                          // which column (0 to COLS-1)
        var row = Math.floor(i / COLS);              // which row (0, 1, 2, ...)
        var cx  = OFFSET_X + col * (CARD_W + PAD) + CARD_W / 2; // centre X of this card
        var cy  = OFFSET_Y + row * (CARD_H + PAD) + CARD_H / 2; // centre Y of this card

        var container = self.add.container(cx, cy); // create container at card centre

        // ── Graphics layer inside the container ──────────────────────
        // All coordinates inside the container are relative to its centre (0,0)
        var gfx = self.add.graphics();
        container.add(gfx);

        // ── Word/emoji label (shown on the front face) ───────────────
        var isBig  = cardData.type === 'emoji'; // emoji cards show a large emoji
        // [ILLUSTRATIONS] Use the real picture if this word has one and it
        // loaded successfully; otherwise fall back to the emoji text, same
        // as before.
        var imgKey = isBig ? 'img_' + cardData.w.id : null;
        var illKey = isBig ? 'ill_' + cardData.w.word : null;
        var pictureKey = (imgKey && self.textures.exists(imgKey)) ? imgKey
          : (illKey && self.textures.exists(illKey)) ? illKey : null;
        var label;
        if (pictureKey) {
          label = self.add.image(0, 8, pictureKey).setOrigin(0.5, 0.5);
          var maxW = CARD_W - 30, maxH = CARD_H - 30;
          label.setScale(Math.min(maxW / label.width, maxH / label.height));
          label.setVisible(false);
        } else {
          // The word's own emoji field can be auto-set equal to its word
          // text when it has no picture (see wordLabel() in management.html)
          // — the 'word' card right next to this one already shows that
          // same text, so falling through to it here would just print the
          // word twice instead of showing a distinct picture-side icon.
          var wEmoji = (cardData.w.emoji && cardData.w.emoji !== cardData.w.word) ? cardData.w.emoji : '🔸';
          label = self.add.text(
            0, isBig ? 8 : 2,
            isBig ? wEmoji : cardData.w.word,
            {
              fontFamily: 'Prompt, sans-serif',
              fontSize:   isBig ? '34px' : '17px', // bigger font for emoji cards
              fontStyle:  'bold',
              color:      '#2b2438'
            }
          ).setOrigin(0.5, 0.5).setVisible(false); // hidden until the card is face-up
        }
        container.add(label);

        // ── Question mark (shown on the back face) ───────────────────
        var qmark = self.add.text(0, 0, '❓', { fontSize: '30px' })
          .setOrigin(0.5, 0.5); // visible by default (card starts face-down)
        container.add(qmark);

        // ── Card data object ───────���─────────────────────────────────
        var card = {
          data:      cardData,   // { type: 'emoji'|'word', w: wordObject }
          container: container,  // the Phaser Container (used for flip tween)
          gfx:       gfx,        // the Graphics inside the container (card background)
          label:     label,      // the Text showing emoji or word
          qmark:     qmark,      // the ❓ text on the back
          faceUp:    false,      // current state: false = face-down, true = face-up
          matched:   false       // true once this card has been matched
        };
        self.drawBack(card); // draw the initial face-down style
        self.cards.push(card);
      });

      // ── Tap handler: detect which card was tapped ─────────────────
      // Phaser's input system fires 'pointerdown' with the pointer's x/y position
      this.input.on('pointerdown', function (ptr) {
        if (self.locked) return; // block taps during flip animations
        self.handleTap(ptr.x, ptr.y);
      });

      // Start the stopwatch — HUD "⏱" pill counts up live via update()
      this.startTime = this.time.now;

      // ── Hint text at the bottom ───────────────────────────────────
      this.add.text(W / 2, H - 16,
        'แตะไพ่เพื่อพลิก — จับคู่ภาพ 🖼️ กับ คำ 📝  |  จับคู่ให้ครบให้เร็วที่สุด!', {
          fontFamily: 'Prompt, sans-serif',
          fontSize: '13px', color: '#999'
        }).setOrigin(0.5, 1);
    },

    // ── [BACK] Draw the face-down style of a card ─────────────────
    // Called when a card is initialised, or after a mismatch flip-back
    drawBack: function (card) {
      var g = card.gfx;
      g.clear(); // erase previous drawing
      g.fillStyle(0x2ec4b6); // teal background — POLISH: change for different back colour
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12); // centred on container
      g.lineStyle(2.5, 0x13726a);
      g.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12); // dark border
      card.qmark.setVisible(true);  // show the ❓
      card.label.setVisible(false); // hide the word/emoji
    },

    // ── [FRONT] Draw the face-up style of a card ───���─────────────
    // Called mid-flip, after scaleX reaches 0 and before it grows back to 1
    drawFront: function (card) {
      var g = card.gfx;
      g.clear();
      // POLISH: emoji cards are warm yellow; word cards are cool blue
      var fill   = card.data.type === 'emoji' ? 0xfef3c7 : 0xe0f2fe;
      var stroke = card.data.type === 'emoji' ? 0xf59e0b : 0x0ea5e9;
      g.fillStyle(fill);
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
      g.lineStyle(2.5, stroke);
      g.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
      card.qmark.setVisible(false); // hide ❓
      card.label.setVisible(true);  // show word or emoji
    },

    // ── Hit test: find the card the player tapped ─────────────────
    // mx, my = pointer position in the scene
    handleTap: function (mx, my) {
      // A pair is already flipped and waiting on checkMatch() — ignore
      // further taps. Without this, spam-tapping a 3rd/4th card in the
      // brief window before the 2nd card's flip animation finishes (this.locked
      // isn't set until then) pushes extra cards into `flipped`, so the
      // `flipped.length === 2` check in flipCard() never fires again and
      // the round gets stuck with no match ever being checked.
      if (this.flipped.length >= 2) return;
      for (var i = 0; i < this.cards.length; i++) {
        var card = this.cards[i];
        if (card.faceUp || card.matched) continue; // skip cards that are already face-up or matched
        // Check if the tap landed within the card's bounding box
        var dx = mx - card.container.x;
        var dy = my - card.container.y;
        if (Math.abs(dx) < CARD_W / 2 && Math.abs(dy) < CARD_H / 2) {
          this.flipCard(card, true); // flip this card face-up
          return; // only flip one card per tap
        }
      }
    },

    // ── Flip animation ─────────────────────────────────────────────
    // toFront = true → flip to face-up; false → flip back to face-down
    // The animation tweens container.scaleX:
    //   1 → 0  (card narrows to a line — midpoint of the flip)
    //   0 ��� 1  (card widens back out, now showing the other face)
    flipCard: function (card, toFront) {
      var self = this;
      card.faceUp = toFront;
      if (this.sfxFlip) this.sfxFlip.play(); // play on every flip (face-up and face-down)
      if (toFront) {
        this.flipped.push(card); // add to the "waiting" list
        // Lock out further taps the instant a 2nd card is flipped, rather
        // than waiting for its flip animation to finish — closes the spam-
        // tap window described in handleTap() above.
        if (this.flipped.length >= 2) this.locked = true;
      }

      // First half of the flip: scale down to 0 (card disappears edge-on)
      this.tweens.add({
        targets:  card.container,
        scaleX:   0,
        duration: 110,
        ease:     'Linear',
        onComplete: function () {
          // At the midpoint, switch the graphics to the new face
          if (toFront) self.drawFront(card);
          else         self.drawBack(card);

          // Second half of the flip: scale back up to 1 (card reappears showing new face)
          self.tweens.add({
            targets:  card.container,
            scaleX:   1,
            duration: 110,
            ease:     'Linear',
            onComplete: function () {
              // Once fully flipped, check if we now have 2 face-up cards to compare
              if (toFront && self.flipped.length === 2) self.checkMatch();
            }
          });
        }
      });
    },

    // ── [MATCH] Check if the two flipped cards are a pair ─────────
    // Called automatically when 2 cards are face-up
    checkMatch: function () {
      var self = this;
      var a = this.flipped[0]; // first flipped card
      var b = this.flipped[1]; // second flipped card
      this.flipped = []; // clear the waiting list immediately
      this.locked  = true; // block new taps until we finish the match/mismatch logic

      // A correct match means: same word id AND different types (one emoji + one word)
      var isMatch = a.data.w.id === b.data.w.id && a.data.type !== b.data.type;

      if (isMatch) {
        // ── CORRECT MATCH ─────────────────────────────────────────
        if (this.sfxCorrect) this.sfxCorrect.play();
        a.matched = b.matched = true; // mark both cards as permanently matched

        // Dim matched cards so the remaining cards stand out
        this.tweens.add({ targets: [a.container, b.container], alpha: 0.55, duration: 280 });

        // Show a green success pop between the two cards
        this.showPop(
          (a.container.x + b.container.x) / 2,
          Math.min(a.container.y, b.container.y) - CARD_H / 2 - 10,
          '✅ จับคู่ได้!'
        );

        this.matchedPairs++;

        // Open the pronunciation practice modal for this word
        callbacks.onPractice(a.data.w, null, function () {
          self.locked = false; // allow tapping again after modal closes
          // If all pairs are matched, end the game — pass the total elapsed
          // time (ms) so the finish screen/leaderboard show speed, not score.
          if (self.matchedPairs >= self.totalPairs) {
            self.finished = true;
            callbacks.onFinish(self.time.now - self.startTime);
          }
        });

      } else {
        // ── WRONG MATCH — flip both cards back, no practice ──
        if (this.sfxWrong) this.sfxWrong.play();
        // Keep locked=true the whole time (600ms pause + 220ms animation)
        // so a fast tap can't sneak in mid-animation
        this.time.delayedCall(600, function () {
          // Kill any conflicting tweens before starting the flip-back
          self.tweens.killTweensOf(a.container);
          self.tweens.killTweensOf(b.container);
          a.container.scaleX = 1; // reset in case a tween left it mid-scale
          b.container.scaleX = 1;
          self.flipCard(a, false);
          self.flipCard(b, false);
          // Unlock only after the flip animation (110+110 = 220ms) completes
          self.time.delayedCall(240, function () { self.locked = false; });
        });
      }
    },

    // ── Stopwatch — pushes the live elapsed whole-seconds count to the
    // shared HUD "⏱" pill via callbacks.onElapsed, throttled to once per
    // second so it isn't writing to the DOM every single frame.
    update: function () {
      if (this.finished) return;
      var elapsedSec = Math.floor((this.time.now - this.startTime) / 1000);
      if (elapsedSec !== this.lastSecShown) {
        this.lastSecShown = elapsedSec;
        callbacks.onElapsed(elapsedSec);
      }
    },

    // ── [POP] Floating feedback text ─────────────────────────────
    // Creates a Phaser Text that floats upward and fades out
    showPop: function (x, y, text) {
      var isDeduc = text.charAt(0) === '-'; // deductions start with '-'
      var pop = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif',
        fontSize:   isDeduc ? '16px' : '22px', // smaller for the frequent -100 deductions
        fontStyle:  'bold',
        color:      isDeduc ? '#e74c3c' : '#27ae60', // red for deductions, green for matches
        stroke: '#ffffff', strokeThickness: 3
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({
        targets: pop, y: y - 50, alpha: 0, duration: 900, ease: 'Power2',
        onComplete: function () { pop.destroy(); }
      });
    }
  });

  // Create and return the Phaser.Game that runs MatchScene
  return new Phaser.Game({
    type:            Phaser.AUTO,
    parent:          'matchingGame',
    width:           W,
    height:          H,
    backgroundColor: '#f0f4f8',
    scale:           { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, autoRound: true },
    scene:           MatchScene
  });
}

// ── Public API ────────────────────────────��───────────────────────
// Wraps the game so it can be controlled with MatchingGame.start() / .stop()
var MatchingGame = (function () {
  var game = null; // holds the running Phaser.Game, or null if stopped

  function start(words, cbs) {
    stop(); // always destroy the previous game before starting a new one
    setTimeout(function () { game = createMatchingGame(words, cbs); }, 60);
  }

  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }

  return { start: start, stop: stop };
}());
