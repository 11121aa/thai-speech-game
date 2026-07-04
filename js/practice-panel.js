const PracticePanel = (function () {
  // SVG mouth animations keyed by exercise_code.
  // Each SVG loops showing how the mouth moves to produce that sound.
  const MOUTH_ANIMATIONS = {
    por: `<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
  <style>
    .lip-up{animation:lu 2.5s ease-in-out infinite}
    .lip-dn{animation:ld 2.5s ease-in-out infinite}
    .puff{opacity:0;animation:pf 2.5s linear infinite}
    @keyframes lu{0%,100%{transform:translateY(0)}28%,60%{transform:translateY(10px)}}
    @keyframes ld{0%,100%{transform:translateY(0)}28%,60%{transform:translateY(-10px)}}
    @keyframes pf{0%,60%,78%,100%{opacity:0}64%,74%{opacity:1}}
  </style>
  <rect width="220" height="220" fill="#fdf4ec" rx="14"/>
  <!-- Nose (static) -->
  <path d="M45,16 C43,28 37,50 34,68 C32,82 37,93 46,100 C50,104 56,107 60,108"
        fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Upper lip only (animates down) -->
  <path class="lip-up"
        d="M60,108 C82,106 112,105 142,108 C156,110 166,114 173,119"
        fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
  <!-- Palate (static) -->
  <path d="M58,122 C84,126 118,129 150,130 C163,130 172,130 177,130"
        fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
  <!-- Lower lip only (animates up) -->
  <path class="lip-dn"
        d="M58,132 C84,130 118,129 150,132 C164,134 174,137 180,141"
        fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
  <!-- Tongue (static) -->
  <path d="M56,158 C78,150 110,146 146,149 C162,151 173,156 179,163"
        fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
  <!-- Lower jaw (static) -->
  <path d="M52,183 C76,177 124,173 165,174"
        fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
  <!-- Pharynx (static) -->
  <path d="M177,130 C176,154 176,172 175,190"
        fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M190,118 C189,142 189,165 188,192"
        fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M177,130 C182,125 186,121 190,118"
        fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linecap="round"/>
  <!-- Air puff at release -->
  <g class="puff">
    <path d="M46,113 C34,111 22,109 10,107" fill="none" stroke="#1a1a1a" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="7 5"/>
    <path d="M46,119 C32,120 18,122 8,122" fill="none" stroke="#1a1a1a" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="7 5"/>
  </g>
  <text x="8" y="212" font-family="Prompt,sans-serif" font-size="12" fill="#bbb">เสียง ป</text>
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
