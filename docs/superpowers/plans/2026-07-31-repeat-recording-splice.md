# Combined Multi-Rep Recording Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a child record all N repetitions of a word in one continuous hold-to-record take (with VAD-based auto-splitting into individual clips), replacing the current press-record-once-per-rep loop, per the approved spec.

**Architecture:** A new `profiles.record_reps_together` toggle (default on) gates the flow per-patient. `js/recorder.js` gains a hold-based recording primitive that logs speech-segment timestamps live, plus a pure PCM-slicing/WAV-encoding step that turns those timestamps into individual clip blobs after the fact. `js/practice-panel.js` gains a second entry point (`openMultiRep`) with its own accumulating capture screen (cards + Done/Re-record), sharing the existing word-display setup and upload path with the single-rep flow it doesn't replace.

**Tech Stack:** Vanilla JS, Web Audio API (`AudioContext`, `decodeAudioData`, `MediaRecorder`), Supabase (Postgres + Storage). No build step, no test framework in this repo — verification is manual, same as the rest of the site.

## Global Constraints

- `record_reps_together boolean not null default true` — exact column name/type/default from the approved spec.
- The single-rep flow (`total <= 1`, or the toggle off) must be completely unaffected — zero behavior change on that path (spec Fallback section).
- Every existing explicit `profiles` `select()` must be checked when the new column is added — this codebase has hit the "new column silently missing from an explicit select list" bug three times before (see spec's Known Risk note).
- Done is only ever enabled at exactly `total` confirmed segments (spec section 4) — no partial-count submission path.

---

### Task 1: Database migration + profile toggle UI

**Files:**
- Create: `supabase/record_reps_together_migration.sql`
- Modify: `management.html:108-128` (profile edit form), `management.html:718` (profile select), `management.html:885-930` (`wireProfileEdit`)

**Interfaces:**
- Produces: `profiles.record_reps_together` (boolean column), readable via any `select()` that names it.

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- Combined multi-rep recording toggle
-- Run in Supabase SQL Editor
-- ============================================================
-- Lets a patient (or their parent) opt out of the "say all N reps in one
-- continuous recording" flow and fall back to today's press-record-once-
-- per-rep flow. Defaults to on for everyone, including existing rows.
-- ============================================================

alter table public.profiles add column if not exists record_reps_together boolean not null default true;
```

- [ ] **Step 2: Run the migration**

This must be run manually in the Supabase SQL Editor (per this project's established workflow — no assistant has direct DB access). Confirm success by checking the Supabase Table Editor shows the new `record_reps_together` column on `profiles` with existing rows already showing `true`.

- [ ] **Step 3: Add the checkbox to the profile edit form**

In `management.html`, find this block (around line 120-124):

```html
            <div class="mb-2">
              <label class="form-label fw-semibold small mb-1">อายุ</label>
              <input type="number" class="form-control form-control-sm" id="editAge" min="1" max="120">
            </div>
```

Add immediately after it, before the save/cancel button row:

```html
            <div class="mb-2 form-check">
              <input type="checkbox" class="form-check-input" id="editRecordRepsTogether">
              <label class="form-check-label small" for="editRecordRepsTogether">
                พูดซ้ำในครั้งเดียว (อัดเสียงต่อเนื่องแล้วแยกให้อัตโนมัติ แทนการกดอัดทีละครั้ง)
              </label>
            </div>
```

- [ ] **Step 4: Include the new column in the profile select and wire the form**

In `management.html:718`, change:

```js
  var { data: profile, error: profileErr } = await sb.from('profiles').select('username, gender, age, avatar_url, avatar_emoji, avatar_color, avatar_color2, patient_code').eq('user_id', session.user.id).maybeSingle();
```

to:

```js
  var { data: profile, error: profileErr } = await sb.from('profiles').select('username, gender, age, avatar_url, avatar_emoji, avatar_color, avatar_color2, patient_code, record_reps_together').eq('user_id', session.user.id).maybeSingle();
```

In `wireProfileEdit` (`management.html:889-895`), change:

```js
  document.getElementById('btnEditProfile').addEventListener('click', function () {
    document.getElementById('editUsername').value = (profile && profile.username) || '';
    document.getElementById('editGender').value = (profile && profile.gender) || 'male';
    document.getElementById('editAge').value = (profile && profile.age) || '';
    displayEl.style.display = 'none';
    editEl.style.display = 'block';
  });
```

to:

```js
  document.getElementById('btnEditProfile').addEventListener('click', function () {
    document.getElementById('editUsername').value = (profile && profile.username) || '';
    document.getElementById('editGender').value = (profile && profile.gender) || 'male';
    document.getElementById('editAge').value = (profile && profile.age) || '';
    document.getElementById('editRecordRepsTogether').checked = !profile || profile.record_reps_together !== false;
    displayEl.style.display = 'none';
    editEl.style.display = 'block';
  });
```

(`!profile || profile.record_reps_together !== false` defaults the checkbox to checked for both a brand-new profile row and any row where the column is already `true` — only an explicit `false` unchecks it.)

In the `btnSaveProfile` handler (`management.html:902-910`), change:

```js
  document.getElementById('btnSaveProfile').addEventListener('click', async function () {
    var username = document.getElementById('editUsername').value.trim();
    var gender = document.getElementById('editGender').value;
    var ageVal = parseInt(document.getElementById('editAge').value, 10);
    var age = isNaN(ageVal) ? null : ageVal;

    if (!username) { alert('กรุณากรอกชื่อผู้ใช้'); return; }

    var payload = { user_id: session.user.id, username: username, gender: gender, age: age };
```

to:

```js
  document.getElementById('btnSaveProfile').addEventListener('click', async function () {
    var username = document.getElementById('editUsername').value.trim();
    var gender = document.getElementById('editGender').value;
    var ageVal = parseInt(document.getElementById('editAge').value, 10);
    var age = isNaN(ageVal) ? null : ageVal;
    var recordRepsTogether = document.getElementById('editRecordRepsTogether').checked;

    if (!username) { alert('กรุณากรอกชื่อผู้ใช้'); return; }

    var payload = { user_id: session.user.id, username: username, gender: gender, age: age, record_reps_together: recordRepsTogether };
```

- [ ] **Step 5: Manual verification**

Open `management.html`, log in as a patient account, open "แก้ไขข้อมูล" (edit profile) — confirm the new checkbox appears, is checked by default, and saving with it unchecked then reopening the edit form shows it unchecked (confirms round-trip persistence).

- [ ] **Step 6: Commit**

```bash
git add supabase/record_reps_together_migration.sql management.html
git commit -m "$(cat <<'EOF'
Add record_reps_together profile toggle

Lets a patient opt out of the upcoming combined multi-rep recording
flow and keep today's press-record-once-per-rep behavior instead.
Defaults to on.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Hold-recording + WAV slicing in `js/recorder.js`

**Files:**
- Modify: `js/recorder.js`

**Interfaces:**
- Consumes: nothing new — same browser APIs (`MediaRecorder`, `AudioContext`) already used by the existing `startRecording`.
- Produces: `Recorder.startHoldRecording(canvas, onStop, onError)` → returns `{ stop(), cancel() }`; `onStop(blob, mimeType, segments)` where `segments` is an array of `[startMs, endMs]` pairs relative to recording start. `Recorder.sliceBlobToWavSegments(blob, segments, padMs)` → `Promise<Blob[]>` (WAV blobs, one per segment). Both consumed by Task 3.

- [ ] **Step 1: Add the hold-recording primitive**

In `js/recorder.js`, add this new function directly after the existing `startRecording` function (after its closing `}` around line 179):

```js
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

    const SPEECH_THRESH  = 0.012;
    const MIN_SPEECH_MS  = 300;  // shorter than startRecording's 600ms -- reps said quickly in one hold are still short utterances
    const SILENCE_GAP_MS = 350;  // gap length that closes out one segment and allows the next to start
    const MAX_HOLD_MS    = 15000; // safety cap regardless of input, in case a hold is never released

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
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
          if (speechStartedAt) {
            segments.push([speechStartedAt - recStartedAt, Date.now() - recStartedAt]);
          }
          const blob = new Blob(chunks, { type: actualMime });
          onStop(blob, actualMime, segments);
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
```

- [ ] **Step 2: Add PCM-to-WAV encoding and blob slicing**

Add these two functions directly after `startHoldRecording`:

```js
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
```

- [ ] **Step 3: Handle the `.wav` extension and export the new functions**

In `mimeToExt` (near the top of the file), change:

```js
  function mimeToExt(mimeType) {
    if (mimeType.indexOf("mp4")  !== -1) return "mp4";
    if (mimeType.indexOf("ogg")  !== -1) return "ogg";
    return "webm";
  }
```

to:

```js
  function mimeToExt(mimeType) {
    if (mimeType.indexOf("wav")  !== -1) return "wav";
    if (mimeType.indexOf("mp4")  !== -1) return "mp4";
    if (mimeType.indexOf("ogg")  !== -1) return "ogg";
    return "webm";
  }
```

At the bottom of the file, change the returned object from:

```js
  return {
    startRecording: startRecording,
    uploadAndSavePractice: uploadAndSavePractice,
    drawPlayback: drawPlayback
  };
})();
```

to:

```js
  return {
    startRecording: startRecording,
    startHoldRecording: startHoldRecording,
    sliceBlobToWavSegments: sliceBlobToWavSegments,
    uploadAndSavePractice: uploadAndSavePractice,
    drawPlayback: drawPlayback
  };
})();
```

- [ ] **Step 4: Manual verification**

Since there's no test harness, verify via the browser console on any page that loads `recorder.js` (e.g. `game.html`, logged in): run

```js
Recorder.startHoldRecording(null, function(blob, mime, segments) { console.log('segments', segments, 'blob size', blob.size, 'mime', mime); }, function(e) { console.error(e); })
```

hold for a couple seconds saying a word twice with a pause in between, then in the console call `.stop()` on the returned object. Confirm `segments` logs two entries with plausible millisecond ranges. Then run:

```js
Recorder.sliceBlobToWavSegments(blob, segments).then(function(wavs) { console.log(wavs); wavs.forEach(function(w){ const a = new Audio(URL.createObjectURL(w)); a.play(); }); })
```

(using the `blob`/`segments` from the previous step) and confirm two short WAV clips play back, each containing roughly one of the two spoken words.

- [ ] **Step 5: Commit**

```bash
git add js/recorder.js
git commit -m "$(cat <<'EOF'
Add hold-based recording and VAD segment slicing to Recorder

startHoldRecording() records for as long as the caller holds, logging
speech-segment timestamps live. sliceBlobToWavSegments() decodes the
resulting blob once and slices it into individual WAV clips, one per
detected segment.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Accumulating capture screen in `practice-panel.js` + wiring

**Files:**
- Modify: `game.html:276-313` (practice modal markup), `game.html:369-371` (G defaults), `game.html:438-464` (`openPractice`), `game.html:886-921` (`launchGame`)
- Modify: `js/practice-panel.js`

**Interfaces:**
- Consumes: `Recorder.startHoldRecording`, `Recorder.sliceBlobToWavSegments`, `Recorder.uploadAndSavePractice` from Task 2; `G.recordRepsTogether` (boolean) and `G.pronounceCount` (number, pre-existing) from `game.html`.
- Produces: `PracticePanel.openMultiRep(word, cbs)` where `cbs` is `{ showListen, hwAssignmentId, worksheetProgressId, total, onCorrect, onClosed }` — mirrors `PracticePanel.open`'s existing `cbs` shape plus `total` instead of `repIndex`/`repTotal`.

- [ ] **Step 1: Add the multi-capture markup to the practice modal**

In `game.html`, find this block (around line 296-300):

```html
        <button class="btn btn-outline-primary btn-sm" id="ppBtnListen"><i class="bi bi-volume-up-fill me-1"></i>ฟังตัวอย่าง</button>
        <canvas id="ppWaveCanvas" width="400" height="70" style="width:100%; background:var(--color-bg-soft); border-radius:14px; margin-top:0.75rem;"></canvas>
        <button class="mic-btn mt-3" id="ppBtnMic"><i class="bi bi-mic-fill"></i></button>
        <p class="small text-secondary" id="ppRecordHint">กดปุ่มไมค์เพื่อเริ่มอัดเสียง แล้วกดอีกครั้งเพื่อหยุด</p>
        <div class="alert alert-danger" id="ppErrorMsg" style="display:none;"></div>
```

Add the new multi-capture block immediately after `ppRecordHint`'s line, before `ppErrorMsg`:

```html
        <div id="ppMultiCapture" style="display:none;">
          <div id="ppMultiCards" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:0.5rem 0;"></div>
          <p class="small fw-bold" id="ppMultiProgress" style="color:#8a5cf6;"></p>
          <button class="mic-btn mt-2" id="ppBtnMicHold"><i class="bi bi-mic-fill"></i></button>
          <p class="small text-secondary" id="ppMultiHint">กดค้างที่ปุ่มไมค์แล้วพูด ปล่อยเมื่อพูดเสร็จ</p>
          <div class="d-flex gap-2 mt-2">
            <button class="btn btn-success flex-fill" id="ppBtnMultiDone" disabled>เสร็จแล้ว</button>
            <button class="btn btn-outline-secondary flex-fill" id="ppBtnMultiRedo">อัดใหม่</button>
          </div>
        </div>
```

- [ ] **Step 2: Extract shared word-display setup in `practice-panel.js`**

In `js/practice-panel.js`, the existing `open()` function (lines 41-105) currently does word-display setup (picture, mouth animation) inline. Extract that into a new `setupWordDisplay(word)` function, and add the new module-level state variables. Replace the entire `open` function (and everything from the top of the file through its start) — i.e. change:

```js
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
      // No picture and no custom emoji — show the word itself rather
      // than a meaningless generic icon.
      el("ppEmoji").textContent = (word.emoji && word.emoji !== word.word) ? word.emoji : word.word;
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
```

to:

```js
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

      const micHoldBtn = el("ppBtnMicHold");
      micHoldBtn.addEventListener("pointerdown", onMultiHoldStart);
      micHoldBtn.addEventListener("pointerup", onMultiHoldEnd);
      micHoldBtn.addEventListener("pointerleave", onMultiHoldEnd);
      micHoldBtn.addEventListener("pointercancel", onMultiHoldEnd);
      el("ppBtnMultiRedo").addEventListener("click", onMultiRedo);
      el("ppBtnMultiDone").addEventListener("click", onMultiDone);
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
```

- [ ] **Step 3: Hide the multi-capture UI in the existing single-rep `resetPanelState`, and add the multi-capture state functions**

In `resetPanelState` (currently lines 107-127), add one line so a leftover multi-capture UI from a previous word never bleeds into the single-rep flow. Change:

```js
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
```

to:

```js
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
    el("ppMultiCapture").style.display = "none";
    if (continueTimer) {
      clearTimeout(continueTimer);
      continueTimer = null;
    }
    resetMicButton();
  }
```

Then add these new functions directly after `resetPanelState`:

```js
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
    renderMultiCards();
    resetMultiMicButton();
  }

  function resetMultiMicButton() {
    multiIsHolding = false;
    const btn = el("ppBtnMicHold");
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
      card.innerHTML =
        '<span style="font-weight:700;">' + (i + 1) + '</span>' +
        '<button class="btn btn-sm btn-outline-primary py-0 px-2" data-idx="' + i + '" data-act="play">▶</button>' +
        '<button class="btn btn-sm btn-outline-danger py-0 px-2" data-idx="' + i + '" data-act="del">ลบ</button>';
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

    multiHoldController = Recorder.startHoldRecording(
      el("ppWaveCanvas"),
      function (blob, mimeType, segments) {
        resetMultiMicButton();
        if (!segments.length) return; // held the button but never actually spoke -- nothing to add
        Recorder.sliceBlobToWavSegments(blob, segments).then(function (wavBlobs) {
          wavBlobs.forEach(function (wavBlob) {
            multiSegments.push({ blob: wavBlob, url: URL.createObjectURL(wavBlob) });
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
    multiSegments.forEach(function (s) { if (s.url) URL.revokeObjectURL(s.url); });
    multiSegments = [];
    renderMultiCards();
    resetMultiMicButton();
  }

  async function onMultiDone() {
    if (multiSegments.length !== multiTotal) return;
    const btn = el("ppBtnMultiDone");
    btn.disabled = true;
    btn.textContent = "กำลังบันทึก...";
    try {
      const session = await Auth.getSession();
      const extra = {};
      if (callbacks.hwAssignmentId) extra.homework_assignment_id = callbacks.hwAssignmentId;
      if (callbacks.worksheetProgressId) extra.worksheet_progress_id = callbacks.worksheetProgressId;

      for (let i = 0; i < multiSegments.length; i++) {
        const result = await Recorder.uploadAndSavePractice(
          multiSegments[i].blob, currentWord.id, session.user.id, "audio/wav",
          Object.keys(extra).length ? extra : undefined
        );
        await sb.from("practice").update({ parent_marked_correct: true }).eq("id", result.id);
      }

      if (callbacks.onCorrect) callbacks.onCorrect();
      modal.hide();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "เสร็จแล้ว";
      showError("เกิดข้อผิดพลาดในการบันทึกเสียง กรุณาลองใหม่");
    }
  }
```

**Design decision made here (not spelled out in the spec, flagging it explicitly):** pressing "เสร็จแล้ว" (Done) sets `parent_marked_correct = true` on all `total` newly-inserted rows — this is the multi-rep flow's equivalent of the single-rep flow's explicit per-attempt "ออกเสียงถูกแล้ว" judge button, since reviewing the cards *is* the parent's approval step here. Correspondingly, Task 4 awards `20 * total` points on completion (matching what `total` individual "correct" judgments would have summed to in the old flow), not a flat 20.

- [ ] **Step 4: Update `onModalHidden` to clean up multi-capture state**

Change:

```js
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
```

to:

```js
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
    el("ppMultiCapture").style.display = "none";
    if (callbacks.onClosed) callbacks.onClosed();
  }
```

- [ ] **Step 5: Export `openMultiRep`**

Change the final line of the file from:

```js
  return { open: open };
})();
```

to:

```js
  return { open: open, openMultiRep: openMultiRep };
})();
```

- [ ] **Step 6: Wire `G.recordRepsTogether` and branch `openPractice` in `game.html`**

In the `G` object definition (`game.html:371`), change:

```js
  hwMode: false, hwAssignmentId: null, worksheetMode: false, worksheetProgressId: null, pronounceCount: 1,
```

to:

```js
  hwMode: false, hwAssignmentId: null, worksheetMode: false, worksheetProgressId: null, pronounceCount: 1, recordRepsTogether: true,
```

In `launchGame` (`game.html:886-892`), change:

```js
async function launchGame() {
  var diffBtn = document.querySelector('#hwDiffBtns .diff-btn.active');
  var diff = diffBtn ? diffBtn.getAttribute('data-diff') : 'custom';
  G.hwMode = diff === 'hw';
  G.hwAssignmentId = G.hwMode ? _selectedHwAssignmentId : null;
  G.worksheetMode = diff === 'worksheet';
  G.hardMode = isHardMode();
```

to:

```js
async function launchGame() {
  var diffBtn = document.querySelector('#hwDiffBtns .diff-btn.active');
  var diff = diffBtn ? diffBtn.getAttribute('data-diff') : 'custom';
  G.hwMode = diff === 'hw';
  G.hwAssignmentId = G.hwMode ? _selectedHwAssignmentId : null;
  G.worksheetMode = diff === 'worksheet';
  G.hardMode = isHardMode();
  var _launchSession = await Auth.getSession();
  if (_launchSession) {
    var { data: _launchProfile } = await sb.from('profiles').select('record_reps_together').eq('user_id', _launchSession.user.id).maybeSingle();
    G.recordRepsTogether = !_launchProfile || _launchProfile.record_reps_together !== false;
  } else {
    G.recordRepsTogether = true;
  }
```

Then replace `openPractice` (`game.html:438-464`) entirely. Change:

```js
function openPractice(word, onCorrect, onClosed) {
  G.paused = true;
  var total = G.pronounceCount || 1;
  var repIndex = 1;
  function doRep() {
    PracticePanel.open(word, {
      showListen: !G.hardMode,
      hwAssignmentId: G.hwAssignmentId,
      worksheetProgressId: G.worksheetProgressId,
      repIndex: repIndex,
      repTotal: total,
      onCorrect: function () { addPts(20); if (onCorrect) onCorrect(); },
      // Fires once this rep's pop-up closes (correct or skipped) — once all
      // reps for this word are done, hand off to the game's own success callback.
      onClosed: function () {
        if (repIndex < total) {
          repIndex++;
          doRep();
        } else {
          G.paused = false;
          if (onClosed) onClosed();
        }
      }
    });
  }
  doRep();
}
```

to:

```js
function openPractice(word, onCorrect, onClosed) {
  G.paused = true;
  var total = G.pronounceCount || 1;

  // Combined multi-rep recording: say all `total` reps in one continuous
  // hold-to-record take instead of pressing record once per rep. Only
  // applies when there's more than one rep to record and the patient
  // hasn't opted out in their profile (see management.html's profile
  // edit form).
  if (total > 1 && G.recordRepsTogether) {
    PracticePanel.openMultiRep(word, {
      showListen: !G.hardMode,
      hwAssignmentId: G.hwAssignmentId,
      worksheetProgressId: G.worksheetProgressId,
      total: total,
      onCorrect: function () { addPts(20 * total); if (onCorrect) onCorrect(); },
      onClosed: function () { G.paused = false; if (onClosed) onClosed(); }
    });
    return;
  }

  var repIndex = 1;
  function doRep() {
    PracticePanel.open(word, {
      showListen: !G.hardMode,
      hwAssignmentId: G.hwAssignmentId,
      worksheetProgressId: G.worksheetProgressId,
      repIndex: repIndex,
      repTotal: total,
      onCorrect: function () { addPts(20); if (onCorrect) onCorrect(); },
      // Fires once this rep's pop-up closes (correct or skipped) — once all
      // reps for this word are done, hand off to the game's own success callback.
      onClosed: function () {
        if (repIndex < total) {
          repIndex++;
          doRep();
        } else {
          G.paused = false;
          if (onClosed) onClosed();
        }
      }
    });
  }
  doRep();
}
```

- [ ] **Step 7: Manual verification**

With the profile toggle left on (default) and `pronounceCount` set above 1 in custom mode's setup stepper:
1. Start any game, reach a word-practice trigger. Confirm the new hold-to-record UI appears (not the old click-to-record UI).
2. Hold the mic button, say the word twice with a pause, release. Confirm two cards appear.
3. Hold again, say it once more, release. Confirm a third card appears and "เสร็จแล้ว" becomes enabled once the count matches the assigned total.
4. Tap a card's ▶ — confirm it plays back just that one clip. Tap ลบ on one card — confirm the count drops and Done disables again; hold the mic again to add a replacement.
5. Tap "อัดใหม่" — confirm all cards clear and progress resets to 0.
6. Get back to exactly `total` cards and tap "เสร็จแล้ว" — confirm the modal closes, points are awarded, and the game continues.
7. In `management.html`, open that patient's practice detail — confirm `total` new rows appear with playable `file_path`s and `parent_marked_correct = true`.
8. Turn the profile toggle off, repeat step 1 — confirm the old click-to-record-once-per-rep flow runs instead, completely unchanged.
9. Set `pronounceCount` to 1 — confirm the single-rep flow runs regardless of the toggle (spec's Fallback section).

- [ ] **Step 8: Commit**

```bash
git add game.html js/practice-panel.js
git commit -m "$(cat <<'EOF'
Add combined multi-rep recording flow (hold-to-record + auto-split)

Replaces the press-record-once-per-rep loop with a single continuous
hold-to-record capture screen when a word has more than one assigned
repetition and the patient hasn't opted out. Segments are detected via
VAD, reviewed as playable/discardable cards, and only uploaded once the
count exactly matches the assigned total.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

## Plan Self-Review Notes

- **Spec coverage:** Section 1 (profile toggle) → Task 1. Sections 2-3 (hold interaction, in-hold segmentation) → Task 2. Section 4 (accumulating capture screen) → Task 3 steps 1-5. Section 5 (slicing) → Task 2. Section 6 (fallback) → Task 3 step 6's `openPractice` branch. All covered.
- **Gap filled (flagged, not silent):** the spec didn't specify what happens to `parent_marked_correct` or point totals for the batch — Task 3 Step 3 documents the decision (Done = batch `parent_marked_correct = true`, `20 * total` points) and why.
- **Known-risk note honored:** Task 1 Step 4 updates the one existing `profiles` select this feature's own code path depends on (`management.html:718`); Task 3 Step 6 adds a second, new `profiles` select in `launchGame` that includes the new column from the start (never had a chance to omit it).
