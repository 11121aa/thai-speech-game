const AppGame = (function () {
  const HEARTS_MAX = 3;
  const WORDS_PER_LEVEL = 5;
  const LEVEL_WIDTH = 3600;
  const FLAG_OFFSET = 260;
  const VIEW_W = 900;
  const VIEW_H = 420;
  const GROUND_Y = 340;
  const PLAYER_SPEED = 230;
  const GRAVITY = 1400;
  const JUMP_VELOCITY = -560;
  const STOP_GAP = 46;

  const PALETTES = [
    { sky: ["#bdeefe", "#eafcf7"], ground: "#7bd9c0", node: "#2ec4b6" },
    { sky: ["#ffe9c7", "#fff6e6"], ground: "#ffb86b", node: "#ff9f1c" },
    { sky: ["#ffe0ef", "#fff0f6"], ground: "#ff9fc2", node: "#ff6b9d" },
    { sky: ["#e7e0ff", "#f3eefe"], ground: "#b9a3f5", node: "#8a5cf6" },
    { sky: ["#dff5d0", "#f1fbe9"], ground: "#9ed98a", node: "#4caf50" },
    { sky: ["#cdeeff", "#e9f8ff"], ground: "#7cc6e8", node: "#3aa0d6" },
    { sky: ["#ffd9d9", "#fff0f0"], ground: "#ff9a9a", node: "#ff5d5d" }
  ];

  const el = {};
  let levelModal = null;
  let historyModal = null;

  const state = {
    screen: "map",
    age: null,
    groupId: null,
    difficulty: "easy",
    levelWords: [],
    hearts: HEARTS_MAX,
    accuracySum: 0,
    attemptsCount: 0,
    player: { x: 60, y: GROUND_Y, vy: 0, onGround: true, facing: 1, running: false },
    camera: { x: 0 },
    encounters: [],
    keys: { left: false, right: false },
    jumpQueued: false,
    rafId: null,
    lastTs: 0,
    paused: false,
    listenController: null,
    recognitionSupported: true,
    manualFallback: false,
    recording: false
  };

  function byId(id) { return document.getElementById(id); }

  function cacheEls() {
    [
      "browserWarning", "btnChangeAge", "btnShowHistory", "ageScreen", "worldMap", "levelTrack",
      "gameStage", "gameCanvas", "gameHud", "hudLevelLabel", "hudHearts", "hudProgress", "touchControls",
      "btnLeft", "btnRight", "btnJump", "challengeOverlay", "challengeWord", "btnListenSample",
      "waveCanvas", "btnMic", "micHint", "resultArea", "resultBadge", "resultMessage", "btnRetryWord",
      "levelCompleteScreen", "starsDisplay", "levelCompleteSummary", "btnNextLevel", "btnBackToMapFromComplete",
      "tryAgainScreen", "btnRetryLevel", "btnBackToMapFromRetry", "levelStartTitle", "btnStartEasy", "btnStartHard",
      "historyStats", "historyList", "historyEmptyMsg"
    ].forEach(function (id) { el[id] = byId(id); });
  }

  function sortedGroupIds() {
    return SOUND_GROUPS.slice().sort(function (a, b) { return a.order - b.order; }).map(function (g) { return g.id; });
  }

  function groupById(id) {
    return SOUND_GROUPS.find(function (g) { return g.id === id; });
  }

  function paletteFor(group) {
    return PALETTES[(group.order - 1) % PALETTES.length];
  }

  /* ===================== Age & Map ===================== */

  function showScreen(name) {
    state.screen = name;
    el.ageScreen.classList.toggle("show", name === "age");
    el.worldMap.style.display = name === "map" ? "block" : "none";
    const stageVisible = name === "playing" || name === "complete" || name === "retry";
    el.gameStage.style.display = stageVisible ? "block" : "none";
    const playing = name === "playing";
    el.gameHud.style.display = playing ? "flex" : "none";
    el.touchControls.style.display = playing ? "flex" : "none";
    el.levelCompleteScreen.classList.toggle("show", name === "complete");
    el.tryAgainScreen.classList.toggle("show", name === "retry");
    if (name !== "playing") {
      el.challengeOverlay.classList.remove("show");
      if (state.listenController) {
        state.listenController.cancel();
        state.listenController = null;
      }
    }
  }

  function initAgeScreen() {
    el.ageScreen.querySelectorAll(".age-pick-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        GameStore.setAge(parseInt(btn.getAttribute("data-age"), 10));
        renderWorldMap();
        showScreen("map");
      });
    });
    el.btnChangeAge.addEventListener("click", function () {
      showScreen("age");
    });
  }

  function renderWorldMap() {
    const ids = sortedGroupIds();
    const progress = GameStore.getProgress();
    el.levelTrack.innerHTML = "";
    SOUND_GROUPS.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (group) {
      const unlocked = GameStore.isLevelUnlocked(group.id, ids);
      const palette = paletteFor(group);
      const node = document.createElement("div");
      node.className = "level-node" + (unlocked ? "" : " locked");
      node.style.background = unlocked ? palette.node : "";
      const labelLen = group.label.length;
      const labelSize = labelLen <= 1 ? "1.9rem" : labelLen <= 3 ? "1.3rem" : labelLen <= 5 ? "1.05rem" : "0.78rem";
      node.innerHTML = '<span style="font-size:' + labelSize + ';line-height:1.05;">' + group.label + '</span><small>เลเวล ' + group.order + '</small>';
      if (!unlocked) {
        node.innerHTML += '<span class="lock-icon">🔒</span>';
      } else if (progress[group.id] && progress[group.id].completed) {
        node.innerHTML += '<span class="stars-earned">' + "★".repeat(progress[group.id].stars) + "</span>";
      }
      if (unlocked) {
        node.addEventListener("click", function () { openLevelStartModal(group); });
      }
      el.levelTrack.appendChild(node);
    });
  }

  function openLevelStartModal(group) {
    el.levelStartTitle.textContent = group.title;
    el.btnStartEasy.onclick = function () { levelModal.hide(); startLevel(group.id, "easy"); };
    el.btnStartHard.onclick = function () { levelModal.hide(); startLevel(group.id, "hard"); };
    levelModal.show();
  }

  /* ===================== Level setup ===================== */

  function pickLevelWords(groupId, difficulty, age) {
    let pool = WORDS.filter(function (w) { return w.group === groupId && w.difficulty === difficulty && w.minAge <= age; });
    if (pool.length < WORDS_PER_LEVEL) {
      pool = WORDS.filter(function (w) { return w.group === groupId && w.minAge <= age; });
    }
    if (pool.length < WORDS_PER_LEVEL) {
      pool = WORDS.filter(function (w) { return w.group === groupId; });
    }
    const shuffled = pool.slice().sort(function () { return Math.random() - 0.5; });
    return shuffled.slice(0, WORDS_PER_LEVEL);
  }

  function buildEncounters(words) {
    const spacing = LEVEL_WIDTH / (words.length + 1);
    return words.map(function (w, i) {
      return { word: w, worldX: Math.round(spacing * (i + 1)) + 80, resolved: false, attempts: 0 };
    });
  }

  function startLevel(groupId, difficulty) {
    state.groupId = groupId;
    state.difficulty = difficulty;
    state.age = GameStore.getAge() || 5;
    state.levelWords = pickLevelWords(groupId, difficulty, state.age);
    state.encounters = buildEncounters(state.levelWords);
    state.hearts = HEARTS_MAX;
    state.accuracySum = 0;
    state.attemptsCount = 0;
    state.player.x = 60;
    state.player.vy = 0;
    state.player.onGround = true;
    state.camera.x = 0;
    state.paused = false;

    const group = groupById(groupId);
    el.hudLevelLabel.textContent = "เลเวล " + group.label + " (" + (difficulty === "easy" ? "ง่าย" : "ยาก") + ")";
    updateHearts();
    updateProgressHud();
    showScreen("playing");
    if (!state.rafId) {
      state.lastTs = performance.now();
      state.rafId = requestAnimationFrame(loop);
    }
  }

  function updateHearts() {
    el.hudHearts.textContent = "❤️".repeat(Math.max(0, state.hearts)) + "🖤".repeat(HEARTS_MAX - Math.max(0, state.hearts));
  }

  function updateProgressHud() {
    const total = LEVEL_WIDTH + FLAG_OFFSET;
    const pct = Math.min(100, Math.round((state.player.x / total) * 100));
    el.hudProgress.textContent = pct + "%";
  }

  /* ===================== Game loop ===================== */

  function currentBlockX() {
    const next = state.encounters.find(function (enc) { return !enc.resolved; });
    return next ? next.worldX - STOP_GAP : LEVEL_WIDTH + FLAG_OFFSET;
  }

  function loop(ts) {
    state.rafId = requestAnimationFrame(loop);
    const dt = Math.min(0.04, (ts - state.lastTs) / 1000);
    state.lastTs = ts;
    if (state.screen !== "playing" || state.paused) return;
    update(dt);
    render();
  }

  function update(dt) {
    const p = state.player;
    let vx = 0;
    if (state.keys.left) { vx -= PLAYER_SPEED; p.facing = -1; }
    if (state.keys.right) { vx += PLAYER_SPEED; p.facing = 1; }
    p.running = vx !== 0;

    const blockX = currentBlockX();
    let nextX = p.x + vx * dt;
    nextX = Math.max(20, Math.min(nextX, blockX));
    p.x = nextX;

    if (state.jumpQueued && p.onGround) {
      p.vy = JUMP_VELOCITY;
      p.onGround = false;
    }
    state.jumpQueued = false;

    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;
    if (p.y >= GROUND_Y) {
      p.y = GROUND_Y;
      p.vy = 0;
      p.onGround = true;
    }

    const viewLeft = Math.max(0, p.x - 220);
    state.camera.x = Math.min(viewLeft, Math.max(0, LEVEL_WIDTH + FLAG_OFFSET + 60 - VIEW_W));

    updateProgressHud();

    const blocking = state.encounters.find(function (enc) { return !enc.resolved && p.x >= enc.worldX - STOP_GAP - 2; });
    if (blocking && state.screen === "playing") {
      openChallenge(blocking);
    } else if (!state.encounters.some(function (enc) { return !enc.resolved; }) && p.x >= LEVEL_WIDTH + FLAG_OFFSET - 30) {
      completeLevel();
    }
  }

  /* ===================== Rendering ===================== */

  function render() {
    const ctx = el.gameCanvas.getContext("2d");
    const group = groupById(state.groupId);
    const palette = paletteFor(group);
    const camX = state.camera.x;

    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, palette.sky[0]);
    grad.addColorStop(1, palette.sky[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 6; i++) {
      const hx = (i * 420 - camX * 0.3) % 2400 - 200;
      drawCloud(ctx, hx, 60 + (i % 3) * 22);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = palette.ground;
    ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 18; i++) {
      const gx = (i * 90 - camX) % (VIEW_W + 90);
      ctx.fillRect(gx, GROUND_Y + 10, 46, 6);
    }
    ctx.globalAlpha = 1;

    state.encounters.forEach(function (enc) {
      if (enc.resolved) return;
      drawBuddy(ctx, enc.worldX - camX, GROUND_Y, palette.node);
    });

    drawFlag(ctx, LEVEL_WIDTH + FLAG_OFFSET - camX, GROUND_Y);

    drawPlayer(ctx, state.player.x - camX, state.player.y, state.player.facing, state.player.running, performance.now());
  }

  function drawCloud(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.arc(x + 24, y + 6, 18, 0, Math.PI * 2);
    ctx.arc(x - 22, y + 8, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFlag(ctx, x, groundTop) {
    ctx.fillStyle = "#8d8d8d";
    ctx.fillRect(x, groundTop - 150, 8, 150);
    ctx.fillStyle = "#ff5d5d";
    ctx.beginPath();
    ctx.moveTo(x + 8, groundTop - 150);
    ctx.lineTo(x + 60, groundTop - 130);
    ctx.lineTo(x + 8, groundTop - 110);
    ctx.closePath();
    ctx.fill();
  }

  function drawBuddy(ctx, x, groundTop, color) {
    const bob = Math.sin(performance.now() / 220) * 4;
    const bodyCenterY = groundTop - 44 + bob;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, bodyCenterY, 30, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, bodyCenterY - 6, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b2438";
    ctx.beginPath();
    ctx.arc(x + 2, bodyCenterY - 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2b2438";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 10, bodyCenterY + 28);
    ctx.lineTo(x - 14, groundTop);
    ctx.moveTo(x + 10, bodyCenterY + 28);
    ctx.lineTo(x + 14, groundTop);
    ctx.stroke();
  }

  function drawPlayer(ctx, x, groundTop, facing, running, ts) {
    const legPhase = running ? Math.sin(ts / 90) * 14 : 0;
    const hipY = groundTop - 34;
    const bodyCenterY = groundTop - 66;
    const headCenterY = groundTop - 114;

    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(facing, 1);

    ctx.strokeStyle = "#2b2438";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-8, hipY);
    ctx.lineTo(-8 + legPhase, groundTop);
    ctx.moveTo(8, hipY);
    ctx.lineTo(8 - legPhase, groundTop);
    ctx.stroke();

    ctx.fillStyle = "#ff9f1c";
    ctx.beginPath();
    ctx.ellipse(0, bodyCenterY, 26, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd9b3";
    ctx.beginPath();
    ctx.arc(0, headCenterY, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4a3728";
    ctx.beginPath();
    ctx.arc(0, headCenterY - 12, 22, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2b2438";
    ctx.beginPath();
    ctx.arc(8, headCenterY - 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#2b2438";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(10, headCenterY + 6, 5, 0, Math.PI, false);
    ctx.stroke();

    ctx.restore();
  }

  /* ===================== Input ===================== */

  function setupInput() {
    window.addEventListener("keydown", function (e) {
      if (state.screen !== "playing") return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") state.keys.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") state.keys.right = true;
      if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") state.jumpQueued = true;
    });
    window.addEventListener("keyup", function (e) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") state.keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") state.keys.right = false;
    });

    bindHold(el.btnLeft, function (down) { state.keys.left = down; });
    bindHold(el.btnRight, function (down) { state.keys.right = down; });
    el.btnJump.addEventListener("pointerdown", function () { state.jumpQueued = true; });
  }

  function bindHold(btn, setter) {
    btn.addEventListener("pointerdown", function (e) { e.preventDefault(); setter(true); });
    btn.addEventListener("pointerup", function () { setter(false); });
    btn.addEventListener("pointerleave", function () { setter(false); });
    btn.addEventListener("pointercancel", function () { setter(false); });
  }

  /* ===================== Challenge overlay ===================== */

  function openChallenge(encounter) {
    state.paused = true;
    el.challengeOverlay.classList.add("show");
    el.challengeWord.textContent = encounter.word.word;
    el.resultArea.style.display = "none";
    el.btnRetryWord.style.display = "none";
    el.micHint.textContent = state.recognitionSupported
      ? "กดปุ่มไมค์แล้วพูดคำด้านบนดังๆ"
      : "กดปุ่มไมค์ พูดคำด้านบนดังๆ แล้วกดอีกครั้งเพื่อยืนยัน";
    resetMicButton();
    state.currentEncounter = encounter;
  }

  function closeChallenge() {
    el.challengeOverlay.classList.remove("show");
    state.paused = false;
  }

  function resetMicButton() {
    state.recording = false;
    el.btnMic.classList.remove("recording");
    el.btnMic.innerHTML = '<i class="bi bi-mic-fill"></i>';
  }

  function setupChallengeUI() {
    el.btnListenSample.addEventListener("click", function () {
      if (state.currentEncounter) SpeechTool.speak(state.currentEncounter.word.word);
    });

    el.btnMic.addEventListener("click", function () {
      if (!state.recording) {
        startRecording();
      } else if (!state.recognitionSupported) {
        state.manualFallback = true;
        if (state.listenController) state.listenController.stop();
      }
    });

    el.btnRetryWord.addEventListener("click", function () {
      el.resultArea.style.display = "none";
      el.btnRetryWord.style.display = "none";
      resetMicButton();
    });

    el.btnNextLevel.addEventListener("click", function () {
      const ids = sortedGroupIds();
      const idx = ids.indexOf(state.groupId);
      const nextId = ids[idx + 1];
      if (nextId && GameStore.isLevelUnlocked(nextId, ids)) {
        startLevel(nextId, state.difficulty);
      } else {
        renderWorldMap();
        showScreen("map");
      }
    });
    el.btnBackToMapFromComplete.addEventListener("click", function () {
      renderWorldMap();
      showScreen("map");
    });
    el.btnRetryLevel.addEventListener("click", function () {
      startLevel(state.groupId, state.difficulty);
    });
    el.btnBackToMapFromRetry.addEventListener("click", function () {
      renderWorldMap();
      showScreen("map");
    });
  }

  function startRecording() {
    state.recording = true;
    state.manualFallback = false;
    el.btnMic.classList.add("recording");
    el.btnMic.innerHTML = '<i class="bi bi-stop-fill"></i>';
    el.micHint.textContent = "กำลังฟัง... พูดได้เลย!";

    state.listenController = SpeechTool.startListening({
      canvas: el.waveCanvas,
      onResult: function (transcript) { handleAttemptResult(transcript); },
      onNoSpeech: function () {
        if (state.manualFallback) {
          handleManualFallbackPass();
        } else {
          resetMicButton();
          el.micHint.textContent = "ไม่ได้ยินเสียงเลย ลองพูดดังๆอีกครั้งนะ";
        }
      },
      onError: function () {
        resetMicButton();
        el.micHint.textContent = "ไม่สามารถใช้ไมโครโฟนได้ กรุณาอนุญาตการใช้ไมโครโฟน";
      }
    });
  }

  function handleManualFallbackPass() {
    resetMicButton();
    const enc = state.currentEncounter;
    GameStore.addAttempt({ word: enc.word.word, group: state.groupId, percent: 78, pass: true });
    state.accuracySum += 78;
    state.attemptsCount += 1;
    showResult(78, true, true);
  }

  function handleAttemptResult(transcript) {
    resetMicButton();
    const enc = state.currentEncounter;
    const percent = SpeechTool.similarity(enc.word.word, transcript);
    const threshold = state.difficulty === "hard" ? 70 : 65;
    const pass = percent >= threshold;
    enc.attempts += 1;
    GameStore.addAttempt({ word: enc.word.word, group: state.groupId, percent: percent, pass: pass });
    state.accuracySum += percent;
    state.attemptsCount += 1;
    showResult(percent, pass, false);
  }

  function showResult(percent, pass, isFallback) {
    el.resultArea.style.display = "block";
    el.resultBadge.className = "result-badge " + (pass ? "result-pass" : "result-fail");
    el.resultBadge.textContent = (isFallback ? "บันทึกแล้ว " : "เหมือน ") + percent + "%";
    if (pass) {
      el.resultMessage.textContent = isFallback
        ? "เยี่ยมเลย! (เบราว์เซอร์นี้วัดผลอัตโนมัติไม่ได้ จึงนับว่าผ่านหลังจากลองพูด)"
        : "เก่งมาก! ออกเสียงได้ดีเลย 🎉";
      el.btnRetryWord.style.display = "none";
      setTimeout(function () { resolveEncounter(); }, 1300);
    } else {
      el.resultMessage.textContent = "เกือบแล้ว! ลองออกเสียงอีกครั้งนะ 💪";
      el.btnRetryWord.style.display = "inline-block";
      loseHeart();
    }
  }

  function loseHeart() {
    state.hearts -= 1;
    updateHearts();
    if (state.hearts <= 0) {
      setTimeout(function () {
        closeChallenge();
        showScreen("retry");
      }, 1300);
    }
  }

  function resolveEncounter() {
    state.currentEncounter.resolved = true;
    closeChallenge();
  }

  /* ===================== Level complete ===================== */

  function completeLevel() {
    state.paused = true;
    const stars = Math.max(1, state.hearts);
    const avgAccuracy = state.attemptsCount ? Math.round(state.accuracySum / state.attemptsCount) : 0;
    GameStore.markLevelComplete(state.groupId, stars, avgAccuracy);
    el.starsDisplay.textContent = "★".repeat(stars) + "☆".repeat(HEARTS_MAX - stars);
    el.levelCompleteSummary.textContent = "ความแม่นยำเฉลี่ย " + avgAccuracy + "% จากทั้งหมด " + state.levelWords.length + " คำ";
    const ids = sortedGroupIds();
    const idx = ids.indexOf(state.groupId);
    el.btnNextLevel.style.display = idx < ids.length - 1 ? "inline-block" : "none";
    showScreen("complete");
  }

  /* ===================== History modal ===================== */

  function renderHistory() {
    const history = GameStore.getHistory();
    const stats = GameStore.getOverallStats();
    el.historyStats.innerHTML =
      '<div><strong style="font-size:1.4rem;color:var(--color-secondary-dark);">' + stats.totalStars + '</strong><div class="text-secondary small">ดาวรวม</div></div>' +
      '<div><strong style="font-size:1.4rem;color:var(--color-primary-dark);">' + stats.levelsCompleted + '</strong><div class="text-secondary small">เลเวลที่ผ่าน</div></div>' +
      '<div><strong style="font-size:1.4rem;color:var(--color-accent-purple);">' + stats.totalAttempts + '</strong><div class="text-secondary small">ครั้งล่าสุด</div></div>';

    el.historyList.innerHTML = "";
    el.historyEmptyMsg.style.display = history.length ? "none" : "block";
    history.forEach(function (item) {
      const row = document.createElement("div");
      row.className = "history-row";
      const time = new Date(item.timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
      row.innerHTML =
        '<span>' + (item.pass ? "✅" : "❌") + " " + item.word + '</span>' +
        '<span class="history-percent" style="color:' + (item.pass ? "var(--color-success)" : "var(--color-danger)") + ';">' + item.percent + '%</span>' +
        '<span class="text-secondary small">' + time + '</span>';
      el.historyList.appendChild(row);
    });
  }

  /* ===================== Init ===================== */

  function init() {
    cacheEls();
    state.recognitionSupported = SpeechTool.isRecognitionSupported();
    if (!state.recognitionSupported) {
      el.browserWarning.style.display = "block";
    }

    levelModal = new bootstrap.Modal(byId("levelStartModal"));
    historyModal = byId("historyModal");
    historyModal.addEventListener("show.bs.modal", renderHistory);

    initAgeScreen();
    setupInput();
    setupChallengeUI();

    if (GameStore.getAge()) {
      renderWorldMap();
      showScreen("map");
    } else {
      showScreen("age");
    }
  }

  return { init: init };
})();
