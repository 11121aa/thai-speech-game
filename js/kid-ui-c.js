/* UI experiment C -- three doors, game list, ready step, grown-up sum gate, big practice controls. */
(function () {
  var U = KidUI, esc = U.esc;
  function $(id) { return document.getElementById(id); }
  function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }

  var view = 'doors';
  function setView(v) {
    view = v;
    $('screenMode').setAttribute('data-view', v);
    $('kcBack').hidden = v !== 'games';
    renderTitle();
    window.scrollTo(0, 0);
  }
  function renderTitle() {
    var kid = window.KID || {};
    setText($('kcTitle'), view === 'games' ? 'เลือกเกม' : (kid.name ? 'สวัสดี ' + kid.name : 'สวัสดี'));
  }

  function renderHome() {
    var kid = window.KID || { homework: null };
    var loggedIn = window._kidSession === true || !!(kid.name || kid.total || kid.homework);
    renderTitle();
    var door = $('kcDoorHw'), hw = kid.homework;
    door.classList.toggle('is-empty', !hw);
    $('kcHwBadge').hidden = !hw;
    $('kcHwBar').hidden = !hw;
    if (!loggedIn) setText($('kcHwLine'), 'เข้าสู่ระบบก่อนนะ');
    else if (hw) {
      setText($('kcHwLine'), hw.name);
      setText($('kcHwBadge'), 'อีก ' + (hw.words - hw.done) + ' คำ');
      $('kcHwBar').style.setProperty('--p', Math.round(hw.done / Math.max(1, hw.words) * 100) + '%');
    } else setText($('kcHwLine'), 'ไม่มีการบ้านค้าง เก่งมาก!');
    door.setAttribute('data-login', loggedIn ? '' : '1');
    var last = U.lastGame();
    document.querySelectorAll('.kc-g').forEach(function (c) {
      var on = c.id.toLowerCase() === 'card' + last;
      if (c.classList.contains('is-last') !== on) c.classList.toggle('is-last', on);
    });
  }

  function renderSetup(ws, mode) {
    var g = U.GAMES[mode] || {}, art = $('kcSetupArt');
    if (art.getAttribute('data-mode') !== mode) {
      art.setAttribute('data-mode', mode);
      art.style.setProperty('--ga', g.ga || ''); art.style.setProperty('--gb', g.gb || '');
      art.innerHTML = '<span data-ic="' + (g.icon || 'games') + '"></span>';
      U.paint(art);
      showAdult(false);
    }
    setText($('kcSetName'), ws.name);
    setText($('kcSetMeta'), ws.meta);
    var warn = !ws.ok || !ws.count, set = $('kcSet');
    if (set.classList.contains('warn') !== warn) set.classList.toggle('warn', warn);
  }
  function showAdult(on) {
    $('kcAdult').hidden = !on;
    $('kcReady').hidden = on;
    document.querySelector('.kc-ready-screen').scrollTop = 0;
  }

  // Grown-up gate: a small sum a young child can't answer by tapping around.
  var gateDone = null;
  function gate(onPass) {
    gateDone = onPass;
    var a = 2 + Math.floor(Math.random() * 7), b = 2 + Math.floor(Math.random() * 7), sum = a + b;
    var opts = [sum];
    while (opts.length < 3) { var o = sum + (Math.floor(Math.random() * 7) - 3); if (o > 1 && opts.indexOf(o) === -1) opts.push(o); }
    opts.sort(function () { return Math.random() - .5; });
    $('kcGateQ').textContent = a + ' + ' + b + ' = ?';
    $('kcGateChoices').innerHTML = opts.map(function (n) { return '<button type="button" data-n="' + n + '" data-ok="' + (n === sum) + '">' + n + '</button>'; }).join('');
    $('kcGate').hidden = false;
    $('kcGateChoices').querySelector('button').focus();
  }
  $('kcGateChoices').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.getAttribute('data-ok') === 'true') { $('kcGate').hidden = true; var f = gateDone; gateDone = null; if (f) f(); }
    else { b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); setTimeout(function () { gate(gateDone); }, 350); }
  });
  $('kcGateClose').addEventListener('click', function () { $('kcGate').hidden = true; gateDone = null; });

  function renderResults() {
    var n = (window.G && G.practiced && G.practiced.length) || 0;
    var s = typeof starsForRound === 'function' ? starsForRound(n) : 0;
    setText($('kcDoneTitle'), s >= 3 ? 'เก่งมาก!' : s >= 1 ? 'ดีมาก!' : 'จบแล้ว!');
    setText($('kcDoneLine'), n ? 'รอบนี้พูดไป ' + n + ' คำ' : 'ลองพูดให้ได้สักคำนะ');
  }

  // Put "ฟัง" and "พูด" side by side as two big labelled buttons.
  (function arrangeControls() {
    var mic = $('ppBtnMic'), listen = $('ppBtnListen');
    if (!mic || !listen) return;
    var row = document.createElement('div');
    row.className = 'kc-controls';
    mic.parentNode.insertBefore(row, mic);
    row.appendChild(listen);
    row.appendChild(mic);
  })();

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-act],[data-gate],#kcBack,#kcAdultDone') : null;
    if (!t) return;
    if (t.id === 'kcBack') { setView('doors'); return; }
    if (t.id === 'kcAdultDone') { showAdult(false); return; }
    var g = t.getAttribute('data-gate');
    if (g === 'adult') { gate(function () { showAdult(true); }); return; }
    if (g === 'link') { e.preventDefault(); var href = t.getAttribute('href'); gate(function () { location.href = href; }); return; }
    var act = t.getAttribute('data-act');
    if (act === 'homework') {
      if (t.getAttribute('data-login')) location.href = 'login.html';
      else if (window.KID && KID.homework) startHomework();
      else setView('games');
    } else if (act === 'say') openSetup('flashcard');
    else if (act === 'games') setView('games');
  });

  document.addEventListener('kidstats', renderHome);
  U.onSetupChange(renderSetup);
  U.onScreen(function (id) {
    if (id === 'screenFinish') renderResults();
    if (id === 'screenMode') { renderHome(); window.scrollTo(0, 0); }
  });
  if (window.Auth && Auth.getSession) Auth.getSession().then(function (s) { window._kidSession = !!s; if (!s || window.KID) renderHome(); }).catch(function () {});

  U.wire();
  renderTitle();
})();
