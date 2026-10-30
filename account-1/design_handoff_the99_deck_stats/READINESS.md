# READINESS — What this deck is (R1)

**Self-assessment: 🟢 green, with one product decision and one flagged amendment.** Both the deck
page block and the roll-up block can be built from this handoff without a further design round. The
product decision does not block either.

---

## What ships, in order

| # | Slice | Files | Blocked on |
|---|---|---|---|
| 1 | **`DeckStatsBlock`** — three ruled sections (the two scalars, the curve as a unit tally, the colours on one ruler), both widths, all absence states | new `src/components/decks/deck-stats-block.tsx`; new `src/lib/copy/deck-stats.ts`; one mount in `builder-shell.tsx` at the foot of the Deck panel | nothing |
| 2 | **Commitments `$0.00` fix** | `src/components/home/commitments-card.tsx:88-91` | nothing — one branch, existing string |
| 3 | **`DeckStatsRollup`** — the same ledger with a wider ruler (record + all six colours), both widths | new `src/components/home/deck-stats-rollup.tsx`; reuses the same copy module | its **placement**, owned by the home handoff |
| 4 | **Versioning strip list clause** | `deck-versioning-surface-2.md:183` + one string in `copy/deck-versioning.ts` | nothing — the surface is unstarted |

Slices 1 and 2 are independent and can land in either order. Slice 3 needs only a container to sit
in. Slice 4 should land **before or with** the versioning strip, never after.

**No new query, no new column, no new token, no new component in `ui/`.** `loadOneDeckStats` and
`loadDeckStats` are merged (PR #524) and already answer for both altitudes at a fixed number of
reads.

---

## Open with Product — one decision, not blocking

**Does the app follow the deck tile or the Commitments card on an unpriced total?** The brief hands
this to Design and Design has answered — **follow the tile**, branch rather than print `$0.00` — but
Commitments is a shipped surface a player is looking at now, and changing it is a product-visible
edit. If Product refuses, the block still ships exactly as drawn: it simply becomes the second
surface disagreeing with Commitments rather than the one that settles it, and amendment 1 stays open
as a known discrepancy.

---

## Open with Design — nothing

All five of the brief's open calls are ruled in `README.md`. No question is deferred to a later
round, and no state in `STATES-deck-stats.md` is drawn as *to be decided*.

---

## Data request — cost vs production (new in R2, not blocking)

The reference's strongest panel compares, per colour, **what the deck asks for** (coloured pips in
mana costs) against **what it can produce** (mana sources). We draw neither, because `stats.ts`
computes neither: `colourSpread` counts **colour identity**, once per colour, lands included.

**It is a real gap and it is a good figure** — it is the one that tells a player their mana base is
wrong. Building it needs two new folds (`pipSpread`, `sourceSpread`) and a source-detection rule for
lands and rocks, which is a computation brief and not a drawing one. **R2 deliberately ships no
empty frame for it.** When those folds exist, the colour cards already have the shape: a second
track and a second caption per card, exactly as the reference does it.

## Flagged back, with the reason

**1 · The versioning strip's mana cell needs a list clause.** Ratified copy does not change; one
caption string joins it. Without it, `avg 3.4` in the block and `was 3.6 → 3.2` in the strip differ
on the same page for a reason nothing on screen explains, and the first bug report will be correct
about the symptom and wrong about the cause.

**2 · A quick-add moves four figures at once, with no easing.** R1 specifies no motion at all. If
review wants the revalidation softened, that is a new decision rather than a missing one — and it
would be the block's first animation, so it would also need a reduced-motion state.

**3 · The block is invisible from Consider and Games.** Deliberate (ruling 1), and the reason the
record cell can state a figure without competing with the Games headline. Worth confirming with
Product that a description of the list is expected to live with the list.

---

## Provenance risk

Ten files were **not** read this turn and are relayed from the brief's own `file:line` citations —
`builder-shell.tsx`, `shopping-rollup.ts`, `availability-query.ts`, `commitments-card.tsx`,
`deck-card.tsx`, `deck-rail.tsx`, `versions.ts`, `mana-value.ts`, `copy/deck-versioning.ts` and
`deck-versioning-surface-2.md`. Listed in `README.md` §0. **If any line disagrees, the line wins;**
the only ruling that would move is amendment 2's exact wording. The four figures themselves were
read at source (`stats.ts`, `stats-query.ts`) and every arithmetic claim below §1 of
`PROPERTY-deck-stats.md` is quoted from them.

---

## Check before merge

- [ ] No denominator is `99`. Every share divides by `colours.copies` or `curve.copies`, as returned.
- [ ] `colours.copies` is never used in the curve cell, and `curve.copies` never in the colour cell.
- [ ] `cost` crosses the prop boundary as `DeckShopping | null`. No zeroed default anywhere.
- [ ] `$0.00` cannot render. Grep the component for `formatCents` and check every call is guarded.
- [ ] The caveat caption prints on a mono-colour deck.
- [ ] All eight curve buckets render at every deck size; an empty one is a baseline with no figure.
- [ ] `curve.average` is printed to one decimal and never raw; `null` renders `avg —`.
- [ ] Bucket 7's label is `7+`.
- [ ] The record prints all three terms, including `–0`.
- [ ] Nothing in the block is `--accent` except the `To buy` figure.
- [ ] Every cell is a `role="figure"` with an explicit `aria-label`; no live region.
- [ ] No focusable descendant at either width.
- [ ] Captions are `--fg-faint`, not `--fg-locked`.
- [ ] Contrast re-checked in all six themes after any `--surface-sunken` change.

---

## R2 additions to the merge check *(superseded by R3 — kept for the R2 canvas)*

- [ ] No percentage renders on top of a colour fill, except at 100% (ink `#14110E` on light fills,
      `--fg` on dark — re-check `--w` and `--g` in all six themes).
- [ ] A share of 1 card renders a **6px minimum** fill, not a zero-width one.
- [ ] A colour at 0 dims the **card**, never the pip; the pip keeps its full-strength fill.
- [ ] The ring is dashed and arcless at both altitudes, and prints `0` at zero games.
- [ ] The To buy progress track is **absent**, not 0%-filled, when `cost === null`.
- [ ] The curve's y-scale is derived from the tallest bucket, and collapses to 0–5 at
      `--fg-locked` when nothing is cast.
- [ ] The in-bar count is only drawn when the bar can hold it; short bars print below the axis.
- [ ] Bucket 7's axis label is `7+` and the axis has **eight** columns, never sixteen.

---

## R3 additions to the merge check

- [ ] **No percentage renders anywhere in the block**, at either altitude or either width.
- [ ] The tally's square count is driven by the same figure that prints beneath it — one array, one
      length, so the drawing cannot drift from the count.
- [ ] The unit doubles above **18** in the tallest bucket, the foot line says *one square, two
      cards*, odd counts round **up**, and the printed figure stays the true one.
- [ ] An empty bucket renders **no squares** and an em dash in its count slot.
- [ ] Every colour rule divides by `colours.copies`; the ruler's ticks are quarters of that
      denominator, **labelled in cards**.
- [ ] Tick labels collapse to `0` and the denominator when quarters are not whole (a 1– or 2-card
      denominator).
- [ ] A colour at 0 draws full-width leader dots and `—`; **nothing in the block is dimmed**.
- [ ] Each section head carries its own denominator; `100 cards` and `63 cast` never appear on the
      same rule.
- [ ] Section heads are Cinzel; every figure is IBM Plex Mono with `tabular-nums`.
- [ ] The four new copy strings live in `deck-stats · copy strings.ts`, not inline.
