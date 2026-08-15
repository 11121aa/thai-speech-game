// ============================================================
//  TOWER DEFENSE GAME — Phaser 3  (place troops, defend the base)
// ============================================================
//  POLISH GUIDE (search for the label to find where to edit):
//    [TUNE]    Starting gold/lives, wave count, pacing   (~line 20)
//    [PATH]    The road enemies walk + placement slots    (~PATH / SLOTS)
//    [TROOPS]  Archer & swordsman stats per tier          (~TROOPS)
//    [ENEMY]   Enemy types + per-wave spawn scaling       (~ENEMY_TYPES / buildWave)
//    [UI]      Bottom troop palette + start-wave button   (~drawPalette)
// ============================================================
//  How the game works:
//    - A road winds across the screen from the portal (left) to your
//      base (right). Enemies walk it every wave; each one that reaches
//      the base costs you a life.
//    - Tap a troop card at the bottom to select it, then tap an empty
//      dashed slot near the road to place it (costs gold).
//    - Tap an already-placed troop to upgrade it (also costs gold) —
//      3 tiers per troop, the 3rd tier unlocks a special ability:
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

function createTowerDefenseGame(words, callbacks) {
  var W = 800, H = 500;

  // ── [TUNE] Difficulty & pacing knobs ─────────────────────────
  var START_GOLD  = 100;
  var START_LIVES = 10;
  var WAVES_TOTAL = 8;
  var SPAWN_GAP_MS = 750;      // time between enemy spawns within a wave
  var RAGE_INTERVAL = 8000;    // ms between swordsman-tier3 rage triggers
  var RAGE_DURATION = 3000;    // ms rage lasts

  var HUD_H = 40, FIELD_Y0 = HUD_H, FIELD_Y1 = 378, PAL_Y0 = 378;

  // ── [PATH] The road (enemies walk waypoint-to-waypoint) + fixed
  // placement pads flanking it. Not pixel-perfect clearance -- this is
  // a rough first version -- just visually clear of the road.
  var PATH = [
    { x: -20, y: 90 }, { x: 170, y: 90 }, { x: 170, y: 270 },
    { x: 380, y: 270 }, { x: 380, y: 110 }, { x: 580, y: 110 },
    { x: 580, y: 300 }, { x: 800, y: 300 }
  ];
  var BASE_X = 780, BASE_Y = 300, PORTAL_X = 10, PORTAL_Y = 90;
  // Kept clear of the HUD strip (y < HUD_H) and palette bar (y > PAL_Y0)
  // given the SLOT_R=26 circle drawn around each one.
  var SLOTS = [
    { x: 90,  y: 170 }, { x: 110, y: 230 }, { x: 250, y: 210 },
    { x: 270, y: 335 }, { x: 320, y: 190 }, { x: 440, y: 190 },
    { x: 480, y: 68 },  { x: 520, y: 230 }, { x: 650, y: 230 },
    { x: 690, y: 348 }, { x: 700, y: 150 }
  ];
  var SLOT_R = 26;

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
        { range: 72, dmg: 7,  atkMs: 850 },
        { range: 82, dmg: 10, atkMs: 750 },
        { range: 88, dmg: 13, atkMs: 650, rage: true }
      ]
    }
  };

  // ── [ENEMY] Types + per-wave scaling ─────────────────────────
  var ENEMY_TYPES = [
    { key: 'slime', name: 'สไลม์',   emoji: '🟢', hp: 18, spd: 40, gold: 4, dmg: 1, color: 0x27AE60 },
    { key: 'bat',   name: 'ค้างคาว', emoji: '🦇', hp: 10, spd: 66, gold: 3, dmg: 1, color: 0x8E44AD },
    { key: 'rock',  name: 'หิน',     emoji: '🪨', hp: 46, spd: 24, gold: 8, dmg: 2, color: 0x7F8C8D }
  ];
  function buildWave(waveNum) {
    var count = 5 + waveNum * 2;
    var hpMul = 1 + (waveNum - 1) * 0.16;
    var list = [];
    for (var i = 0; i < count; i++) {
      var type;
      var roll = Math.random();
      if (waveNum >= 5 && roll < 0.28) type = ENEMY_TYPES[2];
      else if (roll < 0.4) type = ENEMY_TYPES[1];
      else type = ENEMY_TYPES[0];
      list.push({ type: type, hpMul: hpMul });
    }
    return list;
  }

  var TdScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function () {
      Phaser.Scene.call(this, { key: 'towerdefense' });
      this.towers = [];       // { slot, kind, tier, x, y, nextAtkAt, nextRageAt, ragingUntil, icon }
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
        'แตะเลือกทหาร → แตะจุดประวางกำลังพล — แล้วกด "เริ่มด่าน"!', {
          fontFamily: 'Prompt, sans-serif', fontSize: '14px', fontStyle: 'bold',
          color: '#2b2438', backgroundColor: '#ffffffcc', padding: { x: 8, y: 4 }
        }).setOrigin(0.5, 0).setDepth(20);
      this.time.delayedCall(4200, function () {
        self.tweens.add({ targets: hint, alpha: 0, duration: 500, onComplete: function () { hint.destroy(); } });
      });

      this.input.on('pointerdown', function (ptr) { self.onTap(ptr.x, ptr.y); });
    },

    // ── Input: troop cards → start-wave button → slots ──────────
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

      for (var i = 0; i < SLOTS.length; i++) {
        var s = SLOTS[i];
        if (Math.hypot(x - s.x, y - s.y) <= SLOT_R + 6) { this.tapSlot(i); return; }
      }
    },
    hit: function (px, py, x, y, w, h) { return px >= x && px <= x + w && py >= y && py <= y + h; },

    tapSlot: function (idx) {
      var existing = this.towers.filter(function (t) { return t.slot === idx; })[0];
      if (existing) { this.tryUpgrade(existing); return; }
      if (!this.selected) return;
      this.tryPlace(idx, this.selected);
    },

    tryPlace: function (slotIdx, kind) {
      var def = TROOPS[kind];
      var cost = def.costs[0];
      if (this.gold < cost) { this.badTap('เหรียญไม่พอ! 🪙'); return; }
      this.gold -= cost;
      var s = SLOTS[slotIdx];
      var icon = this.add.text(s.x, s.y, def.emoji, { fontSize: '22px' }).setOrigin(0.5).setDepth(5);
      this.towers.push({
        slot: slotIdx, kind: kind, tier: 0, x: s.x, y: s.y,
        nextAtkAt: 0, nextRageAt: this.time.now + RAGE_INTERVAL, ragingUntil: 0, icon: icon
      });
      this.sfxCoin.play();
      this.popText(s.x, s.y - 30, def.emoji + ' วาง!', '#2EC4B6');
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

      // Slots
      var self = this;
      SLOTS.forEach(function (s, idx) {
        var occ = self.towers.some(function (t) { return t.slot === idx; });
        if (occ) return;
        var canAfford = self.selected && self.gold >= TROOPS[self.selected].costs[0];
        var pulse = canAfford ? 3 * Math.sin(time * 0.006 + idx) : 0;
        g.lineStyle(2.5, canAfford ? 0x2EC4B6 : 0xBBAA88, canAfford ? 0.95 : 0.7);
        g.strokeCircle(s.x, s.y, SLOT_R + pulse);
      });

      // Towers (range ring + base disc; icon text is a persistent GameObject updated below)
      this.towers.forEach(function (t) {
        var def = TROOPS[t.kind], tierDef = def.tiers[t.tier];
        var raging = t.ragingUntil > time;
        g.fillStyle(def.color, 0.06); g.fillCircle(t.x, t.y, tierDef.range);
        g.lineStyle(1, def.color, 0.18); g.strokeCircle(t.x, t.y, tierDef.range);
        var baseR = 15 + t.tier * 3;
        if (t.tier === def.tiers.length - 1) {
          var auraColor = t.kind === 'archer' ? 0xF0A500 : 0xE53935;
          g.fillStyle(auraColor, raging ? 0.5 : (0.22 + 0.1 * Math.sin(time * 0.006)));
          g.fillCircle(t.x, t.y, baseR + 9);
        }
        g.fillStyle(0xFFFFFF, 0.9); g.fillCircle(t.x, t.y, baseR);
        g.lineStyle(3, def.color); g.strokeCircle(t.x, t.y, baseR);
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
      t.setText('🌊 ด่าน ' + waveLbl + '     ❤️ ' + this.lives + '     🪙 ' + this.gold);
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
  function start(words, cbs) {
    stop();
    setTimeout(function () { game = createTowerDefenseGame(words, cbs); }, 60);
  }
  function stop() {
    if (game) { try { game.destroy(true); } catch (e) {} game = null; }
  }
  return { start: start, stop: stop };
}());
