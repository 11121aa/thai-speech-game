/* Helpers shared by the three UI experiments (identical file on ui-a,
   ui-b and ui-c). Reads the page's existing globals -- _allWords, KID,
   _setupMode, openSetup, showScreen -- and never changes game logic. */
var KidUI = (function () {
  var GAMES = {
    shooting:     { icon: 'target',    name: 'ยิงเป้า',       ga: '#FFE4DC', gb: '#E0461F' },
    cooking:      { icon: 'pan',       name: 'ทำอาหาร',       ga: '#FFF1D6', gb: '#C77F06' },
    airplane:     { icon: 'plane',     name: 'ขับเครื่องบิน', ga: '#DDEFFF', gb: '#2B82D9' },
    matching:     { icon: 'cards',     name: 'จับคู่ภาพ',     ga: '#EEE6FF', gb: '#7A55E0' },
    platformer:   { icon: 'runner',    name: 'วิ่งเก็บเหรียญ', ga: '#DFF6E6', gb: '#239B56' },
    crossy:       { icon: 'car',       name: 'ข้ามถนน',       ga: '#FFE3EC', gb: '#D6336C' },
    flashcard:    { icon: 'flashcard', name: 'ไพ่คำศัพท์',    ga: '#E2F4F4', gb: '#15878A' },
    dressup:      { icon: 'dress',     name: 'แต่งตัวตุ๊กตา', ga: '#FCE7F6', gb: '#B83CA0' },
    towerdefense: { icon: 'bow',       name: 'ป้องกันฐาน',    ga: '#ECEBDF', gb: '#6F6A2E' },
    tetris:       { icon: 'blocks',    name: 'เตตริส',        ga: '#E4E8FF', gb: '#4257D6' },
    rpg:          { icon: 'star',      name: 'ผจญภัยดันเจี้ยน', ga: '#ECE6F5', gb: '#5B3F8C' }
  };

  // Short, kid-path labels for the therapist's seven levels (full name kept as a title).
  var LEVELS = [
    ['คำ 1 พยางค์ไม่มีความหมาย', 'พยางค์ 1'],
    ['คำ 2 พยางค์ไม่มีความหมาย', 'พยางค์ 2'],
    ['คำ 3 พยางค์ไม่มีความหมาย', 'พยางค์ 3'],
    ['คำ 1 พยางค์ มีความหมาย', 'คำ 1'],
    ['คำ 2 พยางค์', 'คำ 2'],
    ['คำ 3 พยางค์', 'คำ 3'],
    ['ประโยค', 'ประโยค']
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function paint(root) { if (window.KidIcons) KidIcons.paint(root || document); }

  function greeting() {
    var h = new Date().getHours();
    return h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
  }

  function words() { return (typeof _allWords !== 'undefined' && _allWords) || []; }

  function sounds() {
    var s = [];
    words().forEach(function (w) { if (w.letter_category && s.indexOf(w.letter_category) === -1) s.push(w.letter_category); });
    return s.sort(function (a, b) { return a.localeCompare(b, 'th'); });
  }

  // The sound the child has practised most, else the first one.
  function favouriteSound() {
    var lv = (window.KID && KID.levels) || {}, best = null, n = -1;
    Object.keys(lv).forEach(function (s) {
      var c = 0; Object.keys(lv[s]).forEach(function (k) { c += lv[s][k]; });
      if (c > n) { n = c; best = s; }
    });
    var all = sounds();
    return best && all.indexOf(best) !== -1 ? best : all[0] || null;
  }

  // Levels that have words for this sound, with how many different words
  // the child has practised. A level counts as done once every word (or
  // ten of them, for long lists) has been practised at least once.
  function levelPath(sound) {
    var practised = (window.KID && KID.levels && KID.levels[sound]) || {};
    var steps = [];
    LEVELS.forEach(function (L) {
      var total = words().filter(function (w) { return w.letter_category === sound && w.level === L[0]; }).length;
      if (!total) return;
      var done = practised[L[0]] || 0;
      steps.push({ level: L[0], short: L[1], total: total, done: done, complete: done >= Math.min(total, 10) });
    });
    var nowSet = false;
    steps.forEach(function (s) {
      s.state = s.complete ? 'done' : (!nowSet ? (nowSet = true, 'now') : 'next');
    });
    return steps;
  }

  function lastGame() { return (typeof lastPlayedGame === 'function' && lastPlayedGame()) || 'flashcard'; }

  // What the setup screen is about to practise, in plain words.
  function describeWordSet() {
    var active = document.querySelector('#hwDiffBtns .diff-btn.active');
    var kind = active ? active.getAttribute('data-diff') : 'custom';
    var count = parseInt(($('setupWordCount') || {}).textContent, 10) || 0;
    var out = { kind: kind, count: count, ok: count > 0, name: '', meta: '' };
    if (kind === 'hw') {
      var sel = document.querySelector('.hw-selector-btn.is-selected strong, .hw-selector-btn.btn-warning strong');
      out.name = sel ? sel.textContent : 'การบ้าน';
      out.meta = sel ? count + ' คำ จากคุณครู' : 'แตะเพื่อเลือกการบ้าน';
      if (!sel) out.ok = false;
    } else if (kind === 'worksheet') {
      var ws = document.querySelector('.worksheet-selector-btn.btn-warning strong');
      out.name = ws ? ws.textContent : 'แบบฝึกหัด';
      out.meta = ws ? count + ' คำ' : 'แตะเพื่อเลือกแบบฝึกหัด';
      if (!ws) out.ok = false;
    } else {
      var snd = document.querySelector('#setupSoundList input:checked');
      var lv = document.querySelectorAll('#setupLevelList input:checked').length;
      out.name = snd ? 'ฝึกเสียง ' + snd.value : 'เลือกคำเอง';
      out.meta = count + ' คำ · ' + (lv === LEVELS.length ? 'ทุกระดับ' : lv + ' ระดับ');
    }
    if (!count && out.ok === false) return out;
    if (!count) out.meta = 'ยังไม่มีคำ แตะเพื่อเลือกใหม่';
    return out;
  }

  var setupListeners = [];
  function onSetupChange(fn) { setupListeners.push(fn); }
  function fireSetup() { setupListeners.forEach(function (fn) { try { fn(describeWordSet(), window._setupMode); } catch (e) { console.error(e); } }); }

  var screenListeners = [];
  function onScreen(fn) { screenListeners.push(fn); }

  function wire() {
    document.body.setAttribute('data-screen', 'screenMode');
    if (typeof window.showScreen === 'function') {
      var orig = window.showScreen;
      window.showScreen = function (id) {
        orig(id);
        document.body.setAttribute('data-screen', id);
        screenListeners.forEach(function (fn) { fn(id); });
      };
    }
    if (typeof window.openSetup === 'function') {
      var origOpen = window.openSetup;
      window.openSetup = function (mode) {
        origOpen(mode);
        fireSetup();
      };
    }

    // Anything that appears later (leaderboards, results, pop-up) gets its icons.
    var raf = 0, setupDirty = false;
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { if ($('screenSetup') && $('screenSetup').contains(m.target)) setupDirty = true; });
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0; paint(document);
        if (setupDirty) { setupDirty = false; fireSetup(); }
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
    document.addEventListener('change', function (e) { if (e.target.closest && e.target.closest('#screenSetup')) fireSetup(); });

    // Long words and sentences get a smaller size in the pop-up.
    var word = $('ppWord');
    if (word) new MutationObserver(function () {
      word.classList.toggle('is-long', word.textContent.replace(/\s/g, '').length > 7);
    }).observe(word, { childList: true, characterData: true, subtree: true });

    // Our own "listen to yourself" button drives the hidden native player.
    var audio = $('ppPlaybackAudio');
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-mine-play]');
      if (!b || !audio) return;
      if (audio.paused) { audio.currentTime = audio.ended ? 0 : audio.currentTime; audio.play().catch(function () {}); }
      else audio.pause();
    });
    if (audio) ['play', 'pause', 'ended', 'emptied'].forEach(function (ev) {
      audio.addEventListener(ev, function () {
        document.querySelectorAll('[data-mine-play] [data-ic]').forEach(function (i) {
          i.setAttribute('data-ic', audio.paused || audio.ended ? 'play' : 'pause');
        });
        paint($('practiceModal'));
      });
    });
    paint(document);
  }

  return {
    GAMES: GAMES, LEVELS: LEVELS, esc: esc, paint: paint, greeting: greeting, sounds: sounds,
    favouriteSound: favouriteSound, levelPath: levelPath, lastGame: lastGame, describeWordSet: describeWordSet,
    onSetupChange: onSetupChange, onScreen: onScreen, wire: wire
  };
})();
