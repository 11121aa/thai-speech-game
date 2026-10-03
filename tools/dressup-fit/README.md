# Dress-up fit table

Generates `js/dressup-fit.js` — where every garment in `img/dressup/`
attaches to the avatar.

```bash
cd tools/dressup-fit
npm install          # @resvg/resvg-js, once
node measure.js      # -> js/dressup-fit.js
```

Run it whenever the art in `img/dressup/` changes, or a new design is added.

## Why this exists

The avatar's arms, legs and feet are drawn in code (`drawAvatar()` in
`js/game-dressup.js`); the clothes are 50 hand-drawn SVGs. One set of
hand-tuned body coordinates fits a few designs and misses the rest — one
shirt's sleeves end further out than another's, one pair of trousers is
wider and shorter than the next, a party hat has no brim where a beanie
does. So each file is rasterised here and its own attachment points are
read off the pixels, in that file's own viewBox units:

| slot | measured |
|---|---|
| shirt | `cuff[0\|1]` where each sleeve ends and how wide it is, `hemY` |
| pants | `leg[0\|1]` centre and width of each leg at the hem, `hemY`, `waistY` |
| shoes | `top[0\|1]` centre and width of each shoe opening, `topY` |
| hat | `brimY` lowest ink, where it meets the head |
| bag | `strapY` topmost ink, where the strap crosses the shoulder |

The game pins each piece by the feature that touches the body, then draws
the body to meet the rest: arms run out to the measured cuffs at the cuffs'
own width, legs fill the measured trouser legs, and the shoes are placed
(and gently rescaled) so each shoe sits under a trouser leg.

Paired parts — two trouser legs, two shoes — are measured by splitting the
art down its own middle and taking a band at the end, not a single raster
row: in several designs a lace tip or a turn-up owns that row.
