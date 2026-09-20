/* UI experiment B -- owl guide, sound balloons, islands, ready card with a hold-to-open lock. */
(function () {
  var U = KidUI, esc = U.esc;
  var BALLOON_COLORS = ['#FF5FA2', '#7B61FF', '#3BB75E', '#FFB020', '#2B9BEA', '#F2542D'];
  function $(id) { return document.getElementById(id); }
  function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }
  function setHtml(el, h) { if (el && el._h !== h) { el._h = h; el.innerHTML = h; U.paint(el); drawArt(el); } }
  function drawArt(root) {
    (root || document).querySelectorAll('.kb-owl:empty').forEach(function (o) { o.innerHTML = KidArtB.owl; });
    (root || document).querySelectorAll('.kb-trophy:empty').forEach(function (o) { o.innerHTML = KidArtB.trophy; });
  }

  function renderHome() {
    var kid = window.KID || { name: '', total: 0, streak: 0, homework: null, levels: {} };
    var loggedIn = window._kidSession === true || !!(kid.name || kid.total || kid.homework);
    var name = kid.name || 'เพื่อนตัวน้อย';
    setText($('kbName'), loggedIn ? name : 'สวัสดี!');
    if (kid.name) $('kbAvatar').textContent = kid.name.trim().charAt(0).toUpperCase();
    $('kbCoinPill').hidden = !loggedIn; $('kbStreakPill').hidden = !loggedIn || !kid.streak;
    setText($('kbTotal'), String(kid.total || 0)); setText($('kbStreak'), String(kid.streak || 0));

    var h;
    if (!loggedIn) {
      h = '<p class="kb-hand">สวัสดีจ้า! เข้าสู่ระบบก่อนนะ แล้วมาเล่นด้วยกัน</p>' +
        '<a class="kb-candy pink" href="login.html"><span data-ic="key"></span>เข้าสู่ระบบ</a>';
    } else if (kid.homework) {
      var left = kid.homework.words - kid.homework.done;
      h = '<p class="kb-hand">สวัสดี ' + esc(name) + '! คุณครูฝากการบ้าน “' + esc(kid.homework.name) + '” ไว้ อีก ' + left + ' คำเอง</p>' +
        '<button type="button" class="kb-candy pink" data-act="homework"><span data-ic="play"></span>ไปทำการบ้าน</button>' +
        '<button type="button" class="kb-alt" data-act="games">ขอเลือกเกมเองก่อน</button>';
    } else {
      var g = U.GAMES[U.lastGame()] || U.GAMES.flashcard;
      h = '<p class="kb-hand">เก่งมาก ' + esc(name) + '! การบ้านเสร็จหมดแล้ว วันนี้อยากเล่นอะไรดี?</p>' +
        '<button type="button" class="kb-candy purple" data-act="last"><span data-ic="play"></span>เล่น' + esc(g.name) + '</button>';
    }
    setHtml($('kbBubble'), h);

    var sounds = U.sounds(), fav = U.favouriteSound();
    $('kbBalloonsSec').hidden = !sounds.length || !loggedIn;
    setHtml($('kbBalloons'), sounds.map(function (s, i) {
      return '<button type="button" class="kb-balloon' + (s === fav ? ' fav' : '') + '" style="--c:' + BALLOON_COLORS[i % BALLOON_COLORS.length] + ';--i:' + i + '" data-sound="' + esc(s) + '" aria-label="ฝึกเสียง ' + esc(s) + '">' + esc(s) + '</button>';
    }).join(''));

    var last = U.lastGame();
    document.querySelectorAll('.kb-island').forEach(function (c) {
      var on = c.id.toLowerCase() === 'card' + last;
      if (c.classList.contains('is-last') !== on) c.classList.toggle('is-last', on);
    });
  }

  function renderSetup(ws, mode) {
    var g = U.GAMES[mode] || {};
    var art = $('kbSetupArt');
    if (art && art.getAttribute('data-mode') !== mode) {
      art.setAttribute('data-mode', mode);
      art.style.setProperty('--ga', g.ga || ''); art.style.setProperty('--gb', g.gb || '');
      art.innerHTML = '<span data-ic="' + (g.icon || 'games') + '"></span>';
      U.paint(art);
      setAdult(false);
    }
    setText($('kbSetName'), ws.name);
    setText($('kbSetMeta'), ws.meta);
    var warn = !ws.ok || !ws.count, set = $('kbSet');
    if (set.classList.contains('warn') !== warn) set.classList.toggle('warn', warn);
    if (warn && ws.kind === 'custom' && ws.count === 0 && $('kbAdult').hidden && document.querySelector('#setupSoundList input')) setAdult(true);
  }

  function setAdult(open) {
    var panel = $('kbAdult'), lock = $('kbLock');
    if (panel.hidden === !open) return;
    panel.hidden = !open;
    lock.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(function () { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
  }

  // Grown-up settings open after holding the lock for a moment, so a
  // child tapping around the card doesn't land in them by accident.
  (function wireLock() {
    var lock = $('kbLock'); if (!lock) return;
    var t0 = 0, raf = 0, HOLD = 700;
    function tick() {
      var p = Math.min(1, (performance.now() - t0) / HOLD);
      lock.style.setProperty('--p', p.toFixed(3));
      if (p >= 1) { stop(); setAdult($('kbAdult').hidden); return; }
      raf = requestAnimationFrame(tick);
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; t0 = 0; lock.style.setProperty('--p', '0'); }
    lock.addEventListener('pointerdown', function (e) { e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(tick); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { lock.addEventListener(ev, function () { if (t0) stop(); }); });
    lock.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    lock.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAdult($('kbAdult').hidden); } });
  })();

  function renderResults() {
    var n = (window.G && G.practiced && G.practiced.length) || 0;
    var s = typeof starsForRound === 'function' ? starsForRound(n) : 0;
    setText($('kbWinTitle'), s >= 3 ? 'สุดยอด!' : s === 2 ? 'เก่งมาก!' : s === 1 ? 'ดีมาก!' : 'จบแล้ว!');
    drawArt($('screenFinish'));
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-act],[data-sound]') : null;
    if (!t) return;
    var act = t.getAttribute('data-act');
    if (act === 'homework') startHomework();
    else if (act === 'last') openSetup(U.lastGame());
    else if (act === 'games') document.querySelector('.kb-world').scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (t.hasAttribute('data-sound')) openSetupWith(U.lastGame(), t.getAttribute('data-sound'));
  });

  document.addEventListener('kidstats', renderHome);
  U.onSetupChange(renderSetup);
  U.onScreen(function (id) {
    if (id === 'screenFinish') renderResults();
    if (id === 'screenMode') { renderHome(); window.scrollTo(0, 0); }
  });
  if (window.Auth && Auth.getSession) Auth.getSession().then(function (s) {
    window._kidSession = !!s;
    if (!s || window.KID) renderHome();
    // A therapist reaching the kid screens came from their own workspace,
    // so the dock link back to it says "return", not "parents".
    if (s && Auth.getRole) Auth.getRole(s.user.id).then(function (role) {
      if (role !== 'specialist') return;
      var a = document.querySelector('#navSelf a');
      if (!a) return;
      a.innerHTML = '<span data-ic="back"></span>กลับ';
      U.paint(a);
    }).catch(function () {});
  }).catch(function () {});

  drawArt(document);
  U.wire();
})();
