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
    }
  }

  function mouthInfoFor(word) {
    return null;
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

    // Picture priority: the word's own uploaded image > the legacy
    // generated-illustration manifest (kept alive for older words that
    // predate the upload feature) > the emoji fallback.
    const pictureUrl = word.image_url || (window.Illustrations && Illustrations.get(word.word));
    if (pictureUrl) {
      el("ppEmoji").innerHTML = '<img src="' + pictureUrl + '" alt="' + word.word + '" style="height:64px;max-width:100%;object-fit:contain;">';
    } else {
      // A word's emoji field can be auto-set equal to its own word text
      // when it has no picture — ppWord right below already shows that
      // text, so this guard stops it printing twice.
      el("ppEmoji").textContent = (word.emoji && word.emoji !== word.word) ? word.emoji : "🔸";
    }
    el("ppWord").textContent = word.word;
    el("ppReading").textContent = word.level || "";
    const repCounter = el("ppRepCounter");
    if (cbs && cbs.repTotal > 1) {
      repCounter.textContent = "ครั้งที่ " + cbs.repIndex + " จาก " + cbs.repTotal;
      repCounter.style.display = "block";
    } else {
      repCounter.style.display = "none";
    }
    // Animation box: animation > picture > hidden. The mouth-animation
    // clip is uploaded per sound (see management.html's Sounds tab) and
    // comes through on the nested `sounds` join from WordsApi.fetchAllWords().
    const animUrl = word.sounds && word.sounds.mouth_animation_url;
    console.log('[mouth animation] word:', word.word, 'letter_category:', word.letter_category, 'sound_id:', word.sound_id, 'sounds join:', word.sounds, 'animUrl:', animUrl);
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

    resetPanelState();
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
    if (continueTimer) {
      clearTimeout(continueTimer);
      continueTimer = null;
    }
    resetMicButton();
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
    resetMicButton();
    if (callbacks.onClosed) callbacks.onClosed();
  }

  return { open: open };
})();
