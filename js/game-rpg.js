// ============================================================
//  RPG GAME — Phaser 3  (topdown, procedurally generated dungeon)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Board size, movement speed, combat pacing     (~line 20)
//    [GEN]     Procedural dungeon generation (seeded)        (~generateDungeon)
//    [ENEMY]   Regular enemy types                           (~ENEMY_TYPES)
//    [BOSS]    The 3 boss types + their special abilities    (~BOSSES / bossTick)
//    [COMBAT]  Auto-attack, skill use, damage resolution     (~playerAttackTick / useSkill)
//    [SHRINE]  Per-room practice pickup + boss-gate           (~spawnShrines / shrineTick)
//    [UI]      HUD, skill button, analog joystick             (~drawHud / wireInput)
// ============================================================
//  How the game works:
//    - Every run generates a brand-new dungeon from a random seed
//      (shown in the HUD) -- a handful of rooms connected by corridors,
//      ending in a boss room. Move any of three ways -- the analog
//      joystick below the canvas, holding/dragging a finger anywhere on
//      the dungeon itself (the hero walks toward it), or arrow keys/WASD.
//      Combat is automatic -- walk near an enemy and you (and it) trade
//      hits on a timer, no separate attack button needed.
//    - Every non-start room has a glowing practice shrine. Walking into
//      one opens the shared pronunciation practice popup; closing it
//      heals you a little and awards points. The boss room's own boss
//      stays dormant until ITS shrine is triggered, so there's always
//      one last practice moment before a fight starts.
//    - Your weapon/armor/skill (bought in the shop, js/game-rpg.js's
//      shop counterpart is shop.html's RPG section) set your damage,
//      damage reduction, and an active skill button's effect -- with
//      nothing equipped you're still fully playable at baseline stats,
//      just weaker.
//    - One of 3 bosses guards the final room, picked by the run's own
//      seed: ราชาสไลม์ (tanky, plain), อัศวินโครงกระดูก (periodically
//      rages -- faster + harder hits for a few seconds), มังกรไฟ
//      (periodically telegraphs then breathes an AOE burst). Beat the
//      boss to win; run out of HP and it's over.
// ============================================================

// Tracks the currently-attached d-pad/skill/keyboard listeners across
// restarts. NOT cleaned up via the scene's own 'shutdown' event -- Phaser's
// game.destroy(true) does not reliably fire it in this codebase's setup
// (confirmed live the same way as js/game-shooting.js's identical comment),
// so relying on it would leak listeners (and duplicate keydown/keyup
// handlers on window) on every restart. RpgGame.stop() below does this
// cleanup directly and unconditionally instead.
var _rpgSkillFn = null;
var _rpgKeydownFn = null;
var _rpgKeyupFn = null;
var _rpgStickFns = null;

