# STATES — help me choose

R1 · approved. Frame ids match the canvas. Every frame is drawn at 1300 and 390. `scene` is the prop on `Help Me Choose.dc.html`.

Invariants:
- **Nothing before submit.** The form never shows commanders or counts. Results are a separate screen at both
  widths (`screen="results"`).
- **No input is required.** Every state is reachable with any subset of the five answered.
- **No score.** A row is ordered by one figure, or by the lowest of several in the same unit. Ownership orders
  the list only when there is no theme and no card.
- **No credit without the ticket.** The credit line appears only in the results bar's offer, which shows only when the submit had words.
- **Never loosen silently.** The results only change when an answer changes.
- **Zero net motion.** Nothing pulses, shimmers or animates in, including chips arriving from a read.
- **Single commanders only.** No partner slot, eyebrow or pairing strip.

| id | scene / state | Answers | We read this as | Offer | Results |
|---|---|---|---|---|---|
| 1a | door `decksnew` | — | — | — | picker unchanged under the door |
| 1b | door `discover` | Red · Green (Any) | — | — | link on the result line |
| 2a | `blank` | none | hidden | hidden | — (Find commanders; the note explains a blank submit) |
| 2b | `matched` | words: 4 chips | 4 chips | hidden | — (Find commanders) |
| 3a | `leftover` | words: 4 matches + 2 phrases | results bar: chips + Not used | `1 credit` · Look deeper | theme + card |
| 3b | `reading` | same | same | Looking… · Stop | first results, dimmed |
| 3c | `read` | + Tokens (deeper) | + deeper chip · Still not used ×1 | done line | 3 figures, re-ranked |
| 3d | `failed` | same as 3a | same as 3a | Didn’t finish + `1 credit` · Try again | first results |
| 3e | `emptyread` | same as 3a | Still not used ×2 | refund line only | first results |
| 3f | `spent` | same as 3a | same as 3a | `0 left` · disabled | first results |
| 3g | `paused` | same as 3a | same as 3a | `Paused` · disabled | first results |
| — | best fits | any order | — | — | top 3 as cards when ≥ 4 results and no narrow bar |
| 4a | `theme` | theme picker: Dinosaurs (open) | hidden | hidden | one theme |
| 4b | `themes` | Dinosaurs, Enrage | hidden | hidden | two themes, LOWEST |
| 4c | `card` | words: Regisaur Alpha | 1 card chip | hidden | one card |
| 4d | `themecard` | = 3a | 4 chips | hidden | theme + card |
| 4e | `unpriced` | Dinosaurs, Ghalta’s Presence (no price), $150 | 3 chips | hidden | + per-row unpriced line |
| 4f | `ownership` | Red · Green | hidden | hidden | ownership order, 212 |
| 5a | `narrow` | Dinosaurs, Exactly R·G, bracket 2 | hidden | hidden | 1 row + note |
| 5b | `zero` | Dinosaurs, Jeweled Lotus (owned), bracket 2 | 2 chips | hidden | note only |
| 5c | `loading` | Dinosaurs | hidden | hidden | skeletons |
| 5d | `rowloading` | Dinosaurs | hidden | hidden | rows 3–4 counting, row 6 failed |
| 5e | `listfailed` | Dinosaurs | hidden | hidden | failure box |
| 6a | hand-off `form` | theme + card + $150 + 2 | — | — | — |
| 6b | hand-off `creating` | same | — | — | — |
| 6c | hand-off `landed` | same | — | — | today’s deck page, seeded intent line from the answers |
| 6d | hand-off `empty` | same | — | — | today’s FillFailedBanner, 0 / 99 |

## Credit line, by allowance

The line under the Look deeper button gives `creditsCopy.standing`.

| Allowance | Stub | Ticket | Line |
|---|---|---|---|
| ≥ 1 left, none out | `1 credit` | live | `Uses a credit. 3 of 3 left.` |
| ≥ 1 left, some out | `1 credit` | live | `Uses a credit. 2 of 3 left · next one at 4:10 PM.` |
| 0 left | `0 left` | disabled | `0 of 3 left · next one at {reopensAt}. Deeper looks, overviews and suggestions share these credits.` |
| owner’s share used | `Paused` | disabled | `creditsCopy.ownerShare` |
| app paused | `Paused` | disabled | `creditsCopy.paused` (reason widened) |

Precedence follows the tuning panel: paused, then owner share, then spent.

## Screens (both widths)

- `screen="form"`: header, the five inputs, and **Find commanders** (in the dock on a phone). Nothing is interpreted.
- `screen="results"`: *Commanders for you*, then the You asked for bar (read-only answers, **Change answers**,
  **Start over**), the order line, the note, rows, and **Show 12 more**. No total is printed.
- Scenes 2a–2b default to the form; 3a–5e default to results.
