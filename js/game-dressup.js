// ============================================================
//  DRESS-UP GAME — Phaser 3  (Pronounce a word to unlock an outfit piece)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Points per item, avatar position     (~line 15)
//    [SLOTS]   Clothing slots + colours              (~SLOTS array)
//    [AVATAR]  How the avatar is drawn               (~drawAvatar)
//    [CARD]    Item card colours and size            (~buildCard)
//    [BTN]     Button colours and labels             (~buildButtons)
// ============================================================
//  How the game works:
//    - A plain avatar stands on the left; a card on the right shows
//      the next outfit piece to unlock (hat, shirt, pants, shoes, bag)
//    - "🔊 ฟังตัวอย่าง" button → plays the word's recorded pronunciation
//      clip if it has one (hidden otherwise — no TTS fallback)
//    - "🎤 พูดคำนี้!" button → opens the pronunciation practice modal
//    - After practicing, the piece animates onto the avatar and the
//      next card slides in
//    - Game ends once all 5 pieces are equipped
// ============================================================

// createDressupGame is called with:
//   words     = array of word objects { word, emoji, reading, ... }
//   callbacks = { onPoints, onPractice, onFinish, onTime }
function createDressupGame(words, callbacks) {

  // ── [TUNE] Numbers you can change ────────────────────────────
  var PTS_PER_ITEM = 20;  // points awarded per unlocked outfit piece
  var W = 800, H = 500;   // canvas size in pixels
  var AX = 190, AY = 280; // avatar anchor point (base of the torso)

  // ── [SLOTS] Outfit pieces, in unlock order ─────────────────────
  // color is a Phaser hex number used to fill that piece on the avatar
  var SLOTS = [
    { key:'hat',   label:'หมวก',     emoji:'🎩', color:0xE74C3C },
    { key:'shirt', label:'เสื้อ',     emoji:'👕', color:0x2EC4B6 },
    { key:'pants', label:'กางเกง',   emoji:'👖', color:0x3B4A6B },
    { key:'shoes', label:'รองเท้า',  emoji:'👟', color:0xF0A500 },
    { key:'bag',   label:'กระเป๋า',  emoji:'👜', color:0xB1568C }
  ];

  // ── [CARD] Card visual dimensions ──────────────────────────────
  var CARD_W = 340, CARD_H = 260;
  var CARD_X = 580, CARD_Y = 210;
  var CARD_R = 20;

  var DsScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'dressup' });
      this.idx         = 0;      // index into SLOTS of the item currently being unlocked
      this.doneCount   = 0;      // how many items have been unlocked so far
      this.equipped    = {};     // slotKey -> true once unlocked
      this.currentSlot = null;
      this.currentWord = null;
      this.canInteract = true;   // false while the practice modal is open
      this.avatarGfx   = null;
      this.cardCont    = null;
    },

    create: function () {
      // ── Warm background + ground strip ───────────────────────────
      var bg = this.add.graphics();
      bg.fillStyle(0xFFF7EC);
      bg.fillRect(0, 0, W, H);
      var ground = this.add.graphics();
      ground.fillStyle(0xF3E4C8);
      ground.fillRect(0, H - 50, W, 50);

      // ── Progress bar (top) ────────────────────────────────────────
      var track = this.add.graphics();
      track.fillStyle(0xd1d5db);
      track.fillRoundedRect(40, 14, W - 80, 10, 5);
      this.progFill = this.add.graphics();
      this.progText = this.add.text(W / 2, 36, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '14px', color: '#6b7280'
      }).setOrigin(0.5);

      // ── Avatar ──────────────────────────────────────────────────
      this.avatarGfx = this.add.graphics();
      this.drawAvatar();

      // ── Item card ───────────────────────────────────────────────
      this.cardCont = this.add.container(W + CARD_W, CARD_Y);
      this.buildCard(this.cardCont);
      this.buildButtons();

      this.updateProgress();
      this.showItem();
    },

    // ── [AVATAR] Redraws the whole avatar from scratch each time an
    // item unlocks. Unlocked pieces use their slot colour; everything
    // still locked falls back to a plain neutral grey/tan base look.
    drawAvatar: function () {
      var g = this.avatarGfx;
      var eq = this.equipped;
      g.clear();

      var pantsCol = eq.pants ? this.slotColor('pants') : 0xE5E7EB;
      var shoeCol  = eq.shoes ? this.slotColor('shoes') : 0x9CA3AF;
      var shirtCol = eq.shirt ? this.slotColor('shirt') : 0xE5E7EB;

      // legs (pants)
      g.fillStyle(pantsCol);
      g.fillRoundedRect(AX - 38, AY - 40, 30, 90, 8);
      g.fillRoundedRect(AX + 8,  AY - 40, 30, 90, 8);
      // shoes
      g.fillStyle(shoeCol);
      g.fillEllipse(AX - 23, AY + 58, 34, 18);
      g.fillEllipse(AX + 23, AY + 58, 34, 18);
      // arms (skin)
      g.fillStyle(0xF5C9A0);
      g.fillRoundedRect(AX - 58, AY - 110, 18, 80, 9);
      g.fillRoundedRect(AX + 40, AY - 110, 18, 80, 9);
      // torso (shirt)
      g.fillStyle(shirtCol);
      g.fillRoundedRect(AX - 40, AY - 120, 80, 90, 16);
      // bag accessory — hangs off the right hip over the torso
      if (eq.bag) {
        var bagCol = this.slotColor('bag');
        g.lineStyle(4, bagCol, 1);
        g.beginPath();
        g.arc(AX + 44, AY - 92, 16, Math.PI, 0, false);
        g.strokePath();
        g.fillStyle(bagCol);
        g.fillRoundedRect(AX + 28, AY - 78, 30, 32, 6);
      }
      // head (skin)
      g.fillStyle(0xF5C9A0);
      g.fillCircle(AX, AY - 175, 40);
      // hair — rounded band across the top of the head
      g.fillStyle(0x4B3621);
      g.fillRoundedRect(AX - 40, AY - 214, 80, 36, { tl: 20, tr: 20, bl: 0, br: 0 });
      // hat — sits above the hairline once unlocked
      if (eq.hat) {
        var hatCol = this.slotColor('hat');
        g.fillStyle(hatCol);
        g.fillRoundedRect(AX - 36, AY - 232, 72, 20, 10);
        g.fillRoundedRect(AX - 20, AY - 258, 40, 32, 6);
      }
      // face
      g.fillStyle(0x2b2b2b);
      g.fillCircle(AX - 14, AY - 178, 4);
      g.fillCircle(AX + 14, AY - 178, 4);
      g.lineStyle(3, 0x2b2b2b, 1);
      g.beginPath();
      g.arc(AX, AY - 168, 14, 0.2, Math.PI - 0.2, false);
      g.strokePath();
    },

    slotColor: function (key) {
      for (var i = 0; i < SLOTS.length; i++) if (SLOTS[i].key === key) return SLOTS[i].color;
      return 0xffffff;
    },

    // ── Build all graphics/text inside the item card container ────
    buildCard: function (cont) {
      var gfx = this.add.graphics();
      gfx.fillStyle(0xffffff);
      gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_R);
      gfx.lineStyle(3, 0x2ec4b6);
      gfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_R);
      gfx.fillStyle(0xf0fdfa);
      gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H / 2, CARD_R);
      gfx.lineStyle(3, 0x2ec4b6);
      gfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, CARD_R);
      cont.add(gfx);

      var itemTxt = this.add.text(0, -CARD_H / 2 + 54, '', { fontSize: '52px' }).setOrigin(0.5);
      cont.add(itemTxt); cont.itemTxt = itemTxt;

      var labelTxt = this.add.text(0, -CARD_H / 2 + 104, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#374151'
      }).setOrigin(0.5);
      cont.add(labelTxt); cont.labelTxt = labelTxt;

      var wordTxt = this.add.text(0, 8, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '26px', fontStyle: 'bold', color: '#2ec4b6'
      }).setOrigin(0.5);
      cont.add(wordTxt); cont.wordTxt = wordTxt;

      var readingTxt = this.add.text(0, 46, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '15px', color: '#9ca3af'
      }).setOrigin(0.5);
      cont.add(readingTxt); cont.readingTxt = readingTxt;

      var badgeTxt = this.add.text(CARD_W / 2 - 12, -CARD_H / 2 + 12, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '12px', color: '#9ca3af',
        backgroundColor: '#f3f4f6', padding: { x: 6, y: 3 }
      }).setOrigin(1, 0);
      cont.add(badgeTxt); cont.badgeTxt = badgeTxt;
    },

    // ── [BTN] Listen + Practice buttons below the card ─────────────
    buildButtons: function () {
      var self = this;
      var BTN_Y = CARD_Y + CARD_H / 2 + 40;

      function makeBtn(x, w, h, fillColor, strokeColor, label, onClick) {
        var gfx = self.add.graphics();
        gfx.fillStyle(fillColor);
        gfx.fillRoundedRect(x - w / 2, BTN_Y - h / 2, w, h, 10);
        gfx.lineStyle(2, strokeColor);
        gfx.strokeRoundedRect(x - w / 2, BTN_Y - h / 2, w, h, 10);

        var txt = self.add.text(x, BTN_Y, label, {
          fontFamily: 'Prompt, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        txt.on('pointerdown', function () { if (self.canInteract) onClick(); });
        txt.on('pointerover',  function () { gfx.setAlpha(0.85); });
        txt.on('pointerout',   function () { gfx.setAlpha(1); });
        return { gfx: gfx, txt: txt };
      }

      // No TTS fallback — this button is hidden in showItem() below for any
      // word with no real recorded sound_url, rather than falling back to
      // browser text-to-speech.
      this.listenBtn = makeBtn(CARD_X - 90, 160, 50, 0x64748b, 0x475569, '🔊  ฟังตัวอย่าง', function () {
        if (self.currentWord && self.currentWord.sound_url) new Audio(self.currentWord.sound_url).play();
      });

      this.practiceBtn = makeBtn(CARD_X + 90, 160, 50, 0xf59e0b, 0xd97706, '🎤  พูดคำนี้!', function () {
        if (!self.currentWord) return;
        self.canInteract = false;
        callbacks.onPractice(self.currentWord, null, function () {
          self.canInteract = true;
          self.onItemUnlocked();
        });
      });
    },

    // ── Populate the card with the next locked item and slide it in
    showItem: function () {
      if (this.idx >= SLOTS.length) { this.onAllDone(); return; }

      this.currentSlot = SLOTS[this.idx];
      this.currentWord = words[this.idx % words.length];

      var cont = this.cardCont;
      cont.itemTxt.setText(this.currentSlot.emoji);
      cont.labelTxt.setText('ปลดล็อก: ' + this.currentSlot.label);
      cont.wordTxt.setText(this.currentWord.word || '');
      cont.readingTxt.setText(this.currentWord.reading || this.currentWord.level || '');

      var remaining = SLOTS.length - this.idx - 1;
      cont.badgeTxt.setText(remaining > 0 ? remaining + ' ชิ้น' : 'ชิ้นสุดท้าย!');

      var hasSound = !!this.currentWord.sound_url;
      this.listenBtn.gfx.setVisible(hasSound);
      this.listenBtn.txt.setVisible(hasSound);
      if (hasSound) this.listenBtn.txt.setInteractive({ useHandCursor: true });
      else this.listenBtn.txt.disableInteractive();

      this.updateProgress();
      this.canInteract = true;

      cont.x = W + CARD_W;
      this.tweens.add({ targets: cont, x: CARD_X, duration: 340, ease: 'Power2' });
    },

    // ── Called after the practice modal closes successfully ───────
    onItemUnlocked: function () {
      var self = this;
      callbacks.onPoints(PTS_PER_ITEM);
      this.equipped[this.currentSlot.key] = true;
      this.drawAvatar();

      // little pop animation to celebrate the new piece
      this.avatarGfx.setScale(0.9);
      this.tweens.add({ targets: this.avatarGfx, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.Out' });

      this.doneCount++;
      this.idx++;
      this.updateProgress();

      this.time.delayedCall(650, function () { self.advanceCard(); });
    },

    advanceCard: function () {
      var self = this;
      this.tweens.add({
        targets: this.cardCont, x: -CARD_W, duration: 280, ease: 'Power2',
        onComplete: function () { self.showItem(); }
      });
    },

    updateProgress: function () {
      var frac  = SLOTS.length > 0 ? this.doneCount / SLOTS.length : 0;
      var fillW = Math.max(0, (W - 80) * frac);
      this.progFill.clear();
      this.progFill.fillStyle(0x2ec4b6);
      this.progFill.fillRoundedRect(40, 14, fillW, 10, 5);
      this.progText.setText(this.doneCount + ' / ' + SLOTS.length);
    },

    // ── All 5 pieces equipped — show the finished outfit, then end ─
    onAllDone: function () {
      this.cardCont.setVisible(false);
      var doneTxt = this.add.text(CARD_X, H / 2, '🎉 แต่งตัวเสร็จแล้ว! 🎉', {
        fontFamily: 'Prompt, sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#f0a500'
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: doneTxt, alpha: 1, duration: 400 });
      this.time.delayedCall(1600, function () { callbacks.onFinish(); });
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'dressupGame',
    width:  W, height: H,
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, autoRound: true },
    scene:  DsScene,
    audio:  { noAudio: true }
  });
}

// ── Public API (mirrors ShootingGame, FlashcardGame, etc.) ──────────
var DressupGame = (function () {
  var game = null;
  function start(words, cbs) {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
    setTimeout(function () { game = createDressupGame(words, cbs); }, 60);
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }
  return { start: start, stop: stop };
}());
