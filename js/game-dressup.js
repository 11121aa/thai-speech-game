// ============================================================
//  DRESS-UP GAME — Phaser 3  (wear cosmetics bought in the shop)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Points per slot, avatar position       (~line 15)
//    [SLOTS]   Clothing slots + labels                 (~SLOTS array)
//    [AVATAR]  Body base + clothing sprite overlays    (~drawAvatar / buildPieceImages)
//    [CLOSET]  Slot tabs + tappable item grid           (~buildClosetPanel / renderItemGrid)
//  Clothing art itself lives in img/dressup/*.svg (and img/dressup/doll/)
//  — edit those files directly to restyle a piece; the shop's cosmetics
//  catalog (supabase/coin_shop_migration.sql) is what maps each file to
//  a purchasable item.
// ============================================================
//  How the game works:
//    - Cosmetics are no longer unlocked by practicing words in this
//      mini-game — they're bought outright in the shop (shop.html) with
//      coins earned from correct practice recordings anywhere in the
//      app. This screen is just a closet: it shows whatever you've
//      already bought.
//    - Every slot (hat/shirt/pants/shoes/bag) you own at least one item
//      for gets its best-rarity piece equipped automatically, earning a
//      one-time bonus per slot for the session.
//    - Tap a slot's tab (hat/shirt/pants/shoes/bag) to see every item you
//      own for it as real thumbnail art, then tap any card to wear it —
//      pure browsing after the initial bonus, no extra points.
//    - Nothing to "finish" here — the round just runs until the shared
//      HUD countdown timer ends it, like the timer-driven games.
// ============================================================

