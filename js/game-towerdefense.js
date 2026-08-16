// ============================================================
//  TOWER DEFENSE GAME — Phaser 3  (place troops, defend the base)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Grid size, road clearance, pacing knobs     (~line 20)
//    [MAPS]    Map layouts (path/portal/base/waves/scaling)(~MAPS)
//    [TROOPS]  Archer & swordsman stats per tier            (~TROOPS)
//    [ENEMY]   Enemy types + per-wave spawn scaling         (~ENEMY_TYPES / buildWave)
//    [PANEL]   Hover/tap unit stat + upgrade panel           (~PANEL_X etc / drawInfoPanel)
//    [UI]      Bottom troop palette + start-wave button      (~drawPalette)
// ============================================================
//  How the game works:
//    - A road winds across the screen from the portal to your base.
//      Enemies walk it every wave; each one that reaches the base
//      costs you a life. Pick a map before starting (see game.html's
//      setup overlay) — later maps are twistier, longer, and harder.
//    - Placement is grid-based, not fixed spots: tap a troop card at
//      the bottom to select it, then tap any open grid cell that isn't
//      too close to the road/portal/base to place it there (costs gold).
//    - Hover over (or tap) an already-placed troop to see its stats —
//      damage, range, attack speed, and its tier-3 special ability.
//      Tapping it opens a panel with an upgrade button (also shown on
//      hover, without the button, for a quick peek); 3 tiers per troop,
//      the 3rd tier unlocks a special ability:
//        Archer:    tier 3 arrows pierce through several enemies in a line
//        Swordsman: tier 3 periodically RAGES — faster attacks + more damage
//    - Tap "เริ่มด่าน" to start the next wave — this is gated by a quick
//      pronunciation practice (same as every other game's practice
//      popup), and correct practice also pays a small gold bonus.
//    - Survive every wave to win; lose all your lives and it's over.
//  Sound effects:
//    - LaserShot  → archer fires
//    - swoosh     → swordsman slashes
//    - TargetBreak→ an enemy dies
//    - CoinSFX    → gold earned (kill / wave clear / practice bonus)
//    - WrongSFX   → invalid tap (not enough gold, already maxed, etc.)
//    - PixelDamage→ an enemy reaches the base
//    - CongratSFX → you win
// ============================================================

