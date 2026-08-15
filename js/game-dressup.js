// ============================================================
//  DRESS-UP GAME — Phaser 3  (browse the whole closet, pronounce to wear)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Points per equip, avatar position        (~line 15)
//    [SLOTS]   Clothing slots + labels                  (~SLOTS array)
//    [AVATAR]  Body base + clothing sprite overlays     (~drawAvatar / buildPieceImages)
//    [CLOSET]  Slot tabs + tappable item grid            (~buildClosetPanel / renderItemGrid)
//  Clothing art itself lives in img/dressup/*.svg (and img/dressup/doll/)
//  — edit those files directly to restyle a piece; the shop's cosmetics
//  catalog (supabase/coin_shop_migration.sql) is what maps each file to
//  a purchasable item there.
// ============================================================
//  How the game works:
//    - This mini-game is independent of the shop and coin ownership --
//      every cosmetic in the whole catalog (both art styles, 10 designs
//      per slot) can be BROWSED here regardless of what's actually owned.
//      It has nothing to do with what's bought or worn on your persistent
//      profile avatar (that's shop.html + management.html) -- picking
//      something here never touches ownership, coins, or the profile's
//      equipped_* columns.
//    - The avatar starts bare. Tap a slot's tab (hat/shirt/pants/shoes/bag)
//      to see every design for it as real thumbnail art (sticker style top
//      row, doll style bottom row), then tap a card to try to wear it --
//      that opens the shared pronunciation practice popup first. Only once
//      the popup closes does the piece actually go on (+points), same
//      "act now, say the word, then it counts" flow every other game in
//      this app uses for its own success moment.
//    - Nothing to "finish" here — the round just runs until the shared
//      HUD countdown timer ends it, like the timer-driven games.
// ============================================================

