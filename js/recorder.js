const Recorder = (function () {
  function drawWaveform(canvas, analyser, dataArray, rafHolder) {
    const ctx = canvas.getContext("2d");
    function render() {
      rafHolder.id = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#2ec4b6";
      ctx.beginPath();
      const sliceWidth = canvas.width / dataArray.length;
      let x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }
    render();
  }

  // iOS Safari only supports audio/mp4; Chrome/Android supports audio/webm.
  // Pick the first format the current browser actually supports.
  function getSupportedMimeType() {
    var candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/ogg"
    ];
    for (var i = 0; i < candidates.length; i++) {
      if (typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported(candidates[i])) {
        return candidates[i];
      }
    }
    return ""; // let the browser decide (last resort)
  }

  function mimeToExt(mimeType) {
    if (mimeType.indexOf("mp4")  !== -1) return "mp4";
    if (mimeType.indexOf("ogg")  !== -1) return "ogg";
    return "webm";
  }

  function startRecording(canvas, onStop, onError) {
    const rafHolder = { id: null };
    let audioCtx = null;
    let mediaStream = null;
    let mediaRecorder = null;
    const chunks = [];
    const mimeType = getSupportedMimeType();

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        mediaStream = stream;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
        // iOS suspends AudioContext until a user gesture — resume immediately
        if (audioCtx.state === "suspended") audioCtx.resume();

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        if (canvas) drawWaveform(canvas, analyser, dataArray, rafHolder);

        // Pass mimeType only when the browser declared support (empty string = browser default)
        mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType: mimeType })
          : new MediaRecorder(stream);

        // Use the recorder's actual mimeType (may differ from what we requested)
        const actualMime = mediaRecorder.mimeType || mimeType || "audio/webm";

        mediaRecorder.ondataavailable = function (e) {
          if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.onstop = function () {
          if (rafHolder.id) cancelAnimationFrame(rafHolder.id);
          mediaStream.getTracks().forEach(function (t) { t.stop(); });
          if (audioCtx.state !== "closed") audioCtx.close();
          const blob = new Blob(chunks, { type: actualMime });
          onStop(blob, actualMime);
        };
        mediaRecorder.start();
      })
      .catch(function (err) {
        onError(err);
      });

    return {
      stop: function () {
        if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
      },
      cancel: function () {
        if (rafHolder.id) cancelAnimationFrame(rafHolder.id);
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.ondataavailable = null;
          mediaRecorder.onstop = null;
          mediaRecorder.stop();
        }
        if (mediaStream) mediaStream.getTracks().forEach(function (t) { t.stop(); });
        if (audioCtx && audioCtx.state !== "closed") audioCtx.close();
      }
    };
  }

  async function uploadAndSavePractice(blob, wordId, userId, mimeType) {
    const mime = mimeType || blob.type || "audio/webm";
    const ext  = mimeToExt(mime);
    const path = userId + "/" + crypto.randomUUID() + "." + ext;
    const { error: uploadError } = await sb.storage.from("practice-audio").upload(path, blob, {
      contentType: mime
    });
    if (uploadError) throw uploadError;
    const { data: inserted, error: insertError } = await sb
      .from("practice")
      .insert({ word_id: wordId, user_id: userId, file_path: path })
      .select("id")
      .single();
    if (insertError) throw insertError;
    return { path: path, id: inserted.id };
  }

  let playbackCtx = null;
  let playbackAnalyser = null;
  let playbackSource = null;
  let playbackRafId = null;

  function drawPlayback(audioEl, canvas) {
    if (!canvas) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try {
      if (!playbackCtx) {
        playbackCtx = new AudioContextClass();
        playbackSource = playbackCtx.createMediaElementSource(audioEl);
        playbackAnalyser = playbackCtx.createAnalyser();
        playbackAnalyser.fftSize = 2048;
        playbackSource.connect(playbackAnalyser);
        playbackAnalyser.connect(playbackCtx.destination);
      }
      const dataArray = new Uint8Array(playbackAnalyser.frequencyBinCount);
      const ctx = canvas.getContext("2d");
      function render() {
        playbackRafId = requestAnimationFrame(render);
        playbackAnalyser.getByteTimeDomainData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#8a5cf6";
        ctx.beginPath();
        const sliceWidth = canvas.width / dataArray.length;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }
      render();
      const stop = function () {
        if (playbackRafId) cancelAnimationFrame(playbackRafId);
      };
      audioEl.addEventListener("ended", stop, { once: true });
      audioEl.addEventListener("pause", stop, { once: true });
    } catch (e) {
      /* non-critical visual, ignore */
    }
  }

  return {
    startRecording: startRecording,
    uploadAndSavePractice: uploadAndSavePractice,
    drawPlayback: drawPlayback
  };
})();
