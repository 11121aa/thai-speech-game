# Adding a new word — quick checklist

Use this whenever adding a word via **management.html → จัดการคลังคำ (Word Management)**.

## Steps

1. Fill in the form: เลือกประเภทคำ (sound/category), คำ (the Thai word text), ระดับ (level).
2. **Check the prebuilt illustration list below first** — if your word is already in it, leave the image field blank. The game automatically falls back to that picture (see "Prebuilt illustrations" below). Only upload your own image if the word *isn't* in the list, or you want to replace the picture.
3. Sound/pronunciation clip: upload a file or record one directly in the form. Optional, but without it the "ฟัง" (listen) button won't show for that word.
4. Submit. Done — no separate publish step.

Fallback order the game actually uses when displaying a word's picture (see `js/practice-panel.js`): **your uploaded `image_url`** → **prebuilt illustration** (exact Thai text match, see below) → **emoji/word text**.

## Prebuilt illustrations (don't re-upload these — already covered)

All current entries are ป-sound words (`img/illustrations/manifest.json`). If you add a word from a different sound category, it won't have a prebuilt illustration — upload your own or it'll just show the emoji/word text, which is fine too.

```
ปลา, เป่า, ป่า, ปก, ปีน, ปรุง, ป่วย, เปลี่ยน, แปลง, เป็น,
ปลอม, ไป, ปี่, ปู่, ป้า, เป้า, ปอดบวม, ประโยชน์, คนป๋วย, กระป๋อง,
ปากเป็ด, เปิดบ้าน, ไปเที่ยว, ผูกป้าย, ปั้นดิน, เปียกฝน, ปลากระป๋อง, แปดสิบแปด,
เป็ดพะโล้, ปลูกต้นไม้, ปะการัง, ถือกระเป๋า, ผ้ากันเปื้อน, ปู่เป่าปี่, ปีนต้นไม้,
ใส่กระโปรง, ปลาปักเป้ากินปู, ปังปอนปีนต้นประดู่, ป้ากับปู่ไปเป็นผู้ปกครอง,
เปียปลูกต้นตีนเป็ด, เปาอยู่กับปู่ริมป่าโปร่ง
```

The match is on **exact word text** — เปิดบ้าน works, เปิด(บ้าน) or a different spelling of the same word won't match.