// createDressupGame is called with:
//   words     = array of word objects -- cycled through one at a time as
//               the practice word gating each equip attempt
//   callbacks = { onPoints, onPractice, onFinish, onTime }
//   closet    = { hat:[...], shirt:[...], pants:[...], shoes:[...], bag:[...] }
//               every cosmetic for that slot (both styles) -- the whole
//               catalog, not just what's owned -- each entry
//               { id, name, rarity, style, variant, asset_path },
//               sorted sticker-style-first then by variant
function createDressupGame(words, callbacks, closet) {

  // ── [TUNE] Numbers you can change ────────────────────────────
  var PTS_PER_EQUIP = 20; // points awarded each time a practice popup closes and a piece goes on
  var W = 800, H = 500;   // canvas size in pixels
  // Avatar anchor point (base of the torso). AY needs enough headroom
  // above it that the hat -- anchored bottom-up at AY-206 with a fixed
  // display height of 88 (see buildPieceImages' specs.hat below) -- never
  // extends above y=0 and gets clipped by the canvas's own top edge.
  // Every hat design gets stretched to that same 88px height regardless
  // of its own art, so this headroom requirement is universal, not
  // specific to any one hat. With AY=280 the hat's top sat at y=-14
  // (clipped ~16% of its height); AY=302 clears it with an 8px margin.
  var AX = 190, AY = 302;

  // ── [SLOTS] Outfit pieces + the raster size their SVGs load at
  // (independent of the on-avatar display size set in buildPieceImages).
  var SLOTS = [
    { key: 'hat',   label: 'หมวก',    emoji: '🎩', loadW: 140, loadH: 130 },
    { key: 'shirt', label: 'เสื้อ',    emoji: '👕', loadW: 160, loadH: 150 },
    { key: 'pants', label: 'กางเกง',  emoji: '👖', loadW: 140, loadH: 150 },
    { key: 'shoes', label: 'รองเท้า', emoji: '👟', loadW: 200, loadH: 70  },
    { key: 'bag',   label: 'กระเป๋า', emoji: '👜', loadW: 110, loadH: 150 }
  ];

  var RARITY_LABEL = { common: 'ธรรมดา', rare: 'หายาก', epic: 'เอปิก', legendary: 'ในตำนาน' };
  var RARITY_COLOR = { common: '#9CA3AF', rare: '#3B82F6', epic: '#A855F7', legendary: '#F59E0B' };

  // ── Closet panel layout: a row of slot tabs (hat/shirt/pants/shoes/bag)
  // above a grid of tappable item cards for whichever slot is active --
  // tap a card to wear it. 10 designs per slot (5 sticker + 5 doll) wrap
  // into 2 rows of 5.
  var PANEL_X = 400, PANEL_Y = 56, PANEL_W = 380;
  var TAB_H = 48, CARD_W = 68, CARD_H = 100, CARD_GAP = 10, ROW_GAP = 12, PER_ROW = 5;
  var CARD_CY = [PANEL_Y + TAB_H + 76, PANEL_Y + TAB_H + 76 + CARD_H + ROW_GAP];

  var DsScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'dressup' });
      this.avatarGfx    = null;
      this.pieceImgs    = {};   // slotKey -> Image (only created for slots the catalog has designs for)
      this.selectedIdx  = {};   // slotKey -> index into closet[slotKey] currently worn (unset = bare)
      this.activeSlot   = null; // which slot's cards are shown in the grid right now
      this.tabIcons     = {};   // slotKey -> {x, w} for hit-testing/redrawing tabs
      this.gridCards    = [];   // GameObjects for the current grid -- destroyed/rebuilt on slot switch
      this.wordIdx      = 0;    // cycles through `words` for each equip attempt's practice popup
      this.isPaused     = false; // true while a practice popup is open -- blocks new taps underneath
    },

    // Loads one texture per catalog cosmetic (every design, regardless of
    // ownership) -- the ?v= query param is this repo's cache-busting
    // convention (see game.html's script tags): bump it whenever art at
    // these paths is redrawn, since Phaser's SVG loader has no
    // cache-busting of its own.
    preload: function () {
      SLOTS.forEach(function (slot) {
        (closet[slot.key] || []).forEach(function (item) {
          this.load.svg(item.id, item.asset_path + '?v=3', { width: slot.loadW, height: slot.loadH });
        }, this);
      }, this);
      this.load.audio('ds_equip', 'soundeffect/FlipCard.mp3');
      this.load.audio('ds_bonus', 'soundeffect/CoinSFX.mp3');
      this.load.audio('ds_tab',   'soundeffect/Click.mp3');
    },

    create: function () {
      var self = this;
      // Each DressupGame.start() spins up a brand-new AudioContext, which
      // boots suspended. Unlike game-cooking.js, this scene reaches
      // create() through an async chain (loadCloset()'s network round
      // trip, then a setTimeout) with no user-gesture trace left by the
      // time it runs, so resuming here would silently no-op on strict
      // mobile autoplay policies -- resuming only actually works inside a
      // genuine, fresh pointerdown, so that's done for every tap below.
      this.input.on('pointerdown', function () {
        if (self.sound.context && self.sound.context.state !== 'running') self.sound.context.resume();
      });
      this.sfxEquip = this.sound.add('ds_equip', { volume: 0.55 });
      this.sfxBonus = this.sound.add('ds_bonus', { volume: 0.6 });
      this.sfxTab   = this.sound.add('ds_tab',   { volume: 0.4 });

      // ── Warm background + ground strip ───────────────────────────
      var bg = this.add.graphics();
      bg.fillStyle(0xFFF7EC);
      bg.fillRect(0, 0, W, H);
      var ground = this.add.graphics();
      ground.fillStyle(0xF3E4C8);
      ground.fillRect(0, H - 50, W, 50);

      this.add.text(W / 2, 20, '👗 ตู้เสื้อผ้าของคุณ', {
        fontFamily: 'Prompt, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#374151'
      }).setOrigin(0.5, 0);

      // ── Avatar ──────────────────────────────────────────────────
      this.avatarGfx = this.add.graphics();
      this.buildPieceImages();
      this.drawAvatar();

      // Every slot always has the full catalog now -- this only fires if
      // the catalog fetch itself genuinely failed (e.g. offline).
      var hasAnything = SLOTS.some(function (s) { return (closet[s.key] || []).length > 0; });
      if (!hasAnything) {
        this.add.text(PANEL_X + PANEL_W / 2, H / 2, 'โหลดตู้เสื้อผ้าไม่สำเร็จ\nลองเปิดหน้านี้ใหม่อีกครั้ง', {
          fontFamily: 'Prompt, sans-serif', fontSize: '18px', color: '#6b7280', align: 'center'
        }).setOrigin(0.5);
        return;
      }

      // Popup position per slot for requestEquip()'s point pop-text --
      // roughly where that slot's piece actually sits on the avatar.
      this.popupY = { hat: AY - 220, shirt: AY - 110, pants: AY - 20, shoes: AY + 70, bag: AY - 70 };

      this.buildClosetPanel();
    },

    // Floating score/feedback text -- same "create, tween up+fade,
    // destroy on complete" shape used across the other games' pop-text
    // effects (see e.g. game-shooting.js's showPop).
    popText: function (x, y, text, color) {
      var t = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif', fontSize: '20px', fontStyle: 'bold',
        color: color, stroke: '#ffffff', strokeThickness: 4
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({
        targets: t, y: y - 46, alpha: 0, duration: 850, ease: 'Power2',
        onComplete: function () { t.destroy(); }
      });
    },

    // A quick expanding-ring tap ripple at the given position -- purely
    // decorative feedback that a tap registered, same spirit as the
    // cooking/shooting games' own tap ripples, just built from a Graphics
    // object + tween since this scene has no per-frame redraw loop of
    // its own to hang a lightweight canvas effect off of.
    pressRipple: function (x, y) {
      var g = this.add.graphics().setDepth(29);
      g.lineStyle(3, 0x2EC4B6, 0.7);
      g.strokeCircle(0, 0, 10);
      g.setPosition(x, y);
      this.tweens.add({
        targets: g, scaleX: 2.6, scaleY: 2.6, alpha: 0, duration: 320, ease: 'Power2',
        onComplete: function () { g.destroy(); }
      });
    },

    // ── [AVATAR] One illustrated sprite per outfit slot, positioned over
    // the plain body drawn in drawAvatar() and stacked in the order that
    // looks right on the body (pants/shoes first, shirt over the torso,
    // bag over the shirt, hat last on top). Every slot always has a full
    // catalog now, so every slot gets an Image -- created hidden
    // (setVisible(false)) since the avatar starts bare; equipSlot() shows
    // it once the player actually wins that slot's practice popup.
    // Sizes/positions are derived from the plain body's own geometry in
    // drawAvatar() (legs span AX-38..AX+38 / AY-40..AY+50, feet ellipses
    // sit at AY+49..AY+67, torso spans AY-120..AY-30, head circle is
    // centered at AY-175 with radius 40, arms span AX-50..AX-34 (left) /
    // AX+32..AX+48 (right) -- narrower than the torso's own edges, tucked
    // in specifically so the widened shirt below actually reaches them).
    //
    // These w/h/x/y values (and drawAvatar()'s arm rects below) were tuned
    // by actually rendering the real clothing SVGs (img/dressup/*.svg)
    // composited over this body at these exact numbers -- via a local
    // resvg + pngjs script, not guessed -- since the original values
    // (shirt 112x100, bag 52x74 centered beside the torso, arms at
    // AX-58/+40) left visible bare-skin gaps at the shoulders and a bag
    // with no visible strap reaching the shoulder, looking like a prop
    // floating next to the character rather than something worn:
    //   - shirt widened+heightened (112x100 -> 130x120) to actually reach
    //     the arms after they were tucked in, matching the source SVG's
    //     own aspect ratio (~1.08) instead of a squished 1.12
    //   - bag switched from a small centered box (which cropped out most
    //     of its own drawn shoulder strap) to a tall top-anchored one
    //     positioned so the strap's own top point in the source art lands
    //     right at the shoulder, with the bag body hanging to hip height
    //   - pants nudged up 6px so the waistband tucks under the taller
    //     shirt's hem instead of leaving a visible bare-torso seam
    buildPieceImages: function () {
      // Stashed on the scene (this.pieceSpecs) so equipSlot() can re-apply
      // the exact same target size on every equip -- see equipSlot()'s own
      // comment for why that matters (the punch-in animation used to
      // silently discard this size entirely).
      var specs = this.pieceSpecs = {
        pants: { x: AX,      y: AY - 46,  ox: 0.5, oy: 0,   w: 88,  h: 96 },
        shoes: { x: AX,      y: AY + 58,  ox: 0.5, oy: 0.5, w: 86,  h: 30 },
        shirt: { x: AX,      y: AY - 124, ox: 0.5, oy: 0,   w: 130, h: 120 },
        bag:   { x: AX + 40, y: AY - 121, ox: 0.3, oy: 0,   w: 80,  h: 125 },
        hat:   { x: AX,      y: AY - 206, ox: 0.5, oy: 1,   w: 92,  h: 88 }
      };
      SLOTS.forEach(function (slot) {
        var items = closet[slot.key] || [];
        if (!items.length) return;
        var sp = specs[slot.key];
        this.pieceImgs[slot.key] = this.add.image(sp.x, sp.y, items[0].id)
          .setOrigin(sp.ox, sp.oy).setDisplaySize(sp.w, sp.h).setVisible(false);
      }, this);
    },

    // ── Redraws the plain avatar body. The body itself is always a
    // neutral base (bare skin/hair) -- outfit pieces are the illustrated
    // sprites from buildPieceImages(), shown once equipSlot() runs.
    drawAvatar: function () {
      var g = this.avatarGfx;
      g.clear();

      // legs (bare base -- covered by the pants sprite once equipped)
      g.fillStyle(0xE5E7EB);
      g.fillRoundedRect(AX - 38, AY - 40, 30, 90, 8);
      g.fillRoundedRect(AX + 8,  AY - 40, 30, 90, 8);
      // feet (bare base -- covered by the shoes sprite once equipped)
      g.fillStyle(0x9CA3AF);
      g.fillEllipse(AX - 23, AY + 58, 34, 18);
      g.fillEllipse(AX + 23, AY + 58, 34, 18);
      // arms (skin) -- narrower span than the torso's own edges (was
      // AX-58/+40, 18 wide) so the widened shirt in buildPieceImages()
      // actually reaches all the way to them instead of leaving a gap
      g.fillStyle(0xF5C9A0);
      g.fillRoundedRect(AX - 50, AY - 110, 16, 80, 9);
      g.fillRoundedRect(AX + 32, AY - 110, 16, 80, 9);
      // torso (bare base -- covered by the shirt sprite once equipped)
      g.fillStyle(0xE5E7EB);
      g.fillRoundedRect(AX - 40, AY - 120, 80, 90, 16);
      // head (skin)
      g.fillStyle(0xF5C9A0);
      g.fillCircle(AX, AY - 175, 40);
      // hair — rounded band across the top of the head
      g.fillStyle(0x4B3621);
      g.fillRoundedRect(AX - 40, AY - 214, 80, 36, { tl: 20, tr: 20, bl: 0, br: 0 });
      // face
      g.fillStyle(0x2b2b2b);
      g.fillCircle(AX - 14, AY - 178, 4);
      g.fillCircle(AX + 14, AY - 178, 4);
      g.lineStyle(3, 0x2b2b2b, 1);
      g.beginPath();
      g.arc(AX, AY - 168, 14, 0.2, Math.PI - 0.2, false);
      g.strokePath();
    },

    // ── [CLOSET] A tab per slot (hat/shirt/pants/shoes/bag) above a grid
    // of tappable cards showing every design the catalog has for it --
    // tap a card to try to wear it (see requestEquip). The card itself
    // shows the real thumbnail art, so there's no guessing what a name
    // means before picking it.
    buildClosetPanel: function () {
      var self = this;
      this.tabBg = this.add.graphics();
      var tabW = PANEL_W / SLOTS.length;
      SLOTS.forEach(function (slot, i) {
        var tx = PANEL_X + i * tabW + tabW / 2;
        var ty = PANEL_Y + TAB_H / 2;
        this.add.text(tx, ty, slot.emoji, { fontSize: '24px' }).setOrigin(0.5);
        // Hit target is the tab's whole highlighted box (tabW-8 wide,
        // TAB_H tall, matching drawTabs()), not just the emoji glyph's
        // own small rendered bounds -- a young child tapping anywhere on
        // the visibly-colored tab should register, not just the icon.
        var hit = this.add.rectangle(tx, ty, tabW - 8, TAB_H, 0x000000, 0)
          .setInteractive({ useHandCursor: true });
        hit.on('pointerdown', function () {
          if (self.isPaused || slot.key === self.activeSlot) return;
          self.sfxTab.play();
          self.pressRipple(tx, ty);
          self.selectSlot(slot.key);
        });
        this.tabIcons[slot.key] = { x: tx, w: tabW };
      }, this);

      this.emptyMsg = this.add.text(PANEL_X + PANEL_W / 2, CARD_CY[0], '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '15px', color: '#9ca3af',
        align: 'center', wordWrap: { width: PANEL_W - 30 }
      }).setOrigin(0.5).setVisible(false);

      var firstSlot = SLOTS.filter(function (s) { return (closet[s.key] || []).length > 0; })[0] || SLOTS[0];
      this.selectSlot(firstSlot.key);
    },

    drawTabs: function () {
      var self = this;
      this.tabBg.clear();
      SLOTS.forEach(function (slot) {
        var t = self.tabIcons[slot.key];
        var active = slot.key === self.activeSlot;
        self.tabBg.fillStyle(active ? 0xd1f5f0 : 0xffffff, 1);
        self.tabBg.fillRoundedRect(t.x - t.w / 2 + 4, PANEL_Y, t.w - 8, TAB_H, 10);
        self.tabBg.lineStyle(2, active ? 0x2ec4b6 : 0xe5e7eb);
        self.tabBg.strokeRoundedRect(t.x - t.w / 2 + 4, PANEL_Y, t.w - 8, TAB_H, 10);
      });
    },

    selectSlot: function (slotKey) {
      this.activeSlot = slotKey;
      this.drawTabs();
      this.renderItemGrid();
    },

    // Rebuilds the grid for the active slot from scratch -- called on
    // every tab switch and every equip (so the selection border moves).
    renderItemGrid: function () {
      var self = this;
      this.gridCards.forEach(function (o) { o.destroy(); });
      this.gridCards = [];

      var items = closet[this.activeSlot] || [];
      if (!items.length) {
        var slotInfo = SLOTS.filter(function (s) { return s.key === self.activeSlot; })[0];
        this.emptyMsg.setText('โหลด' + (slotInfo ? slotInfo.label : '') + 'ไม่สำเร็จ ลองใหม่อีกครั้ง').setVisible(true);
        return;
      }
      this.emptyMsg.setVisible(false);

      // Up to 10 designs per slot (5 sticker + 5 doll) wrap into 2 rows
      // of up to PER_ROW=5, each row centered independently.
      var rowCount = Math.ceil(items.length / PER_ROW);
      var rows = [];
      for (var r = 0; r < rowCount; r++) rows.push(items.slice(r * PER_ROW, r * PER_ROW + PER_ROW));

      rows.forEach(function (rowItems, rowIdx) {
        var cy = CARD_CY[rowIdx] || CARD_CY[CARD_CY.length - 1];
        var totalW = rowItems.length * CARD_W + (rowItems.length - 1) * CARD_GAP;
        var startX = PANEL_X + (PANEL_W - totalW) / 2 + CARD_W / 2;

        rowItems.forEach(function (item, colIdx) {
          var idx = rowIdx * PER_ROW + colIdx;
          var cx = startX + colIdx * (CARD_W + CARD_GAP);
          var selected = self.selectedIdx[self.activeSlot] === idx;

          var bg = self.add.graphics();
          bg.fillStyle(0xffffff);
          bg.fillRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 12);
          bg.lineStyle(selected ? 3 : 2, selected ? 0x2ec4b6 : 0xe5e7eb);
          bg.strokeRoundedRect(cx - CARD_W / 2, cy - CARD_H / 2, CARD_W, CARD_H, 12);

          var thumb = self.add.image(cx, cy - 26, item.id).setDisplaySize(40, 40);

          var name = self.add.text(cx, cy, item.name, {
            fontFamily: 'Prompt, sans-serif', fontSize: '9px', color: '#374151',
            align: 'center', wordWrap: { width: CARD_W - 6 }
          }).setOrigin(0.5, 0);

          var rarity = self.add.text(cx, cy + 34, RARITY_LABEL[item.rarity] || item.rarity, {
            fontFamily: 'Prompt, sans-serif', fontSize: '8px', fontStyle: 'bold',
            color: RARITY_COLOR[item.rarity] || '#6b7280'
          }).setOrigin(0.5, 0);

          var hit = self.add.rectangle(cx, cy, CARD_W, CARD_H, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
          hit.on('pointerdown', function () {
            if (self.isPaused || self.selectedIdx[self.activeSlot] === idx) return; // already worn, or a practice popup is already open
            self.pressRipple(cx, cy);
            self.requestEquip(self.activeSlot, idx);
          });

          self.gridCards.push(bg, thumb, name, rarity, hit);
        });
      });
    },

    // Gates actually wearing an item behind the shared pronunciation
    // practice popup -- tapping a card doesn't equip it directly; it opens
    // practice for the next word in the pool, and only once that popup
    // closes (correct or skipped, same as every other game's success
    // moment in this app) does equipSlot() run and points get awarded.
    // Re-picking the currently-worn item is already blocked by the
    // caller (renderItemGrid's pointerdown handler), so every call here
    // is a genuine change of what's worn in that slot.
    requestEquip: function (slotKey, idx) {
      if (this.isPaused) return;
      var self = this;
      if (!words || !words.length) { this.equipSlot(slotKey, idx); return; } // no pool to practice from -- fall back to a direct equip
      this.isPaused = true;
      var word = words[this.wordIdx++ % words.length];
      callbacks.onPractice(word, null, function () {
        self.isPaused = false;
        self.equipSlot(slotKey, idx);
        callbacks.onPoints(PTS_PER_EQUIP);
        self.sfxBonus.play();
        var px = slotKey === 'bag' ? AX + 70 : AX + 60;
        self.popText(px, self.popupY[slotKey] || AY, '+' + PTS_PER_EQUIP + ' ⭐', '#F0A500');
        self.renderItemGrid();
      });
    },

    // Puts item index `idx` of a slot's catalog list onto the avatar.
    // Only ever called from requestEquip() once its practice popup closes.
    equipSlot: function (slotKey, idx) {
      var items = closet[slotKey] || [];
      if (!items.length) return;
      this.selectedIdx[slotKey] = idx;
      var item = items[idx];
      var img = this.pieceImgs[slotKey];
      if (!img) return;
      img.setTexture(item.id).setVisible(true);
      // Re-apply this slot's real target size (buildPieceImages()'s
      // pieceSpecs) before punching in, rather than trusting whatever
      // scale the image happens to be holding right now. The old code did
      // `img.setScale(0.9)` then tweened straight to the LITERAL values
      // scaleX:1, scaleY:1 -- i.e. 100% of the raw loaded SVG texture's
      // own pixel size (each slot's loadW/loadH in SLOTS, e.g. the hat's
      // 140x130), completely ignoring the carefully-fitted display size
      // set here. Every single equip silently resized the garment to its
      // raw source dimensions instead of the size it was actually placed
      // and tuned for -- the real cause of clothes visibly not fitting
      // the body, far more than any position tweak. Recomputing the
      // target scale from pieceSpecs and punching in AS A MULTIPLIER of
      // that (90% -> 100% of the correct size) keeps the same "pop in"
      // feel while landing on the right size every time.
      var sp = this.pieceSpecs[slotKey];
      img.setDisplaySize(sp.w, sp.h);
      var targetScaleX = img.scaleX, targetScaleY = img.scaleY;
      img.setScale(targetScaleX * 0.9, targetScaleY * 0.9);
      this.tweens.add({ targets: img, scaleX: targetScaleX, scaleY: targetScaleY, duration: 180, ease: 'Back.Out' });
      this.sfxEquip.play();
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'dressupGame',
    width:  W, height: H,
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, autoRound: true },
    scene:  DsScene
  });
}

