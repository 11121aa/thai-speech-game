// ============================================================
//  GESTURE HINT — animated "how to play" hands
//
//  Two jobs:
//
//  1. gate(scene, key)  — the start gate. Called at the end of a
//     game's create(). The scene renders its first frame, then
//     PAUSES, and a DOM overlay shows a looping hand performing
//     the control for that game, positioned over the thing it
//     acts on (behind the cannon, on the plane, on the runner).
//     The first touch anywhere dismisses it and resumes the scene.
//     Nothing in the game has moved or ticked until that touch.
//
//  2. (future) the per-step hints inside the cooking game, which
//     draws in raw Canvas 2D rather than Phaser objects.
//
//  Why DOM and not Phaser objects: a paused Phaser scene stops
//  its tweens along with everything else, so a hand animated in
//  Phaser would freeze exactly when we need it moving. CSS
//  animation runs regardless of what the game loop is doing --
//  which also makes it immune to the render stalls that make this
//  project hard to verify in a browser pane.
// ============================================================

var GestureHint = (function () {
  'use strict';

  var HAND_W = 44, HAND_H = 56;   // the hand artwork's own box, in px
  var STAGE  = 112;               // the square a motion animates inside

  // ── The hand, injected once and re-used by reference ──────────
  // One <defs> for the whole document: every hand on screen is a
  // <use> of the same two shapes, drawn twice -- a thick dark pass
  // for the outline, a thinner white pass on top -- so it stays
  // legible on a dark game, a bright one, or a photo background.
  function installDefs() {
    if (document.getElementById('ghDefs')) return;
    var d = document.createElement('div');
    d.id = 'ghDefs';
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg"><defs>' +
        '<g id="ghHandShape">' +
          // The fist is a rounded box and the finger and thumb are
          // capsules. Drawn twice -- fat in dark, thinner in white --
          // which inflates every shape by the same amount and so gives
          // the whole hand one even outline from one pair of widths.
          '<rect x="10" y="30" width="27" height="17" rx="7"/>' +
          '<path d="M18 33V9"/>' +
          '<path d="M12 35l-7-6"/>' +
        '</g>' +
      '</defs></svg>';
    document.body.appendChild(d);
  }

  function handSvg(cls) {
    return '<svg class="gh-hand ' + (cls || '') + '" viewBox="0 0 44 56" ' +
           'width="' + HAND_W + '" height="' + HAND_H + '" aria-hidden="true">' +
             '<use href="#ghHandShape" class="gh-hand-out"/>' +
             '<use href="#ghHandShape" class="gh-hand-in"/>' +
           '</svg>';
  }

  // ── The motion tracks ─────────────────────────────────────────
  // Each motion gets a dashed path showing where the finger goes,
  // drawn behind the hand in the stage's own 112x112 box. The hand
  // itself is moved by the CSS keyframes further down; these are
  // only the breadcrumbs, so a child sees the shape of the gesture
  // even at the instant the hand is at one end of it.
  var TRACKS = {
    tap:        '<circle cx="56" cy="56" r="20"/>',
    tapRepeat:  '<circle cx="56" cy="56" r="20"/>',
    hold:       '<circle cx="56" cy="56" r="22" class="gh-fill"/>',
    slideUp:    '<path d="M56 84V32"/><path class="gh-head" d="M47 41l9-10 9 10"/>',
    slideDown:  '<path d="M56 28v52"/><path class="gh-head" d="M47 71l9 10 9-10"/>',
    slideLeft:  '<path d="M84 56H32"/><path class="gh-head" d="M41 47l-10 9 10 9"/>',
    slideRight: '<path d="M28 56h52"/><path class="gh-head" d="M71 47l10 9-10 9"/>',
    slideLR:    '<path d="M30 56h52"/><path class="gh-head" d="M39 47l-9 9 9 9"/>' +
                '<path class="gh-head" d="M73 47l9 9-9 9"/>',
    slideUD:    '<path d="M56 30v52"/><path class="gh-head" d="M47 39l9-9 9 9"/>' +
                '<path class="gh-head" d="M47 73l9 9 9-9"/>',
    pullBack:   '<path d="M56 30v48"/><path class="gh-head" d="M47 69l9 9 9-9"/>',
    pullOut:    '<path d="M46 46l38 38"/><path class="gh-head" d="M72 84h12V72"/>',
    shake:      '<path d="M56 34v44"/><path class="gh-head" d="M47 43l9-9 9 9"/>' +
                '<path class="gh-head" d="M47 69l9 9 9-9"/>',
    loop:       '<circle cx="56" cy="56" r="26"/>'
  };

  function stage(motion, big) {
    var track = TRACKS[motion] || TRACKS.tap;
    return '<div class="gh-stage' + (big ? ' gh-big' : '') + ' gh-m-' + motion + '">' +
             '<svg class="gh-track" viewBox="0 0 112 112" aria-hidden="true">' + track + '</svg>' +
             '<span class="gh-ring"></span>' +
             handSvg() +
           '</div>';
  }

  // ── Styles ────────────────────────────────────────────────────
  // All of it scoped under .gh-* so it cannot reach into a game's
  // own DOM controls (the crossy arrows, the platformer buttons),
  // which sit in the same containers.
  var CSS = [
    '.gh-gate{position:absolute;z-index:40;display:flex;flex-direction:column;',
      'align-items:center;justify-content:flex-end;',
      'background:radial-gradient(ellipse at 50% 38%,rgba(24,16,38,.28),rgba(24,16,38,.72));',
      'font-family:Prompt,system-ui,sans-serif;cursor:pointer;',
      '-webkit-tap-highlight-color:transparent;touch-action:manipulation;',
      'animation:ghGateIn .22s ease-out both}',
    '@keyframes ghGateIn{from{opacity:0}to{opacity:1}}',
    '@keyframes ghGateOut{to{opacity:0}}',
    '.gh-gate.gh-out{animation:ghGateOut .18s ease-in both;pointer-events:none}',

    // the title at the top
    '.gh-title{position:absolute;top:0;left:0;right:0;text-align:center;',
      'padding:14px 16px 0;color:#fff;font-size:26px;font-weight:700;',
      'text-shadow:0 2px 10px rgba(0,0,0,.55);line-height:1.2}',
    '.gh-title small{display:block;font-size:14px;font-weight:500;opacity:.8;margin-top:2px}',

    // a hand parked over a spot in the game
    '.gh-pin{position:absolute;width:' + STAGE + 'px;height:' + STAGE + 'px;',
      'margin:' + (-STAGE / 2) + 'px 0 0 ' + (-STAGE / 2) + 'px;pointer-events:none}',

    // the card of labelled controls along the bottom
    '.gh-card{margin:0 12px 14px;padding:10px 12px;border-radius:20px;',
      'background:rgba(255,255,255,.94);box-shadow:0 10px 30px rgba(0,0,0,.35);',
      'display:flex;flex-wrap:wrap;gap:4px 14px;justify-content:center;max-width:92%}',
    '.gh-row{display:flex;align-items:center;gap:6px;min-height:52px}',
    '.gh-row .gh-stage{transform:scale(.46);margin:-31px -30px}',
    '.gh-label{font-size:15px;font-weight:600;color:#2b2438;max-width:230px;line-height:1.25}',

    // "tap to start"
    '.gh-start{display:flex;align-items:center;gap:8px;margin:0 0 18px;',
      'padding:11px 26px;border-radius:999px;background:#2EC4B6;color:#06312c;',
      'font-size:20px;font-weight:700;box-shadow:0 8px 0 #1b9c90,0 14px 26px rgba(0,0,0,.4);',
      'animation:ghPulse 1.5s ease-in-out infinite}',
    '@keyframes ghPulse{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.04)}}',

    // ── the stage, the hand, the track ──
    '.gh-stage{position:relative;width:' + STAGE + 'px;height:' + STAGE + 'px;flex:0 0 auto}',
    '.gh-track{position:absolute;inset:0;width:100%;height:100%;fill:none;',
      'stroke:#fff;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;',
      'stroke-dasharray:7 8;opacity:.85;',
      'filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))}',
    '.gh-track .gh-head{stroke-dasharray:none}',
    '.gh-track .gh-fill{stroke-dasharray:none;opacity:.5}',
    '.gh-row .gh-track{stroke:#2b2438;opacity:.55;filter:none}',

    '.gh-hand{position:absolute;left:50%;top:50%;',
      'margin:' + (-HAND_H * 0.18) + 'px 0 0 ' + (-HAND_W / 2) + 'px;',
      'overflow:visible;will-change:transform}',
    '.gh-hand-out{fill:#2b2438;stroke:#2b2438;stroke-width:8;',
      'stroke-linecap:round;stroke-linejoin:round}',
    '.gh-hand-in{fill:#fff;stroke:#fff;stroke-width:4;',
      'stroke-linecap:round;stroke-linejoin:round}',
    '.gh-stage .gh-hand{filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))}',

    // the tap ripple
    '.gh-ring{position:absolute;left:50%;top:50%;width:46px;height:46px;',
      'margin:-23px 0 0 -23px;border-radius:50%;border:4px solid #fff;',
      'opacity:0;pointer-events:none}',

    // ── motions ──
    // Every one is a single loop with a built-in rest at the end, so
    // the gesture reads as a repeated demonstration rather than a
    // continuous blur.
    '.gh-m-tap .gh-hand,.gh-m-tapRepeat .gh-hand,.gh-m-hold .gh-hand{animation:ghTap 1.7s ease-in-out infinite}',
    '.gh-m-tapRepeat .gh-hand{animation:ghTapRepeat 1.7s ease-in-out infinite}',
    '.gh-m-hold .gh-hand{animation:ghHold 2.2s ease-in-out infinite}',
    '@keyframes ghTap{0%,100%{transform:translateY(0) scale(1)}' +
      '38%{transform:translateY(7px) scale(.9)}58%{transform:translateY(7px) scale(.9)}}',
    '@keyframes ghTapRepeat{0%{transform:translateY(0) scale(1)}' +
      '10%{transform:translateY(7px) scale(.9)}20%{transform:translateY(0) scale(1)}' +
      '30%{transform:translateY(7px) scale(.9)}40%{transform:translateY(0) scale(1)}' +
      '50%{transform:translateY(7px) scale(.9)}60%,100%{transform:translateY(0) scale(1)}}',
    '@keyframes ghHold{0%,100%{transform:translateY(0) scale(1)}' +
      '12%{transform:translateY(7px) scale(.9)}88%{transform:translateY(7px) scale(.9)}}',

    '.gh-m-tap .gh-ring{animation:ghRing 1.7s ease-out infinite}',
    '.gh-m-tapRepeat .gh-ring{animation:ghRingFast 1.7s ease-out infinite}',
    '.gh-m-pullBack .gh-ring{animation:ghRingLate 1.9s ease-out infinite}',
    '@keyframes ghRing{0%,34%{transform:scale(.4);opacity:0}' +
      '46%{opacity:.95}100%{transform:scale(1.75);opacity:0}}',
    '@keyframes ghRingFast{0%{transform:scale(.4);opacity:.9}' +
      '20%{transform:scale(1.5);opacity:0}21%,30%{transform:scale(.4);opacity:.9}' +
      '45%{transform:scale(1.5);opacity:0}46%,50%{transform:scale(.4);opacity:.9}' +
      '70%,100%{transform:scale(1.6);opacity:0}}',
    '@keyframes ghRingLate{0%,62%{transform:scale(.4);opacity:0}' +
      '70%{opacity:.95}92%,100%{transform:scale(1.9);opacity:0}}',

    // the hold ring draws itself round the circle as the finger waits
    '.gh-m-hold .gh-fill{stroke-dasharray:139;stroke-dashoffset:139;' +
      'animation:ghHoldFill 2.2s linear infinite;opacity:1}',
    '@keyframes ghHoldFill{0%,12%{stroke-dashoffset:139}82%,100%{stroke-dashoffset:0}}',

    '.gh-m-slideUp .gh-hand{animation:ghSlideUp 1.8s ease-in-out infinite}',
    '@keyframes ghSlideUp{0%,8%{transform:translateY(26px);opacity:1}' +
      '55%{transform:translateY(-26px);opacity:1}72%{transform:translateY(-26px);opacity:0}' +
      '73%,100%{transform:translateY(26px);opacity:0}100%{opacity:1}}',
    '.gh-m-slideDown .gh-hand{animation:ghSlideDown 1.8s ease-in-out infinite}',
    '@keyframes ghSlideDown{0%,8%{transform:translateY(-26px);opacity:1}' +
      '55%{transform:translateY(26px);opacity:1}72%{transform:translateY(26px);opacity:0}' +
      '73%,100%{transform:translateY(-26px);opacity:0}100%{opacity:1}}',
    '.gh-m-slideLeft .gh-hand{animation:ghSlideLeft 1.8s ease-in-out infinite}',
    '@keyframes ghSlideLeft{0%,8%{transform:translateX(26px);opacity:1}' +
      '55%{transform:translateX(-26px);opacity:1}72%{transform:translateX(-26px);opacity:0}' +
      '73%,100%{transform:translateX(26px);opacity:0}100%{opacity:1}}',
    '.gh-m-slideRight .gh-hand{animation:ghSlideRight 1.8s ease-in-out infinite}',
    '@keyframes ghSlideRight{0%,8%{transform:translateX(-26px);opacity:1}' +
      '55%{transform:translateX(26px);opacity:1}72%{transform:translateX(26px);opacity:0}' +
      '73%,100%{transform:translateX(-26px);opacity:0}100%{opacity:1}}',

    // the two-way ones stay visible the whole loop -- there is no
    // "lift and start over", the finger just keeps travelling
    '.gh-m-slideLR .gh-hand{animation:ghSlideLR 2.2s ease-in-out infinite}',
    '@keyframes ghSlideLR{0%,100%{transform:translateX(-26px)}50%{transform:translateX(26px)}}',
    '.gh-m-slideUD .gh-hand{animation:ghSlideUD 2.2s ease-in-out infinite}',
    '@keyframes ghSlideUD{0%,100%{transform:translateY(-26px)}50%{transform:translateY(26px)}}',
    '.gh-m-shake .gh-hand{animation:ghShake 1.6s ease-in-out infinite}',
    '@keyframes ghShake{0%,100%{transform:translateY(-16px)}' +
      '12%{transform:translateY(16px)}25%{transform:translateY(-16px)}' +
      '37%{transform:translateY(16px)}50%{transform:translateY(-16px)}' +
      '62%{transform:translateY(16px)}75%{transform:translateY(-16px)}}',

    // pull back slowly, then snap -- the release is the whole point,
    // so it gets a hard ease and the ripple fires on it
    '.gh-m-pullBack .gh-hand{animation:ghPullBack 1.9s infinite}',
    '@keyframes ghPullBack{0%{transform:translateY(-4px);animation-timing-function:ease-in}' +
      '60%{transform:translateY(28px);animation-timing-function:cubic-bezier(.2,.9,.2,1)}' +
      '70%,100%{transform:translateY(-4px)}}',
    '.gh-m-pullOut .gh-hand{animation:ghPullOut 1.9s ease-in-out infinite}',
    '@keyframes ghPullOut{0%,8%{transform:translate(-8px,-8px);opacity:1}' +
      '55%{transform:translate(24px,24px);opacity:1}72%{transform:translate(24px,24px);opacity:0}' +
      '73%,100%{transform:translate(-8px,-8px);opacity:0}100%{opacity:1}}',

    // eight stops round the circle: smooth enough to read as a
    // circle, cheap enough to need no path support
    '.gh-m-loop .gh-hand{animation:ghLoop 2.4s linear infinite}',
    '@keyframes ghLoop{0%{transform:translate(0,-26px)}12.5%{transform:translate(18px,-18px)}' +
      '25%{transform:translate(26px,0)}37.5%{transform:translate(18px,18px)}' +
      '50%{transform:translate(0,26px)}62.5%{transform:translate(-18px,18px)}' +
      '75%{transform:translate(-26px,0)}87.5%{transform:translate(-18px,-18px)}' +
      '100%{transform:translate(0,-26px)}}',

    // Honour a reduced-motion preference: the hand stops travelling
    // and the dashed track carries the meaning on its own.
    '@media (prefers-reduced-motion:reduce){.gh-stage .gh-hand,.gh-stage .gh-ring,',
      '.gh-stage .gh-fill,.gh-start{animation:none!important}',
      '.gh-stage .gh-fill{stroke-dashoffset:0}}',

    // phone-sized canvases get a smaller card so it cannot eat the game
    '@media (max-width:480px){.gh-title{font-size:21px}.gh-label{font-size:13px;max-width:160px}',
      '.gh-start{font-size:17px;padding:9px 20px}.gh-card{gap:2px 8px;padding:8px}}'
  ].join('');

  function installCss() {
    if (document.getElementById('ghCss')) return;
    var s = document.createElement('style');
    s.id = 'ghCss';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── Per-game control previews ─────────────────────────────────
  // `at` is in the game's OWN coordinates (the numbers the game's
  // code uses), converted to screen pixels below -- so a hand sits
  // on the cannon or the runner however the canvas is scaled.
  var GATES = {
    shooting: {
      title: 'ยิงเป้า',
      rows: [{ motion: 'pullBack', at: [400, 280],
               label: 'ลากถอยหลังแล้วปล่อย = ยิง' }]
    },
    crossy: {
      title: 'ข้ามถนน',
      rows: [{ motion: 'slideUp', at: [396, 190], label: 'ปัดขึ้น = เดินหน้า' },
              { motion: 'slideLR', label: 'ปัดซ้าย-ขวา = หลบ' },
              { motion: 'slideDown', label: 'ปัดลง = ถอยหลัง' },
              { motion: 'tap', label: 'แตะ = ไปข้างหน้า 1 ช่อง' }]
    },
    airplane: {
      title: 'ขับเครื่องบิน',
      rows: [{ motion: 'slideLR', at: [240, 560],
               label: 'ลากนิ้วซ้าย-ขวา = บังคับเครื่องบิน' }]
    },
    platformer: {
      title: 'วิ่งเก็บเหรียญ',
      rows: [{ motion: 'slideUp', at: [200, 250], label: 'ปัดขึ้น = กระโดด' },
              { motion: 'slideDown', label: 'ปัดลง = ลอดต่ำ' }]
    },
    tetris: {
      title: 'เตตริส',
      rows: [{ motion: 'slideLR', at: [240, 320], label: 'ปัดซ้าย-ขวา = เลื่อน' },
              { motion: 'tap', label: 'แตะ = หมุน' },
              { motion: 'slideDown', label: 'ปัดลง = ปล่อยลงเร็ว' }]
    },
    rpg: {
      title: 'ผจญภัยดันเจี้ยน',
      rows: [{ motion: 'slideRight', at: [400, 260],
               label: 'กดค้างแล้วลากไปทางที่อยากเดิน' }]
    },
    drawing: {
      title: 'ลากเส้นวาดรูป',
      rows: [{ motion: 'loop', at: [400, 274],
               label: 'ลากนิ้วตามเส้นประ รอบรูปให้ครบ' },
              { motion: 'tap', label: 'เริ่มที่จุดสีเขียว' }]
    },
    // The only gate that is shown once and then never again: the rule
    // ("find the two cards with the same picture") is learned in one
    // round, so repeating it every time would just be a door in the way.
    matching: {
      title: 'จับคู่ภาพ',
      once: 'gh_seen_matching',
      rows: [{ motion: 'tap', label: 'แตะการ์ด 2 ใบ ให้เจอรูปเดียวกัน' }]
    }
  };

  var open = null;   // only ever one gate at a time

  // ── The gate ──────────────────────────────────────────────────
  function gate(scene, key, extra) {
    var cfg = GATES[key];
    if (!cfg) return null;
    if (extra) {
      cfg = { title: extra.title || cfg.title, rows: extra.rows || cfg.rows,
              once: extra.once || cfg.once, onStart: extra.onStart || cfg.onStart };
    }
    if (!scene || !scene.game || !scene.game.canvas) return null;
    // A once-only gate checks (and later sets) its own flag. Storage can
    // throw in a private window, and a gate shown twice is better than a
    // game that fails to start, so a throw here means "show it".
    if (cfg.once && seen(cfg.once)) return null;

    installDefs();
    installCss();
    cancel();

    var canvas = scene.game.canvas;
    var host   = canvas.parentElement;
    if (!host) return null;
    // The overlay is absolutely positioned inside whatever div the
    // game was told to mount into; if that div is static, absolute
    // would escape to the page instead of covering the canvas.
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

    var el = document.createElement('div');
    el.className = 'gh-gate';
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', cfg.title + ' — แตะเพื่อเริ่ม');

    var pinned = [], html = '';
    html += '<div class="gh-title">' + cfg.title + '<small>วิธีเล่น</small></div>';
    html += '<div class="gh-card">';
    cfg.rows.forEach(function (r) {
      html += '<div class="gh-row">' + stage(r.motion) +
              '<span class="gh-label">' + r.label + '</span></div>';
    });
    html += '</div>';
    html += '<div class="gh-start">👆 แตะหน้าจอเพื่อเริ่ม</div>';
    el.innerHTML = html;

    cfg.rows.forEach(function (r) {
      if (!r.at) return;
      var pin = document.createElement('div');
      pin.className = 'gh-pin';
      pin.innerHTML = stage(r.motion, true);
      el.appendChild(pin);
      pinned.push({ el: pin, at: r.at });
    });

    host.appendChild(el);

    // ── Keeping the overlay on the canvas ──
    // Phaser's FIT mode letterboxes the canvas inside the host div,
    // so the overlay is sized to the CANVAS rect, not the host's,
    // and the pinned hands are placed in that same space.
    function layout() {
      var cr = canvas.getBoundingClientRect(), hr = host.getBoundingClientRect();
      if (!cr.width || !cr.height) return;
      var left = cr.left - hr.left, top = cr.top - hr.top;
      el.style.left   = left + 'px';
      el.style.top    = top + 'px';
      el.style.width  = cr.width + 'px';
      el.style.height = cr.height + 'px';
      var gw = (scene.scale && scene.scale.gameSize && scene.scale.gameSize.width)  || canvas.width;
      var gh = (scene.scale && scene.scale.gameSize && scene.scale.gameSize.height) || canvas.height;
      var sx = cr.width / gw, sy = cr.height / gh;
      // A hand pinned to something near the bottom of a short canvas
      // (the cannon, the runner) would land under the instruction card,
      // so every pin is clamped into the clear space above it.
      var card   = el.querySelector('.gh-card');
      var limitY = card ? (card.getBoundingClientRect().top - cr.top - 62)
                        : (cr.height - 70);
      pinned.forEach(function (p) {
        var x = p.at[0] * sx, y = p.at[1] * sy;
        p.el.style.left = Math.max(62, Math.min(x, cr.width - 62)) + 'px';
        p.el.style.top  = Math.max(74, Math.min(y, limitY)) + 'px';
      });
    }
    layout();
    // One more pass after a frame: on first load the canvas can still
    // be mid-resize when create() finishes, which reports a stale rect.
    requestAnimationFrame(layout);
    window.addEventListener('resize', layout);
    if (scene.scale && scene.scale.on) scene.scale.on('resize', layout);

    // ── Freezing the game behind it ──
    // Pause only after a couple of rendered frames: the games that
    // draw their whole board in update() (tower defense, tetris)
    // would otherwise freeze on an empty canvas, and the preview is
    // meant to show the child the board they are about to play.
    var frames = 0, paused = false;
    function onPost() {
      if (++frames < 2) return;
      scene.events.off('postupdate', onPost);
      if (!paused && scene.scene) { paused = true; scene.scene.pause(); }
    }
    scene.events.on('postupdate', onPost);

    function cleanup() {
      scene.events.off('postupdate', onPost);
      window.removeEventListener('resize', layout);
      if (scene.scale && scene.scale.off) scene.scale.off('resize', layout);
      if (el.parentNode) el.parentNode.removeChild(el);
      if (open && open.el === el) open = null;
    }

    var started = false;
    function start(e) {
      if (started) return;
      started = true;
      if (e) e.preventDefault();
      el.className = 'gh-gate gh-out';
      if (paused && scene.scene) scene.scene.resume();
      paused = false;
      scene.events.off('postupdate', onPost);
      setTimeout(cleanup, 200);
      if (cfg.once) markSeen(cfg.once);
      if (cfg.onStart) cfg.onStart();
    }

    // pointerdown covers touch and mouse on everything current;
    // touchstart is the fallback for older iOS, and both guard on
    // `started` so a touch that fires both only starts once.
    el.addEventListener('pointerdown', start);
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('mousedown', start);

    // If the child backs out to the game menu while the gate is up,
    // the scene dies underneath us -- take the overlay with it.
    scene.events.once('shutdown', cleanup);
    scene.events.once('destroy', cleanup);

    open = { el: el, cleanup: cleanup };
    return open;
  }

  // ── Canvas 2D: the per-step hints inside the cooking game ────
  // The cooking game draws itself straight onto the canvas with a 2D
  // context rather than with Phaser objects, so it cannot use the
  // DOM gate above: a hand that must sit on the frying pan has to be
  // painted in the same pass as the pan. Same gestures, same hand,
  // drawn by hand instead of by CSS.
  //
  //   ctx    the game's own 2D context, mid-frame
  //   motion one of the names in TRACKS
  //   x, y   where the finger should be, in canvas pixels
  //   now    the game's clock, for the animation phase
  //   age    ms since this step began, for the fade-out
  //
  // Returns false once it has faded, so a caller can stop asking.
  var SHOW_MS = 5200, FADE_MS = 700;

  function draw2d(ctx, motion, x, y, now, age) {
    if (age != null && age > SHOW_MS) return false;
    var a = (age == null || age < SHOW_MS - FADE_MS)
      ? 1 : (SHOW_MS - age) / FADE_MS;
    if (a <= 0) return false;

    var p = (now % 1800) / 1800;        // one loop, every motion
    var ox = 0, oy = 0, press = 0, ring = -1;

    if (motion === 'tap') {
      press = (p > 0.38 && p < 0.58) ? 1 : 0;
      ring  = (p > 0.34) ? (p - 0.34) / 0.5 : -1;
    } else if (motion === 'tapRepeat') {
      var q = (p % 0.2) / 0.2;
      press = (p < 0.6 && q < 0.5) ? 1 : 0;
      ring  = (p < 0.6) ? q : -1;
    } else if (motion === 'hold') {
      press = p > 0.12 ? 1 : 0;
    } else if (motion === 'slideDown') {
      oy = -26 + 52 * Math.min(1, p / 0.6);
    } else if (motion === 'slideUp') {
      oy = 26 - 52 * Math.min(1, p / 0.6);
    } else if (motion === 'slideRight') {
      ox = -30 + 60 * Math.min(1, p / 0.6);
    } else if (motion === 'slideLR') {
      ox = Math.sin(p * Math.PI * 2) * 30;
    } else if (motion === 'shake') {
      oy = Math.sin(p * Math.PI * 8) * 18;
    } else if (motion === 'loop') {
      ox = Math.cos(p * Math.PI * 2) * 30;
      oy = Math.sin(p * Math.PI * 2) * 30;
    } else if (motion === 'pullOut') {
      var k = Math.min(1, p / 0.6);
      ox = k * 34; oy = k * 34;
    }
    // A motion that travels lifts off and starts over, so it fades at
    // the end of its run rather than sliding backwards through the
    // gesture it is trying to teach.
    var travels = (motion === 'slideDown' || motion === 'slideUp' ||
                   motion === 'slideRight' || motion === 'pullOut');
    if (travels && p > 0.72) a *= Math.max(0, 1 - (p - 0.72) / 0.14);
    if (travels && p > 0.86) a = 0;
    if (a <= 0) return true;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // the track: where the finger is going
    ctx.save();
    ctx.translate(x, y);
    ctx.setLineDash([6, 7]);
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (motion === 'slideDown')      { ctx.moveTo(0, -26); ctx.lineTo(0, 30); }
    else if (motion === 'slideUp')   { ctx.moveTo(0, 26);  ctx.lineTo(0, -30); }
    else if (motion === 'slideRight'){ ctx.moveTo(-30, 0); ctx.lineTo(34, 0); }
    else if (motion === 'slideLR')   { ctx.moveTo(-32, 0); ctx.lineTo(32, 0); }
    else if (motion === 'shake')     { ctx.moveTo(0, -22); ctx.lineTo(0, 22); }
    else if (motion === 'loop')      { ctx.arc(0, 0, 30, 0, Math.PI * 2); }
    else if (motion === 'pullOut')   { ctx.moveTo(0, 0);   ctx.lineTo(38, 38); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // the tap ripple
    if (ring >= 0 && ring <= 1) {
      ctx.save();
      ctx.globalAlpha = a * (1 - ring) * 0.9;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(x, y, 12 + ring * 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // the hold ring, filling clockwise while the finger waits
    if (motion === 'hold') {
      var f = Math.max(0, Math.min(1, (p - 0.12) / 0.7));
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#2EC4B6';
      ctx.beginPath();
      ctx.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // the hand, with its fingertip on the anchor
    ctx.translate(x + ox - 18, y + oy - 9 + press * 5);
    handPath2d(ctx, '#2b2438', 8, true);
    handPath2d(ctx, '#ffffff', 4, true);
    ctx.restore();
    return true;
  }

  // The same three shapes as the SVG hand, in canvas calls: fat dark
  // pass first, thinner white pass on top.
  function handPath2d(ctx, colour, width, fill) {
    ctx.strokeStyle = colour;
    ctx.fillStyle   = colour;
    ctx.lineWidth   = width;
    ctx.beginPath();
    var x = 10, y = 30, w = 27, h = 17, r = 7;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
    if (fill) ctx.fill();
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, 33); ctx.lineTo(18, 9);  ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 35); ctx.lineTo(5, 29);  ctx.stroke();
  }

  function seen(key) {
    try { return localStorage.getItem(key) === '1'; } catch (e) { return false; }
  }
  function markSeen(key) {
    try { localStorage.setItem(key, '1'); } catch (e) {}
  }

  function cancel() {
    if (open) { try { open.cleanup(); } catch (e) {} open = null; }
  }

  return { gate: gate, cancel: cancel, seen: seen, draw2d: draw2d, GATES: GATES };
}());
