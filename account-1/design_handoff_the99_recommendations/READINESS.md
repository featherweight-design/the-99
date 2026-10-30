# READINESS — Recommendations (#130 · #131), R1

**Self-assessed: 🟡 Yellow — one hard block, and it is not a design question.**

**R1's audit came back 🟠 Orange** — four undrawn frames, a copy-file disagreement, three
consistency slips, two wrong engineering notes. All eight items are answered: four frames in
`The 99 - Recommendations Addendum.dc.html`, three fixes in place in the R1 canvas, the copy
file reconciled and corrected. Items 2 and 3 below were **not** part of that audit and stay
open.

The audit against §8 is what settles this; the note below is what Design believes it is handing
over.

## Blocking

1. **§0 — the recommendation foundation has not merged.** Per-card EDHREC inclusion for an
   arbitrary commander, served offline, does not exist. Every chip figure (§8.4) and the unowned
   top-up (§8.2) depend on it. The brief instructs Design to mock as though it exists, and this
   handoff does — but nothing here can be built until `feat/rec-foundation` lands. **This is a
   scheduling block, not a design gap, and no drawing changes when it clears.**

## Needs a ruling — neither requires a redraw

2. **The keep gesture (§8.5's "explicitly").** The ruling fixes the semantics and names no
   gesture. Design's answer is **tag-as-button**: `auto` → `keep ✓` → gone. If Product prefers
   an implicit keep (any edit to the row counts), the tag becomes inert text and nothing else in
   the handoff moves. Decision 4, gap 3.
3. **Desktop chip target size.** The desktop chip is 28px and pointer-first; its accessible
   equivalent is the phone's 44px row, and both ship. If a 44px desktop target is required, the
   row density replaces the pill wrap at all widths — a real option, drawn at phone, not drawn at
   desktop. Gap 2.

## Called, not asked — flagged for the record

4. **No confirmation on `Clear all auto`.** The count in the label plus a reversible sweep is
   Design's substitute for a dialog. §9.3 invited the question; this is the answer, not a
   deferral.
5. **The swept-empty copy branches** on whether the deck was ever filled. If that bit is
   expensive, the shipped first-run string ships in both places and reads slightly wrong when
   reached by deletion. Gap 7.
6. **State 14 may never render.** Design prefers the fill inside the create transaction. The
   in-flight frame is drawn so that a streaming implementation has a spec, not because one is
   recommended.

## Corrected since R1 — read these before estimating

7. **The unowned top-up is a flat `slice(0, 5)`**, not a per-role bound
   (`src/app/decks/actions.ts:106`, `:153`), with no role classification. Ruling 2 needs new
   engine code, and state 11's seven-card Shopping tab is not reachable without it. R1 recorded
   this as free and was wrong. Nothing drawn changes.
8. **The three `REPLACES` entries target hardcoded JSX in `detail.tsx`**, not a copy module.
   The lift out of the component is part of the work.

## Not blocking

- No new token, no new hex, no new motion class, no new empty-state construct, no new modal.
- `role-counter-strip.tsx` and `role-counter-cell.tsx` are untouched (decision 8).
- `suggestDeck` is untouched; #130 commits what it already returns.
- The null rule is drawn in three places (chip dash, Shopping figure dash, in-flight role cells)
  and **nowhere renders a 0%**.
- Every figure in the canvas is arithmetically consistent: 10 + 10 + 8 + 3 + 37 = 68, state 13 is
  67, Shopping is 7, and the pruned deck is 66 with 58 auto.
