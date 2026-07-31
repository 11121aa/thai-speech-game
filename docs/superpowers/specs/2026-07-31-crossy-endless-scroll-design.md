# Crossy Road Game: Endless Forward Scroll (No Reset-to-Start)

## Problem

`js/game-crossy.js` ("the traffic game" — a Frogger-style grid-hop game where a frog crosses lanes of cars) currently plays on a fixed 7-row board. Two events teleport the frog back to the fixed starting cell (`charCol=5, charRow=6`):

1. Reaching the goal row (row 0) — after the word-practice modal closes.
2. Getting hit by a car — immediately, plus a -5s timer penalty.

The player wants the game to instead scroll continuously forward, like the real Crossy Road, rather than snapping back to a static start position after every crossing or hit.

## Goals

- The screen visibly scrolls forward as the frog advances (not an instant re-paint).
- Reaching a goal/checkpoint does **not** reset position — the frog keeps going, a new word is queued for the next checkpoint.
- Getting hit by a car is still a real penalty, but knocks the frog back a few rows rather than resetting to the absolute start.
- The existing grid-hop input, car rendering, word-practice modal, and point/timer callbacks are unchanged in feel.

## Non-goals

- No change to sideways (column) movement or the 11-column width.
- No shift to a fully continuous (non-grid-hop) scrolling mechanic — this stays a discrete "hop between cells" game.
- No change to car visuals, frog visuals, or the practice modal itself.
- No game-over-on-hit behavior (rejected in favor of knockback, to keep this low-frustration for the app's audience).

## Design

### 0. Coordinate system change

`charRow` stops being a 0–6 index into a fixed board and becomes the frog's `worldRow` directly — it decreases without a lower bound as the frog moves forward past successive goal checkpoints (row 0, then -6, then -12, ...), and `ROW_TYPES[row]`-style lookups are replaced by a `rowTypeAt(worldRow)` function derived from `worldRow % GOAL_SPACING`. The boundary check in `tryMove()` (currently `if (newRow < 0 || newRow > 6) return;`) changes to: no lower bound (forward is unlimited), and an upper bound of `scrollWorldRow + VISIBLE_ROWS - 1` so the player can't hop backward past the currently generated/visible window.

### 1. World data model

Replace the fixed `ROW_TYPES` / `ROW_COLOR` / `ROW_DIRS` / `ROW_SPEED` global arrays (currently indexed 0–6 for a static board) with a **dynamic row registry** indexed by an ever-increasing `worldRow` counter, starting at `worldRow = 0` for the original start row.

- A constant `GOAL_SPACING = 6` means a `'goal'` checkpoint row is generated every 6 rows.
- Non-goal rows cycle through the existing hand-tuned filler template (the current road/road/grass/road/road pattern, just repeated indefinitely) so moment-to-moment difficulty and rhythm don't change — only the "does it reset" behavior does.
- Rows are generated lazily: only as far ahead of the frog's current `worldRow` as needed to fill the visible window plus a small buffer (so scrolling never reveals an ungenerated gap).
- Rows more than one screen-height behind the frog's current position are discarded (along with their cars) so memory stays flat over an arbitrarily long run.
- Each road row keeps its own car list, generated the same way `createCars()` does today (2–3 cars, alternating direction/speed by row), just at generation time instead of all upfront in `create()`.

### 2. Camera / scroll rendering

Introduce `scrollWorldRow` (float), tweened toward the frog's `worldRow` the same way `charX`/`charY` already tween per hop in `tryMove()`. Each forward or backward hop smoothly slides the whole visible board (terrain + cars) by one `CELL_H`, rather than snapping.

- The frog stays visually anchored near a fixed screen position (same relative placement it has today at the start), while row content is drawn at `screenY = (row.worldRow - scrollWorldRow) * CELL_H`.
- `drawBg()` moves from a one-time static draw to a per-frame (or per-scroll-change) draw over the currently visible row window, since row content is no longer fixed.

### 3. Goal / practice-word flow

Entering a `'goal'`-type row pauses input and opens the practice modal exactly as today (`onReachGoal()`), awarding the same 20pt bonus. The check changes from `charRow === 0` to `currentRowType(this.charRow /* worldRow */) === 'goal'`.

On modal close: **no teleport**. The frog remains at its current `worldRow`/column; invincibility is **not** granted here anymore (it was only ever needed because of the old teleport-into-traffic risk — no longer applicable, since the frog stays on the safe goal row). The next word is queued, to be shown when the frog reaches the next `'goal'` row 6 rows ahead.

### 4. Hit / knockback flow

Same detection logic (AABB overlap on the frog's current row while `ROW_TYPES[row] === 'road'`), same -5s timer penalty via `callbacks.onTime(-5)`, same ~1.5s invincibility. The position change becomes:

```
KNOCKBACK_ROWS = 2
newWorldRow = max(oldestGeneratedRow, frog.worldRow - KNOCKBACK_ROWS)
```

instead of resetting to the fixed start cell. Column (`charCol`) is unchanged by a hit.

### 5. Row/car cleanup

On each scroll advance, rows (and their cars) with `worldRow < scrollWorldRow - VISIBLE_ROWS` are spliced out of the registry. This bounds memory for indefinitely long runs and keeps the per-frame car-collision loop scoped to only the currently relevant rows.

## Files touched

- `js/game-crossy.js` (only file implementing this game — no standalone counterpart exists for it, unlike the platformer).

## Testing / verification

- Manual playtest via the game's normal entry point in `game.html` (this game has no automated tests and no standalone dev build).
- Verify: scrolling is visually smooth on both forward and knockback-backward movement; goal checkpoints appear at the expected spacing; memory doesn't grow unbounded over an extended play session (spot-check row registry length stays bounded); existing timer/point callbacks still fire correctly.
