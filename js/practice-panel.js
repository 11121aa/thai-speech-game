const PracticePanel = (function () {
  // SVG mouth animations keyed by exercise_code.
  // Each SVG loops showing how the mouth moves to produce that sound.
  const MOUTH_ANIMATIONS = {
    por: `<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
  <rect width="220" height="220" fill="#fdf4ec" rx="14"/>
  <!-- Nose profile (static) -->
  <path d="M 52,20 C 50,30 44,50 41,66 C 39,78 44,89 52,96 C 56,100 62,102 66,103"
        fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Upper lip + palate (moves DOWN on closure) -->
  <g>
    <animateTransform attributeName="transform" type="translate"
      values="0,0; 0,12; 0,12; 0,0"
      keyTimes="0; 0.28; 0.58; 1"
      dur="2.5s" repeatCount="indefinite"
      calcMode="spline"
      keySplines="0.5 0 0.2 1; 0 0 1 1; 0.3 0 0.9 1"/>
    <path d="M 66,103 C 88,101 118,100 150,103 C 163,105 173,109 180,113"
          fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M 64,115 C 92,119 128,122 161,124 C 174,124 183,124 190,124"
          fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
  </g>
  <!-- Lower lip + tongue + jaw (moves UP on closure) -->
  <g>
    <animateTransform attributeName="transform" type="translate"
      values="0,0; 0,-13; 0,-13; 0,0"
      keyTimes="0; 0.28; 0.58; 1"
      dur="2.5s" repeatCount="indefinite"
      calcMode="spline"
      keySplines="0.5 0 0.2 1; 0 0 1 1; 0.3 0 0.9 1"/>
    <path d="M 64,128 C 90,126 122,125 155,128 C 168,130 178,133 184,137"
          fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M 62,156 C 86,148 116,144 150,147 C 165,149 177,154 184,161"
          fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M 56,182 C 82,176 130,172 170,173"
          fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
  </g>
  <!-- Pharynx right side (static) -->
  <path d="M 190,124 C 189,148 189,168 188,190"
        fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M 204,108 C 203,135 203,162 202,194"
        fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M 190,124 C 195,118 200,112 204,108"
        fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
  <!-- Air puff at release (dashed lines left of lips, brief flash) -->
  <g opacity="0">
    <animate attributeName="opacity"
      values="0; 0; 1; 1; 0"
      keyTimes="0; 0.56; 0.6; 0.68; 0.76"
      dur="2.5s" repeatCount="indefinite"/>
    <path d="M 52,108 C 40,106 28,104 16,102"
          fill="none" stroke="#1a1a1a" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="7 5"/>
    <path d="M 52,114 C 38,115 24,117 12,117"
          fill="none" stroke="#1a1a1a" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="7 5"/>
  </g>
  <text x="8" y="214" font-family="Prompt,sans-serif" font-size="12" fill="#aaa" font-weight="500">เสียง ป</text>
</svg>`
  };

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
    // Animation box: animation > picture > hidden
    const animSvg = MOUTH_ANIMATIONS[word.exercise_code];
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
