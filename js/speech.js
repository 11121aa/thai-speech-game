const SpeechTool = (function () {
  const RecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  let cachedThaiVoice = null;

  if ("speechSynthesis" in window) {
    const pickVoice = function () {
      const voices = window.speechSynthesis.getVoices();
      cachedThaiVoice = voices.find(function (v) { return v.lang && v.lang.toLowerCase().indexOf("th") === 0; }) || null;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function isRecognitionSupported() {
    return !!RecognitionClass;
  }

  function isSynthesisSupported() {
    return "speechSynthesis" in window;
  }

  function speak(word) {
    if (!isSynthesisSupported()) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = "th-TH";
    utter.rate = 0.8;
    if (cachedThaiVoice) utter.voice = cachedThaiVoice;
    window.speechSynthesis.speak(utter);
  }

  function normalize(str) {
    return (str || "")
      .replace(/[\s.,!?؟。、,]/g, "")
      .trim()
      .toLowerCase();
  }

  function levenshtein(a, b) {
    const arrA = Array.from(a);
    const arrB = Array.from(b);
    const m = arrA.length;
    const n = arrB.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = [];
    for (let i = 0; i <= m; i++) dp.push([i]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arrA[i - 1] === arrB[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    return dp[m][n];
  }

  function similarity(target, transcript) {
    const t = normalize(target);
    const r = normalize(transcript);
    if (!t.length && !r.length) return 100;
    if (!r.length) return 0;
    const distance = levenshtein(t, r);
    const maxLen = Math.max(Array.from(t).length, Array.from(r).length);
    const pct = (1 - distance / maxLen) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  function drawWaveform(canvas, analyser, dataArray, rafHolder) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    function render() {
      rafHolder.id = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(dataArray);
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#2ec4b6";
      ctx.beginPath();
      const sliceWidth = width / dataArray.length;
      let x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }
    render();
  }

  function startListening(options) {
    const canvas = options.canvas;
    const onResult = options.onResult || function () {};
    const onNoSpeech = options.onNoSpeech || function () {};
    const onError = options.onError || function () {};

    const rafHolder = { id: null };
    let audioCtx = null;
    let mediaStream = null;
    let recognition = null;
    let settled = false;

    function cleanup() {
      if (rafHolder.id) cancelAnimationFrame(rafHolder.id);
      if (mediaStream) mediaStream.getTracks().forEach(function (t) { t.stop(); });
      if (audioCtx && audioCtx.state !== "closed") audioCtx.close();
      if (recognition) {
        try { recognition.abort(); } catch (e) { /* noop */ }
      }
    }

    function finishWithResult(transcript) {
      if (settled) return;
      settled = true;
      cleanup();
      onResult(transcript);
    }

    function finishWithNoSpeech() {
      if (settled) return;
      settled = true;
      cleanup();
      onNoSpeech();
    }

    function finishWithError(err) {
      if (settled) return;
      settled = true;
      cleanup();
      onError(err);
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      mediaStream = stream;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      if (canvas) drawWaveform(canvas, analyser, dataArray, rafHolder);

      if (!RecognitionClass) {
        return;
      }

      recognition = new RecognitionClass();
      recognition.lang = "th-TH";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        finishWithResult(transcript);
      };
      recognition.onerror = function (event) {
        if (event.error === "no-speech") {
          finishWithNoSpeech();
        } else {
          finishWithError(event.error);
        }
      };
      recognition.onend = function () {
        finishWithNoSpeech();
      };
      recognition.start();
    }).catch(function (err) {
      finishWithError(err && err.name ? err.name : "mic-denied");
    });

    return {
      stop: function () {
        if (recognition) {
          try { recognition.stop(); } catch (e) { /* noop */ }
        } else {
          finishWithNoSpeech();
        }
      },
      cancel: function () {
        settled = true;
        cleanup();
      }
    };
  }

  return {
    isRecognitionSupported: isRecognitionSupported,
    isSynthesisSupported: isSynthesisSupported,
    speak: speak,
    similarity: similarity,
    startListening: startListening
  };
})();
