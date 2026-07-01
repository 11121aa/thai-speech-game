const PracticePanel = (function () {
  // Placeholder mouth-position references, keyed by exercise_code.
  // TODO (Task 4 / future): replace icon+label with real diagrams/videos
  // supplied by the user, mapped via target_consonant once Task 2 lands.
  const MOUTH_PLACEHOLDERS = {
    ror: { icon: "👅", label: 'ลิ้นกระดกขึ้นแบบเสียง "ร"' },
    lor: { icon: "👅", label: 'ลิ้นแตะเพดานปากแบบเสียง "ล"' },
    cluster_kl: { icon: "👄", label: "คำควบกล้ำ กล" },
    cluster_pl: { icon: "👄", label: "คำควบกล้ำ ปล" },
    cluster_other: { icon: "👄", label: "คำควบกล้ำ ร/ล" }
  };

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
        if (currentWord) SpeechTool.speak(currentWord.word);
      });
      el("ppBtnMic").addEventListener("click", onMicClick);
      el("ppBtnCorrect").addEventListener("click", markCorrect);
      el("ppBtnRetry").addEventListener("click", resetForRetry);
      modalEl.addEventListener("hidden.bs.modal", onModalHidden);
    }
  }

  function mouthInfoFor(word) {
    const imageUrl = word.sounds && word.sounds.mouth_image_url;
    if (imageUrl) return { imageUrl: imageUrl };
    return MOUTH_PLACEHOLDERS[word.exercise_code] || null;
  }

  async function open(word, cbs) {
    const session = await Auth.getSession();
    if (!session) {
      const page = location.pathname.split("/").pop() || "index.html";
      location.href = "login.html?redirect=" + encodeURIComponent(page);
      return;
    }
    ensureModal();
    currentWord = word;
    callbacks = cbs || {};

    el("ppEmoji").textContent = word.emoji || "🔸";
    el("ppWord").textContent = word.word;
    el("ppReading").textContent = word.reading;
    const mouth = mouthInfoFor(word);
    const diag = el("ppMouthDiagram");
    if (!mouth) {
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
      el("ppRecordHint").textContent = "กำลังอัดเสียง... กดอีกครั้งเพื่อหยุด";
      el("ppErrorMsg").style.display = "none";

      recordController = Recorder.startRecording(
        el("ppWaveCanvas"),
        async function (blob) {
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
            const result = await Recorder.uploadAndSavePractice(blob, currentWord.id, session.user.id);
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
