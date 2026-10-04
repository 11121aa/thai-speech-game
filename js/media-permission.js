// ============================================================
//  MEDIA PERMISSION WARM-UP
//  Asks for the microphone (and camera) once, on the first visit,
//  instead of mid-game.
// ============================================================
//  Why: the browser's own permission bar used to appear the first time a
//  child held the mic button to say a word -- in the middle of the first
//  round, on top of the game, with the recording already "started". The
//  round was effectively lost, and a child who can't read the bar has no
//  idea what happened. Asking up front, while nothing is happening, costs
//  one tap and every round after that just works.
//
//  How it behaves:
//    - runs once per browser (localStorage), and never again once the
//      answer is known -- allowed or blocked, we don't nag
//    - skipped entirely when the Permissions API already reports an
//      answer, e.g. a returning player, or a device policy
//    - the actual getUserMedia() call happens inside the button's own
//      click handler: Safari and friends only honour it during a real
//      user gesture, so an automatic request on page load would be
//      refused without ever showing the prompt
//    - tracks are stopped the instant permission is granted, so no
//      camera light stays on and no audio is captured here
//    - camera is requested together with the mic, but a device with no
//      camera (or a refusal of just the camera) still leaves the mic
//      permission granted -- the mic is the one the game needs
(function () {
  'use strict';

  var DONE_KEY = 'speech_media_perm_v1';

  function seen() {
    try { return localStorage.getItem(DONE_KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { localStorage.setItem(DONE_KEY, '1'); } catch (e) { /* private window: ask again next time */ }
  }

  // Already answered at the browser level? Then there is nothing to ask.
  function alreadyAnswered() {
    if (!navigator.permissions || !navigator.permissions.query) return Promise.resolve(false);
    return navigator.permissions.query({ name: 'microphone' })
      .then(function (st) { return st.state === 'granted' || st.state === 'denied'; })
      .catch(function () { return false; });   // Firefox/Safari don't support the query
  }

  function build() {
    var wrap = document.createElement('div');
    wrap.id = 'mediaPermAsk';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'mediaPermTitle');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:4000;display:flex;align-items:center;' +
      'justify-content:center;padding:20px;background:rgba(26,22,40,.55);backdrop-filter:blur(2px)';
    wrap.innerHTML =
      '<div style="max-width:420px;width:100%;background:#fff;border-radius:22px;padding:26px 24px;' +
      'box-shadow:0 18px 50px rgba(0,0,0,.28);text-align:center;font-family:Prompt,system-ui,sans-serif">' +
        '<div style="font-size:54px;line-height:1">🎤</div>' +
        '<h2 id="mediaPermTitle" style="margin:10px 0 6px;font-size:21px;color:#2f3b52">ขออนุญาตใช้ไมค์และกล้อง</h2>' +
        '<p style="margin:0 0 6px;font-size:15px;color:#5b6477;line-height:1.6">' +
          'เกมนี้ต้องฟังเสียงพูดของน้อง และใช้กล้องให้น้องเห็นปากตัวเองขณะฝึก</p>' +
        '<p style="margin:0 0 18px;font-size:13px;color:#8a92a6;line-height:1.6">' +
          'กดอนุญาตตอนนี้ เพื่อไม่ให้มีหน้าต่างเด้งขึ้นมาระหว่างเล่น<br>เสียงและภาพจะไม่ถูกบันทึกจนกว่าจะเริ่มฝึกพูด</p>' +
        '<button type="button" id="mediaPermAllow" style="width:100%;border:0;border-radius:14px;padding:14px;' +
          'font-size:17px;font-weight:700;font-family:inherit;color:#fff;background:#2ec4b6;cursor:pointer">' +
          'อนุญาต</button>' +
        '<button type="button" id="mediaPermLater" style="width:100%;margin-top:8px;border:0;background:none;' +
          'font-size:14px;font-family:inherit;color:#8a92a6;padding:8px;cursor:pointer">ไว้ทีหลัง</button>' +
        '<p id="mediaPermNote" style="margin:12px 0 0;font-size:13px;color:#8a92a6;display:none"></p>' +
      '</div>';
    return wrap;
  }

  function ask() {
    var wrap = build();
    document.body.appendChild(wrap);
    var allow = wrap.querySelector('#mediaPermAllow');
    var later = wrap.querySelector('#mediaPermLater');
    var note  = wrap.querySelector('#mediaPermNote');

    function close() { markSeen(); if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }
    function stop(stream) { stream.getTracks().forEach(function (t) { t.stop(); }); }

    later.addEventListener('click', close);

    allow.addEventListener('click', function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { close(); return; }
      allow.disabled = true;
      allow.textContent = 'กำลังขออนุญาต...';
      allow.style.background = '#9fd9d3';
      navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(function (s) { stop(s); close(); })
        .catch(function () {
          // No camera, or the camera alone was refused: the microphone is
          // the one that actually blocks play, so ask for it on its own.
          return navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function (s) { stop(s); close(); })
            .catch(function () {
              // Blocked. Say so once, then stop asking -- the browser will
              // not show its prompt again from here anyway.
              note.textContent = 'ไม่ได้รับอนุญาต — เปิดได้ภายหลังที่การตั้งค่าของเบราว์เซอร์';
              note.style.display = 'block';
              allow.textContent = 'ตกลง';
              allow.disabled = false;
              allow.style.background = '#2ec4b6';
              allow.onclick = close;
            });
        });
    });
  }

  function maybeAsk() {
    if (seen()) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { markSeen(); return; }
    alreadyAnswered().then(function (answered) {
      if (answered) { markSeen(); return; }
      ask();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', maybeAsk);
  else maybeAsk();
})();
