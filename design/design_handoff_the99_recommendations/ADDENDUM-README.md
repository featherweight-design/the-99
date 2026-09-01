# Addendum — Recommendations (#130 · #131)

Answers the R1 audit (🟠 Orange) against its eight items. **No decision in R1's log is
reopened**, and `READINESS.md` items 2 and 3 stay open — they were not part of this audit.

File: `The 99 - Recommendations Addendum.dc.html` (canvas). R1's canvas is
`The 99 - Recommendations.dc.html`; the three consistency fixes were made **in place** there
rather than restated in the addendum.

## The four frames

### A1 · Degraded EDHREC — both widths
Decision 2 split absent from degraded and gave degraded a retry; only absent was drawn.

Below the note, degraded is **identical to absent**: the figure slot is removed, not dashed, and
the chip returns to its shipped `0 10px` padding. Chips stay live controls — the modal is a
Scryfall read and does not depend on EDHREC. With nothing to sort by, ordering falls back to
pool order.

**One retry, because there is one fetch.** Four panels read one payload; four retries would be
four calls to one endpoint and three lies about scope. Desktop places it **inline, right of the
sentence**, on the baseline of the clause it answers — the shipped degraded-banner idiom,
unchanged. Phone gives it **its own 44px line**: inline at 390px it either wraps mid-clause or
starves the sentence, and it is the only control in the block.

The **left rule is `--warning`** where absent's is `--fg-faint`. That is the whole visual
delta, and it is the right one: absent is a permanent fact about a commander, degraded is a
thing that went wrong. Same shape, different rule, different string, presence of a control —
four signals, none of them colour alone. In flight the retry takes the shipped disabled
treatment and the text does not change; a second failure escalates nothing.

### A2 · The Shopping row at 390px
State 8's phone row had no figure column, so `inclusionPct` — the whole reason state 11 exists
— was undrawn at phone, along with the group header and the footer.

At 390px the row already holds a dot, a name, `buy`, `auto` and a 44px `✕`. A sixth item in
the same line leaves the name ~90px, which is where *Talisman of Creativity* becomes *Talisman
of…* and the row stops naming a card.

**So Shopping's phone row is 52px, not 44px**, and the figure sits on a meta line under the
name as `edhrec 24%` — prefixed, because outside the pill it has lost the context the chip gave
it. This is **the only row in the builder that grows**: the All view keeps its 44px row and
prints no figure, because the figure is the argument for a purchase and All is not asking you to
buy anything.

**Shrink order, widest yield first:** (1) the meta line ellipses — one short mono clause that
never needs to; (2) the name ellipses next, and only after the meta line has given up
everything — `flex-auto`, not `flex-1`, the bug `decklist-row.tsx` already documents at
length; (3) nothing else yields — `buy`, `auto`, the dot and the `✕` are `flex-none` at fixed
widths, because a hit box that shrinks is not a hit box; (4) **absence stays a sentence here**,
`no EDHREC figure`, not an em dash — on its own line with no column of figures beside it the
dash has nothing to mean. Same reasoning as state 5, one scale down, and `suggestion-tile.tsx`
already ships the string.

### A3 · In-flight at desktop — what the bar does
"Same construct" did not hold: the desktop cell carries a meter bar and a denominator the phone
cell lacks.

**An empty track is pixel-identical to a 0% fill**, which is exactly the reading decision 9
forbids. So mid-fill there is **no track and no fill element** — a **1px dashed
`--border-strong` hairline**, no solid ground. Dashed is this codebase's established
"nothing here yet" (dropzone border, spent slot, unowned dot), so it needs no new vocabulary and
cannot be read as a quantity.

**The denominator stays.** This is the one place the cell keeps `/ 10` while the numerator is a
dash: the target is known before the fill starts, and printing it is what makes the dash read as
*pending* rather than *broken*. Every colour in the cell drops a step (label `--fg-locked`,
figure `--border-strong`) so the strip reads as not-yet rather than as five failed roles.
**The status pill goes dashed and reads `Draft`** — the deck genuinely is one until the rows
land, and `Building` would be a computed claim about counts that do not exist.

**No motion**: no shimmer, no pulse, no indeterminate sweep. Nothing new joins the
reduced-motion block, per R1's contract.

