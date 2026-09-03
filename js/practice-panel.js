const PracticePanel = (function () {
  let modalEl = null;
  let modal = null;
  let currentWord = null;
  let recordController = null;
  let isRecording = false;
  let cameraStream = null;
  let lastPracticeId = null;
  let callbacks = {};
  let continueTimer = null;
  let wired = false;

  // Multi-rep capture state (see openMultiRep)
  let multiTotal = 1;
  let multiSegments = []; // [{ blob, url }]
  let multiHoldController = null;
  let multiIsHolding = false;

  function el(id) {
    return document.getElementById(id);
  }

  /* ── Recording feedback ────────────────────────────────────────
     A child pressing record shouldn't have to read a hint to know it
     worked. Three non-visual cues fire together on start/stop: a short
     vibration, a soft tone, and (while recording) the button swelling
     in time with their own voice. All three degrade silently on
     browsers or devices that don't support them. */

  // Android/Chrome honour this; iOS Safari has no vibration API at all,
  // so this is a bonus, never the only signal that something happened.
  function buzz(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  // Short synthesized earcons rather than audio files -- no extra network
  // request, no load-order dependency, and they can't be missing. Rising
  // two-note = "go", falling = "done", which reads as start/stop without
  // words. Its own AudioContext, created lazily inside the user gesture
  // so autoplay policy lets it through, and reused thereafter.
  let cueCtx = null;
  function cue(kind) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!cueCtx) cueCtx = new AC();
      if (cueCtx.state === "suspended") cueCtx.resume();
      const notes = kind === "start" ? [660, 880] : [660, 440];
      notes.forEach(function (hz, i) {
        const t0 = cueCtx.currentTime + i * 0.09;
        const osc = cueCtx.createOscillator();
        const gain = cueCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = hz;
        // Quick fade in/out -- a raw gate on a sine pops audibly.
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
        osc.connect(gain); gain.connect(cueCtx.destination);
        osc.start(t0); osc.stop(t0 + 0.14);
      });
    } catch (e) {}
  }

  // Drives the button's live "hearing you" swell. rms is roughly 0..0.3
  // for normal speech, so it's scaled up and clamped; the CSS reads
  // --level to grow the ring (see .mic-btn in css/style.css).
  function setMicLevel(btn, rms) {
    if (!btn) return;
    const lvl = Math.max(0, Math.min(1, (rms || 0) * 7));
    btn.style.setProperty("--level", lvl.toFixed(3));
  }
  function clearMicLevel(btn) {
    if (btn) btn.style.setProperty("--level", "0");
  }

  function ensureModal() {
    if (!modalEl) {
      modalEl = el("practiceModal");
      modal = new bootstrap.Modal(modalEl);
    }
    if (!wired) {
      wired = true;
      el("ppBtnListen").addEventListener("click", function () {
        // No text-to-speech fallback — this button only ever shows when
        // currentWord.sound_url exists (see resetPanelState).
        if (currentWord && currentWord.sound_url) new Audio(currentWord.sound_url).play();
      });
      // Tap to start, tap again to stop -- was press-and-hold (release to
      // stop), which is hard for young kids to sustain while also
      // concentrating on saying the word. pointerup/pointerleave no longer
      // stop it (lifting the finger mid-recording is now expected, not a
      // "done" signal); pointercancel still stops it, since that's a real
      // interruption (OS gesture, app losing focus), not a normal tap.
      el("ppBtnMic").addEventListener("pointerdown", function (e) {
        if (isRecording) onSingleHoldEnd(e); else onSingleHoldStart(e);
      });
      el("ppBtnMic").addEventListener("pointercancel", onSingleHoldEnd);
      // The waveform strip sits directly above the button and has no other
      // job, so it acts as extra target area -- roughly doubling what a
      // child can hit. It drives the SINGLE-rep flow only: it's hidden
      // during multi-rep capture, so there's no ambiguity about which
      // recorder a tap belongs to.
      const wave = el("ppWaveCanvas");
      if (wave) {
        wave.style.cursor = "pointer";
        wave.addEventListener("pointerdown", function (e) {
          if (el("ppMultiCapture") && el("ppMultiCapture").style.display !== "none") return;
          if (isRecording) onSingleHoldEnd(e); else onSingleHoldStart(e);
        });
      }
      el("ppBtnCorrect").addEventListener("click", markCorrect);
      el("ppBtnRetry").addEventListener("click", resetForRetry);
      el("ppBtnSkip").addEventListener("click", function () { modal.hide(); });
      modalEl.addEventListener("hidden.bs.modal", onModalHidden);

      // The multi-rep capture markup only exists on pages built from
      // game.html's practiceModal (cooking.html/app.html share this same
      // module but predate this markup) -- guard so wiring the new
      // multi-rep controls doesn't throw on those pages. This does NOT
      // make the single-rep flow work on cooking.html/app.html in
      // general -- both already dereference other, unrelated pre-existing
      // ids (ppBtnSkip, ppRepCounter) that they also lack, a bug that
      // predates this branch and isn't fixed here.
      const micHoldBtn = el("ppBtnMicHold");
      if (micHoldBtn) {
        // Same tap-to-start/tap-to-stop change as ppBtnMic above.
        micHoldBtn.addEventListener("pointerdown", function (e) {
          if (multiIsHolding) onMultiHoldEnd(e); else onMultiHoldStart(e);
        });
        micHoldBtn.addEventListener("pointercancel", onMultiHoldEnd);
        el("ppBtnMultiRedo").addEventListener("click", onMultiRedo);
        el("ppBtnMultiDone").addEventListener("click", onMultiDone);
      }
    }
  }

  // Shared word-display setup (picture, title, mouth animation) used by
  // both the single-rep flow (open) and the multi-rep flow (openMultiRep).
  function setupWordDisplay(word) {
    // Picture priority: the word's own uploaded image > the legacy
    // generated-illustration manifest (kept alive for older words that
    // predate the upload feature) > the emoji fallback.
    const pictureUrl = word.image_url || (window.Illustrations && Illustrations.get(word.word));
    if (pictureUrl) {
      el("ppEmoji").innerHTML = '<img src="' + pictureUrl + '" alt="' + word.word + '" style="height:64px;max-width:100%;object-fit:contain;">';
    } else {
      // No picture and no custom emoji — show the word itself rather
      // than a meaningless generic icon.
      el("ppEmoji").textContent = (word.emoji && word.emoji !== word.word) ? word.emoji : word.word;
    }
    el("ppWord").textContent = word.word;
    el("ppReading").textContent = word.level || "";

    // Animation box: animation > picture > hidden. The mouth-animation
    // clip is uploaded per sound (see management.html's Sounds tab) and
    // comes through on the nested `sounds` join from WordsApi.fetchAllWords().
    const animUrl = word.sounds && word.sounds.mouth_animation_url;
    const animSvg = animUrl ? '<img src="' + animUrl + '" alt="ปากเสียง ' + word.letter_category + '" style="width:100%;height:100%;display:block;">' : null;
    const animBox = el("ppMouthAnimation");
    if (animBox) {
      if (animSvg) {
        animBox.innerHTML = animSvg;
        animBox.style.display = "flex";
      } else {
        animBox.innerHTML = "";
        animBox.style.display = "none";
      }
    }

    // Pronunciation description box: teacher-written text on the sound,
    // shown alongside the animation/camera boxes (not mutually exclusive).
    const tip = word.sounds && word.sounds.pronunciation_tip;
    const diag = el("ppMouthDiagram");
    if (tip) {
      diag.style.display = "flex";
      diag.textContent = tip;
    } else {
      diag.style.display = "none";
      diag.textContent = "";
    }
  }

  async function open(word, cbs) {
    const session = await Auth.getSession();
    if (!session) {
      const page = location.pathname.split("/").pop() || "game.html";
      location.href = "login.html?redirect=" + encodeURIComponent(page);
      return;
    }
    ensureModal();
    currentWord = word;
    callbacks = cbs || {};
    setupWordDisplay(word);

    const repCounter = el("ppRepCounter");
    if (cbs && cbs.repTotal > 1) {
      repCounter.textContent = "ครั้งที่ " + cbs.repIndex + " จาก " + cbs.repTotal;
      repCounter.style.display = "block";
    } else {
      repCounter.style.display = "none";
    }

    resetPanelState();
    modal.show();
    startCameraMirror();
  }

  async function openMultiRep(word, cbs) {
    const session = await Auth.getSession();
    if (!session) {
      const page = location.pathname.split("/").pop() || "game.html";
      location.href = "login.html?redirect=" + encodeURIComponent(page);
      return;
    }
    ensureModal();
    currentWord = word;
    callbacks = cbs || {};
    multiTotal = (cbs && cbs.total) || 1;
    setupWordDisplay(word);
    el("ppRepCounter").style.display = "none";

    resetMultiCaptureState();
    modal.show();
    startCameraMirror();
  }

  function resetPanelState() {
    el("ppPlaybackArea").style.display = "none";
    el("ppErrorMsg").style.display = "none";
    el("ppCorrectMsg").style.display = "none";
    el("ppBtnCorrect").disabled = true;
    lastPracticeId = null;
    // Restore practice aids hidden during playback review
    var ps = el("ppPracticeStage");
    if (ps) ps.style.display = "";
    // No TTS fallback — the listen button only ever shows when this word
    // actually has a real recorded pronunciation clip.
    el("ppBtnListen").style.display = (callbacks.showListen === false || !(currentWord && currentWord.sound_url)) ? "none" : "";
    el("ppWaveCanvas").style.display = "";
    el("ppBtnMic").style.display = "";
    el("ppRecordHint").style.display = "";
    // Multi-rep markup only exists on pages built from game.html's
    // practiceModal -- guard for cooking.html/app.html, which share this
    // module's single-rep open() flow but predate this markup.
    var multiCapture = el("ppMultiCapture");
    if (multiCapture) multiCapture.style.display = "none";
    // Belt-and-braces: onModalHidden is what actually re-enables controls
    // a save left disabled, but that only runs on an intervening hide.
    // Not currently reachable without one, but cheap and idempotent
    // (see setMultiCaptureControlsEnabled's null guards) to also reset
    // here at the point a fresh panel is about to be shown.
    setMultiCaptureControlsEnabled(true);
    if (continueTimer) {
      clearTimeout(continueTimer);
      continueTimer = null;
    }
    resetMicButton();
  }

  function resetMultiCaptureState() {
    el("ppPlaybackArea").style.display = "none";
    el("ppErrorMsg").style.display = "none";
    var ps = el("ppPracticeStage");
    if (ps) ps.style.display = "";
    el("ppBtnListen").style.display = (callbacks.showListen === false || !(currentWord && currentWord.sound_url)) ? "none" : "";

    el("ppWaveCanvas").style.display = "";
    el("ppBtnMic").style.display = "none";
    el("ppRecordHint").style.display = "none";
    el("ppMultiCapture").style.display = "block";

    multiSegments.forEach(function (s) { if (s.url) URL.revokeObjectURL(s.url); });
    multiSegments = [];
    // onMultiDone() relabels this button while saving; reset it here so a
    // later word's capture screen doesn't inherit a stuck "กำลังบันทึก..."
    // label from a previous successful submission. (Controls disabled
    // during a save are primarily re-enabled in onModalHidden, which
    // covers every path back to a fresh modal, not just this one -- the
    // call below is belt-and-braces for a re-open without an intervening
    // hide, not currently reachable but cheap and idempotent.)
    setMultiCaptureControlsEnabled(true);
    var doneBtn = el("ppBtnMultiDone");
    doneBtn.textContent = "เสร็จแล้ว";
    renderMultiCards();
    resetMultiMicButton();
  }

  function resetMultiMicButton() {
    multiIsHolding = false;
    // Called unconditionally from onModalHidden on every page -- guard
    // for cooking.html/app.html, which lack this markup (see ensureModal).
    const btn = el("ppBtnMicHold");
    if (!btn) return;
    btn.classList.remove("recording");
    btn.innerHTML = '<i class="bi bi-mic-fill"></i>';
    clearMicLevel(btn);
    el("ppMultiHint").textContent = "กดปุ่มไมค์เพื่อเริ่มอัดเสียง แล้วกดอีกครั้งเพื่อหยุด";
  }

  function renderMultiCards() {
    const wrap = el("ppMultiCards");
    wrap.innerHTML = "";
    multiSegments.forEach(function (seg, i) {
      const card = document.createElement("div");
      card.style.cssText = "background:var(--color-bg-soft);border-radius:12px;padding:6px 8px;display:flex;align-items:center;gap:6px;";
      // A segment's practice row can exist (practiceId set) before
      // `uploaded` is true -- uploaded only flips once the follow-up
      // parent_marked_correct update also succeeds. Gate on either: a row
      // exists the moment practiceId is set, and this UI has no way to
      // delete a row, only to avoid creating one. Only offer discard for
      // segments that are still purely local.
      const delBtn = (seg.practiceId || seg.uploaded)
        ? ''
        : '<button class="btn btn-sm btn-outline-danger py-0 px-2" data-idx="' + i + '" data-act="del">ลบ</button>';
      card.innerHTML =
        '<span style="font-weight:700;">' + (i + 1) + '</span>' +
        '<button class="btn btn-sm btn-outline-primary py-0 px-2" data-idx="' + i + '" data-act="play">▶</button>' +
        delBtn;
      wrap.appendChild(card);
    });
    el("ppMultiProgress").textContent = multiSegments.length + " / " + multiTotal;
    el("ppBtnMultiDone").disabled = multiSegments.length !== multiTotal;

    wrap.querySelectorAll('[data-act="play"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        const seg = multiSegments[parseInt(btn.getAttribute("data-idx"), 10)];
        if (seg) new Audio(seg.url).play();
      });
    });
    wrap.querySelectorAll('[data-act="del"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        const seg = multiSegments[idx];
        if (seg && seg.url) URL.revokeObjectURL(seg.url);
        multiSegments.splice(idx, 1);
        renderMultiCards();
      });
    });
  }

  // How long a silence has to last before it's treated as a real gap
  // between repetitions, rather than a pause within a single longer
  // utterance. A short single-syllable word only needs ~90ms (tuned
  // against live testing of rapid repetition), but a longer word or a
  // full sentence has its own natural pauses between its own syllables/
  // words that can easily exceed that -- confirmed by testing, where a
  // fixed 90ms chopped sentences into fragments mid-utterance. Character
  // count is a rough proxy for how much speech a word represents (not a
  // real syllable count, but Thai script length does track "how much
  // there is to say" well enough for this without needing a real
  // syllable analyzer). Capped so an unusually long sentence doesn't push
  // the gap out far enough to feel unresponsive between real repetitions.
  function estimateSilenceGapMs(word) {
    const len = (word && word.word) ? word.word.length : 0;
    const gap = 90 + Math.max(0, len - 2) * 40;
    return Math.min(gap, 450);
  }

  function onMultiHoldStart(e) {
    e.preventDefault();
    if (multiIsHolding) return;
    multiIsHolding = true;
    const btn = el("ppBtnMicHold");
    btn.classList.add("recording");
    btn.innerHTML = '<i class="bi bi-stop-fill"></i>';
    el("ppMultiHint").textContent = "กำลังฟังอยู่... พูดได้เลย! 🎤";
    el("ppErrorMsg").style.display = "none";
    buzz(18); cue("start"); clearMicLevel(btn);

    // getUserMedia() can resolve well after this call returns (notably,
    // while a permission prompt is up). If the modal moved on to a
    // different word in that window, this callback must not attribute its
    // audio to the new currentWord -- capture which word this hold
    // actually belongs to and bail if it no longer matches.
    const heldWord = currentWord;

    // Cards used to appear all at once when the hold ended, so a child
    // saying five repetitions got no sign any of them had registered until
    // they let go. Each one is now added the moment the recorder confirms
    // it, which also keeps the N / total counter and the ✓ button live.
    let heardThisHold = 0;

    multiHoldController = Recorder.startHoldRecording(
      el("ppWaveCanvas"),
      function () {
        resetMultiMicButton();
        if (currentWord !== heldWord) return; // modal moved on to a different word while this hold was pending
        // Segments were already added as they arrived; nothing to slice here.
        if (!heardThisHold) el("ppMultiHint").textContent = "ไม่ได้ยินเสียงพูด ลองกดค้างแล้วพูดอีกครั้ง";
      },
      function () {
        resetMultiMicButton();
        showError("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้ไมโครโฟน");
      },
      estimateSilenceGapMs(heldWord),
      function (rms) { setMicLevel(el("ppBtnMicHold"), rms); },
      function (wavBlob) {
        // Same guard as the finish callback: a hold whose permission
        // prompt outlived the word must not attribute audio to the new one.
        if (currentWord !== heldWord) return;
        heardThisHold++;
        multiSegments.push({ blob: wavBlob, url: URL.createObjectURL(wavBlob), uploaded: false, practiceId: null });
        renderMultiCards();
        buzz(10);
        if (multiIsHolding) {
          // Extras aren't dropped -- overshooting still leaves the ✓ button
          // disabled and the existing per-card delete is the way back, the
          // same as before. The live count is what makes that unlikely now.
          el("ppMultiHint").textContent = multiSegments.length >= multiTotal
            ? "ครบแล้ว! ปล่อยนิ้วได้เลย 🎉"
            : "ได้ยินแล้ว " + multiSegments.length + "/" + multiTotal + " — พูดต่อได้เลย!";
        }
      }
    );
  }

  function onMultiHoldEnd(e) {
    if (e) e.preventDefault();
    if (!multiIsHolding) return;
    buzz([12, 40, 12]); cue("stop");
    clearMicLevel(el("ppBtnMicHold"));
    if (multiHoldController) multiHoldController.stop();
  }

  function onMultiRedo() {
    if (multiIsHolding && multiHoldController) multiHoldController.cancel();
    // Same rule as the per-card discard button (see renderMultiCards): a
    // segment with a practiceId already has a real practice row behind it
    // -- possibly still mid-retry if parent_marked_correct hasn't
    // succeeded yet -- so "start over" only clears purely local segments,
    // never one that's been uploaded or is in the middle of being marked.
    multiSegments = multiSegments.filter(function (s) {
      if (s.practiceId || s.uploaded) return true;
      if (s.url) URL.revokeObjectURL(s.url);
      return false;
    });
    renderMultiCards();
    resetMultiMicButton();
  }

  // Disables/re-enables every control that could mutate multiSegments,
  // start a new hold, or close the modal while a save is in flight --
  // otherwise a tap on ลบ, "อัดใหม่", the mic, or ✕ can let the game move
  // on to a new word while onMultiDone's loop is still running, uploading
  // its remaining segments against the *new* currentWord.
  // Every lookup here is null-guarded: this needs to be safely callable
  // from onModalHidden, which runs on every page that loads this module
  // (including cooking.html/app.html, which lack the multi-rep markup --
  // see ensureModal) and regardless of which flow (single-rep or
  // multi-rep) is about to open next.
  function setMultiCaptureControlsEnabled(enabled) {
    const micHoldBtn = el("ppBtnMicHold");
    if (micHoldBtn) micHoldBtn.disabled = !enabled;
    const redoBtn = el("ppBtnMultiRedo");
    if (redoBtn) redoBtn.disabled = !enabled;
    const cardsWrap = el("ppMultiCards");
    if (cardsWrap) cardsWrap.querySelectorAll("button").forEach(function (b) { b.disabled = !enabled; });
    const skipBtn = el("ppBtnSkip");
    if (skipBtn) skipBtn.disabled = !enabled;
  }

  async function onMultiDone() {
    if (multiSegments.length !== multiTotal) return;
    const btn = el("ppBtnMultiDone");
    btn.disabled = true;
    btn.textContent = "กำลังบันทึก...";
    setMultiCaptureControlsEnabled(false);

    // setMultiCaptureControlsEnabled disables every control this module
    // knows about that could close the modal or advance the word, but it's
    // still only a defense against *this* module's own controls -- it
    // can't stop a caller from tearing the modal down some other way.
    // Snapshotting what this save belongs to, and using the snapshot
    // everywhere below instead of the live currentWord/callbacks, means
    // even if that happens, this save still finishes against the word and
    // callbacks it started with rather than whatever replaced them.
    const savingWord = currentWord;
    const savingCallbacks = callbacks;

    try {
      const session = await Auth.getSession();
      const extra = {};
      if (savingCallbacks.hwAssignmentId) extra.homework_assignment_id = savingCallbacks.hwAssignmentId;
      if (savingCallbacks.worksheetProgressId) extra.worksheet_progress_id = savingCallbacks.worksheetProgressId;

      // Snapshot the list being saved -- controls that could change it are
      // disabled above, but iterating a stable copy is the cheap guarantee
      // that a skipped/duplicated iteration can't happen even so.
      const batch = multiSegments.slice();
      const pending = batch.filter(function (seg) { return !seg.uploaded; }); // skip segments already fully saved on an earlier attempt

      // One insert per segment (parent_marked_correct is set directly on
      // the row -- see uploadAndSavePractice -- instead of a second
      // sequential UPDATE), and all segments upload in parallel instead of
      // one at a time. That's what made "เสร็จแล้ว" feel slow with 5
      // recordings: up to 10 sequential round-trips became up to 5 run
      // concurrently. Each segment mutates itself independently as its own
      // promise settles, so a segment that fails stays retryable without
      // touching the ones that already succeeded.
      const results = await Promise.allSettled(pending.map(async function (seg) {
        const result = await Recorder.uploadAndSavePractice(
          seg.blob, savingWord.id, session.user.id, "audio/wav",
          Object.assign({}, extra, { parent_marked_correct: true })
        );
        seg.practiceId = result.id;
        seg.uploaded = true;
      }));
      const failed = results.find(function (r) { return r.status === "rejected"; });
      if (failed) throw failed.reason;

      if (savingCallbacks.onCorrect) savingCallbacks.onCorrect();
      if (currentWord === savingWord) modal.hide(); // only close a modal that's still showing this same save
    } catch (err) {
      if (currentWord !== savingWord) return; // this save's word isn't on screen anymore -- nothing here to repaint
      // Rebuild the cards first -- any segment that reached `uploaded`
      // before the failure needs its delete button gone (see
      // renderMultiCards), and this also gives the mic/redo buttons fresh,
      // enabled event listeners in one step.
      renderMultiCards();
      setMultiCaptureControlsEnabled(true);
      btn.disabled = false;
      btn.textContent = "เสร็จแล้ว";
      showError("เกิดข้อผิดพลาดในการบันทึกเสียง กรุณาลองใหม่");
    }
  }

  function resetForRetry() {
    resetPanelState();
    const btn = el("ppBtnMic");
    btn.disabled = true;
    el("ppRecordHint").textContent = "รอสักครู่...";
    setTimeout(function () {
      btn.disabled = false;
      el("ppRecordHint").textContent = "กดปุ่มไมค์เพื่อเริ่มอัดเสียง แล้วกดอีกครั้งเพื่อหยุด";
    }, 1000);
  }

  function resetMicButton() {
    isRecording = false;
    const btn = el("ppBtnMic");
    btn.classList.remove("recording");
    btn.innerHTML = '<i class="bi bi-mic-fill"></i>';
    clearMicLevel(btn);
    el("ppRecordHint").textContent = "กดปุ่มไมค์เพื่อเริ่มอัดเสียง แล้วกดอีกครั้งเพื่อหยุด";
  }

  function showError(message) {
    el("ppErrorMsg").textContent = message;
    el("ppErrorMsg").style.display = "block";
  }

  function startCameraMirror() {
    const wrap = el("ppCameraWrap");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      wrap.style.display = "none";
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(function (stream) {
        cameraStream = stream;
        el("ppCameraVideo").srcObject = stream;
        wrap.style.display = "block";
      })
      .catch(function () {
        wrap.style.display = "none";
      });
  }

  function stopCameraMirror() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (t) {
        t.stop();
      });
      cameraStream = null;
    }
  }

  function onSingleHoldStart(e) {
    e.preventDefault();
    if (isRecording) return;
    isRecording = true;
    const btn = el("ppBtnMic");
    btn.classList.add("recording");
    btn.innerHTML = '<i class="bi bi-stop-fill"></i>';
    el("ppRecordHint").textContent = "กำลังฟังอยู่... พูดได้เลย! 🎤";
    el("ppErrorMsg").style.display = "none";
    buzz(18); cue("start"); clearMicLevel(btn);

    // Same reasoning as onMultiHoldStart's heldWord: getUserMedia() can
    // resolve after the modal has already moved on to a different word
    // (e.g. a pending permission prompt), so the callback below must not
    // attribute its audio to whatever currentWord happens to be by then.
    const heldWord = currentWord;

    recordController = Recorder.startHoldRecording(
      el("ppWaveCanvas"),
      async function (samples, sampleRate, segments) {
        resetMicButton();
        if (currentWord !== heldWord) return;
        if (!segments.length) {
          showError("ไม่ได้ยินเสียงพูด กรุณาลองใหม่");
          return;
        }
        const btn = el("ppBtnMic");
        btn.disabled = true;
        el("ppRecordHint").textContent = "รอสักครู่...";
        setTimeout(function () {
          btn.disabled = false;
          if (el("ppPlaybackArea").style.display === "none") {
            el("ppRecordHint").textContent = "กดปุ่มไมค์เพื่อเริ่มอัดเสียง แล้วกดอีกครั้งเพื่อหยุด";
          }
        }, 1000);
        try {
          // Only one repetition is expected here -- take the first
          // detected segment even if the child spoke more than once.
          const wavBlobs = Recorder.sliceSamplesToWavSegments(samples, sampleRate, [segments[0]]);
          const blob = wavBlobs[0];
          const session = await Auth.getSession();
          const extra = {};
          if (callbacks.hwAssignmentId) extra.homework_assignment_id = callbacks.hwAssignmentId;
          if (callbacks.worksheetProgressId) extra.worksheet_progress_id = callbacks.worksheetProgressId;
          const result = await Recorder.uploadAndSavePractice(blob, currentWord.id, session.user.id, "audio/wav",
            Object.keys(extra).length ? extra : undefined);
          lastPracticeId = result.id;
          showPlayback(blob);
        } catch (err) {
          console.error("[single-rep] recording failed:", err);
          showError("เกิดข้อผิดพลาดในการบันทึกเสียง กรุณาลองใหม่");
        }
      },
      function () {
        resetMicButton();
        showError("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้ไมโครโฟน");
      },
      estimateSilenceGapMs(heldWord),
      function (rms) { setMicLevel(el("ppBtnMic"), rms); }
    );
  }

  function onSingleHoldEnd(e) {
    if (e) e.preventDefault();
    if (!isRecording) return;
    buzz([12, 40, 12]); cue("stop");
    clearMicLevel(el("ppBtnMic"));
    if (recordController) recordController.stop();
  }

  function showPlayback(blob) {
    const audioEl = el("ppPlaybackAudio");
    const url = URL.createObjectURL(blob);
    audioEl.src = url;
    // Collapse practice aids — frees ~150px so the judge buttons fit on screen
    var ps = el("ppPracticeStage");
    if (ps) ps.style.display = "none";
    el("ppBtnListen").style.display  = "none";
    el("ppWaveCanvas").style.display = "none";
    el("ppBtnMic").style.display     = "none";
    el("ppRecordHint").style.display = "none";
    el("ppPlaybackArea").style.display = "block";

    const btnCorrect = el("ppBtnCorrect");
    btnCorrect.disabled = true;
    let unlocked = false;
    function unlock() {
      if (!unlocked) {
        unlocked = true;
        btnCorrect.disabled = false;
      }
    }
    continueTimer = setTimeout(unlock, 1500);
    audioEl.addEventListener("ended", unlock, { once: true });
    audioEl.play().catch(function () {
      /* autoplay may be blocked; 1.5s timer still unlocks as fallback */
    });

    Recorder.drawPlayback(audioEl, el("ppWaveCanvas"));
  }

  async function markCorrect() {
    if (lastPracticeId) {
      try {
        await sb.from("practice").update({ parent_marked_correct: true }).eq("id", lastPracticeId);
      } catch (e) {
        /* non-fatal: still give the child positive feedback locally */
      }
    }
    el("ppCorrectMsg").style.display = "block";
    el("ppBtnCorrect").disabled = true;
    setTimeout(function () {
      if (callbacks.onCorrect) callbacks.onCorrect();
      modal.hide();
    }, 900);
  }

  function onModalHidden() {
    const animBox = el("ppMouthAnimation");
    if (animBox) { animBox.innerHTML = ""; animBox.style.display = "none"; }
    stopCameraMirror();
    if (recordController) {
      recordController.cancel();
      recordController = null;
    }
    if (multiHoldController) {
      multiHoldController.cancel();
      multiHoldController = null;
    }
    multiSegments.forEach(function (s) { if (s.url) URL.revokeObjectURL(s.url); });
    multiSegments = [];
    resetMicButton();
    resetMultiMicButton();
    // A save in progress when the modal closed left these disabled
    // (see onMultiDone/setMultiCaptureControlsEnabled) -- reset here,
    // on every close regardless of which flow opens next, rather than
    // only in the multi-rep entry point. ppBtnSkip is shared with the
    // single-rep flow, so fixing it only on the multi-rep side would
    // still leave a single-rep game's ✕ dead after a multi-rep word
    // that preceded it in the same session.
    setMultiCaptureControlsEnabled(true);
    var multiCapture = el("ppMultiCapture");
    if (multiCapture) multiCapture.style.display = "none";
    if (callbacks.onClosed) callbacks.onClosed();
  }

  return { open: open, openMultiRep: openMultiRep };
})();
