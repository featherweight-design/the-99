# READINESS — price on the buy tag (#291), R3

**Verdict: 🟢 Green.** Both items are closed with one structural change and one rename, the scrim
ruling is made, and the derivation is total. No decision is waiting on anyone.

R1 and R2 are untouched. Five stale drawings are recorded in `R3-README.md` §6 rather than redrawn.

## What remained, and what R3 does

| Item | Ruling |
|---|---|
| **1 · The header string, cited wrong twice** | **The right fix isn't a third string — it's to stop borrowing the line.** `builder-spine.tsx:391` (`54 owned · 8 to buy`, desktop-only) stays exactly as shipped. The total and the provenance/"behind" line become a **price strip** under the `All / Shopping` pills, rendered only while Shopping is active, identical at both widths. |
| **1b · Where they live at phone width** | **In the strip, which is the only price aggregate on that screen.** The spine's mobile omission is preserved rather than overturned sideways, and nothing restates anything. |
| **1c · Two `8`s on desktop** | **When every card is priced, the clause drops entirely** — `$129.50` and nothing else. R1's `· 8 cards` was a third `8` beside the filter pill and the spine. `6 of 8 priced` stays: that `8` is a denominator doing work. |
| **2 · `Cheapest first` means mana value** | **Renamed: `Cheapest to cast`.** Keeps the word the label earned, makes the collision impossible, and imports no jargon. **Fail-quiet then survives verbatim** — nothing ranks, filters or sorts on price — which is why a rename beats a caveat on a locked argument. |
| **3 · The tile scrim at 9px** | **Raised 82% → 92%, unconditionally, tile tag only.** A word is recognised; a figure is read, and a misread digit is a wrong number in somebody's budget. Not conditional on a figure rendering — that is a primitive deciding how to look from its own content, per R5's pip-ring objection. |
| **4 · The derivation isn't total** | `absent` becomes the **default branch**. A live row with all three price columns null renders the bare tag and counts as unpriced. |

## Carried forward

- **One ask of eng:** the worst-case per-theme figures recomputed at a **92%** scrim. I expect all
  six between the normal-art column and AA with room; it should be measured and written down rather
  than expected. Not a blocker — the direction only raises.
- **`export.pricingNote` sweeps two call sites**, `:397` and the mobile note at `:425`. One live
  value; don't leave the mobile one behind.
- **Curly apostrophes** in every string this pass touches, matching shipped.

## Open, non-blocking

- **The strip is a new element on the builder, small as it is.** It is the first thing in this pass
  that is not a modification of something shipped, and it exists because the two constructs that
  looked like homes for it turned out to belong to other surfaces. Worth one look in place before
  beta — specifically whether it reads as belonging to the filter row or floating between the
  filter and the first group header.
- **`Cheapest to cast` is one word longer in a toolbar that already carries three controls.** Fits
  at desktop; the phone toolbar is the row most likely to feel it. Not measured.
- **The scrim step is a judgement about the bright-art worst case**, and card art that bright is
  rare. If the re-measure shows 92% still short on kaldheim or innistrad, the next move is the
  theme's `--warning`, not another 10 points of scrim.
- **Gap §8 stands** — `buy` beside a figure can read as a verb. Unchanged by this pass.

## Unchanged and still verified

The `as_of === max(as_of)` derivation and its inverted failure mode · the run-health clause on the
provenance line · `sold out` at `--fg-body` · the token table in place of a contrast claim · four
tails, zero new marks · state 4 byte-identical to the shipped tag · the tag is never a target at
either density · no banner · exports copy names only.