### A4 · A short role cell at phone
State 13's `2 / 3` + bar + `see shelf` was the desktop idiom only; the phone cell has no bar
and no denominator (both are `hidden md:` in the shipped component).

Three signals carry short at 390px, all shipped: **the brass figure** (`2` in `--brass` among
four in `--success`, straight from `roleCellState`); **the arithmetic** (`2` above `rec 3` —
the `rec N` line *is* the phone's denominator, which is why the shipped cell drops the fraction
rather than shrinking it); and **the caption as a control** (`see shelf` in brass where met
cells draw an inert dash, with the 62px cell clearing 44px on its own).

**One addendum call:** a short cell in a *just-filled* deck takes `1px --border-strong` instead
of `--border` — a hairline, not a tint, not a colour. Five cells of small type in a 390px row
is a lot, and the one the provenance line is talking about should be findable without counting.
It is the only phone-only addition in the handoff and it is one token swap.

Desktop keeps its `67%` `--brass-mid` fill: **2 of 3 is a real quantity**, so a real bar is
correct there — unlike A3, where there is no quantity to draw.

## Copy reconciled — the copy file wins

It was marked production-final, so it is the source. Two canvas strings were edited to match it:

- **State 13's provenance** now reads `fill.provenanceShort` verbatim: *"We filled 67 of 99.
  Wipes came up short — you own what you own, EDHREC knows what it knows, and that is everything
  we have. The other 32 are yours."* The canvas's variant named a specific count of EDHREC
  candidates, which no string can know.
- **State 15's body** now reads `fill.failedBody` verbatim, with **"your commander"** rather
  than a commander name. The canvas interpolated *Kykar* into a string with no slot for it, and
  the fix is the canvas's: this banner renders in the one state where the deck's own header is
  least trustworthy, so it should not lean on a name.

Two keys were **added** for A2 (`shopping.rowFigure`, `shopping.rowNoFigure`) and one for A1
(`coverage.degradedRetryAria`). Nothing was deleted.

## Three consistency fixes, in R1's canvas

1. **Card Draw is 14 owned**, not 12, so drawing 12 chips + `+2 more` agrees with
   `DENSITY-long-role.md`'s "7–12: all on desktop, no disclosure" instead of contradicting it.
   Two chips added (`5%`, `4%`); the phone disclosure reads `Show all 14`.
2. **Shopping gained its Wipes group** (`2 · closes 1→3`), so seven rows are drawn under a
   footer that counts seven. §7 forbids the elision, so the fix is rows, not a caption.
3. **`aria-pressed` is off the auto tag.** It reported a state that cannot be observed: the
   control removes itself on activation, so `true` never exists and `false` is the only value it
   could ever announce. The tag carries an `aria-label` (`Keep {name} in this deck`) and the
   builder's live region confirms the keep.

## Two corrections to R1's engineering notes

Both are recorded in `README.md` and `READINESS.md` as well, because they change an estimate.

1. **The unowned top-up is not bounded per role.** `getDeckSuggestions` appends a flat
   `slice(0, 5)` of unowned EDHREC staples (`src/app/decks/actions.ts:106`, `:153`) with **no
   role classification**. Ruling 2's "top each role up to its target and no further" therefore
   needs **new engine code** — classify the unowned candidates, bound each by its own remaining
   gap — and the seven-card Shopping tab in state 11 is **not reachable from what ships**.
   Nothing drawn changes. R1 recorded this as free and was wrong.
2. **The three `REPLACES` entries target hardcoded JSX in `detail.tsx`**, not
   `decks-builder.ts` / `commanders.ts`. There is no copy module for this surface yet; eng lifts
   the strings out of the component first, and that lift is part of the work.

## Files touched
- **New:** `The 99 - Recommendations Addendum.dc.html`, `ADDENDUM-README.md`.
- **Edited in place:** `The 99 - Recommendations.dc.html` (3 consistency fixes, 2 copy
  reconciliations), `recommendations · copy strings.ts` (3 keys added, corrected REPLACES
  preamble), `README.md` (addendum table, 2 corrections, gap 8), `READINESS.md` (audit
  outcome, corrections section).
- **Untouched:** `DENSITY-long-role.md` — the density table was right and the canvas was wrong,
  so the canvas moved.
