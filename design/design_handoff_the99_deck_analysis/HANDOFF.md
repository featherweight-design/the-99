# Deck analysis — handoff package (R1, Round 0 of 5)

**Canvas:** `The 99 - Deck Analysis Frame.dc.html` (pan/zoom; `theme` prop: amonkhet · kamigawa).
**Assets:** `assets/` — five mark SVGs on `currentColor`, plus `bracket-marks.html`, a standalone
sheet of every mark, chip and palette swatch you can open, copy from, or screenshot.

---

## Decisions, settled

| | |
|---|---|
| **Placement** | Analysis is the **second tab** (`deck · analysis · consider · games · versions`). The **Recommended mix strip moves into it**; the art band and version line stay. Net −150px above the tabs. |
| **Mark** | **Filigree** — an open diamond that gains ornament by rank (echo → vertex ticks → hollow satellites → edge cusps). Exact SVG on a 40-unit box, stroke included in the fit. |
| **Sizes** | **22** tile/band · **26** chip · **36** verdict · **44** reference. Below **20px** no mark is drawn — the bracket is the numeral alone. Numeral is `max(10px, 0.40S)`; Cinzel’s `4` carries `dx="-0.9"`. |
| **Palette** | **2e Ignition** — `#8A857C #A89A74 #C9AC62 #E6D08A #FBEFC6`, **identical in every theme** (brackets are the format’s vocabulary, per the `--w/--u/--b/--r/--g` precedent). Every rung clears **4.5:1 on all twelve grounds**; the numeral inside the mark is text. |
| **Chip** | mark + `{n} {Name}` in a pill on `1px color-mix(bracket 55%)`. A range is **one Split chip** (`◇/◇ Split`), never two floating marks. |
| **Verdict** | Labelled **Your bracket**. Icons carry the range; the big numeral was removed as a duplicate. Undeclared ranges offer **two CTAs** (`Bracket 1` / `Bracket 2`) under *“Pick one so pods know what to expect”*. |
| **How it is reached** | The **climb** (option 3d): five rungs, each listing the barometers that *reach* it, bullets wrapping along the row. The deck’s bracket is the furthest rung. Declaration is a ringed glyph bullet — `?` *Yours to declare*, `✓` *Declared*. |
| **Ledger** | Record as a **proportional bar** (scales past 30 games); **Mana curve** as a filled line with the average marked between 3 and 4; **Color distribution** with round mana icons and *“Multi-colors included, totals could exceed 100”*. |
| **Altitude** | The mark travels to the deck tile and the deck band; **Home gets nothing** (a bracket does not roll up). |

## Two findings worth keeping

1. **The cards can never produce bracket 2, or bracket 5.** Brackets 1–2 share card limits, as do 4–5,
   so no count distinguishes them — the difference is intent. That is why a verdict reads *1 or 2* and
   why bracket **3 is the only verdict the cards state exactly**.
2. **The numeral inside the mark is text**, so every rung owes 4.5:1. That puts a hard floor under
   rank 1: it cannot be made quiet by being made darker. Quietness at the bottom is bought with
   *chroma*, which is why all the escalation happens at the top (rank 5 is 3.65× rank 1’s luminance).

## Grounded in source, read this round

`deck-card.tsx` · `spine-desktop.tsx` · `spine-mobile.tsx` · `builder-spine.tsx` · `art-wash.tsx` ·
`full-card-trigger.tsx` · `commander-art.tsx` (IdentityPips) · `status-pill.tsx` · `status-style.ts` ·
`hover-preview.tsx` · `card-detail-provider.tsx` · `builder-view.ts` · `mix.ts` · `globals.css`.

Component specs for each — real tokens, real geometry — are in `README.md`.

---

## Outstanding — for the engineering side

These were requested late and are **not** in the canvas. All are small and independent.

- [ ] **Phone header order.** Desktop is now `deck name → commander → status + bracket chip → progress bar`. `spine-mobile` needs the same sequence; today its chips still lead the meta row.
- [ ] **Deck tiles: use the chip, not the bare mark.** Tiles are already restructured to three lines (chips · bar + count · subtext); swap the mark for the named chip.
- [ ] **Home — “Pick up where you left off”.** Not mocked. The resume row is `left-portrait` at band 72 with a 99px portrait column (`art-wash.tsx` `PORTRAITS[99]`); the chip belongs beside the status pill on its meta line.
- [ ] **Colour-board tiles** still use the one-line footer, inconsistent with section E.
- [ ] **Real clip to fix:** `Yuriko, the Tiger’s Shadow` renders 160px in a 130px box in the reordered desktop header. New since the reorder, and *not* one of the known Cinzel false positives.
- [ ] **Doc sync.** `README.md` still describes the pre-climb ladder, the old section F and “Bracket — your cards permit”.

### Known false positives

The layout validator reports ~5 “content clipped” findings on deck names. Measured: ink is 200px+
*narrower* than its box with symmetric 1.87/1.88px vertical overflow — Cinzel’s ascent/descent under
the real component’s own `line-height: 1.15`. No glyph ink is cut. Ignore those five; fix the Yuriko
one above, which is real.

## Not this round

The card mark, the limits table and violations, declaration drift, and the push line are Rounds 1–4.
Where this frame reserves a slot for them it is marked as a reservation, not a drawing.
