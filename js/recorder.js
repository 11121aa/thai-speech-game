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

  function startRecording(canvas, onStop, onError) {
    const rafHolder = { id: null };
    let audioCtx = null;
    let mediaStream = null;
    let mediaRecorder = null;
    const chunks = [];

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        mediaStream = stream;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        if (canvas) drawWaveform(canvas, analyser, dataArray, rafHolder);

        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = function (e) {
          if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.onstop = function () {
          if (rafHolder.id) cancelAnimationFrame(rafHolder.id);
          mediaStream.getTracks().forEach(function (t) {
            t.stop();
          });
          if (audioCtx.state !== "closed") audioCtx.close();
          const blob = new Blob(chunks, { type: "audio/webm" });
          onStop(blob);
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

  async function uploadAndSavePractice(blob, wordId, userId) {
    const path = userId + "/" + crypto.randomUUID() + ".webm";
    const { error: uploadError } = await sb.storage.from("practice-audio").upload(path, blob, {
      contentType: "audio/webm"
    });
    if (uploadError) throw uploadError;
    const { error: insertError } = await sb.from("practice").insert({
      word_id: wordId,
      user_id: userId,
      file_path: path
    });
    if (insertError) throw insertError;
    return path;
  }

  return {
    startRecording: startRecording,
    uploadAndSavePractice: uploadAndSavePractice
  };
})();
