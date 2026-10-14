# Readiness — the commander row · R1

**Verdict: green on the design call, amber on three figures.** The `Nothing new` ruling, the
composition and the five states are ready to build against. Three numbers in §2 were derived rather
than measured, and one of them can change a line count.

---

## 1 · What is closed

| # | Question | Closed as |
|---|---|---|
| 1 | The `Nothing new` treatment | A copy swap in the gap line's slot, asserting overlap. INDEX §D. |
| 2 | Does `Nothing new` need its own geometry? | **No.** Same slot, ink, measure and line count — which is how the locked height decision survives it. |
| 3 | `Nothing new` vs a commander with no mechanic tags | **Two states, not one.** `No tags` is redefined post-classifier and takes the second case. INDEX §D. |
| 4 | Where Fit draws | The band's **Fit chip**, at both widths — the shipped geometry on `/commanders` today, and the only place a figure sits over art without a plate fight. The foot line carries the two remaining figures. Canvas §6. |
| 5 | Does the gap line keep the brass run? | **No.** Names take `--fg` 600. Brass marked the sort key; the line is now on both sorts and both routes, so a brass run would mark a sort key that is not there. |
| 6 | Is the prose `aria-hidden`, as the tag sentence was? | **No.** The tag sentence was hidden because the row's link restated it. Both sentences are now the row's content, so they are read, and the link's label drops to name + Fit. Canvas §2, STATES §F. |
| 7 | `No sentence` — reserve the space or close it? | **Close it.** One commander in 3,342 cannot buy two reserved blank lines on every other row. The locked height ruling is about the gap line and the two sorts, and it still holds. |
| 8 | `Unpriced` | The figure unmounts and the line closes up — `PriceSlot`'s shipped rule, unchanged. No dash, no zero, no reason. |
| 9 | Does anything on the row read ownership? | **Nothing.** Checked state by state against STATES §D rule 1. |

## 2 · Amber — three figures R1 derived and did not measure

| # | Figure | Drawn as | Who measures it | If it is wrong |
|---|---|---|---|---|
| A | **Longest stored sentence** | 2 lines at a 760px measure (≈190 characters at 13.5px), 4 lines at 330px (≈176) | one `max(length(prose))` over `commander_support` | a long sentence clips at the clamp. The measure moves, not the design: widen to the row's full `1fr` before adding a third line. Mean is 148 (production) / 160 (local-dev). |
| B | **Mechanic tags per commander after classification** | the gap line drawn at one, two and three names; three is the cap the spec sets | the classifier's unit run over all 401 labels | if commanders commonly land on **one** mechanic tag the line is thinner than drawn but structurally identical. No geometry moves. |
| C | **`Nothing new` frequency on `/commanders`** | assumed common enough to matter, which is why the line is calm rather than celebratory | one count over a wide collection | if it is rare the calm treatment is still right; if it is the majority, §4's rejected "celebrate it" option stays rejected for the same reason, harder. |

## 3 · Not verified, and not R1's to verify

- **Fit parity.** The spec's probe requires the row's figure to equal Commander Details' for the same
  commander. R1 draws the same component and the same denominator strings; the equality is a probe,
  not a drawing.
- **The 401-label vocabulary.** Read in the spec's prose, not in the source. The twelve mis-sorted
  mechanic tags and the five irregular plurals are the spec's figures, quoted, not independently
  confirmed.
- **Payload.** 0.97 MB against a 2 MB ceiling is the spec's measurement. R1's deletions match the six
  fields it names; nothing here adds a field.
- **`db:copy:prose` on local-dev.** 1,070 of 3,279. Any browser walk of these states before that runs
  reads two thirds of rows as `No sentence`, which is a fixture gap and not a state.

## 4 · Dependencies, none of them a design gate

- PR 1 (data and arithmetic) lands before anything here is visible. This canvas is drawn against PR 2.
- `check:copy-drift` will fail on every property table quoting the tag sentence, the floor note or
  `not in your collection`. The retirement list is in the copy file, and it is the same round.
- The About entry and the `ABOUT_VERSION` bump ship with PR 3. Entry drawn on canvas §7.

## 5 · One thing Product owns

**Whether the deferred second stored sentence (`how it wins`) is revisited on a date or on a report.**
The spec defers it "after the row has shipped"; nothing here depends on it, and the composition has
room for it in the sentence block without a height change — the one design fact worth recording
before the question is asked again.
