/* UI experiment A -- home (today card + lesson path), setup summary, results title. */
(function () {
  var U = KidUI, esc = U.esc;
  function $(id) { return document.getElementById(id); }
  function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }
  function setHtml(el, h) { if (el && el._h !== h) { el._h = h; el.innerHTML = h; U.paint(el); } }

  var pathSound = null;

  function renderHome() {
    var kid = window.KID || { name: '', total: 0, streak: 0, homework: null, levels: {} };
    var loggedIn = window._kidSession === true || !!(kid.name || kid.total || kid.homework || Object.keys(kid.levels).length);
    setText($('kaGreeting'), U.greeting());
    setText($('kaName'), kid.name || (loggedIn ? 'นักฝึกพูด' : 'ยินดีต้อนรับ'));
    var av = $('kaAvatar');
    if (kid.name) { av.textContent = kid.name.trim().charAt(0).toUpperCase(); }
    $('kaChips').hidden = !loggedIn;
    setText($('kaStreak'), String(kid.streak || 0));
    setText($('kaTotal'), String(kid.total || 0));

    var today = $('kaToday'), h;
    if (!loggedIn) {
      h = '<div class="ka-eyebrow">เริ่มต้น</div><h2>เข้าสู่ระบบเพื่อฝึกคำจากคุณครู</h2>' +
        '<p>เก็บดาวและดูว่าฝึกไปกี่คำแล้ว</p>' +
        '<a class="ka-cta" href="login.html"><span data-ic="key"></span>เข้าสู่ระบบ</a>';
    } else if (kid.homework) {
      var hw = kid.homework, pct = Math.round(hw.done / Math.max(1, hw.words) * 100);
      h = '<div class="ka-eyebrow">ภารกิจวันนี้</div><h2>' + esc(hw.name) + '</h2>' +
        '<p>' + hw.words + ' คำ · พูดคำละ ' + hw.repeat + ' ครั้ง</p>' +
        '<div class="ka-bar-row"><div class="ka-bar"><span style="width:' + pct + '%"></span></div>' + hw.done + '/' + hw.words + '</div>' +
        '<button type="button" class="ka-cta" data-act="homework"><span data-ic="play"></span>' + (hw.done ? 'ทำการบ้านต่อ' : 'เริ่มทำการบ้าน') + '</button>' +
        '<button type="button" class="ka-link-2" data-act="games">หรือเลือกเกมเอง</button>';
    } else {
      var g = U.GAMES[U.lastGame()] || U.GAMES.flashcard;
      h = '<div class="ka-eyebrow">ฝึกพูดวันนี้</div><h2>ไม่มีการบ้านค้าง เก่งมาก!</h2>' +
        '<p>' + (kid.total ? 'ฝึกไปแล้ว ' + kid.total + ' ครั้ง ลองฝึกต่ออีกนิดไหม' : 'เริ่มฝึกเสียงแรกกันเลย') + '</p>' +
        '<button type="button" class="ka-cta" data-act="last"><span data-ic="play"></span>เล่น' + esc(g.name) + '</button>';
    }
    setHtml(today, h);
    renderPath();
  }

  function renderPath() {
    var all = U.sounds();
    var sec = $('kaPathSec');
    if (!all.length) { sec.hidden = true; return; }
    if (!pathSound || all.indexOf(pathSound) === -1) pathSound = U.favouriteSound();
    sec.hidden = false;
    setText($('kaPathTitle'), 'บทเรียนเสียง ' + pathSound);
    setHtml($('kaSoundTabs'), all.map(function (s) {
      return '<button type="button" class="ka-sound" role="tab" aria-selected="' + (s === pathSound) + '" data-sound="' + esc(s) + '">' + esc(s) + '</button>';
    }).join(''));
    var steps = U.levelPath(pathSound);
    setHtml($('kaPath'), steps.map(function (s, i) {
      return '<li class="ka-step ' + s.state + '"><button type="button" data-level="' + esc(s.level) + '" title="' + esc(s.level) + ' · ฝึกแล้ว ' + s.done + '/' + s.total + ' คำ">' +
        '<span class="ka-node">' + (s.state === 'done' ? '<span data-ic="check"></span>' : (i + 1)) + '</span>' +
        '<small>' + esc(s.short) + '</small></button></li>';
    }).join(''));
    var tab = document.querySelector('.ka-sound[aria-selected="true"]');
    if (tab && tab.scrollIntoView && !renderPath._scrolled) { renderPath._scrolled = true; tab.scrollIntoView({ block: 'nearest', inline: 'center' }); }
  }

  function renderSetup(ws, mode) {
    var g = U.GAMES[mode] || {};
    var art = $('kaSetupArt');
    if (art && art.getAttribute('data-mode') !== mode) {
      art.setAttribute('data-mode', mode);
      art.style.setProperty('--ga', g.ga || '');
      art.style.setProperty('--gb', g.gb || '');
      art.innerHTML = '<span data-ic="' + (g.icon || 'games') + '"></span>';
      U.paint(art);
      $('kaAdult').open = false;
    }
    var card = $('kaSetSummary');
    if (!card) return;
    setText($('kaSetName'), ws.name);
    setText($('kaSetMeta'), ws.meta);
    var warn = !ws.ok || !ws.count;
    if (card.classList.contains('warn') !== warn) card.classList.toggle('warn', warn);
    // Nothing to practise: open the adult settings so the fix is visible.
    if (warn && ws.kind !== 'hw' && !$('kaAdult').open && ws.count === 0 && document.querySelector('#setupSoundList input')) $('kaAdult').open = true;
  }

  function renderResults() {
    var n = (window.G && G.practiced && G.practiced.length) || 0;
    setText($('kaResWords'), String(n));
    var s = typeof starsForRound === 'function' ? starsForRound(n) : 0;
    setText($('kaResTitle'), s >= 3 ? 'เก่งมาก!' : s === 2 ? 'ดีมาก!' : s === 1 ? 'ทำได้ดี!' : 'จบแล้ว!');
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-act],[data-sound],[data-level],#kaSetSummary,.ka-tab[data-tab]') : null;
    if (!t) return;
    if (t.id === 'kaSetSummary') {
      var d = $('kaAdult'); d.open = true;
      setTimeout(function () { d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
      return;
    }
    if (t.hasAttribute('data-tab')) {
      document.querySelectorAll('.ka-tab[data-tab]').forEach(function (x) { x.classList.toggle('on', x === t); });
      if (document.body.getAttribute('data-screen') !== 'screenMode' && typeof showScreen === 'function') showScreen('screenMode');
      return;
    }
    var act = t.getAttribute('data-act');
    if (act === 'homework') startHomework();
    else if (act === 'last') openSetup(U.lastGame());
    else if (act === 'games') $('kaGamesSec').scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (t.hasAttribute('data-sound')) { pathSound = t.getAttribute('data-sound'); renderPath(); }
    else if (t.hasAttribute('data-level')) openSetupWith(U.lastGame(), pathSound, t.getAttribute('data-level'));
  });

  document.addEventListener('kidstats', renderHome);
  U.onSetupChange(renderSetup);
  U.onScreen(function (id) {
    if (id === 'screenFinish') renderResults();
    if (id === 'screenMode') { renderHome(); window.scrollTo(0, 0); }
  });
  // The session check is quick; show the right greeting before the stats arrive.
  if (window.Auth && Auth.getSession) Auth.getSession().then(function (s) { window._kidSession = !!s; if (!s || window.KID) renderHome(); }).catch(function () {});

  U.wire();
  setText($('kaGreeting'), U.greeting());
})();