function createRpgGame(words, callbacks) {
  var W = 800, H = 500;

  // ── [TUNE] ──────────────────────────────────────────────────
  var HUD_H = 36;
  var TILE = 32, COLS = 24, ROWS = 14;
  var FIELD_X0 = (W - COLS * TILE) / 2, FIELD_Y0 = HUD_H;
  var PLAYER_R = 12, PLAYER_SPD = 150; // px/sec
  var BASE_HP = 100, BASE_DMG = 6, BASE_DEF = 0;
  var ATTACK_RANGE = 40, ATTACK_INTERVAL_MS = 700;
  var ENEMY_AGGRO_RANGE = 180, ENEMY_ATTACK_INTERVAL_MS = 900;
  var SHRINE_R = 22, SHRINE_HEAL = 20;
  var DEFAULT_SKILL_CD_MS = 6000;

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── [ENEMY] Regular monster types, scattered through non-start,
  // non-boss rooms. ─────────────────────────────────────────────
  var ENEMY_TYPES = {
    slime:  { name: 'สไลม์',   emoji: '🟢', hp: 20, spd: 40, dmg: 4, color: 0x27AE60, r: 10 },
    goblin: { name: 'ก็อบลิน', emoji: '👺', hp: 16, spd: 60, dmg: 6, color: 0x8B5A2B, r: 10 },
    bat:    { name: 'ค้างคาว', emoji: '🦇', hp: 10, spd: 80, dmg: 3, color: 0x6D28D9, r: 8 }
  };
  var ENEMY_KEYS = Object.keys(ENEMY_TYPES);

  // ── [BOSS] Three distinct final-room guardians, one picked per run
  // (seeded) for replay variety. ────────────────────────────────
  var BOSSES = {
    slime_king: {
      name: 'ราชาสไลม์', emoji: '👑', hp: 220, spd: 22, dmg: 10, color: 0x1B7A3E, r: 26
    },
    skeleton_knight: {
      name: 'อัศวินโครงกระดูก', emoji: '💀', hp: 180, spd: 40, dmg: 13, color: 0xB0AEA4, r: 22,
      rageIntervalMs: 7000, rageDurationMs: 2500
    },
    fire_dragon: {
      name: 'มังกรไฟ', emoji: '🐉', hp: 260, spd: 26, dmg: 8, color: 0xC0392B, r: 28,
      breathIntervalMs: 5200, breathTelegraphMs: 800, breathRadius: 90, breathDmg: 22
    }
  };
  var BOSS_KEYS = Object.keys(BOSSES);

  // ── [GEN] Procedural dungeon: rooms placed until ROOM_COUNT valid
  // (non-overlapping, in-bounds) placements are found or attempts run
  // out, each new room linked to the previous one's center by an
  // L-shaped 2-tile-wide corridor. Deterministic for a given seed --
  // same seed always produces the same dungeon. ──────────────────
  function roomsOverlap(a, b, buf) {
    return a.x - buf < b.x + b.w && a.x + a.w + buf > b.x &&
           a.y - buf < b.y + b.h && a.y + a.h + buf > b.y;
  }
  function carveRoom(grid, room) {
    for (var ry = room.y; ry < room.y + room.h; ry++) {
      for (var rx = room.x; rx < room.x + room.w; rx++) grid[ry][rx] = 1;
    }
  }
  function carveCorridor(grid, a, b, rng) {
    var x = a.x, y = a.y;
    function carveAt(cx, cy) {
      for (var oy = 0; oy <= 1; oy++) {
        for (var ox = 0; ox <= 1; ox++) {
          var gy = cy + oy, gx = cx + ox;
          if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) grid[gy][gx] = 1;
        }
      }
    }
    if (rng() < 0.5) {
      while (x !== b.x) { carveAt(x, y); x += x < b.x ? 1 : -1; }
      while (y !== b.y) { carveAt(x, y); y += y < b.y ? 1 : -1; }
    } else {
      while (y !== b.y) { carveAt(x, y); y += y < b.y ? 1 : -1; }
      while (x !== b.x) { carveAt(x, y); x += x < b.x ? 1 : -1; }
    }
    carveAt(b.x, b.y);
  }
  function generateDungeonAttempt(seed) {
    var rng = mulberry32(seed);
    var grid = [];
    for (var r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(0));
    var rooms = [];
    var ROOM_COUNT = 6 + Math.floor(rng() * 3); // 6-8 rooms
    var attempts = 0;
    while (rooms.length < ROOM_COUNT && attempts < 300) {
      attempts++;
      var rw = 3 + Math.floor(rng() * 3), rh = 3 + Math.floor(rng() * 3);
      var rx = 1 + Math.floor(rng() * (COLS - rw - 2));
      var ry = 1 + Math.floor(rng() * (ROWS - rh - 2));
      var room = { x: rx, y: ry, w: rw, h: rh };
      if (rooms.some(function (o) { return roomsOverlap(room, o, 1); })) continue;
      carveRoom(grid, room);
      if (rooms.length > 0) {
        var prevC = roomCenter(rooms[rooms.length - 1]);
        carveCorridor(grid, prevC, roomCenter(room), rng);
      }
      rooms.push(room);
    }
    var bossType = BOSS_KEYS[Math.floor(rng() * BOSS_KEYS.length)];
    return { grid: grid, rooms: rooms, bossType: bossType, rng: rng };
  }
  // Room placement is randomized rejection-sampling (up to 300 tries) --
  // vanishingly unlikely to yield fewer than 2 rooms, but a run with only
  // 1 room would have no shrines (spawnShrines starts at rooms[1]) and no
  // way to ever activate the boss, making it unwinnable. Retry with a
  // perturbed seed until at least 2 rooms land, rather than trusting luck.
  function generateDungeon(seed) {
    var d = generateDungeonAttempt(seed);
    var tries = 0;
    while (d.rooms.length < 2 && tries < 10) {
      tries++;
      d = generateDungeonAttempt((seed + tries * 7919) >>> 0);
    }
    return d;
  }
  function roomCenter(room) {
    return { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };
  }
  function tileToPixel(tx, ty) {
    return { x: FIELD_X0 + tx * TILE + TILE / 2, y: FIELD_Y0 + ty * TILE + TILE / 2 };
  }

  var RpgScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function () {
      Phaser.Scene.call(this, { key: 'rpg' });
      this.seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
      this.dungeon = generateDungeon(this.seed);
      this.enemies = [];       // { x,y,hp,maxHp,type,def,nextAtkAt,icon }
      this.shrines = [];       // { x,y,roomIdx,collected,isBossShrine,icon }
      this.boss = null;        // set once the boss room is built
      this.fx = [];            // floating text / telegraph rings
      this.heldDir = { up: false, down: false, left: false, right: false };
      // Analog move vector from the joystick (-1..1 each axis, already
      // magnitude-limited to 1). Keyboard still writes heldDir; whichever
      // source is actually active wins in getMoveVec().
      this.stick = { x: 0, y: 0, active: false };
      // World-space point the finger is holding on the canvas -- the
      // player walks toward it while held ("drag the character").
      this.dragTo = null;
      this.phase = 'playing';  // playing | won | lost
      this.paused = false;     // true while a practice popup is open
      this.wordIdx = 0;
      this.attackNextAt = 0;
      this.roomIndexCleared = -1; // highest room index whose shrine has been collected, for the HUD progress readout
    },

    preload: function () {
      this.load.audio('rpg_hit',   'soundeffect/LaserShot.mp3');
      this.load.audio('rpg_hurt',  'soundeffect/PixelDamage.mp3');
      this.load.audio('rpg_death', 'soundeffect/TargetBreak.mp3');
      this.load.audio('rpg_coin',  'soundeffect/CoinSFX.mp3');
      this.load.audio('rpg_skill', 'soundeffect/swoosh.mp3');
      this.load.audio('rpg_win',   'soundeffect/CongratSFX.mp3');
    },

    create: function () {
      var self = this;
      var ca = this.cache.audio;
      this.sfxHit   = ca.exists('rpg_hit')   ? this.sound.add('rpg_hit',   { volume: 0.4 })  : null;
      this.sfxHurt  = ca.exists('rpg_hurt')  ? this.sound.add('rpg_hurt',  { volume: 0.55 }) : null;
      this.sfxDeath = ca.exists('rpg_death') ? this.sound.add('rpg_death', { volume: 0.5 })  : null;
      this.sfxCoin  = ca.exists('rpg_coin')  ? this.sound.add('rpg_coin',  { volume: 0.6 })  : null;
      this.sfxSkill = ca.exists('rpg_skill') ? this.sound.add('rpg_skill', { volume: 0.55 }) : null;
      this.sfxWin   = ca.exists('rpg_win')   ? this.sound.add('rpg_win',   { volume: 0.8 })  : null;

      this.g = this.add.graphics();

      // Baseline stats -- boosted below once (if) the player's equipped
      // loadout has loaded from Supabase (see RpgGame.start()'s async
      // loadout fetch; loadout is whatever was resolved by the time this
      // scene was created, {} if nothing equipped or not logged in).
      var loadout = window.__rpgLoadout || {};
      this.player = {
        x: 0, y: 0, hp: BASE_HP, maxHp: BASE_HP,
        dmg: BASE_DMG + (loadout.weaponPower || 0),
        def: BASE_DEF + (loadout.armorPower || 0),
        skill: loadout.skill || null, // { power, cooldownMs, effect, name } or null
        skillReadyAt: 0
      };
      var startC = tileToPixel(roomCenter(this.dungeon.rooms[0]).x, roomCenter(this.dungeon.rooms[0]).y);
      this.player.x = startC.x; this.player.y = startC.y;

      this.spawnEnemies();
      this.spawnShrines();

      this.playerIcon = this.add.text(this.player.x, this.player.y, '🧑', { fontSize: '22px' }).setOrigin(0.5).setDepth(6);

      var hint = this.add.text(W / 2, H - 12,
        'เดินเข้าหาศัตรูเพื่อสู้อัตโนมัติ — แตะแท่นเรืองแสงเพื่อฝึกพูด — ปุ่มขวาล่างใช้สกิล', {
          fontFamily: 'Prompt, sans-serif', fontSize: '13px', fontStyle: 'bold',
          color: '#2b2438', backgroundColor: '#ffffffcc', padding: { x: 8, y: 4 }
        }).setOrigin(0.5, 1).setDepth(20);
      this.time.delayedCall(4500, function () {
        self.tweens.add({ targets: hint, alpha: 0, duration: 500, onComplete: function () { hint.destroy(); } });
      });

      this.wireInput();
    },

    // ── Enemies: 1-2 per intermediate room (every room except the
    // first/start and the last/boss room). ─────────────────────────
    spawnEnemies: function () {
      var self = this;
      var rooms = this.dungeon.rooms;
      for (var i = 1; i < rooms.length - 1; i++) {
        var room = rooms[i];
        var count = 1 + Math.floor(this.dungeon.rng() * 2);
        for (var n = 0; n < count; n++) {
          var tx = room.x + 1 + Math.floor(this.dungeon.rng() * Math.max(1, room.w - 2));
          var ty = room.y + 1 + Math.floor(this.dungeon.rng() * Math.max(1, room.h - 2));
          var p = tileToPixel(tx, ty);
          var key = ENEMY_KEYS[Math.floor(this.dungeon.rng() * ENEMY_KEYS.length)];
          var def = ENEMY_TYPES[key];
          var icon = this.add.text(p.x, p.y, def.emoji, { fontSize: '18px' }).setOrigin(0.5).setDepth(5);
          this.enemies.push({ x: p.x, y: p.y, hp: def.hp, maxHp: def.hp, type: def, nextAtkAt: 0, roomIdx: i, icon: icon });
        }
      }
      // Boss, placed at the last room's center, dormant until that
      // room's shrine is triggered (see shrineTick()).
      var bossRoom = rooms[rooms.length - 1];
      var bc = tileToPixel(roomCenter(bossRoom).x, roomCenter(bossRoom).y);
      var bdef = BOSSES[this.dungeon.bossType];
      var icon = this.add.text(bc.x, bc.y, bdef.emoji, { fontSize: '34px' }).setOrigin(0.5).setDepth(5);
      this.boss = {
        x: bc.x, y: bc.y, hp: bdef.hp, maxHp: bdef.hp, def: bdef,
        active: false, nextAtkAt: 0, nextRageAt: 0, ragingUntil: 0,
        nextBreathAt: 0, breathTelegraphUntil: 0, icon: icon
      };
    },

    // ── [SHRINE] One per non-start room -- the boss room's own shrine
    // additionally gates the boss's AI (see shrineTick()). ──────────
    spawnShrines: function () {
      var rooms = this.dungeon.rooms;
      for (var i = 1; i < rooms.length; i++) {
        var c = roomCenter(rooms[i]);
        // Nudge off the exact center so it doesn't sit on top of an
        // enemy spawned at the same point.
        var p = tileToPixel(c.x, c.y - (rooms[i].h > 3 ? 1 : 0));
        var icon = this.add.text(p.x, p.y, '🔯', { fontSize: '20px' }).setOrigin(0.5).setDepth(4);
        this.shrines.push({ x: p.x, y: p.y, roomIdx: i, collected: false, isBoss: i === rooms.length - 1, icon: icon });
      }
    },

    // ── Input: analog joystick, drag-on-canvas, keyboard, skill tap ──
    // Cleanup is NOT wired via this.events.on('shutdown', ...) -- see the
    // comment on _rpgStickFns above createRpgGame(). RpgGame.stop() removes
    // these listeners directly instead.
    wireInput: function () {
      var self = this;

      // ── Virtual joystick ──
      // Pointer Events + setPointerCapture means the drag keeps tracking
      // even when the finger slides outside the stick's circle, which is
      // exactly what happens when a child pushes it to full deflection.
      var stick = document.getElementById('rpgStick');
      var knob = document.getElementById('rpgStickKnob');
      if (stick && knob) {
        var STICK_DEAD = 0.16; // ignore tiny wobbles so the player doesn't creep
        var moveKnob = function (dx, dy) {
          knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        };
        var applyPointer = function (e) {
          var r = stick.getBoundingClientRect();
          var maxR = r.width / 2 - 12;
          var dx = e.clientX - (r.left + r.width / 2);
          var dy = e.clientY - (r.top + r.height / 2);
          var d = Math.hypot(dx, dy);
          if (d > maxR) { dx = dx / d * maxR; dy = dy / d * maxR; d = maxR; }
          moveKnob(dx, dy);
          var mag = maxR ? d / maxR : 0;
          if (mag < STICK_DEAD) { self.stick.x = 0; self.stick.y = 0; self.stick.active = false; return; }
          self.stick.x = dx / maxR; self.stick.y = dy / maxR; self.stick.active = true;
        };
        // Track the owning pointer by id rather than asking the element
        // whether it still holds capture -- capture can be silently lost
        // (or never granted), and then the stick would stick at whatever
        // deflection it was at with no way to recover.
        var stickId = null;
        var stickDown = function (e) {
          e.preventDefault();
          stickId = e.pointerId;
          knob.style.transition = 'none'; // track the finger with no lag
          try { stick.setPointerCapture(e.pointerId); } catch (err) {}
          applyPointer(e);
        };
        var stickMove = function (e) { if (stickId === e.pointerId) applyPointer(e); };
        var stickUp = function (e) {
          if (stickId !== e.pointerId) return;
          stickId = null;
          try { stick.releasePointerCapture(e.pointerId); } catch (err) {}
          knob.style.transition = '';   // spring back to center
          moveKnob(0, 0);
          self.stick.x = 0; self.stick.y = 0; self.stick.active = false;
        };
        stick.addEventListener('pointerdown', stickDown);
        stick.addEventListener('pointermove', stickMove);
        stick.addEventListener('pointerup', stickUp);
        stick.addEventListener('pointercancel', stickUp);
        _rpgStickFns = { stick: stick, down: stickDown, move: stickMove, up: stickUp };
      }

      // ── Drag anywhere on the dungeon to walk there ──
      // Phaser reports pointer coords already in the game's own 800x500
      // space, so these need no manual scaling from CSS pixels.
      this.input.on('pointerdown', function (ptr) { self.dragTo = { x: ptr.worldX, y: ptr.worldY }; });
      this.input.on('pointermove', function (ptr) { if (ptr.isDown) self.dragTo = { x: ptr.worldX, y: ptr.worldY }; });
      this.input.on('pointerup', function () { self.dragTo = null; });
      this.input.on('pointerupoutside', function () { self.dragTo = null; });

      var skillBtn = document.getElementById('rpgBtnSkill');
      _rpgSkillFn = function (e) { e.preventDefault(); self.useSkill(); };
      if (skillBtn) {
        skillBtn.addEventListener('mousedown', _rpgSkillFn);
        skillBtn.addEventListener('touchstart', _rpgSkillFn, { passive: false });
      }

      _rpgKeydownFn = function (e) {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') self.heldDir.up = true;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') self.heldDir.down = true;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') self.heldDir.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') self.heldDir.right = true;
        if (e.key === ' ') self.useSkill();
      };
      _rpgKeyupFn = function (e) {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') self.heldDir.up = false;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') self.heldDir.down = false;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') self.heldDir.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') self.heldDir.right = false;
      };
      window.addEventListener('keydown', _rpgKeydownFn);
      window.addEventListener('keyup', _rpgKeyupFn);
    },

    // Releases every movement source at once, for moments where input
    // can be left latched with no matching release event (see shrineTick).
    clearMoveInput: function () {
      this.dragTo = null;
      this.stick.x = 0; this.stick.y = 0; this.stick.active = false;
      this.heldDir.up = this.heldDir.down = this.heldDir.left = this.heldDir.right = false;
      var knob = document.getElementById('rpgStickKnob');
      if (knob) { knob.style.transition = ''; knob.style.transform = 'translate(0px,0px)'; }
    },

    // Resolves the three movement sources into one vector of magnitude
    // <= 1. Joystick wins when deflected, then a held drag on the
    // dungeon, then the keyboard -- so picking up one control never
    // fights input still latched from another.
    getMoveVec: function () {
      if (this.stick.active) {
        var m = Math.hypot(this.stick.x, this.stick.y);
        if (m > 1) return { x: this.stick.x / m, y: this.stick.y / m };
        return { x: this.stick.x, y: this.stick.y };
      }
      if (this.dragTo) {
        var dx = this.dragTo.x - this.player.x, dy = this.dragTo.y - this.player.y;
        var d = Math.hypot(dx, dy);
        // Dead zone around the finger, else the player jitters back and
        // forth across the exact point it's standing on.
        if (d < PLAYER_R) return { x: 0, y: 0 };
        // Ease down over the last stride so it settles instead of
        // overshooting and snapping back.
        var speed = Math.min(1, d / (PLAYER_R * 3));
        return { x: dx / d * speed, y: dy / d * speed };
      }
      var kx = (this.heldDir.right ? 1 : 0) - (this.heldDir.left ? 1 : 0);
      var ky = (this.heldDir.down ? 1 : 0) - (this.heldDir.up ? 1 : 0);
      if (kx !== 0 && ky !== 0) { kx *= 0.7071; ky *= 0.7071; }
      return { x: kx, y: ky };
    },

    isWallAtPixel: function (px, py) {
      var col = Math.floor((px - FIELD_X0) / TILE);
      var row = Math.floor((py - FIELD_Y0) / TILE);
      if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
      return this.dungeon.grid[row][col] === 0;
    },
    canMoveTo: function (px, py, r) {
      return !this.isWallAtPixel(px - r, py - r) && !this.isWallAtPixel(px + r, py - r) &&
             !this.isWallAtPixel(px - r, py + r) && !this.isWallAtPixel(px + r, py + r);
    },

    // ── [COMBAT] Nearest enemy-or-boss within ATTACK_RANGE takes
    // player.dmg every ATTACK_INTERVAL_MS -- no manual attack input. ──
    playerAttackTick: function (time) {
      if (time < this.attackNextAt) return;
      var self = this, nearest = null, nearestD = Infinity;
      this.enemies.forEach(function (e) {
        var d = Math.hypot(e.x - self.player.x, e.y - self.player.y);
        if (d <= ATTACK_RANGE + e.type.r && d < nearestD) { nearest = e; nearestD = d; }
      });
      if (this.boss && this.boss.active && this.boss.hp > 0) {
        var bd = Math.hypot(this.boss.x - this.player.x, this.boss.y - this.player.y);
        if (bd <= ATTACK_RANGE + this.boss.def.r && bd < nearestD) { nearest = this.boss; nearestD = bd; }
      }
      if (!nearest) return;
      this.attackNextAt = time + ATTACK_INTERVAL_MS;
      this.damageTarget(nearest, this.player.dmg);
      if (this.sfxHit) this.sfxHit.play();
      this.fx.push({ kind: 'hit', x: nearest.x, y: nearest.y - 16, startedAt: time });
    },

    damageTarget: function (target, dmg) {
      target.hp -= dmg;
      if (target === this.boss) {
        if (this.boss.hp <= 0) this.killBoss();
      } else if (target.hp <= 0) {
        this.killEnemy(target);
      }
    },

    killEnemy: function (e) {
      e.icon.destroy();
      this.enemies = this.enemies.filter(function (u) { return u !== e; });
      callbacks.onPoints(3);
      if (this.sfxDeath) this.sfxDeath.play();
    },

    killBoss: function () {
      this.boss.icon.destroy();
      this.boss = null;
      callbacks.onPoints(30);
      this.endGame(true);
    },

    // Manual skill trigger -- no-op if nothing equipped or on cooldown.
    useSkill: function () {
      if (this.paused || this.phase !== 'playing') return;
      var skill = this.player.skill;
      if (!skill) { this.popText(this.player.x, this.player.y - 30, 'ยังไม่มีสกิล!', '#9CA3AF'); return; }
      var now = this.time.now;
      if (now < this.player.skillReadyAt) return;
      this.player.skillReadyAt = now + (skill.cooldownMs || DEFAULT_SKILL_CD_MS);
      if (this.sfxSkill) this.sfxSkill.play();

      if (skill.effect === 'heal') {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + skill.power);
        this.popText(this.player.x, this.player.y - 30, '+' + skill.power + ' ❤️', '#27AE60');
        return;
      }
      // damage / slow -- hits the nearest enemy or boss within a
      // generous radius, same "nearest in range" targeting as the
      // auto-attack but with a much bigger reach.
      var self = this, nearest = null, nearestD = Infinity;
      var SKILL_RANGE = 170;
      this.enemies.forEach(function (e) {
        var d = Math.hypot(e.x - self.player.x, e.y - self.player.y);
        if (d <= SKILL_RANGE && d < nearestD) { nearest = e; nearestD = d; }
      });
      if (this.boss && this.boss.active && this.boss.hp > 0) {
        var bd = Math.hypot(this.boss.x - this.player.x, this.boss.y - this.player.y);
        if (bd <= SKILL_RANGE && bd < nearestD) { nearest = this.boss; nearestD = bd; }
      }
      if (!nearest) { this.popText(this.player.x, this.player.y - 30, 'ไม่มีเป้าหมายในระยะ', '#9CA3AF'); return; }
      this.damageTarget(nearest, skill.power);
      this.fx.push({ kind: 'skill', x1: this.player.x, y1: this.player.y, x2: nearest.x, y2: nearest.y, startedAt: this.time.now });
      if (skill.effect === 'slow' && nearest !== this.boss) nearest.slowedUntil = this.time.now + 2500;
    },

    // ── [SHRINE] Proximity trigger -- pauses for the shared practice
    // popup; on close, heals a little and marks it collected. The boss
    // room's shrine additionally flips boss.active so the boss starts
    // moving/attacking only after that one specific shrine is used.
    shrineTick: function () {
      var self = this;
      this.shrines.forEach(function (s) {
        if (s.collected || self.paused) return;
        var d = Math.hypot(s.x - self.player.x, s.y - self.player.y);
        if (d > SHRINE_R + PLAYER_R) return;
        s.collected = true;
        s.icon.setAlpha(0.25);
        self.roomIndexCleared = Math.max(self.roomIndexCleared, s.roomIdx);
        if (!words.length) {
          self.afterShrine(s);
          return;
        }
        self.paused = true;
        // Drop any latched movement before the popup takes over. Walking
        // into a shrine mid-drag means the finger lifts on top of the
        // modal, not the canvas, so Phaser may never see the pointerup --
        // without this the hero resumes marching the moment it closes.
        self.clearMoveInput();
        var word = words[self.wordIdx++ % words.length];
        callbacks.onPractice(word, null, function () {
          self.paused = false;
          self.afterShrine(s);
        });
      });
    },
    afterShrine: function (s) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + SHRINE_HEAL);
      callbacks.onPoints(8);
      if (this.sfxCoin) this.sfxCoin.play();
      this.popText(s.x, s.y - 20, '+' + SHRINE_HEAL + ' ❤️ +8 ⭐', '#2EC4B6');
      if (s.isBoss && this.boss) this.boss.active = true;
    },

    // ── Regular enemy AI: chase within aggro range, contact damage on
    // a timer once adjacent. ─────────────────────────────────────────
    enemyTick: function (time, dt) {
      var self = this;
      this.enemies.forEach(function (e) {
        var d = Math.hypot(self.player.x - e.x, self.player.y - e.y);
        var spd = e.type.spd * (e.slowedUntil > time ? 0.4 : 1);
        if (d <= ENEMY_AGGRO_RANGE && d > 1) {
          var ux = (self.player.x - e.x) / d, uy = (self.player.y - e.y) / d;
          var nx = e.x + ux * spd * dt, ny = e.y + uy * spd * dt;
          if (self.canMoveTo(nx, e.y, e.type.r)) e.x = nx;
          if (self.canMoveTo(e.x, ny, e.type.r)) e.y = ny;
        }
        e.icon.setPosition(e.x, e.y);
        if (d <= e.type.r + PLAYER_R + 4 && time >= e.nextAtkAt) {
          e.nextAtkAt = time + ENEMY_ATTACK_INTERVAL_MS;
          self.hurtPlayer(e.type.dmg);
        }
      });
    },

    hurtPlayer: function (rawDmg) {
      var dmg = Math.max(1, rawDmg - this.player.def);
      this.player.hp = Math.max(0, this.player.hp - dmg);
      if (this.sfxHurt) this.sfxHurt.play();
      this.popText(this.player.x, this.player.y - 20, '-' + dmg, '#E53935');
      if (this.player.hp <= 0) this.endGame(false);
    },

    // ── [BOSS] Dormant until its shrine triggers boss.active; once
    // active, chases like a regular enemy but bigger, plus one special
    // ability per boss type. ─────────────────────────────────────────
    bossTick: function (time, dt) {
      var boss = this.boss;
      if (!boss || !boss.active) { if (boss) boss.icon.setPosition(boss.x, boss.y); return; }
      var def = boss.def;
      var d = Math.hypot(this.player.x - boss.x, this.player.y - boss.y);
      var raging = boss.ragingUntil > time;
      var spd = def.spd * (raging ? 1.6 : 1);
      if (d > 1) {
        var ux = (this.player.x - boss.x) / d, uy = (this.player.y - boss.y) / d;
        var nx = boss.x + ux * spd * dt, ny = boss.y + uy * spd * dt;
        if (this.canMoveTo(nx, boss.y, def.r)) boss.x = nx;
        if (this.canMoveTo(boss.x, ny, def.r)) boss.y = ny;
      }
      boss.icon.setPosition(boss.x, boss.y);

      if (d <= def.r + PLAYER_R + 6 && time >= boss.nextAtkAt) {
        boss.nextAtkAt = time + (raging ? ENEMY_ATTACK_INTERVAL_MS * 0.5 : ENEMY_ATTACK_INTERVAL_MS);
        this.hurtPlayer(raging ? def.dmg * 1.6 : def.dmg);
      }

      if (def.rageIntervalMs && time >= boss.nextRageAt) {
        boss.nextRageAt = time + def.rageIntervalMs;
        boss.ragingUntil = time + def.rageDurationMs;
        this.popText(boss.x, boss.y - 40, '🔥 RAGE!', '#E53935');
      }

      if (def.breathIntervalMs) {
        if (boss.breathTelegraphUntil && time >= boss.breathTelegraphUntil) {
          boss.breathTelegraphUntil = 0;
          if (Math.hypot(this.player.x - boss.x, this.player.y - boss.y) <= def.breathRadius) {
            this.hurtPlayer(def.breathDmg);
          }
          boss.nextBreathAt = time + def.breathIntervalMs;
        } else if (!boss.breathTelegraphUntil && time >= boss.nextBreathAt) {
          boss.breathTelegraphUntil = time + def.breathTelegraphMs;
          this.popText(boss.x, boss.y - 40, '⚠️', '#F0A500');
        }
      }
    },

    endGame: function (won) {
      if (this.phase !== 'playing') return;
      var self = this;
      this.phase = won ? 'won' : 'lost';
      this.paused = true;
      // Drop any held input and grey the controls out -- the run is over,
      // so a still-deflected stick shouldn't look like it still does
      // something during the 2.2s before the finish screen takes over.
      this.clearMoveInput();
      var ctrls = document.querySelector('.rpg-controls');
      if (ctrls) ctrls.classList.add('is-over');
      if (won && this.sfxWin) this.sfxWin.play();
      this.time.delayedCall(2200, function () {
        // On a loss, one last forced practice word before finishing --
        // same "act now, say the word, then it counts" popup every other
        // game uses, just gating the finish itself this time. Not shown
        // on a win, only "when died".
        if (won || !words.length) { callbacks.onFinish(); return; }
        var word = words[self.wordIdx++ % words.length];
        callbacks.onPractice(word, null, function () { callbacks.onFinish(); });
      });
    },

    popText: function (x, y, text, color) {
      var t = this.add.text(x, y, text, {
        fontFamily: 'Prompt, sans-serif', fontSize: '14px', fontStyle: 'bold',
        color: color, stroke: '#ffffff', strokeThickness: 3
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 800, ease: 'Power2', onComplete: function () { t.destroy(); } });
    },

    update: function (time, delta) {
      var dt = Math.min(delta, 50) / 1000;
      this.g.clear();
      this.drawDungeon(this.g);
      this.drawShrines(this.g);
      this.drawFx(this.g, time);
      this.drawHud(this.g, time);

      if (this.paused || this.phase !== 'playing') {
        this.playerIcon.setPosition(this.player.x, this.player.y);
        if (this.phase !== 'playing') this.drawEndOverlay(this.g);
        return;
      }

      // Movement
      var mv = this.getMoveVec();
      var nx = this.player.x + mv.x * PLAYER_SPD * dt;
      if (this.canMoveTo(nx, this.player.y, PLAYER_R)) this.player.x = nx;
      var ny = this.player.y + mv.y * PLAYER_SPD * dt;
      if (this.canMoveTo(this.player.x, ny, PLAYER_R)) this.player.y = ny;
      this.playerIcon.setPosition(this.player.x, this.player.y);

      this.shrineTick();
      this.enemyTick(time, dt);
      this.bossTick(time, dt);
      this.playerAttackTick(time);
    },

    // ── Drawing ──────────────────────────────────────────────
    drawDungeon: function (g) {
      g.fillStyle(0x0f172a);
      g.fillRect(0, FIELD_Y0, W, H - FIELD_Y0);
      var grid = this.dungeon.grid;
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if (!grid[r][c]) continue;
          var px = FIELD_X0 + c * TILE, py = FIELD_Y0 + r * TILE;
          g.fillStyle(0xCBD5E1);
          g.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        }
      }
      // Enemies + boss (icons are persistent GameObjects, positioned in
      // enemyTick/bossTick -- this only draws the base disc + hp bar)
      var self = this;
      this.enemies.forEach(function (e) { self.drawUnit(g, e.x, e.y, e.type.r, e.type.color, e.hp, e.maxHp); });
      if (this.boss) {
        this.drawUnit(g, this.boss.x, this.boss.y, this.boss.def.r, this.boss.def.color, this.boss.hp, this.boss.maxHp);
        if (this.boss.breathTelegraphUntil) {
          g.lineStyle(3, 0xF0A500, 0.7);
          g.strokeCircle(this.boss.x, this.boss.y, this.boss.def.breathRadius);
        }
      }
      g.fillStyle(0xFFFFFF, 0.9);
      g.fillCircle(this.player.x, this.player.y, PLAYER_R);
      g.lineStyle(2, 0x2EC4B6);
      g.strokeCircle(this.player.x, this.player.y, PLAYER_R);
    },
    drawUnit: function (g, x, y, r, color, hp, maxHp) {
      g.fillStyle(color, 0.9);
      g.fillCircle(x, y, r);
      g.lineStyle(2, 0x111827, 0.7);
      g.strokeCircle(x, y, r);
      var barW = r * 2.2, barX = x - barW / 2, barY = y - r - 12;
      g.fillStyle(0x000000, 0.4);
      g.fillRect(barX, barY, barW, 4);
      var frac = Math.max(0, hp / maxHp);
      g.fillStyle(frac > 0.5 ? 0x27AE60 : frac > 0.25 ? 0xF39C12 : 0xE53935);
      g.fillRect(barX, barY, barW * frac, 4);
    },
    drawShrines: function (g) {
      var t = this.time.now;
      this.shrines.forEach(function (s) {
        if (s.collected) return;
        var pulse = 3 + 2 * Math.sin(t * 0.005);
        g.lineStyle(2, 0xF0A500, 0.8);
        g.strokeCircle(s.x, s.y, SHRINE_R + pulse);
        g.fillStyle(0xF0A500, 0.15);
        g.fillCircle(s.x, s.y, SHRINE_R);
      });
    },
    drawFx: function (g, time) {
      this.fx = this.fx.filter(function (f) {
        var age = time - f.startedAt;
        if (f.kind === 'hit') {
          if (age > 150) return false;
          g.lineStyle(2, 0xffffff, 1 - age / 150);
          g.strokeCircle(f.x, f.y, 6 + age / 10);
          return true;
        }
        if (f.kind === 'skill') {
          if (age > 200) return false;
          g.lineStyle(3, 0x8A5CF6, 1 - age / 200);
          g.lineBetween(f.x1, f.y1, f.x2, f.y2);
          return true;
        }
        return false;
      });
    },
    drawHud: function (g, time) {
      g.fillStyle(0x1e2a40); g.fillRect(0, 0, W, HUD_H);
      var t = this.hudText || (this.hudText = this.add.text(0, 0, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#fff'
      }).setDepth(25));
      var hpFrac = Math.max(0, this.player.hp / this.player.maxHp);
      var roomProg = Math.max(0, this.roomIndexCleared) + '/' + (this.dungeon.rooms.length - 1);
      t.setText('❤️ ' + Math.ceil(this.player.hp) + '/' + this.player.maxHp +
        '   🚪 ' + roomProg + '   🎲 seed ' + this.seed);
      t.setPosition(10, 8);

      // Skill cooldown readout, right side of the HUD
      var skillTxt = this.skillHudText || (this.skillHudText = this.add.text(0, 0, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#fff', align: 'right'
      }).setOrigin(1, 0).setDepth(25));
      var remain = 0, cdFrac = 0;
      if (this.player.skill) {
        remain = Math.max(0, this.player.skillReadyAt - time);
        cdFrac = remain / (this.player.skill.cooldownMs || DEFAULT_SKILL_CD_MS);
        skillTxt.setText(remain > 0 ? '🔮 ' + (remain / 1000).toFixed(1) + 's' : '🔮 พร้อม!');
      } else {
        skillTxt.setText('');
      }
      skillTxt.setPosition(W - 10, 8);

      // Mirror the same cooldown onto the on-screen skill button, so the
      // player watching their thumb doesn't have to also track the HUD.
      var btn = this._skillBtnEl || (this._skillBtnEl = document.getElementById('rpgBtnSkill'));
      if (btn) {
        var ring = this._skillRingEl || (this._skillRingEl = document.getElementById('rpgSkillRing'));
        if (ring) ring.style.setProperty('--cd', Math.max(0, Math.min(1, cdFrac)).toFixed(3));
        var ready = !!this.player.skill && remain <= 0 && this.phase === 'playing';
        if (ready !== this._skillWasReady) {
          btn.classList.toggle('is-ready', ready);
          this._skillWasReady = ready;
        }
      }
    },
    drawEndOverlay: function (g) {
      g.fillStyle(0x000000, 0.55); g.fillRect(0, 0, W, H);
      var won = this.phase === 'won';
      var t = this.endLabel || (this.endLabel = this.add.text(0, 0, '', {
        fontFamily: 'Prompt, sans-serif', fontSize: '32px', fontStyle: 'bold', color: '#fff', align: 'center'
      }).setOrigin(0.5).setDepth(40));
      t.setText(won ? '🎉 ปราบบอสสำเร็จ!' : '💀 พ่ายแพ้');
      t.setColor(won ? '#F0A500' : '#E53935');
      t.setPosition(W / 2, H / 2);
    }
  });

  return new Phaser.Game({
    type:   Phaser.AUTO,
    parent: 'rpgGame',
    width:  W, height: H,
    scale:  { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY, autoRound: true },
    scene:  RpgScene
  });
}