// createTowerDefenseGame is called with an optional 4th argument, mapIdx
// (index into MAPS below, defaulting to 0) — see game.html's tdMapRow
// setup-overlay selector for how a map gets picked before the game starts.
function createTowerDefenseGame(words, callbacks, mapIdx) {
  var W = 800, H = 500;

  // ── [TUNE] Pacing knobs that don't vary by map ───────────────
  var SPAWN_GAP_MS = 750;      // time between enemy spawns within a wave
  var RAGE_INTERVAL = 8000;    // ms between swordsman-tier3 rage triggers
  var RAGE_DURATION = 3000;    // ms rage lasts

  var HUD_H = 40, FIELD_Y0 = HUD_H, FIELD_Y1 = 378, PAL_Y0 = 378;

  // ── [MAPS] Three layouts, each with its own road, portal/base
  // position, wave count, and enemy-HP scaling — later maps are
  // longer/twistier (less open room to place troops) AND scale enemies
  // harder, so difficulty comes from both map geometry and raw numbers.
  var MAPS = [
    {
      name: 'ทุ่งหญ้า', diffLabel: 'ง่าย', wavesTotal: 8, hpScale: 1.0, startGold: 100, startLives: 10,
      path: [
        { x: -20, y: 90 }, { x: 170, y: 90 }, { x: 170, y: 270 },
        { x: 380, y: 270 }, { x: 380, y: 110 }, { x: 580, y: 110 },
        { x: 580, y: 300 }, { x: 800, y: 300 }
      ],
      portal: { x: 10, y: 90 }, base: { x: 780, y: 300 }
    },
    {
      name: 'ทะเลทราย', diffLabel: 'ปานกลาง', wavesTotal: 10, hpScale: 1.15, startGold: 110, startLives: 9,
      path: [
        { x: -20, y: 70 }, { x: 130, y: 70 }, { x: 130, y: 190 },
        { x: 320, y: 190 }, { x: 320, y: 70 }, { x: 500, y: 70 },
        { x: 500, y: 310 }, { x: 680, y: 310 }, { x: 680, y: 190 }, { x: 800, y: 190 }
      ],
      portal: { x: 10, y: 70 }, base: { x: 780, y: 190 }
    },
    {
      name: 'ภูเขาไฟ', diffLabel: 'ยาก', wavesTotal: 12, hpScale: 1.3, startGold: 120, startLives: 8,
      path: [
        { x: -20, y: 350 }, { x: 100, y: 350 }, { x: 100, y: 75 },
        { x: 250, y: 75 }, { x: 250, y: 350 }, { x: 400, y: 350 },
        { x: 400, y: 75 }, { x: 550, y: 75 }, { x: 550, y: 350 },
        { x: 700, y: 350 }, { x: 700, y: 190 }, { x: 800, y: 190 }
      ],
      portal: { x: 10, y: 350 }, base: { x: 780, y: 190 }
    }
  ];
  var MAP = MAPS[mapIdx] || MAPS[0];
  var PATH = MAP.path;
  var PORTAL_X = MAP.portal.x, PORTAL_Y = MAP.portal.y;
  var BASE_X = MAP.base.x, BASE_Y = MAP.base.y;
  var WAVES_TOTAL = MAP.wavesTotal;
  var HP_SCALE = MAP.hpScale;
  var START_GOLD = MAP.startGold;
  var START_LIVES = MAP.startLives;

  function buildPathMeta(path) {
    var segLens = [], total = 0;
    for (var i = 0; i < path.length - 1; i++) {
      var len = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
      segLens.push(len); total += len;
    }
    return { segLens: segLens, total: total };
  }
  var PATH_META = buildPathMeta(PATH);
  function pointAtDistance(d) {
    d = Math.max(0, Math.min(PATH_META.total, d));
    var acc = 0;
    for (var i = 0; i < PATH_META.segLens.length; i++) {
      var segLen = PATH_META.segLens[i];
      if (d <= acc + segLen || i === PATH_META.segLens.length - 1) {
        var t = segLen > 0 ? (d - acc) / segLen : 0;
        var p0 = PATH[i], p1 = PATH[i + 1];
        return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
      }
      acc += segLen;
    }
    return PATH[PATH.length - 1];
  }

  // ── [TUNE] Placement grid — replaces the old fixed 11-spot SLOTS
  // array with a real grid covering the field, so a troop can go
  // (almost) anywhere instead of only a handful of predetermined spots.
  // Column/row COUNTs are fixed; the actual pixel spacing is derived so
  // the grid fills the usable field area evenly regardless of map.
  var GRID_COLS = 19, GRID_ROWS = 8;
  var GRID_X0 = 30, GRID_X1 = 770;
  var GRID_Y0 = FIELD_Y0 + 32, GRID_Y1 = FIELD_Y1 - 32;
  var GRID_STEP_X = (GRID_X1 - GRID_X0) / (GRID_COLS - 1);
  var GRID_STEP_Y = (GRID_Y1 - GRID_Y0) / (GRID_ROWS - 1);
  var CELL_BOX_W = GRID_STEP_X - 6, CELL_BOX_H = GRID_STEP_Y - 6; // drawn box size per grid cell (leaves a gap between cells)
  // Road is drawn 34px wide (17px half-width, see strokePath's lineStyle
  // below) -- clearance used to be 36, leaving a ~19px dead zone beyond
  // the road's visible edge where cells looked empty but were blocked.
  // 32 = road half-width (17) + a freshly-placed tower's base-circle
  // radius (15, see baseR in drawField) -- the tightest clearance that
  // still keeps a tier-0 tower's solid disc off the visible road. A
  // maxed (tier 2, baseR 21) tower can nose a few px into the road edge
  // after upgrading, same as the existing tier-3 aura ring (radius up to
  // baseR+9) already does regardless of this constant -- an accepted
  // cosmetic tradeoff for opening up placement near the path.
  var ROAD_CLEARANCE = 32; // min distance from road centerline a tower can be placed
  var PORTAL_CLEARANCE = 42, BASE_CLEARANCE = 48;

  function cellCenter(col, row) {
    return { x: GRID_X0 + col * GRID_STEP_X, y: GRID_Y0 + row * GRID_STEP_Y };
  }
  // Nearest grid cell to a raw pixel tap, or null if the tap isn't
  // actually close enough to any cell's center (dead zone between cells,
  // or outside the grid/field entirely).
  function cellAtPixel(px, py) {
    var col = Math.round((px - GRID_X0) / GRID_STEP_X);
    var row = Math.round((py - GRID_Y0) / GRID_STEP_Y);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    var c = cellCenter(col, row);
    if (Math.abs(px - c.x) > GRID_STEP_X * 0.55 || Math.abs(py - c.y) > GRID_STEP_Y * 0.55) return null;
    return { col: col, row: row, x: c.x, y: c.y };
  }
  function distToSegment(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var lenSq = dx * dx + dy * dy;
    var t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    var cx = ax + t * dx, cy = ay + t * dy;
    return Math.hypot(px - cx, py - cy);
  }
  function distToPath(px, py) {
    var min = Infinity;
    for (var i = 0; i < PATH.length - 1; i++) {
      var d = distToSegment(px, py, PATH[i].x, PATH[i].y, PATH[i + 1].x, PATH[i + 1].y);
      if (d < min) min = d;
    }
    return min;
  }
  // ── [PANEL] Fixed top-right stat/upgrade panel shown on hovering or
  // tapping a placed troop. Hover shows the short (no-button) version;
  // tapping "pins" it with the upgrade button until dismissed. Declared
  // before isCellBuildable() (below) so that function can keep this
  // whole footprint permanently unbuildable -- otherwise a tower placed
  // underneath it could sit exactly where ANOTHER pinned tower's
  // close/upgrade button gets hit-tested, so tapping that tower would
  // silently upgrade/dismiss the wrong one instead of opening its own panel.
  var PANEL_X = W - 200, PANEL_Y = HUD_H + 10, PANEL_W = 190;
  var PANEL_H_PINNED = 132, PANEL_H_HOVER = 96;
  var CLOSE_BTN = { x: PANEL_X + PANEL_W - 34, y: PANEL_Y, w: 34, h: 28 };
  var UPGRADE_BTN = { x: PANEL_X + 10, y: PANEL_Y + PANEL_H_PINNED - 38, w: PANEL_W - 20, h: 28 };
  var PANEL_NO_BUILD_MARGIN = 20; // extra padding beyond the panel's own rect

  function isCellBuildable(cx, cy) {
    if (distToPath(cx, cy) < ROAD_CLEARANCE) return false;
    if (Math.hypot(cx - PORTAL_X, cy - PORTAL_Y) < PORTAL_CLEARANCE) return false;
    if (Math.hypot(cx - BASE_X, cy - BASE_Y) < BASE_CLEARANCE) return false;
    if (cx > PANEL_X - PANEL_NO_BUILD_MARGIN && cy < PANEL_Y + PANEL_H_PINNED + PANEL_NO_BUILD_MARGIN) return false;
    return true;
  }

  // ── [TROOPS] Base + upgrade-tier stats. costs[i] is what it takes to
  // reach tier i (costs[0] = placement cost). Tier index 2 is "final".
  var TROOPS = {
    archer: {
      name: 'นักธนู', emoji: '🏹', color: 0x2E7D32,
      costs: [40, 60, 90],
      tiers: [
        { range: 190, dmg: 9,  atkMs: 1000 },
        { range: 220, dmg: 14, atkMs: 900 },
        { range: 245, dmg: 18, atkMs: 800, pierce: true, pierceCount: 3 }
      ]
    },
    sword: {
      name: 'นักดาบ', emoji: '⚔️', color: 0xB33A3A,
      costs: [35, 55, 85],
      tiers: [
        { range: 55, dmg: 7,  atkMs: 850 },
        { range: 62, dmg: 10, atkMs: 750 },
        { range: 68, dmg: 13, atkMs: 650, rage: true }
      ]
    }
  };

  // ── [ENEMY] Types + per-wave scaling. "ยักษ์" (ogre) is a tougher
  // late-game addition (wave >= 6) on top of the original three, for
  // extra bite as waves climb — combined with HP_SCALE (map-driven) and
  // the per-wave hpMul below, this is what makes later waves/maps feel
  // meaningfully harder rather than just "the same fight, more hits".
  var ENEMY_TYPES = [
    { key: 'slime', name: 'สไลม์',   emoji: '🟢', hp: 18, spd: 50, gold: 4,  dmg: 1, color: 0x27AE60 },
    { key: 'bat',   name: 'ค้างคาว', emoji: '🦇', hp: 10, spd: 82, gold: 3,  dmg: 1, color: 0x8E44AD },
    { key: 'rock',  name: 'หิน',     emoji: '🪨', hp: 46, spd: 30, gold: 8,  dmg: 2, color: 0x7F8C8D },
    { key: 'ogre',  name: 'ยักษ์',   emoji: '👹', hp: 90, spd: 22, gold: 14, dmg: 3, color: 0x6D4C41 }
  ];
  function buildWave(waveNum) {
    var count = 5 + waveNum * 2;
    var hpMul = (1 + (waveNum - 1) * 0.16) * HP_SCALE;
    var list = [];
    for (var i = 0; i < count; i++) {
      var roll = Math.random();
      var type;
      if (waveNum >= 6 && roll < 0.15) type = ENEMY_TYPES[3];
      else if (waveNum >= 5 && roll < 0.40) type = ENEMY_TYPES[2];
      else if (roll < 0.62) type = ENEMY_TYPES[1];
      else type = ENEMY_TYPES[0];
      list.push({ type: type, hpMul: hpMul });
    }
    return list;
  }

  var TdScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function () {
      Phaser.Scene.call(this, { key: 'towerdefense' });
      this.towers = [];       // { col, row, kind, tier, x, y, nextAtkAt, nextRageAt, ragingUntil, icon }
      this.enemies = [];      // { type, hp, maxHp, travel, x, y, icon, hpBg, hpFg }
      this.fx = [];           // { kind:'text'|'slash'|'beam', ... startedAt }
      this.gold = START_GOLD;
      this.lives = START_LIVES;
      this.wave = 0;
      this.phase = 'prep';    // prep | combat | lost | won
      this.selected = null;   // 'archer' | 'sword' | null
      this.spawnQueue = [];
      this.nextSpawnAt = 0;
      this.paused = false;
      this.hoverTower = null; // live pointermove proximity — read-only preview
      this.panelTower = null; // tap-pinned — shows the upgrade button too
    },

    preload: function () {
      this.load.audio('td_shoot', 'soundeffect/LaserShot.mp3');
      this.load.audio('td_slash', 'soundeffect/swoosh.mp3');
      this.load.audio('td_death', 'soundeffect/TargetBreak.mp3');
      this.load.audio('td_coin',  'soundeffect/CoinSFX.mp3');
      this.load.audio('td_wrong', 'soundeffect/WrongSFX.mp3');
      this.load.audio('td_hurt',  'soundeffect/PixelDamage.mp3');
      this.load.audio('td_win',   'soundeffect/CongratSFX.mp3');
    },

    create: function () {
      var self = this;
      this.sfxShoot = this.sound.add('td_shoot', { volume: 0.5 });
      this.sfxSlash = this.sound.add('td_slash', { volume: 0.6 });
      this.sfxDeath = this.sound.add('td_death', { volume: 0.5 });
      this.sfxCoin  = this.sound.add('td_coin',  { volume: 0.6 });
      this.sfxWrong = this.sound.add('td_wrong', { volume: 0.6 });
      this.sfxHurt  = this.sound.add('td_hurt',  { volume: 0.55 });
      this.sfxWin   = this.sound.add('td_win',   { volume: 0.8 });

      this.g = this.add.graphics();

      var hint = this.add.text(W / 2, HUD_H + 14,
        'แตะเลือกทหาร → แตะช่องว่างเพื่อวาง — แตะทหารที่วางแล้วเพื่อดูสถานะ!', {
          fontFamily: 'Prompt, sans-serif', fontSize: '14px', fontStyle: 'bold',
          color: '#2b2438', backgroundColor: '#ffffffcc', padding: { x: 8, y: 4 }
        }).setOrigin(0.5, 0).setDepth(20);
      this.time.delayedCall(4200, function () {
        self.tweens.add({ targets: hint, alpha: 0, duration: 500, onComplete: function () { hint.destroy(); } });
      });

      this.input.on('pointerdown', function (ptr) { self.onTap(ptr.x, ptr.y); });
      this.input.on('pointermove', function (ptr) { self.onHover(ptr.x, ptr.y); });
    },

    // ── Input: troop cards → start-wave button → info panel buttons →
    // placed-troop toggle → empty-cell placement ──────────────────
    onTap: function (x, y) {
      if (this.paused || this.phase === 'lost' || this.phase === 'won') return;

      var cardW = 150, cardH = 92, cardY = PAL_Y0 + 14;
      var archerCardX = 30, swordCardX = 30 + cardW + 14;
      if (this.hit(x, y, archerCardX, cardY, cardW, cardH)) {
        this.selected = this.selected === 'archer' ? null : 'archer'; return;
      }
      if (this.hit(x, y, swordCardX, cardY, cardW, cardH)) {
        this.selected = this.selected === 'sword' ? null : 'sword'; return;
      }
      var btnX = W - 190, btnY = cardY, btnW = 160, btnH = cardH;
      if (this.hit(x, y, btnX, btnY, btnW, btnH)) { this.tryStartWave(); return; }

      if (this.panelTower) {
        if (this.hit(x, y, CLOSE_BTN.x, CLOSE_BTN.y, CLOSE_BTN.w, CLOSE_BTN.h)) { this.panelTower = null; return; }
        if (this.hit(x, y, UPGRADE_BTN.x, UPGRADE_BTN.y, UPGRADE_BTN.w, UPGRADE_BTN.h)) { this.tryUpgrade(this.panelTower); return; }
        // Any other tap inside the panel's own footprint is swallowed
        // (it visually covers the field there) rather than falling
        // through to a grid placement/toggle underneath it.
        if (this.hit(x, y, PANEL_X, PANEL_Y, PANEL_W, PANEL_H_PINNED)) return;
      }

      var cell = cellAtPixel(x, y);
      if (cell) {
        var existing = this.towerAt(cell.col, cell.row);
        if (existing) {
          this.panelTower = (this.panelTower === existing) ? null : existing;
          return;
        }
        if (this.selected) { this.tryPlaceAt(cell, this.selected); return; }
      }

      if (this.panelTower) this.panelTower = null;
    },
    hit: function (px, py, x, y, w, h) { return px >= x && px <= x + w && py >= y && py <= y + h; },

    // Live pointer proximity to any placed troop, purely a read-only
    // display hint — never mutates gold/towers/etc, so it's safe to run
    // unconditionally on every pointermove, paused or not.
    onHover: function (x, y) {
      if (this.paused || this.phase === 'lost' || this.phase === 'won') { this.hoverTower = null; return; }
      var found = null;
      for (var i = 0; i < this.towers.length; i++) {
        var t = this.towers[i];
        var r = 15 + t.tier * 3 + 10; // baseR + a touch of hit-buffer
        if (Math.hypot(x - t.x, y - t.y) <= r) { found = t; break; }
      }
      this.hoverTower = found;
    },

    towerAt: function (col, row) {
      for (var i = 0; i < this.towers.length; i++) {
        if (this.towers[i].col === col && this.towers[i].row === row) return this.towers[i];
      }
      return null;
    },

    tryPlaceAt: function (cell, kind) {
      if (!isCellBuildable(cell.x, cell.y)) { this.badTap('วางตรงนี้ไม่ได้!'); return; }
      var def = TROOPS[kind];
      var cost = def.costs[0];
      if (this.gold < cost) { this.badTap('เหรียญไม่พอ! 🪙'); return; }
      this.gold -= cost;
      var icon = this.add.text(cell.x, cell.y, def.emoji, { fontSize: '22px' }).setOrigin(0.5).setDepth(5);
      this.towers.push({
        col: cell.col, row: cell.row, kind: kind, tier: 0, x: cell.x, y: cell.y,
        nextAtkAt: 0, nextRageAt: this.time.now + RAGE_INTERVAL, ragingUntil: 0, icon: icon
      });
      this.sfxCoin.play();
      this.popText(cell.x, cell.y - 30, def.emoji + ' วาง!', '#2EC4B6');
      this.selected = null;
    },

    tryUpgrade: function (tower) {
      var def = TROOPS[tower.kind];
      if (tower.tier >= def.tiers.length - 1) { this.badTap('อัพเกรดสูงสุดแล้ว!'); return; }
      var cost = def.costs[tower.tier + 1];
      if (this.gold < cost) { this.badTap('เหรียญไม่พอ! 🪙'); return; }
      this.gold -= cost;
      tower.tier++;
      this.sfxCoin.play();
      var label = tower.tier === def.tiers.length - 1 ? '⭐ สูงสุด!' : '⬆ อัพเกรด!';
      this.popText(tower.x, tower.y - 30, label, '#F0A500');
    },

    badTap: function (msg) {
      this.sfxWrong.play();
      this.popText(W / 2, PAL_Y0 - 18, msg, '#E53935');
    },

    // ── Wave flow ─────────────────────────────────────────────
    tryStartWave: function () {
      if (this.phase !== 'prep') { this.badTap('รอด่านนี้จบก่อนนะ!'); return; }
      var self = this;
      var word = words && words.length ? words[this.wave % words.length] : null;
      if (!word) { this.beginWave(); return; }
      this.paused = true;
      callbacks.onPractice(word, null, function () {
        self.paused = false;
        self.gold += 15;
        self.sfxCoin.play();
        self.popText(W / 2, PAL_Y0 - 18, '+15 🪙 โบนัสฝึกพูด!', '#2EC4B6');
        self.beginWave();
      });
    },
    beginWave: function () {
      this.wave++;
      this.phase = 'combat';
      this.spawnQueue = buildWave(this.wave);
      this.nextSpawnAt = this.time.now + 200;
    },
    spawnEnemy: function (entry) {
      var t = entry.type;
      var maxHp = Math.round(t.hp * entry.hpMul);
      var icon = this.add.text(0, 0, t.emoji, { fontSize: '18px' }).setOrigin(0.5).setDepth(4);
      this.enemies.push({ type: t, hp: maxHp, maxHp: maxHp, travel: 0, x: PORTAL_X, y: PORTAL_Y, icon: icon });
    },
    waveClearBonus: function () {
      var bonus = 20 + this.wave * 2;
      this.gold += bonus;
      this.sfxCoin.play();
      this.popText(BASE_X - 60, BASE_Y - 40, 'ด่าน ' + this.wave + ' สำเร็จ! +' + bonus + ' 🪙', '#2EC4B6');
      if (this.wave >= WAVES_TOTAL) { this.endGame(true); }
      else { this.phase = 'prep'; }
    },

    killEnemy: function (e) {
      e.icon.destroy();
      this.enemies = this.enemies.filter(function (u) { return u !== e; });
      this.gold += e.type.gold;
      callbacks.onPoints(2);
      this.sfxDeath.play();
    },
    enemyReachedBase: function (e) {
      e.icon.destroy();
      this.enemies = this.enemies.filter(function (u) { return u !== e; });
      this.lives = Math.max(0, this.lives - e.type.dmg);
      this.sfxHurt.play();
      this.popText(BASE_X - 30, BASE_Y - 30, '-' + e.type.dmg + ' ❤️', '#E53935');
      if (this.lives <= 0) this.endGame(false);
    },

    endGame: function (won) {
      // Guards against firing twice -- multiple enemies can reach the
      // base in the same frame batch once lives is already at 0, each
      // independently satisfying the "lives <= 0" check.
      if (this.phase === 'lost' || this.phase === 'won') return;
      var self = this;
      this.phase = won ? 'won' : 'lost';
      this.paused = true;
      if (won) this.sfxWin.play();
      this.time.delayedCall(2200, function () { callbacks.onFinish(); });
    },

    // ── Combat: towers seek and attack enemies in range ─────────
    towerAttack: function (time) {
      var self = this;
      this.towers.forEach(function (tower) {
        var def = TROOPS[tower.kind];
        var tierDef = def.tiers[tower.tier];
        var raging = tower.ragingUntil > time;
        if (tierDef.rage && time >= tower.nextRageAt) {
          tower.ragingUntil = time + RAGE_DURATION;
          tower.nextRageAt = time + RAGE_INTERVAL;
          raging = true;
          self.popText(tower.x, tower.y - 26, '🔥 RAGE!', '#E53935');
        }
        var atkMs = raging ? tierDef.atkMs * 0.5 : tierDef.atkMs;
        var dmg   = raging ? tierDef.dmg * 1.6 : tierDef.dmg;
        if (time < tower.nextAtkAt) return;

        if (tower.kind === 'sword') {
          var hits = self.enemies.filter(function (e) { return Math.hypot(e.x - tower.x, e.y - tower.y) <= tierDef.range; });
          if (!hits.length) return;
          hits.forEach(function (e) { self.damageEnemy(e, dmg); });
          self.sfxSlash.play();
          self.fx.push({ kind: 'slash', x: tower.x, y: tower.y, r: tierDef.range, startedAt: time });
          tower.nextAtkAt = time + atkMs;
        } else {
          var inRange = self.enemies.filter(function (e) { return Math.hypot(e.x - tower.x, e.y - tower.y) <= tierDef.range; });
          if (!inRange.length) return;
          inRange.sort(function (a, b) { return b.travel - a.travel; });
          var primary = inRange[0];
          var targets = [primary];
          if (tierDef.pierce) {
            var dx = primary.x - tower.x, dy = primary.y - tower.y;
            var dist = Math.hypot(dx, dy) || 1;
            var ux = dx / dist, uy = dy / dist;
            self.enemies.forEach(function (e) {
              if (e === primary || targets.length >= tierDef.pierceCount) return;
              var ex = e.x - tower.x, ey = e.y - tower.y;
              var proj = ex * ux + ey * uy;
              if (proj < 0 || proj > tierDef.range) return;
              var perp = Math.abs(ex * uy - ey * ux);
              if (perp < 16) targets.push(e);
            });
          }
          targets.forEach(function (e) { self.damageEnemy(e, dmg); });
          self.sfxShoot.play();
          self.fx.push({ kind: 'beam', x1: tower.x, y1: tower.y, x2: primary.x, y2: primary.y, startedAt: time });
          tower.nextAtkAt = time + atkMs;
        }
      });
    },
    damageEnemy: function (e, dmg) {
      e.hp -= dmg;
      if (e.hp <= 0) this.killEnemy(e);
    },

    popText: function (x, y, text, color) {
      var t = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif', fontSize: '15px', fontStyle: 'bold',
        color: color, stroke: '#ffffff', strokeThickness: 3
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: t, y: y - 34, alpha: 0, duration: 850, ease: 'Power2', onComplete: function () { t.destroy(); } });
    },

    // ── Per-frame update ─────────────────────────────────────
    update: function (time, delta) {
      var self = this;
      var dt = delta / 1000;
      this.g.clear();

      this.drawField(this.g, time);
      this.drawHud(this.g);
      this.drawPalette(this.g, time);
      this.drawFx(this.g, time);
      this.drawInfoPanel(this.g);

      if (this.paused || this.phase === 'lost' || this.phase === 'won') {
        if (this.phase === 'lost' || this.phase === 'won') this.drawEndOverlay(this.g);
        return;
      }

      // Spawn queue
      if (this.phase === 'combat' && this.spawnQueue.length && time >= this.nextSpawnAt) {
        this.spawnEnemy(this.spawnQueue.shift());
        this.nextSpawnAt = time + SPAWN_GAP_MS;
      }

      // Move enemies
      this.enemies.forEach(function (e) {
        e.travel += e.type.spd * dt;
        if (e.travel >= PATH_META.total) { self.enemyReachedBase(e); return; }
        var p = pointAtDistance(e.travel);
        e.x = p.x; e.y = p.y;
      });

      this.towerAttack(time);

      // Wave-clear check
      if (this.phase === 'combat' && !this.spawnQueue.length && !this.enemies.length) {
        this.waveClearBonus();
      }
    },

    // ── Drawing ──────────────────────────────────────────────
    drawField: function (g, time) {
      g.fillStyle(0xEFE6D8); g.fillRect(0, FIELD_Y0, W, FIELD_Y1 - FIELD_Y0);

      // [Grid] A real lattice of cell-boundary lines (not lines through
      // cell centers -- these sit HALFWAY between centers, so each
      // resulting box actually outlines one placeable cell), drawn faint
      // and permanent so placement visibly reads as "a grid" even before
      // a troop is selected. Drawn before the road/portal/base so those
      // still paint over it cleanly wherever they cross a line.
      g.lineStyle(1, 0x8a7355, 0.14);
      for (var gx = 0; gx <= GRID_COLS; gx++) {
        var lineX = GRID_X0 - GRID_STEP_X / 2 + gx * GRID_STEP_X;
        g.lineBetween(lineX, GRID_Y0 - GRID_STEP_Y / 2, lineX, GRID_Y1 + GRID_STEP_Y / 2);
      }
      for (var gy = 0; gy <= GRID_ROWS; gy++) {
        var lineY = GRID_Y0 - GRID_STEP_Y / 2 + gy * GRID_STEP_Y;
        g.lineBetween(GRID_X0 - GRID_STEP_X / 2, lineY, GRID_X1 + GRID_STEP_X / 2, lineY);
      }

      // Road
      g.lineStyle(34, 0xD8C7A6);
      this.strokePath(g);
      g.lineStyle(2, 0xC2AC80);
      this.strokePath(g);

      // Portal + base
      g.fillStyle(0x6A4FB3, 0.85); g.fillCircle(PORTAL_X, PORTAL_Y, 16);
      g.fillStyle(0x8E24AA, 0.5); g.fillCircle(PORTAL_X, PORTAL_Y, 16 + 4 * Math.sin(time * 0.005));
      g.fillStyle(0x5D4037); g.fillRect(BASE_X - 22, BASE_Y - 30, 44, 44);
      g.fillStyle(0x8D6E63); g.fillTriangle(BASE_X - 26, BASE_Y - 30, BASE_X + 26, BASE_Y - 30, BASE_X, BASE_Y - 54);

      // [Grid] Placeable-cell squares, only highlighted while a troop is
      // selected so the field stays clean otherwise -- filled boxes
      // (matching the lattice above) rather than circles, so a selected
      // cell reads as "this square of the grid" instead of a floating
      // dot. Cells too close to the road/portal/base are simply skipped
      // rather than marked, so 150+ cells don't turn into visual noise.
      var self = this;
      if (self.selected) {
        var affordable = self.gold >= TROOPS[self.selected].costs[0];
        for (var col = 0; col < GRID_COLS; col++) {
          for (var row = 0; row < GRID_ROWS; row++) {
            if (self.towerAt(col, row)) continue;
            var c = cellCenter(col, row);
            if (!isCellBuildable(c.x, c.y)) continue;
            var pulse = affordable ? 1.5 * Math.sin(time * 0.006 + col * 0.7 + row) : 0;
            var bw = CELL_BOX_W + pulse * 2, bh = CELL_BOX_H + pulse * 2;
            g.fillStyle(affordable ? 0x2EC4B6 : 0xBBAA88, 0.14);
            g.fillRoundedRect(c.x - bw / 2, c.y - bh / 2, bw, bh, 6);
            g.lineStyle(2, affordable ? 0x2EC4B6 : 0xBBAA88, affordable ? 0.9 : 0.55);
            g.strokeRoundedRect(c.x - bw / 2, c.y - bh / 2, bw, bh, 6);
          }
        }
      }

      // Towers (range ring + base disc; icon text is a persistent GameObject updated below)
      this.towers.forEach(function (t) {
        var def = TROOPS[t.kind], tierDef = def.tiers[t.tier];
        var raging = t.ragingUntil > time;
        var highlighted = self.panelTower === t || self.hoverTower === t;
        g.fillStyle(def.color, highlighted ? 0.12 : 0.06); g.fillCircle(t.x, t.y, tierDef.range);
        g.lineStyle(highlighted ? 2 : 1, def.color, highlighted ? 0.4 : 0.18); g.strokeCircle(t.x, t.y, tierDef.range);
        var baseR = 15 + t.tier * 3;
        if (t.tier === def.tiers.length - 1) {
          var auraColor = t.kind === 'archer' ? 0xF0A500 : 0xE53935;
          g.fillStyle(auraColor, raging ? 0.5 : (0.22 + 0.1 * Math.sin(time * 0.006)));
          g.fillCircle(t.x, t.y, baseR + 9);
        }
        g.fillStyle(0xFFFFFF, 0.9); g.fillCircle(t.x, t.y, baseR);
        g.lineStyle(highlighted ? 4 : 3, highlighted ? 0xffffff : def.color); g.strokeCircle(t.x, t.y, baseR);
        t.icon.setPosition(t.x, t.y).setFontSize(16 + t.tier * 3);
      });

      // Enemies
      this.enemies.forEach(function (e) {
        var r = 12;
        g.fillStyle(e.type.color, 0.9); g.fillCircle(e.x, e.y, r);
        g.lineStyle(2, 0x2b2438, 0.6); g.strokeCircle(e.x, e.y, r);
        e.icon.setPosition(e.x, e.y);
        var barW = 24, barX = e.x - barW / 2, barY = e.y - r - 10;
        g.fillStyle(0x000000, 0.35); g.fillRect(barX, barY, barW, 4);
        var frac = Math.max(0, e.hp / e.maxHp);
        g.fillStyle(frac > 0.5 ? 0x27AE60 : frac > 0.25 ? 0xF39C12 : 0xE53935);
        g.fillRect(barX, barY, barW * frac, 4);
      });
    },
    strokePath: function (g) {
      g.beginPath();
      g.moveTo(PATH[0].x, PATH[0].y);
      for (var i = 1; i < PATH.length; i++) g.lineTo(PATH[i].x, PATH[i].y);
      g.strokePath();
    },

    drawHud: function (g) {
      g.fillStyle(0x1e2a40); g.fillRect(0, 0, W, HUD_H);
      var t = this.hudText || (this.hudText = this.add.text(0, 0, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#fff'
      }).setDepth(25));
      var waveLbl = this.phase === 'won' ? WAVES_TOTAL + '/' + WAVES_TOTAL : Math.min(this.wave, WAVES_TOTAL) + '/' + WAVES_TOTAL;
      t.setText('🗺️ ' + MAP.name + '     🌊 ด่าน ' + waveLbl + '     ❤️ ' + this.lives + '     🪙 ' + this.gold);
      t.setPosition(14, 10);
    },

    drawPalette: function (g, time) {
      g.fillStyle(0x1e2a40); g.fillRect(0, PAL_Y0, W, H - PAL_Y0);
      var cardW = 150, cardH = 92, cardY = PAL_Y0 + 14;
      var self = this;
      ['archer', 'sword'].forEach(function (kind, i) {
        var def = TROOPS[kind];
        var x = 30 + i * (cardW + 14);
        var selected = self.selected === kind;
        var affordable = self.gold >= def.costs[0];
        g.fillStyle(selected ? 0x2EC4B6 : 0x0f3460, 1);
        g.fillRoundedRect(x, cardY, cardW, cardH, 12);
        g.lineStyle(selected ? 3 : 2, selected ? 0xffffff : 0x2c4a75);
        g.strokeRoundedRect(x, cardY, cardW, cardH, 12);
        var key = kind + 'Label';
        var lbl = self[key] || (self[key] = self.add.text(0, 0, '', {
          fontFamily: 'Prompt, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#fff', align: 'center'
        }).setOrigin(0.5).setDepth(25));
        lbl.setText(def.emoji + ' ' + def.name + '\n🪙' + def.costs[0]);
        lbl.setAlpha(affordable ? 1 : 0.4);
        lbl.setPosition(x + cardW / 2, cardY + cardH / 2);
      });

      var btnX = W - 190, btnY = cardY, btnW = 160, btnH = cardH;
      var canStart = this.phase === 'prep';
      g.fillStyle(canStart ? 0xF0A500 : 0x555f74, 1);
      g.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
      var btnLbl = this.startBtnLabel || (this.startBtnLabel = this.add.text(0, 0, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#fff', align: 'center'
      }).setOrigin(0.5).setDepth(25));
      btnLbl.setText(canStart ? '▶ เริ่มด่าน\n' + (this.wave + 1) : this.phase === 'combat' ? 'กำลังสู้อยู่...' : '');
      btnLbl.setPosition(btnX + btnW / 2, btnY + btnH / 2);
    },

    drawFx: function (g, time) {
      this.fx = this.fx.filter(function (f) {
        var age = time - f.startedAt;
        if (f.kind === 'beam') {
          if (age > 160) return false;
          g.lineStyle(3, 0xF0A500, 1 - age / 160);
          g.lineBetween(f.x1, f.y1, f.x2, f.y2);
          return true;
        }
        if (f.kind === 'slash') {
          if (age > 200) return false;
          g.lineStyle(4, 0xB33A3A, 1 - age / 200);
          g.strokeCircle(f.x, f.y, f.r * Math.min(1, age / 120));
          return true;
        }
        return false;
      });
    },

    // ── [PANEL] Hover (read-only preview) or tap-pinned (with upgrade
    // button) stat panel for a placed troop -- panelTower wins over
    // hoverTower when both would apply, so hovering elsewhere never
    // yanks away a panel the player deliberately opened.
    drawInfoPanel: function (g) {
      var tower = this.panelTower || this.hoverTower;
      if (!tower) {
        if (this.infoPanelTxt) this.infoPanelTxt.setVisible(false);
        if (this.infoCloseTxt) this.infoCloseTxt.setVisible(false);
        if (this.infoUpgradeTxt) this.infoUpgradeTxt.setVisible(false);
        return;
      }
      var pinned = this.panelTower === tower;
      var def = TROOPS[tower.kind], tierDef = def.tiers[tower.tier];
      var ph = pinned ? PANEL_H_PINNED : PANEL_H_HOVER;

      g.fillStyle(0x0f1626, 0.94);
      g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, ph, 12);
      g.lineStyle(2, def.color, 0.9);
      g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, ph, 12);

      var txt = this.infoPanelTxt || (this.infoPanelTxt = this.add.text(0, 0, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '12px', color: '#fff', lineSpacing: 5
      }).setDepth(35));
      var lines = [
        def.emoji + ' ' + def.name + '  (ระดับ ' + (tower.tier + 1) + '/3)',
        '⚔️ ดาเมจ: ' + tierDef.dmg,
        '🎯 ระยะ: ' + tierDef.range,
        '⏱ ความเร็ว: ' + tierDef.atkMs + 'ms'
      ];
      if (tierDef.pierce) lines.push('✨ ทะลุ ' + tierDef.pierceCount + ' เป้า');
      if (tierDef.rage) lines.push('🔥 โกรธจัดทุก ' + (RAGE_INTERVAL / 1000) + ' วิ');
      txt.setText(lines.join('\n')).setPosition(PANEL_X + 12, PANEL_Y + 10).setVisible(true);

      var closeTxt = this.infoCloseTxt || (this.infoCloseTxt = this.add.text(0, 0, '✕', {
        fontFamily: 'Prompt, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#fff'
      }).setDepth(35));
      closeTxt.setPosition(CLOSE_BTN.x + CLOSE_BTN.w / 2, CLOSE_BTN.y + CLOSE_BTN.h / 2).setOrigin(0.5).setVisible(pinned);

      var upTxt = this.infoUpgradeTxt || (this.infoUpgradeTxt = this.add.text(0, 0, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#fff', align: 'center'
      }).setOrigin(0.5).setDepth(35));
      if (pinned) {
        var maxed = tower.tier >= def.tiers.length - 1;
        g.fillStyle(maxed ? 0x555f74 : 0xF0A500, 1);
        g.fillRoundedRect(UPGRADE_BTN.x, UPGRADE_BTN.y, UPGRADE_BTN.w, UPGRADE_BTN.h, 8);
        upTxt.setText(maxed ? '⭐ สูงสุดแล้ว' : 'อัพเกรด 🪙' + def.costs[tower.tier + 1]);
        upTxt.setPosition(UPGRADE_BTN.x + UPGRADE_BTN.w / 2, UPGRADE_BTN.y + UPGRADE_BTN.h / 2);
        upTxt.setVisible(true);
      } else {
        upTxt.setVisible(false);
      }
    },

    drawEndOverlay: function (g) {
      g.fillStyle(0x000000, 0.55); g.fillRect(0, 0, W, H);
      var won = this.phase === 'won';
      var t = this.endLabel || (this.endLabel = this.add.text(0, 0, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#fff', align: 'center'
      }).setOrigin(0.5).setDepth(40));
      t.setText(won ? '🎉 ป้องกันฐานสำเร็จ!' : '💥 ฐานแตก!');
      t.setColor(won ? '#F0A500' : '#E53935');
      t.setPosition(W / 2, H / 2);
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'towerdefenseGame',
    width:  W, height: H,
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, autoRound: true },
    scene:  TdScene
  });
}

// Public API (mirrors ShootingGame, CrossyGame, etc.)
var TowerDefenseGame = (function () {
  var game = null;
  function start(words, cbs, mapIdx) {
    stop();
    setTimeout(function () { game = createTowerDefenseGame(words, cbs, mapIdx); }, 60);
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }
  return { start: start, stop: stop };
}());
