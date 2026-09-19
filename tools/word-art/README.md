# Word pictures

Code-drawn illustrations for the practice words (bright children's style:
bold outlines, flat colours, round backdrop). Each `w_*.js` file maps a
word's exact Thai text to a drawing built from the kit in `lib.js`.

Regenerate:

    cd tools/word-art
    npm install
    node render.js w_mor w_nor w_hor w_yor w_kor w_por w_sent

PNGs (800x800, transparent) land in `tools/word-art/out/`, plus a
`_sheet_<file>.png` contact sheet for checking. Copy the PNGs into
`img/illustrations/` and add each word to `img/illustrations/manifest.json`
(`"word": "img/illustrations/word.png"`); the practice pop-up, matching
and flashcard games read that manifest.
