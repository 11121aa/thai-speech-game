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
  // first silence gap it logs each complete speech/silence transition as
  // its own segment, recorded as a [startSample, endSample] pair indexing
  // into the captured PCM (see capturedSamples below for why samples, not
  // timestamps) -- so a single hold can still yield more than one segment
  // if multiple words are spoken before releasing.
  // Captures raw PCM samples directly via a ScriptProcessorNode, instead of
  // recording into a MediaRecorder/WebM blob and decoding it back out
  // afterward. Browsers' AudioContext.decodeAudioData() frequently cannot
  // decode WebM/Opus blobs MediaRecorder produces -- confirmed by hand
  // during first real-device testing ("EncodingError: Unable to decode
  // audio data" on a valid, non-empty, correctly-typed blob that plays
  // back fine through a plain <audio> element). MediaRecorder streams a
  // "live" WebM that never had reason to include the duration/seek
  // metadata a stricter decoder like decodeAudioData expects, so this
  // isn't a bug to patch around -- it's the wrong tool for needing the
  // samples back out programmatically. Capturing them as they arrive
  // sidesteps that decoder (and the whole blob/mimeType/decode step)
  // entirely, and makes slicing a synchronous array operation afterward.
  function startHoldRecording(canvas, onStop, onError) {
    const rafHolder = { id: null };
    let audioCtx = null;
    let mediaStream = null;
    // Set once getUserMedia() resolves and the processing graph is live;
    // calling it ends the recording and is what stop()/cancel() actually
    // invoke. invokeCallback distinguishes stop() (finish and call onStop)
    // from cancel() (tear down silently, never call onStop).
    let finishRecording = null;

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
    // Measured from real usage across two rounds of live testing (see VAD
    // diagnostic logging above): at 350ms, segments almost never closed at
    // all. At 150ms, most repetitions split correctly, but pacing sped up
    // toward the end of a 5-rep hold and the last couple of pauses (85-
    // 127ms) came in just under the threshold, merging into the previous
    // segment. Within-word noise/artifacts observed separately topped out
    // around 70ms. 90ms sits in the gap between those two clusters.
    // Perfect 1:1 splitting isn't guaranteed for every pacing a real
    // person might use -- the review screen's discard-and-hold-again flow
    // is the actual safety net for whatever a fixed threshold misses.
    const SILENCE_GAP_MS = 90;  // gap length that closes out one segment and allows the next to start
    const MAX_HOLD_MS    = 15000; // safety cap regardless of input, in case a hold is never released
    const PROCESSOR_BUFFER_SIZE = 4096;

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

        // ScriptProcessorNode only reliably fires onaudioprocess while
        // connected into a graph that reaches the destination -- routed
        // through a silent (gain=0) node so the mic isn't also played
        // back out the speakers while recording.
        const processor = audioCtx.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1);
        const muteGain = audioCtx.createGain();
        muteGain.gain.value = 0;
        const pcmChunks = [];
        // Running count of samples actually captured so far. ScriptProcessorNode
        // runs its callback on the main thread; if the thread hasn't drained
        // the previous callback in time (a GC pause, a slow frame elsewhere),
        // that quantum's audio is silently dropped -- no event, no error. If
        // segment boundaries were computed from wall-clock time instead, each
        // drop would make every later boundary land progressively later than
        // where the corresponding audio actually is in the captured array.
        // Indexing by capturedSamples instead means a boundary always points
        // at the sample that was actually captured at that transition,
        // immune to drops, clock drift, or rAF throttling.
        let capturedSamples = 0;
        processor.onaudioprocess = function (e) {
          pcmChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
          capturedSamples += e.inputBuffer.length;
        };
        source.connect(processor);
        processor.connect(muteGain);
        muteGain.connect(audioCtx.destination);

        const recStartedAt = Date.now();
        const segments = [];         // completed [startSample, endSample] pairs
        let speechStartedAt = null;      // wall-clock ms -- only used to decide MIN_SPEECH_MS/SILENCE_GAP_MS timing
        let silenceStartedAt = null;     // wall-clock ms
        let speechStartedSample = null;  // capturedSamples at the same transition -- what actually gets stored
        let silenceStartedSample = null;
        let finished = false;

        finishRecording = function (invokeCallback) {
          if (finished) return;
          finished = true;
          if (rafHolder.id) { cancelAnimationFrame(rafHolder.id); rafHolder.id = null; }
          processor.onaudioprocess = null;
          processor.disconnect();
          source.disconnect();
          muteGain.disconnect();
          mediaStream.getTracks().forEach(function (t) { t.stop(); });

          if (!invokeCallback) {
            if (audioCtx.state !== "closed") audioCtx.close();
            return;
          }

          // Close out whatever segment was still open when the hold ended
          // (released mid-utterance, before the silence-gap timer confirmed
          // it). Same MIN_SPEECH_MS gate the in-loop close applies, so a
          // mic pop or an accidental tap-and-release can't sneak in as a
          // near-zero-length segment.
          if (speechStartedAt && (Date.now() - speechStartedAt) >= MIN_SPEECH_MS) {
            segments.push([speechStartedSample, capturedSamples]);
          }

          let totalLen = 0;
          for (let i = 0; i < pcmChunks.length; i++) totalLen += pcmChunks[i].length;
          const samples = new Float32Array(totalLen);
          let offset = 0;
          for (let j = 0; j < pcmChunks.length; j++) {
            samples.set(pcmChunks[j], offset);
            offset += pcmChunks[j].length;
          }
          const sampleRate = audioCtx.sampleRate;
          if (audioCtx.state !== "closed") audioCtx.close();
          onStop(samples, sampleRate, segments);
        };

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
            if (!speechStartedAt) { speechStartedAt = now; speechStartedSample = capturedSamples; }
            if (silenceStartedAt) {
              // Speech resumed before the silence gap was long enough to
              // close the segment -- log how close it was, so tuning
              // SILENCE_GAP_MS can be based on real numbers instead of a
              // guess.
              console.log("[multi-rep VAD] silence interrupted after " + (now - silenceStartedAt) + "ms (needs " + SILENCE_GAP_MS + "ms to split) at t=" + (now - recStartedAt) + "ms");
            }
            silenceStartedAt = null;
            silenceStartedSample = null;
          } else if (speechStartedAt && !silenceStartedAt) {
            silenceStartedAt = now;
            silenceStartedSample = capturedSamples;
          }

          if (speechStartedAt && silenceStartedAt) {
            const hadSpeechMs  = silenceStartedAt - speechStartedAt;
            const silenceLenMs = now - silenceStartedAt;
            if (hadSpeechMs >= MIN_SPEECH_MS && silenceLenMs >= SILENCE_GAP_MS) {
              console.log("[multi-rep VAD] segment closed: spoke for " + hadSpeechMs + "ms, silence " + silenceLenMs + "ms, at t=" + (speechStartedAt - recStartedAt) + "-" + (silenceStartedAt - recStartedAt) + "ms");
              segments.push([speechStartedSample, silenceStartedSample]);
              speechStartedAt = null;
              silenceStartedAt = null;
              speechStartedSample = null;
              silenceStartedSample = null;
            }
          }

          if (now - recStartedAt >= MAX_HOLD_MS) finishRecording(true);
        }
        loop();

        // stop() ran before permission resolved -- honor it now instead of
        // recording unattended. The normal finish path still runs (with
        // essentially no captured audio), so cleanup and the caller's
        // callback happen exactly the same way as any other stop.
        if (stopRequested) finishRecording(true);
      })
      .catch(function (err) {
        // A cancelled hold whose permission request is then denied (or
        // fails for any other reason) shouldn't surface an error against
        // whatever word the modal has since moved to.
        if (cancelled) return;
        // If setup threw after getUserMedia resolved but before
        // finishRecording was assigned (e.g. createScriptProcessor
        // unsupported), the mic would otherwise stay live with no way to
        // stop it until something else eventually calls cancel().
        if (mediaStream) mediaStream.getTracks().forEach(function (t) { t.stop(); });
        if (audioCtx && audioCtx.state !== "closed") audioCtx.close();
        onError(err);
      });

    return {
      stop: function () {
        stopRequested = true;
        if (finishRecording) finishRecording(true);
      },
      cancel: function () {
        cancelled = true;
        if (finishRecording) {
          finishRecording(false);
        } else if (mediaStream) {
          mediaStream.getTracks().forEach(function (t) { t.stop(); });
          if (audioCtx && audioCtx.state !== "closed") audioCtx.close();
        }
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

  // Anything shorter than this is not a plausible real utterance -- if a
  // slice ever comes out this short, something upstream indexed wrong
  // (e.g. a boundary past the end of the captured samples), and producing
  // a valid-but-silent WAV for it would upload that as if it were a real
  // attempt with no visible error anywhere. Throwing surfaces it instead.
  const MIN_SLICE_MS = 50;

  // Slices one [startSample, endSample) window out of a full recording's
  // raw Float32 PCM samples into its own standalone WAV blob. Indices are
  // sample counts, not seconds/ms -- segments from startHoldRecording are
  // already sample-indexed (see its capturedSamples comment for why).
  function sliceToWav(samples, sampleRate, startSample, endSample) {
    const startIdx = Math.max(0, Math.floor(startSample));
    const endIdx = Math.min(samples.length, Math.ceil(endSample));
    const slice = samples.subarray(startIdx, endIdx);
    const minSamples = Math.round(sampleRate * MIN_SLICE_MS / 1000);
    if (slice.length < minSamples) {
      throw new Error("Segment slice too short (" + slice.length + " samples, expected at least " + minSamples + ") -- refusing to produce a near-empty WAV.");
    }
    return encodeWav(slice, sampleRate);
  }

  // Slices a full recording's raw PCM samples (as produced by
  // startHoldRecording's onStop) into one WAV blob per [startSample,
  // endSample] segment, each padded by padMs worth of samples on either
  // side (clamped to the recording's actual bounds by sliceToWav).
  // Synchronous -- there's no decode step, the samples are already in
  // memory.
  //
  // A single degenerate segment (sliceToWav's MIN_SLICE_MS guard) is
  // skipped rather than aborting the whole hold -- the caller already
  // shows a running count of confirmed segments and lets the user hold
  // again to add more, so losing one bad segment out of several just
  // means one fewer card instead of throwing away an entire take.
  function sliceSamplesToWavSegments(samples, sampleRate, segments, padMs) {
    padMs = padMs || 150;
    const padSamples = Math.round(sampleRate * padMs / 1000);
    const wavBlobs = [];
    segments.forEach(function (seg, i) {
      try {
        wavBlobs.push(sliceToWav(samples, sampleRate, seg[0] - padSamples, seg[1] + padSamples));
      } catch (err) {
        console.error("[multi-rep] segment " + i + " skipped:", err, "seg:", seg);
      }
    });
    return wavBlobs;
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
    sliceSamplesToWavSegments: sliceSamplesToWavSegments,
    uploadAndSavePractice: uploadAndSavePractice,
    drawPlayback: drawPlayback
  };
})();
