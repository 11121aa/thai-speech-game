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
      el("ppBtnMic").addEventListener("click", onMicClick);
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
        micHoldBtn.addEventListener("pointerdown", onMultiHoldStart);
        micHoldBtn.addEventListener("pointerup", onMultiHoldEnd);
        micHoldBtn.addEventListener("pointerleave", onMultiHoldEnd);
        micHoldBtn.addEventListener("pointercancel", onMultiHoldEnd);
        el("ppBtnMultiRedo").addEventListener("click", onMultiRedo);
        el("ppBtnMultiDone").addEventListener("click", onMultiDone);
      }
    }
  }

  function mouthInfoFor(word) {
    return null;
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

    // Picture/icon box: only shown when no animation
    const mouth = mouthInfoFor(word);
    const diag = el("ppMouthDiagram");
    if (animSvg || !mouth) {
      diag.style.display = "none";
    } else if (mouth.imageUrl) {
      diag.style.display = "flex";
      diag.innerHTML = '<img src="' + mouth.imageUrl + '" alt="ภาพปาก" style="width:100%;height:100%;object-fit:contain;border-radius:12px;" onerror="this.parentNode.style.display=\'none\'">';
    } else {
      diag.style.display = "flex";
      diag.innerHTML = '<div class="mouth-diagram-icon">' + mouth.icon + "</div><div>" + mouth.label + "</div>";
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
    // label from a previous successful submission.
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
    el("ppMultiHint").textContent = "กดค้างที่ปุ่มไมค์แล้วพูด ปล่อยเมื่อพูดเสร็จ";
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

  function onMultiHoldStart(e) {
    e.preventDefault();
    if (multiIsHolding) return;
    multiIsHolding = true;
    const btn = el("ppBtnMicHold");
    btn.classList.add("recording");
    btn.innerHTML = '<i class="bi bi-stop-fill"></i>';
    el("ppMultiHint").textContent = "กำลังอัดเสียง... ปล่อยปุ่มเมื่อพูดเสร็จ";
    el("ppErrorMsg").style.display = "none";

    // getUserMedia() can resolve well after this call returns (notably,
    // while a permission prompt is up). If the modal moved on to a
    // different word in that window, this callback must not attribute its
    // audio to the new currentWord -- capture which word this hold
    // actually belongs to and bail if it no longer matches.
    const heldWord = currentWord;

    multiHoldController = Recorder.startHoldRecording(
      el("ppWaveCanvas"),
      function (blob, mimeType, segments) {
        resetMultiMicButton();
        if (currentWord !== heldWord) return; // modal moved on to a different word while this hold was pending
        if (!segments.length) return; // held the button but never actually spoke -- nothing to add
        Recorder.sliceBlobToWavSegments(blob, segments).then(function (wavBlobs) {
          if (currentWord !== heldWord) return; // re-check: the modal could have moved on during the async slice too
          wavBlobs.forEach(function (wavBlob) {
            multiSegments.push({ blob: wavBlob, url: URL.createObjectURL(wavBlob), uploaded: false, practiceId: null });
          });
          renderMultiCards();
        }).catch(function () {
          showError("เกิดข้อผิดพลาดในการประมวลผลเสียง กรุณาลองใหม่");
        });
      },
      function () {
        resetMultiMicButton();
        showError("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้ไมโครโฟน");
      }
    );
  }

  function onMultiHoldEnd(e) {
    if (e) e.preventDefault();
    if (!multiIsHolding) return;
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
  function setMultiCaptureControlsEnabled(enabled) {
    el("ppBtnMicHold").disabled = !enabled;
    el("ppBtnMultiRedo").disabled = !enabled;
    el("ppMultiCards").querySelectorAll("button").forEach(function (b) { b.disabled = !enabled; });
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
      for (let i = 0; i < batch.length; i++) {
        const seg = batch[i];
        if (seg.uploaded) continue; // already fully saved on an earlier attempt

        // practiceId is set as soon as the row exists, separately from
        // `uploaded` (only set once parent_marked_correct also succeeds) --
        // so a retry after the mark-correct step fails re-tries only that
        // step against the row that already exists, instead of calling
        // uploadAndSavePractice again and creating a duplicate row.
        if (!seg.practiceId) {
          const result = await Recorder.uploadAndSavePractice(
            seg.blob, savingWord.id, session.user.id, "audio/wav",
            Object.keys(extra).length ? extra : undefined
          );
          seg.practiceId = result.id;
        }
        const { error: markError } = await sb.from("practice").update({ parent_marked_correct: true }).eq("id", seg.practiceId);
        if (markError) throw markError;
        seg.uploaded = true;
      }

      if (savingCallbacks.onCorrect) savingCallbacks.onCorrect();
      if (currentWord === savingWord) modal.hide(); // only close a modal that's still showing this same save
    } catch (err) {
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
      el("ppRecordHint").textContent = "กดปุ่มไมค์เพื่อเริ่มอัดเสียง แล้วกดอีกครั้งเพื่อหยุดและบันทึก";
    }, 1000);
  }

  function resetMicButton() {
    isRecording = false;
    const btn = el("ppBtnMic");
    btn.classList.remove("recording");
    btn.innerHTML = '<i class="bi bi-mic-fill"></i>';
    el("ppRecordHint").textContent = "กดปุ่มไมค์เพื่อเริ่มอัดเสียง แล้วกดอีกครั้งเพื่อหยุดและบันทึก";
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

  function onMicClick() {
    if (!isRecording) {
      isRecording = true;
      const btn = el("ppBtnMic");
      btn.classList.add("recording");
      btn.innerHTML = '<i class="bi bi-stop-fill"></i>';
      el("ppRecordHint").textContent = "กำลังอัดเสียง... หยุดอัตโนมัติเมื่อหยุดพูด หรือกดอีกครั้งเพื่อหยุดเอง";
      el("ppErrorMsg").style.display = "none";

      recordController = Recorder.startRecording(
        el("ppWaveCanvas"),
        async function (blob, mimeType) {
          resetMicButton();
          const btn = el("ppBtnMic");
          btn.disabled = true;
          el("ppRecordHint").textContent = "รอสักครู่...";
          setTimeout(function () {
            btn.disabled = false;
            if (el("ppPlaybackArea").style.display === "none") {
              el("ppRecordHint").textContent = "กดปุ่มไมค์เพื่อเริ่มอัดเสียง แล้วกดอีกครั้งเพื่อหยุดและบันทึก";
            }
          }, 1000);
          try {
            const session = await Auth.getSession();
            const extra = {};
            if (callbacks.hwAssignmentId) extra.homework_assignment_id = callbacks.hwAssignmentId;
            if (callbacks.worksheetProgressId) extra.worksheet_progress_id = callbacks.worksheetProgressId;
            const result = await Recorder.uploadAndSavePractice(blob, currentWord.id, session.user.id, mimeType,
              Object.keys(extra).length ? extra : undefined);
            lastPracticeId = result.id;
            showPlayback(blob);
          } catch (err) {
            showError("เกิดข้อผิดพลาดในการบันทึกเสียง กรุณาลองใหม่");
          }
        },
        function () {
          resetMicButton();
          showError("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้ไมโครโฟน");
        }
      );
    } else {
      if (recordController) recordController.stop();
    }
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
    var multiCapture = el("ppMultiCapture");
    if (multiCapture) multiCapture.style.display = "none";
    if (callbacks.onClosed) callbacks.onClosed();
  }

  return { open: open, openMultiRep: openMultiRep };
})();
