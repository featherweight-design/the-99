# R3 — the Mana Pool link-out (#330), the two blockers

`design/design_handoff_the99_decks/` · 2026-09-06 · **new files only**

Canvas: `The 99 - Decks · Mana Pool Link-Out (R3).dc.html`. R1 and R2 are untouched as the record.

**Verdict: 🟢 Green — nothing carried.** Both blockers are corrected with drawings, both token
questions are ruled, and R2's two carried items are closed by review
(`/add-deck?deck=<base64>`, `/cards?q=<name>`, `rel="noopener"` alone). Item 6 is now a corrections
ledger rather than a carry list.

**The one-line summary:** *both blockers were the same mistake — R2 drew desktop by extrapolating
from mobile, and drew mobile from an addendum canvas rather than from shipped — and correcting them
made R2's structural rule more general, not less: **the link-out lives in its container's pinned
bottom row, below the hairline that row already has.***

---

## 0. Relayed, not read

`docs/superpowers/specs/2026-09-05-manapool-checkout-design.md` and
`src/components/cards/card-modal.tsx` are still not in this project. **Every shipped fact this round
corrects against — the pinned nav row and its rule, the two-button footer, the 590px sheet, the
`md:` split, both URL shapes — reached me in review and is recorded as relayed.** The drawings
should be checked against the files once; the nav row's padding in particular is matched to the
shipped footer's, not measured.

## 1. Blocker 1 — the desktop card modal: **the link joins the pinned nav row**

Drawn in item 3, because it cannot be extrapolated from the 390px sheets. Desktop pins
`‹ Prev · N of M · Next ›` outside the scrolling content column, already under a
`1px solid var(--border)` rule. **So the modal did have an actions row, and R2's claim that it
lacked one was wrong** — a claim I made about a file I could not read, which is the honest reason
this blocker exists.

The three options, and the ruling:

| Option | Verdict |
|---|---|
| **Above the row** | **No.** Two hairlines 44px apart with a one-item row between them, and the link sits in the scroll column — so it leaves the screen on a long oracle text while a navigation row holds the bottom. That is R2's structural rule producing the opposite of what it was for. |
| **Replaces the row** | **Not on the table.** Prev/next is a shipped affordance doing an unrelated job — moving the player through their own deck. No design pass trades that for a store link, and #330 is not the ticket that would. |
| **Joins the row** | **Ruled.** Costs no hairline, no height, and no scroll. The link sits at the row's leading edge, the nav cluster keeps the trailing edge it already has. |

**Link left, navigation right.** The counter has to stay between its arrows, so the nav cluster
can't be split or moved; that leaves the leading edge for the link, which is the reading position
for the one item in the row that isn't navigation. They don't read as one control: nav is
right-aligned, unlined, mono-numbered, `--fg-dim`; the link is left, underlined, glyphed, brass.
**16px of gap and a flex spacer between them — never a divider**, because a divider inside a row
under a rule is two rules doing one job.

**What pinning fixes beyond tidiness:** the link is in the same pixel for every card — a five-line
oracle text and a planeswalker with four abilities put it in the same place. And it keeps the
hairline's §2.2 meaning intact where it matters most: the printing picker is now visibly *inside*
the scroll column and the link visibly outside it, so nothing reads as *buy this printing*.

### R2's rule, in its corrected form

> ~~The outbound link is the last thing in its container, below a hairline.~~
> **The link-out lives in its container's pinned bottom row, below the hairline that row already
> has — and where no pinned row exists, it becomes one.**

R2 had mistaken the mobile case for the rule. The corrected form is better inheritance for the next
link-out: **the convention adds no dividers to this app.** The export footer's rule is shipped; the
modal's rule is shipped.

## 2. Blocker 2 — the phone export sheet: **redrawn, and the centring ruling withdrawn**

Shipped footer is one flex row at every breakpoint and on both tabs: `Copy shopping list` beside a
secondary `.txt` (`Download .txt` above `md:`). R2 drew a full-width `Copy` with no `.txt` and then
centred the link *because* the button above was full-width. **The premise was false, so the ruling
goes with it: the link is left-aligned**, which also matches desktop — the whole point of a
convention.

**The 590px is fixed, and at a Shopping list of 8 it holds — exactly.** All eight rows fit above the
footer with the link's row in place, which is the useful thing to know: **the link costs the sheet
its remaining slack, not a row.** A ninth card is what starts the scroll, and it would have started
it one card later without this row. If that trade ever bites, the sheet should grow for the list —
not lose the link.

## 3. The two token questions

**Active ink — corrected, and the catch is a good one.** R2 drew `#AB6E37`: darker than the
`--accent` item 5 rejects for failing AA, and unmeasured in all six. Any darker step has the same
problem in the two themes that already fail, so **active does not darken at all** — the ink stays
`--fg` and the underline goes 1px → 2px. Press is legible as a change in weight, contrast can only
improve, and no seventh value enters the table.

**Focus — the specified ring, not the drawn one.** R2's asymmetric `box-shadow` + padding was a
drawing artifact; it is now a real `outline: 2px solid var(--accent); outline-offset: 2px`. This
matters beyond tidiness: `outline` follows the text box across a line wrap and takes no layout
space, which is what lets the link keep **no box of its own** in a row it shares with buttons.

**Box metrics, as asked:** 14px / `line-height: 1.45` / `letter-spacing: 0` (inherits body),
`display: inline`, no padding, no min-width. **The 44px target lives on the row, not the link** —
below `md:`, the row is `min-height: 44px`.

## 4. What R3 does not reopen

Weight and its two rejects · the §2.2 label ruling and its grammar · one-state-unconditional · the
empty state (absent, not disabled — the hairline goes with it) · the buy tag and Decklist tab
exclusions · item 5's six-theme ink derivation, which the active-ink correction **uses** rather than
revisits.

## 5. Open, non-blocking — three things worth one look in place

- **The desktop row at its narrowest.** Link plus nav is 29 characters and three nav elements;
  below the modal's min-width the link should wrap before *at Mana Pool* rather than compress the
  counter.
- **The 590px sheet is now at its limit.** Eight rows fit with ~18px to spare; a ninth scrolls. If
  Shopping lists routinely run longer, the sheet's height is the thing to revisit, not the link.
- **Tab order in the pinned row.** The link precedes Prev/Next in DOM order, matching its leading
  position. **If the shipped nav is focus-trapped first for keyboard deck-walking, keep the nav
  first and leave the visual order alone** — reading order is worth less here than not breaking a
  shipped keyboard path.

## Files

- `The 99 - Decks · Mana Pool Link-Out (R3).dc.html` — desktop card modal drawn with the pinned row;
  390px export sheet redrawn from shipped at 590px fixed; corrected active and focus states; item 6
  as the corrections ledger.
- `LINKOUT-R3-README.md` / `LINKOUT-R3-READINESS.md` — this file and the verdict.
- `manapool-linkout · copy strings.ts` — **updated in place**: the two URLs and the `rel` note are
  now settled rather than pending.
