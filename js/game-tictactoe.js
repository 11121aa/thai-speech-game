var TictactoeGame = (function () {
  var board, currentPlayer, gameActive, cbs, wordPool, playedRounds;
  var container = null;

  var LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

  function start(words, callbacks) {
    wordPool = words;
    cbs = callbacks;
    playedRounds = 0;
    container = document.getElementById('tictactoeGame');
    newRound();
  }

  function newRound() {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    gameActive = true;
    render();
  }

  function render() {
    if (!container) return;
    container.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:20px 8px;">' +
        '<div id="tttMsg" style="font-size:1.1rem;font-weight:600;min-height:32px;color:var(--color-primary-dark);text-align:center;"></div>' +
        '<div id="tttBoard" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:min(270px,82vw);"></div>' +
        '<div style="font-size:0.82rem;color:#9b93b0;margin-top:4px;">รอบที่เล่น: <strong id="tttRounds">' + playedRounds + '</strong></div>' +
      '</div>';
    drawBoard();
    setMsg('🟣 ตาของคุณ (X)');
  }

  function drawBoard() {
    var el = document.getElementById('tttBoard');
    if (!el) return;
    el.innerHTML = '';
    board.forEach(function (v, i) {
      var btn = document.createElement('button');
      btn.style.cssText =
        'aspect-ratio:1;font-size:2.8rem;font-weight:900;border:3px solid #e8e3f5;border-radius:18px;' +
        'background:' + (v ? '#f8f5ff' : '#fff') + ';' +
        'color:' + (v === 'X' ? '#8a5cf6' : '#e74c3c') + ';' +
        'cursor:' + (!v && gameActive && currentPlayer === 'X' ? 'pointer' : 'default') + ';' +
        'transition:background 0.12s;line-height:1;';
      btn.textContent = v || '';
      if (!v && gameActive && currentPlayer === 'X') {
        btn.addEventListener('click', function () { playerMove(i); });
        btn.addEventListener('mouseenter', function () { btn.style.background = '#f0ebfc'; });
        btn.addEventListener('mouseleave', function () { btn.style.background = '#fff'; });
      }
      el.appendChild(btn);
    });
  }

  function setMsg(text) {
    var el = document.getElementById('tttMsg');
    if (el) el.textContent = text;
  }

  function playerMove(i) {
    if (!gameActive || board[i] || currentPlayer !== 'X') return;
    board[i] = 'X';
    drawBoard();
    var result = checkResult();
    if (result) { endRound(result); return; }
    currentPlayer = 'O';
    setMsg('🔴 AI กำลังคิด...');
    // Disable board clicks while AI thinks
    setTimeout(aiMove, 500);
  }

  function aiMove() {
    if (!gameActive) return;
    // Easy AI: fully random — just pick any empty cell
    var empty = [];
    board.forEach(function (v, i) { if (!v) empty.push(i); });
    if (!empty.length) return;
    var pick = empty[Math.floor(Math.random() * empty.length)];
    board[pick] = 'O';
    drawBoard();
    var result = checkResult();
    currentPlayer = 'X';
    if (result) { endRound(result); return; }
    setMsg('🟣 ตาของคุณ (X)');
  }

  function checkResult() {
    for (var li = 0; li < LINES.length; li++) {
      var a = LINES[li][0], b = LINES[li][1], c = LINES[li][2];
      if (board[a] && board[a] === board[b] && board[b] === board[c]) {
        return { winner: board[a] };
      }
    }
    if (board.every(function (v) { return v; })) return { draw: true };
    return null;
  }

  function endRound(result) {
    gameActive = false;
    playedRounds++;
    var roundEl = document.getElementById('tttRounds');
    if (roundEl) roundEl.textContent = playedRounds;

    var msg, pts;
    if (result.draw)            { msg = 'เสมอ! 🤝';     pts = 5;  }
    else if (result.winner === 'X') { msg = 'คุณชนะ! 🎉'; pts = 15; }
    else                        { msg = 'AI ชนะ 😅';   pts = 0;  }

    setMsg(msg);
    if (pts && cbs.onPoints) cbs.onPoints(pts);

    // Brief pause → open practice → new round either way
    setTimeout(function () {
      if (!wordPool || !wordPool.length) { newRound(); return; }
      var word = wordPool[Math.floor(Math.random() * wordPool.length)];
      cbs.onPractice(word, newRound, newRound);
    }, 1000);
  }

  function stop() {
    gameActive = false;
    if (container) container.innerHTML = '';
    wordPool = [];
    cbs = null;
  }

  return { start: start, stop: stop };
})();