// ── Public API (mirrors ShootingGame, TowerDefenseGame, etc.) ───────
// Unlike every other game, this one needs an async Supabase read (the
// player's equipped weapon/armor/skill) before its stats make sense, so
// start() resolves that into a scene-independent global (window.__rpgLoadout)
// before constructing the Phaser.Game -- same "resolve async data first,
// then build the game" shape js/game-dressup.js already uses for its
// catalog fetch.
var RpgGame = (function () {
  var game = null;
  // Bumped by every start()/stop() so a start() superseded by a later
  // stop() (e.g. a fast retry double-tap, or a fresh start() firing before
  // this one's async loadLoadout()/setTimeout resolve) can detect that and
  // skip creating its game -- otherwise its create() would clobber the
  // newer call's _rpgStickFns/_rpgSkillFn/_rpgKeydownFn/_rpgKeyupFn module
  // vars out from under it, leaking the superseded generation's listeners
  // with no way for stop() to ever reach them again.
  var startToken = 0;

  async function loadLoadout() {
    var loadout = {};
    if (typeof sb === 'undefined' || !sb) return loadout;
    try {
      // FREE_MODE: there's no shop to equip from, so just take the
      // strongest item in each category. Highest `power` wins; for the
      // skill, ties break toward the shorter cooldown.
      if (typeof isFreeMode === 'function' && isFreeMode()) {
        var { data: allItems } = await sb.from('rpg_items').select('*');
        (allItems || []).forEach(function (item) {
          if (item.category === 'weapon') {
            if (loadout.weaponPower === undefined || item.power > loadout.weaponPower) loadout.weaponPower = item.power;
          } else if (item.category === 'armor') {
            if (loadout.armorPower === undefined || item.power > loadout.armorPower) loadout.armorPower = item.power;
          } else if (item.category === 'skill') {
            var better = !loadout.skill || item.power > loadout.skill.power ||
              (item.power === loadout.skill.power && (item.cooldown_ms || 0) < (loadout.skill.cooldownMs || 0));
            if (better) loadout.skill = { power: item.power, cooldownMs: item.cooldown_ms, effect: item.effect, name: item.name };
          }
        });
        return loadout;
      }
      var session = await Auth.getSession();
      if (!session) return loadout;
      var { data: profile } = await sb.from('profiles')
        .select('equipped_weapon, equipped_armor, equipped_skill')
        .eq('user_id', session.user.id).maybeSingle();
      if (!profile) return loadout;
      var ids = [profile.equipped_weapon, profile.equipped_armor, profile.equipped_skill].filter(Boolean);
      if (!ids.length) return loadout;
      var { data: items } = await sb.from('rpg_items').select('*').in('id', ids);
      (items || []).forEach(function (item) {
        if (item.category === 'weapon') loadout.weaponPower = item.power;
        else if (item.category === 'armor') loadout.armorPower = item.power;
        else if (item.category === 'skill') {
          loadout.skill = { power: item.power, cooldownMs: item.cooldown_ms, effect: item.effect, name: item.name };
        }
      });
    } catch (e) {
      console.error('[rpg] failed to load equipped loadout:', e);
    }
    return loadout;
  }

  function start(words, cbs) {
    stop();
    var token = startToken;
    loadLoadout().then(function (loadout) {
      if (token !== startToken) return; // superseded -- see comment on startToken
      window.__rpgLoadout = loadout;
      setTimeout(function () {
        if (token !== startToken) return;
        game = createRpgGame(words, cbs);
      }, 60);
    });
  }
  function stop() {
    startToken++;
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
    // Done here rather than the scene's own 'shutdown' event -- see the
    // comment on _rpgStickFns above createRpgGame().
    if (_rpgStickFns) {
      var s = _rpgStickFns;
      s.stick.removeEventListener('pointerdown', s.down);
      s.stick.removeEventListener('pointermove', s.move);
      s.stick.removeEventListener('pointerup', s.up);
      s.stick.removeEventListener('pointercancel', s.up);
      _rpgStickFns = null;
    }
    // Leave no stale cooldown wipe / ready-pulse on the button between runs.
    var knob = document.getElementById('rpgStickKnob');
    if (knob) { knob.style.transition = ''; knob.style.transform = ''; }
    var ring = document.getElementById('rpgSkillRing');
    if (ring) ring.style.setProperty('--cd', '0');
    var skillBtn = document.getElementById('rpgBtnSkill');
    if (skillBtn) skillBtn.classList.remove('is-ready');
    var ctrls = document.querySelector('.rpg-controls');
    if (ctrls) ctrls.classList.remove('is-over');
    if (skillBtn && _rpgSkillFn) {
      skillBtn.removeEventListener('mousedown', _rpgSkillFn);
      skillBtn.removeEventListener('touchstart', _rpgSkillFn);
      _rpgSkillFn = null;
    }
    if (_rpgKeydownFn) { window.removeEventListener('keydown', _rpgKeydownFn); _rpgKeydownFn = null; }
    if (_rpgKeyupFn) { window.removeEventListener('keyup', _rpgKeyupFn); _rpgKeyupFn = null; }
  }
  return { start: start, stop: stop };
}());
