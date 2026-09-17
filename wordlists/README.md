# Word lists

Source lists from the speech therapist, one CSV per sound, kept in the same
order as the paper sheets. These are the input for importing into the
database — not read by the app directly.

Columns: `word, sound, category, group`

## Categories

| Code | Therapist's category |
|---|---|
| `NSS1` | Nonsense syllable – 1 syllable |
| `NSS2` | Nonsense syllables – 2 syllables |
| `NSS3` | Nonsense syllables – 3 syllables |
| `W1` | Word – 1 syllable |
| `W2` | Word – 2 syllables |
| `W3` | Word – 3 syllables |
| `SENT` | Sentence (more than 3 syllables) |
| `PASSAGE` | Passage (optional) – picture narration |

`group` is the sub-group numbering on the sheet (e.g. `2.1` = the same
syllable doubled, `2.2` = two different syllables).
