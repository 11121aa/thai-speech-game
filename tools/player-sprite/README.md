# Player sprite sheet (platformer)

Generates `img/player/player-anim.png` + `.json` — the running boy in the
platformer game (`js/game-platformer.js`).

```bash
cd tools/player-sprite
npm install          # @resvg/resvg-js, once
node sprite.js       # -> out/player/
```

Then copy `out/player/player-anim.png` and `out/player/player-anim.json` into
`img/player/` and bump the `?v=` on the `this.load.atlas(...)` line in
`js/game-platformer.js` so browsers pick the new sheet up.

## How it works

`sprite.js` poses one little skeleton (hip → knee → ankle, shoulder → elbow →
wrist) instead of holding eighteen drawings. Angles are degrees clockwise from
straight down, so `+30` is "swung forward" and `180` is "straight up"; the
runner faces `+x`.

- The run cycle comes out of a single phase number (`runPose(p)`, 7 frames):
  thigh swing is a sine, knee flex is a bump function that peaks just after
  toe-off, arms swing opposite the legs.
- Every frame is planted on the ground by its lowest sole, so the body bob
  comes from the leg geometry and the feet never sink or float. Poses with
  `plant: 'hip'` (the slide) sit on the seat instead.
- Jump and slide are hand-set poses in `POSES`. Raised arms use **positive**
  angles (up-forward) because the near arm draws over the head and would
  otherwise cover the face.
- Frame names and sizes must stay as they are — the game asks for `run_0..6`,
  `jump_0..2`, `airbound_0`, `slidein_0..2`, `slide_0..2`, the sprite is drawn
  at `setScale(0.5)` with its origin bottom-centre, and the frame heights are
  what set how tall the player looks.

`out/player/_sheet.png` is a contact sheet of every frame, for checking the
poses without launching the game.