// ── Public API (mirrors ShootingGame, FlashcardGame, etc.) ──────────
var DressupGame = (function () {
  var game = null;
  var STYLE_RANK = { sticker: 0, doll: 1 };

  // Fetches the WHOLE cosmetics catalog (every design, both art styles,
  // regardless of who owns what -- this game is free play, independent
  // of the shop) grouped by slot, sorted sticker-style row first then
  // doll-style row, each ordered by variant -- so renderItemGrid()'s
  // 2-row wrap lines up with "row 1 = sticker, row 2 = doll". Public
  // read-only data (cosmetics_select_all RLS policy), so no login is
  // required to browse or try things on.
  async function loadCloset() {
    var closet = { hat: [], shirt: [], pants: [], shoes: [], bag: [] };
    if (typeof sb === 'undefined' || !sb) return closet;

    var { data: rows, error: rowsErr } = await sb.from('cosmetics').select('*');
    if (rowsErr) { console.error('[dressup] failed to load cosmetics catalog:', rowsErr); return closet; }
    (rows || []).forEach(function (item) {
      if (closet[item.slot]) closet[item.slot].push(item);
    });
    Object.keys(closet).forEach(function (slotKey) {
      closet[slotKey].sort(function (a, b) {
        return (STYLE_RANK[a.style] - STYLE_RANK[b.style]) || (a.variant - b.variant);
      });
    });
    return closet;
  }

  // The closet fetch is a network round-trip in front of Phaser's own
  // preload() -- every sibling game constructs its Phaser.Game
  // synchronously, so without this the shared HUD timer (already
  // running by the time start() is called) would tick down over a
  // blank canvas on a slow connection. Cleared right before Phaser
  // takes over the same container.
  function showLoading() {
    var el = document.getElementById('dressupGame');
    if (el) el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:300px;font-family:Prompt,sans-serif;color:#6b7280;">กำลังโหลดตู้เสื้อผ้า...</div>';
  }

  function start(words, cbs) {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
    showLoading();
    loadCloset().then(function (closet) {
      setTimeout(function () {
        var el = document.getElementById('dressupGame');
        if (el) el.innerHTML = '';
        game = createDressupGame(words, cbs, closet);
      }, 60);
    });
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }
  return { start: start, stop: stop };
}());