// createDressupGame is called with:
//   words     = array of word objects (kept for signature compatibility
//               with DressupGame.start(words, cbs); unused now that
//               cosmetics replace word-practice unlocks)
//   callbacks = { onPoints, onFinish, onTime }
//   closet    = { hat:[...], shirt:[...], pants:[...], shoes:[...], bag:[...] }
//               each entry: { id, name, rarity, style, variant, asset_path },
//               already sorted best-rarity-first within each slot
function createDressupGame(words, callbacks, closet) {

  // ── [TUNE] Numbers you can change ────────────────────────────
  var PTS_PER_SLOT = 20;  // one-time bonus for equipping anything in a slot this session
  var W = 800, H = 500;   // canvas size in pixels
  var AX = 190, AY = 280; // avatar anchor point (base of the torso)

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
  // tap a card to wear it. Replaces an earlier version that hid the
  // choice behind tiny ‹/› cycle arrows with no visible art.
  var PANEL_X = 400, PANEL_Y = 56, PANEL_W = 380;
  var TAB_H = 48, CARD_W = 68, CARD_H = 108, CARD_GAP = 10, CARD_CY = PANEL_Y + TAB_H + 92;

  var DsScene = new Phaser.Class({
    Extends: Phaser.Scene,

    initialize: function () {
      Phaser.Scene.call(this, { key: 'dressup' });
      this.avatarGfx    = null;
      this.pieceImgs    = {};   // slotKey -> Image (only created for slots you own something in)
      this.selectedIdx  = {};   // slotKey -> index into closet[slotKey] currently worn
      this.activeSlot   = null; // which slot's cards are shown in the grid right now
      this.tabIcons     = {};   // slotKey -> {x, w} for hit-testing/redrawing tabs
      this.gridCards    = [];   // GameObjects for the current grid -- destroyed/rebuilt on slot switch
    },

    // Loads one texture per OWNED cosmetic (not the whole catalog) --
    // the ?v= query param is this repo's cache-busting convention (see
    // game.html's script tags): bump it whenever art at these paths is
    // redrawn, since Phaser's SVG loader has no cache-busting of its own.
    preload: function () {
      SLOTS.forEach(function (slot) {
        (closet[slot.key] || []).forEach(function (item) {
          this.load.svg(item.id, item.asset_path + '?v=2', { width: slot.loadW, height: slot.loadH });
        }, this);
      }, this);
    },

    create: function () {
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

      var hasAnything = SLOTS.some(function (s) { return (closet[s.key] || []).length > 0; });
      if (!hasAnything) {
        this.add.text(PANEL_X + PANEL_W / 2, H / 2, 'ยังไม่มีของแต่งตัวเลย\nไปที่ร้านค้าเพื่อเปิดกล่องสุ่มกันเถอะ! 🪙', {
          fontFamily: 'Prompt, sans-serif', fontSize: '18px', color: '#6b7280', align: 'center'
        }).setOrigin(0.5);
        return;
      }

      // Auto-equip the best-owned piece per slot and award the one-time
      // session bonus for each slot that had anything to equip -- done
      // before buildClosetPanel() so its first render already shows the
      // correct selection border instead of nothing selected.
      SLOTS.forEach(function (slot) {
        if ((closet[slot.key] || []).length > 0) {
          this.equipSlot(slot.key, 0);
          callbacks.onPoints(PTS_PER_SLOT);
        }
      }, this);

      this.buildClosetPanel();
    },

    // ── [AVATAR] One illustrated sprite per outfit slot, positioned over
    // the plain body drawn in drawAvatar() and stacked in the order that
    // looks right on the body (pants/shoes first, shirt over the torso,
    // bag over the shirt, hat last on top). Only created for slots you
    // actually own something in -- an empty slot has no Image at all.
    // Sizes/positions are derived from the plain body's own geometry in
    // drawAvatar() (legs span AX-38..AX+38 / AY-40..AY+50, feet ellipses
    // sit at AY+49..AY+67, torso spans AY-120..AY-30, head circle is
    // centered at AY-175 with radius 40).
    buildPieceImages: function () {
      var specs = {
        pants: { x: AX,      y: AY - 40,  ox: 0.5, oy: 0,   w: 88,  h: 96 },
        shoes: { x: AX,      y: AY + 58,  ox: 0.5, oy: 0.5, w: 86,  h: 30 },
        shirt: { x: AX,      y: AY - 124, ox: 0.5, oy: 0,   w: 112, h: 100 },
        bag:   { x: AX + 44, y: AY - 82,  ox: 0.5, oy: 0.5, w: 52,  h: 74 },
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
      // arms (skin)
      g.fillStyle(0xF5C9A0);
      g.fillRoundedRect(AX - 58, AY - 110, 18, 80, 9);
      g.fillRoundedRect(AX + 40, AY - 110, 18, 80, 9);
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
    // of tappable cards showing every item you own in that slot -- tap a
    // card to wear it. The card itself shows the real thumbnail art, so
    // there's no guessing what a name means before picking it.
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
        hit.on('pointerdown', function () { self.selectSlot(slot.key); });
        this.tabIcons[slot.key] = { x: tx, w: tabW };
      }, this);

      this.emptyMsg = this.add.text(PANEL_X + PANEL_W / 2, CARD_CY, '', {
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
        this.emptyMsg.setText('ยังไม่มี' + (slotInfo ? slotInfo.label : '') + 'เลย\nไปเปิดกล่องที่ร้านค้ากันเถอะ! 🪙').setVisible(true);
        return;
      }
      this.emptyMsg.setVisible(false);

      var totalW = items.length * CARD_W + (items.length - 1) * CARD_GAP;
      var startX = PANEL_X + (PANEL_W - totalW) / 2 + CARD_W / 2;

      items.forEach(function (item, idx) {
        var cx = startX + idx * (CARD_W + CARD_GAP);
        var selected = self.selectedIdx[self.activeSlot] === idx;

        var bg = self.add.graphics();
        bg.fillStyle(0xffffff);
        bg.fillRoundedRect(cx - CARD_W / 2, CARD_CY - CARD_H / 2, CARD_W, CARD_H, 12);
        bg.lineStyle(selected ? 3 : 2, selected ? 0x2ec4b6 : 0xe5e7eb);
        bg.strokeRoundedRect(cx - CARD_W / 2, CARD_CY - CARD_H / 2, CARD_W, CARD_H, 12);

        var thumb = self.add.image(cx, CARD_CY - 30, item.id).setDisplaySize(48, 48);

        var name = self.add.text(cx, CARD_CY + 2, item.name, {
          fontFamily: 'Prompt, sans-serif', fontSize: '10px', color: '#374151',
          align: 'center', wordWrap: { width: CARD_W - 6 }
        }).setOrigin(0.5, 0);

        var rarity = self.add.text(cx, CARD_CY + 40, RARITY_LABEL[item.rarity] || item.rarity, {
          fontFamily: 'Prompt, sans-serif', fontSize: '9px', fontStyle: 'bold',
          color: RARITY_COLOR[item.rarity] || '#6b7280'
        }).setOrigin(0.5, 0);

        var hit = self.add.rectangle(cx, CARD_CY, CARD_W, CARD_H, 0x000000, 0)
          .setInteractive({ useHandCursor: true });
        hit.on('pointerdown', function () {
          if (self.selectedIdx[self.activeSlot] === idx) return; // already worn
          self.equipSlot(self.activeSlot, idx);
          self.renderItemGrid();
        });

        self.gridCards.push(bg, thumb, name, rarity, hit);
      });
    },

    // Puts item index `idx` of a slot's owned list onto the avatar --
    // used for the initial auto-equip and every card tap afterward.
    equipSlot: function (slotKey, idx) {
      var items = closet[slotKey] || [];
      if (!items.length) return;
      this.selectedIdx[slotKey] = idx;
      var item = items[idx];
      var img = this.pieceImgs[slotKey];
      if (!img) return;
      img.setTexture(item.id).setVisible(true);
      img.setScale(0.9);
      this.tweens.add({ targets: img, scaleX: 1, scaleY: 1, duration: 180, ease: 'Back.Out' });
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
  var RARITY_RANK = { legendary: 0, epic: 1, rare: 2, common: 3 };

  // Fetches the signed-in user's owned cosmetics (joined with the
  // catalog for name/rarity/asset_path), grouped by slot and sorted
  // best-rarity-first, before the Phaser game is created -- preload()
  // needs to know which asset paths to load up front.
  async function loadCloset() {
    var closet = { hat: [], shirt: [], pants: [], shoes: [], bag: [] };
    if (typeof Auth === 'undefined' || typeof sb === 'undefined' || !sb) return closet;
    var session = await Auth.getSession();
    if (!session) return closet;

    var { data: owned, error: ownedErr } = await sb.from('owned_cosmetics').select('cosmetic_id').eq('user_id', session.user.id);
    if (ownedErr) { console.error('[dressup] failed to load owned_cosmetics:', ownedErr); return closet; }
    var ownedIds = (owned || []).map(function (o) { return o.cosmetic_id; });
    if (!ownedIds.length) return closet;

    var { data: rows, error: rowsErr } = await sb.from('cosmetics').select('*').in('id', ownedIds);
    if (rowsErr) { console.error('[dressup] failed to load cosmetics catalog:', rowsErr); return closet; }
    (rows || []).forEach(function (item) {
      if (closet[item.slot]) closet[item.slot].push(item);
    });
    Object.keys(closet).forEach(function (slotKey) {
      closet[slotKey].sort(function (a, b) {
        return (RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity]) || (b.variant - a.variant);
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
