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
    if (mimeType.indexOf("wav")  !== -1) return "wav";
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

    // Auto-stop thresholds
    const SPEECH_THRESH  = 0.012; // RMS above this = "speaking"
    const MIN_SPEECH_MS  = 600;   // need at least this much speech before auto-stop is armed
    const SILENCE_TAIL_MS = 1000; // silence after speech → stop
    const MAX_MS         = 10000; // hard cap regardless of input

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

        const recStartedAt = Date.now();
        let speechStartedAt = null;  // timestamp when first speech detected
        let silenceStartedAt = null; // timestamp when silence began (after speech)

        function loop() {
          rafHolder.id = requestAnimationFrame(loop);
          analyser.getByteTimeDomainData(dataArray);

          // Draw waveform
          if (canvas) {
            const ctx = canvas.getContext("2d");
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

          // RMS voice detection
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const now = Date.now();

          if (rms > SPEECH_THRESH) {
            if (!speechStartedAt) speechStartedAt = now;
            silenceStartedAt = null; // reset silence clock while speaking
          } else if (speechStartedAt && !silenceStartedAt) {
            silenceStartedAt = now; // first silent frame after speech
          }

          // Decide whether to auto-stop
          let shouldStop = (now - recStartedAt) >= MAX_MS;
          if (!shouldStop && speechStartedAt && silenceStartedAt) {
            const hadSpeechMs  = silenceStartedAt - speechStartedAt;
            const silenceLenMs = now - silenceStartedAt;
            if (hadSpeechMs >= MIN_SPEECH_MS && silenceLenMs >= SILENCE_TAIL_MS) shouldStop = true;
          }

          if (shouldStop && mediaRecorder && mediaRecorder.state !== "inactive") {
            cancelAnimationFrame(rafHolder.id);
            rafHolder.id = null;
            mediaRecorder.stop();
          }
        }
        loop();

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
          if (rafHolder.id) { cancelAnimationFrame(rafHolder.id); rafHolder.id = null; }
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
        if (rafHolder.id) { cancelAnimationFrame(rafHolder.id); rafHolder.id = null; }
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

  // Records continuously for as long as the caller holds the mic button
  // (no auto-stop threshold — the caller decides when to stop via
  // .stop()). While recording, the same RMS voice-activity approach
  // startRecording() uses keeps running, but instead of stopping at the
  // first silence gap it logs each complete [speechStart, speechEnd]
  // timestamp pair (relative to recording start) as its own segment --
  // so a single hold can still yield more than one segment if multiple
  // words are spoken before releasing.
  function startHoldRecording(canvas, onStop, onError) {
    const rafHolder = { id: null };
    let audioCtx = null;
    let mediaStream = null;
    let mediaRecorder = null;
    const chunks = [];
    const mimeType = getSupportedMimeType();

    // getUserMedia() can take an arbitrary amount of time to resolve --
    // notably, the browser's permission prompt on first use. stop()/cancel()
    // called before it resolves would otherwise be silent no-ops (nothing
    // to call them on yet), leaving an unstoppable recording that starts
    // the moment permission is granted. These flags are checked once the
    // promise resolves so a pre-resolution stop/cancel is honored instead
    // of lost.
    let cancelled = false;
    let stopRequested = false;

    const SPEECH_THRESH  = 0.012;
    const MIN_SPEECH_MS  = 300;  // shorter than startRecording's 600ms -- reps said quickly in one hold are still short utterances
    const SILENCE_GAP_MS = 350;  // gap length that closes out one segment and allows the next to start
    const MAX_HOLD_MS    = 15000; // safety cap regardless of input, in case a hold is never released

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        if (cancelled) {
          // cancel() ran before permission resolved -- never start
          // anything, never call onStop.
          stream.getTracks().forEach(function (t) { t.stop(); });
          return;
        }
        mediaStream = stream;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
        if (audioCtx.state === "suspended") audioCtx.resume();

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const recStartedAt = Date.now();
        const segments = [];         // completed [startMs, endMs] pairs
        let speechStartedAt = null;
        let silenceStartedAt = null;

        function loop() {
          rafHolder.id = requestAnimationFrame(loop);
          analyser.getByteTimeDomainData(dataArray);

          if (canvas) {
            const ctx = canvas.getContext("2d");
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

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const now = Date.now();

          if (rms > SPEECH_THRESH) {
            if (!speechStartedAt) speechStartedAt = now;
            silenceStartedAt = null;
          } else if (speechStartedAt && !silenceStartedAt) {
            silenceStartedAt = now;
          }

          if (speechStartedAt && silenceStartedAt) {
            const hadSpeechMs  = silenceStartedAt - speechStartedAt;
            const silenceLenMs = now - silenceStartedAt;
            if (hadSpeechMs >= MIN_SPEECH_MS && silenceLenMs >= SILENCE_GAP_MS) {
              segments.push([speechStartedAt - recStartedAt, silenceStartedAt - recStartedAt]);
              speechStartedAt = null;
              silenceStartedAt = null;
            }
          }

          if (now - recStartedAt >= MAX_HOLD_MS && mediaRecorder && mediaRecorder.state !== "inactive") {
            cancelAnimationFrame(rafHolder.id);
            rafHolder.id = null;
            mediaRecorder.stop();
          }
        }
        loop();

        mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType: mimeType })
          : new MediaRecorder(stream);
        const actualMime = mediaRecorder.mimeType || mimeType || "audio/webm";

        mediaRecorder.ondataavailable = function (e) {
          if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.onstop = function () {
          if (rafHolder.id) { cancelAnimationFrame(rafHolder.id); rafHolder.id = null; }
          mediaStream.getTracks().forEach(function (t) { t.stop(); });
          if (audioCtx.state !== "closed") audioCtx.close();
          // Close out whatever segment was still open when the hold ended
          // (released mid-utterance, before the silence-gap timer confirmed it).
          // Same MIN_SPEECH_MS gate the in-loop close applies, so a mic
          // pop or an accidental tap-and-release can't sneak in as a
          // near-zero-length segment.
          if (speechStartedAt && (Date.now() - speechStartedAt) >= MIN_SPEECH_MS) {
            segments.push([speechStartedAt - recStartedAt, Date.now() - recStartedAt]);
          }
          const blob = new Blob(chunks, { type: actualMime });
          onStop(blob, actualMime, segments);
        };
        mediaRecorder.start();
        // stop() ran before permission resolved -- honor it now instead of
        // recording unattended. The normal onstop path still runs (with
        // essentially no captured audio), so cleanup and the caller's
        // callback happen exactly the same way as any other stop.
        if (stopRequested) mediaRecorder.stop();
      })
      .catch(function (err) {
        // A cancelled hold whose permission request is then denied (or
        // fails for any other reason) shouldn't surface an error against
        // whatever word the modal has since moved to.
        if (cancelled) return;
        onError(err);
      });

    return {
      stop: function () {
        stopRequested = true;
        if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
      },
      cancel: function () {
        cancelled = true;
        if (rafHolder.id) { cancelAnimationFrame(rafHolder.id); rafHolder.id = null; }
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

  // Encodes mono Float32 PCM samples as a 16-bit WAV blob.
  function encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }
    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return new Blob([view], { type: "audio/wav" });
  }

  // Slices one [startSec, endSec) window of channel-0 samples out of a
  // decoded AudioBuffer into its own standalone WAV blob.
  function sliceToWav(audioBuffer, startSec, endSec) {
    const sr = audioBuffer.sampleRate;
    const startIdx = Math.max(0, Math.floor(startSec * sr));
    const endIdx = Math.min(audioBuffer.length, Math.ceil(endSec * sr));
    const channelData = audioBuffer.getChannelData(0);
    const slice = channelData.subarray(startIdx, endIdx);
    return encodeWav(slice, sr);
  }

  // Decodes a recorded blob once, then slices it into one WAV blob per
  // [startMs, endMs] segment, each padded by padMs on either side (clamped
  // to the recording's actual bounds by sliceToWav).
  function sliceBlobToWavSegments(blob, segments, padMs) {
    padMs = padMs || 150;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const decodeCtx = new AudioContextClass();
    return blob.arrayBuffer()
      .then(function (arrBuf) { return decodeCtx.decodeAudioData(arrBuf); })
      .then(function (audioBuffer) {
        const wavBlobs = segments.map(function (seg) {
          const startSec = Math.max(0, seg[0] - padMs) / 1000;
          const endSec = (seg[1] + padMs) / 1000;
          return sliceToWav(audioBuffer, startSec, endSec);
        });
        decodeCtx.close();
        return wavBlobs;
      });
  }

  async function uploadAndSavePractice(blob, wordId, userId, mimeType, extra) {
    const mime = mimeType || blob.type || "audio/webm";
    const ext  = mimeToExt(mime);
    const path = userId + "/" + crypto.randomUUID() + "." + ext;
    const { error: uploadError } = await sb.storage.from("practice-audio").upload(path, blob, {
      contentType: mime
    });
    if (uploadError) throw uploadError;
    var row = { word_id: wordId, user_id: userId, file_path: path };
    if (extra && extra.homework_assignment_id) row.homework_assignment_id = extra.homework_assignment_id;
    if (extra && extra.worksheet_progress_id) row.worksheet_progress_id = extra.worksheet_progress_id;
    const { data: inserted, error: insertError } = await sb
      .from("practice")
      .insert(row)
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
    startHoldRecording: startHoldRecording,
    sliceBlobToWavSegments: sliceBlobToWavSegments,
    uploadAndSavePractice: uploadAndSavePractice,
    drawPlayback: drawPlayback
  };
})();
