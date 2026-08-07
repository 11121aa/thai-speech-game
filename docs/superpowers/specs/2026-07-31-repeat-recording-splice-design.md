# Combined Multi-Rep Recording (Hold-to-Record + Auto-Split)

## Problem

When a word's assigned repeat count is > 1 (custom mode's stepper, or a homework/worksheet's `repeat_count`), the current flow (`openPractice()` in [game.html:438-464](game.html#L438-L464)) makes the child open the practice modal, record, and mark-correct **once per repetition**, in a loop (`doRep()`). A therapist proposed letting the child instead say the word repeatedly in one continuous take, with the app splitting that into individual attempts — removing the repeated open/record/close friction while still producing the same per-attempt data the therapist review UI already expects.

## Goals

- Replace the per-rep press-record-once loop with a single continuous capture screen when repeat count > 1.
- Each individual utterance still becomes its own row in `practice`, scored/reviewed by the therapist exactly as today — zero changes to the review/scoring UI.
- The child/parent stays in control of when a take is good, when to add more, and when to start over — no silent auto-decisions about count mismatches.
- Opt-out available per-patient, set in the patient's own profile (not shown in the pre-game setup screen — the game-start flow shouldn't gain more choices for the kid).

## Non-goals

- No change to the single-repetition (`total === 1`) recording flow.
- No change to how the therapist reviews/scores recordings in `management.html`.
- No manual waveform/boundary-dragging UI — segment boundaries are algorithmic (VAD-detected), not user-adjustable; the user's only controls are discard-and-redo-that-one (via holding again) or full reset.

## Design

### 1. Profile toggle

New column: `profiles.record_reps_together boolean not null default true`. New migration file in `supabase/`. Added as a checkbox to the patient's own editable profile fields in [management.html](management.html#L108) (`profileInfoEdit` — alongside username/gender/age, self-service, not therapist-controlled). `game.html`'s `launchGame()` fetches it in the same query pattern as [game.html:558](game.html#L558) and stores it on `G`.

**Known risk carried over from project history:** this codebase has hit the "explicit `select()` column list silently omits a newly-added column" bug three times already. Every existing explicit `select('...')` on `profiles` (several across `management.html` and `game.html`) must be audited when this column is added, not just the new query this feature introduces.

### 2. Recording interaction: hold-to-record

The mic button switches from click-to-start/click-to-stop to **press-and-hold-to-record, release-to-stop**, whenever this flow is active (repeat count > 1 and the toggle is on). This replaces `onMicClick`'s click-toggle wiring with `pointerdown`/`pointerup` (+ `pointerleave`/`touchend` for mobile safety) handlers, scoped to this flow only — the existing single-rep click-to-toggle behavior in `practice-panel.js` is untouched.

Each hold is capped by a per-hold safety max-duration (same idea as today's existing 10s `MAX_MS` in `recorder.js`) purely as a runaway-recording guard — there's no "auto-stop once N segments found" logic anymore, since stopping is always either a release, or the explicit Done/Re-record buttons below.

### 3. In-hold segmentation

While a hold is active, the existing RMS-over-threshold voice-activity logic in `recorder.js` (lines 108-130) keeps running exactly as it does today, but instead of auto-stopping the recorder at the first silence gap, it logs each `[speechStart, speechEnd]` timestamp pair as a candidate segment and keeps recording until release — so a single hold can still yield more than one card if the child says the word twice without releasing.

### 4. Accumulating capture screen (replaces the old per-rep modal loop)

One screen, shown instead of `doRep()`'s per-rep modal cycling:

- A row of cards builds up as segments are detected (across one or more holds) — each card: playback button + a "ลบ" discard button.
- A running counter shows progress (e.g. "3 / 5").
- **"เสร็จแล้ว" (Done)** button — enabled only when the card count exactly equals `total`. Confirms and uploads all `total` segments as individual `practice` rows via the existing `Recorder.uploadAndSavePractice()` (unchanged), then proceeds exactly as `doRep()`'s completion path does today (awards points, calls `onClosed`).
- **"อัดใหม่" (Re-record)** button — always available. Clears every accumulated card and resets the capture to zero. This is the only full-reset path; there is no automatic reset-on-mismatch.
- Discarding a single bad card just removes it from the row (dropping the count below `total`, disabling Done); the child holds the mic again to add a replacement. This is the same recovery path whether they stopped holding early or are replacing a discarded take — no special-casing needed.
- Over-count (a hold catches more utterances than needed, e.g. 6 cards when `total` is 5) uses the same discard mechanism: Done stays disabled until the extra card(s) are discarded down to exactly `total`. No separate "trim automatically" logic.

### 5. Slicing implementation

After each hold's `MediaRecorder` stops, its blob is decoded via `AudioContext.decodeAudioData()`. For each candidate segment's timestamp range (with ~150ms padding on each side), the raw PCM samples are sliced into a new short `AudioBuffer` and written out as a WAV blob via a small manual WAV encoder (no new dependency — a PCM→WAV header writer is well-understood, ~30 lines). WAV is used for every produced segment regardless of the source recording's original mime type, keeping the encode/upload path uniform. This logic lives in `recorder.js` (or a small new `js/audio-splice.js` if `recorder.js` gets unwieldy) as pure functions independent of the capture UI.

### 6. Fallback behavior

- `total <= 1`: this entire flow is skipped; today's single-record path in `practice-panel.js` runs unchanged.
- Toggle off (`record_reps_together = false`): `openPractice()`'s existing `doRep()` loop runs unchanged, once per rep, exactly as today.

## Files touched

- `supabase/` — new migration adding `profiles.record_reps_together`.
- `management.html` — profile edit form gets the new checkbox; audit existing `profiles` selects for the new column.
- `game.html` — `launchGame()` fetches the toggle into `G`; `openPractice()` branches to the new accumulating-capture flow vs. the existing `doRep()` loop.
- `js/recorder.js` — new hold-based recording primitive, VAD segment-timestamp logging, PCM slicing + WAV encoding.
- `js/practice-panel.js` — new accumulating capture screen (cards, Done/Re-record buttons), hold-based mic button wiring; existing single-rep flow untouched.

## Testing / verification

- Manual playtest: custom mode with reps set > 1 (toggle on) — verify multiple utterances in one hold produce multiple cards, discard-and-redo works, Done only enables at exact count, Re-record fully resets.
- Verify toggle off still produces the old per-rep modal loop unchanged.
- Verify `total === 1` is entirely unaffected regardless of toggle state.
- Verify therapist-side review in `management.html` sees no difference in the resulting `practice` rows (same columns populated the same way) — spliced WAV attempts must be indistinguishable in the review UI from today's per-rep recordings.
- Spot-check that every existing explicit `profiles` `select()` still returns all needed fields after the new column is added (see known-risk note in section 1).
