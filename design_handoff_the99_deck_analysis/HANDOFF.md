# Deck analysis — handoff package (R1, Round 0 of 5)

**Canvas:** `The 99 - Deck Analysis Frame.dc.html` (pan/zoom; `theme` prop: amonkhet · kamigawa).
**Assets:** `assets/` — **the mark set's only home.** Ten SVGs on `currentColor` (five full marks,
five chip forms), `ASSETS.md` for the reduction rule — **normative on sizes and forms** — and
`bracket-marks.html`, a standalone sheet of every mark and chip you can open, copy from, or
screenshot. No other handoff package carries bracket assets.

---

## R9 — the chip ladder, ruled

Both 22px collisions are **closed**, in the chip form only. **All five full marks are unchanged**
and still additive: 1 diamond → 2 adds the mid ring → 3 adds ticks → 4 adds studs → 5 closes them
into a third ring, at 26 / 36 / 44.

| | |
|---|---|
| **Amended chip rule** | **One ornament per rank, chosen to survive 22px.** The chip sheds every ornament below the rank's own; where that ornament does not survive 22px it is drawn at the chip's own radius rather than dropped. |
| **1 vs 2** | Rank 2's chip is **the ring alone**, radius `16.5`, **no inner diamond**. Two lone diamonds 43% apart in linear size — rank 1 floats in the box, rank 2 fills it. `bracket-2-core-chip.svg` redrawn. |
| **3 vs 4** | Rank 3's ticks become **spokes** — `5.3` units from each core vertex to the rim, attached, at `1.5`. 3 bridges core and rim; 4 keeps four detached studs. `bracket-3-upgraded-chip.svg` redrawn. |
| **Rejected** | Rotating rank 4's studs to the diagonals (breaks family with the full mark); re-deriving the ladder (moves five full marks to fix two chips). |
| **Label** | **Stays optional.** The chip exists to carry a rank where there is no room for a word. The Declaration's chips keep their names for reading, not for disambiguation. |
| **Unblocks** | Round 3's declaration build — the `[1,2]` ask (Exhibition / Core) and state A5's 22px mark are buildable as drawn. |

Files changed: two chip SVGs, `ASSETS.md`, `bracket-marks.html`. Ranks 1, 4, 5 byte-identical.

---

## Decisions, settled

| | |
|---|---|
| **Placement** | Analysis is the **second tab** (`deck · analysis · consider · games · versions`). The **Recommended mix strip moves into it**; the art band and version line stay. Net −150px above the tabs. |
| **Mark** | **Filigree** — an open diamond that gains ornament by rank (echo → vertex ticks → hollow satellites → edge cusps). Exact SVG on a 40-unit box, stroke included in the fit. |
| **Sizes** | **Chip form at 22** (tile footer, band, filter rows); **full mark at 26 / 36 / 44** (chip pill, verdict, reference). Below **20px** no mark is drawn — the bracket is the numeral alone. Numeral is `max(10px, 0.40S)`; Cinzel’s `4` carries `dx="-0.9"`. |
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
