# Gap report: deck overview, PR 3 (the Overview on the Analysis tab and its sheet)

Design review ran against `docs/superpowers/design-tables/synopsis-overview.md` (267 property rows,
13 states), which was enumerated from the Analysis tab handoff (`SYNOPSIS-modal.md`, the Synopsis
Sheet canvas, the 1300 and 390 frames, `STATES-analysis-tab.md`, `CREDITS-overview.md`) and
Round 0's `STATES-synopsis.md`.

## Verify: 16 visual gaps, 6 state gaps

Fixed in this PR, and confirmed by the confirm pass (0 remain):

- The entry link's hover ink, `--accent-hover`, on the label and its dotted rule.
- The write row and the Try again row's spacing: line to row 7 / 8px, then a margin-top of
  4 / 6px and a gap of 9 / 16px. The refused slot's gap is 7 / 8px on the tab and 8px in the
  modal. The modal's refused sentence is 13px at both widths.
- A disabled press is `aria-disabled` rather than `disabled`, so it stays in the tab order. Its
  credit note describes it through `aria-describedby` (audit finding 10d).
- The credit note's `min-width: 0` and `flex: 1 1 280px` on desktop.
- Ruling D draws state 2's chrome, credit note included (credits audit, finding 3).
- The modal's stale banner:
  - Re-analyze while the reading itself is stale, and ruling D's write once it is current;
  - `nowrap` and `flex: none` on the button, and `min-width: 0` on the sentence;
  - the credit note beside the write (finding 5).
- A refused section's Try again in the modal takes 7g's disabled form when credits are spent.
- The Mulligan and Weaknesses item grids: `14px minmax(0,1fr)`, baseline aligned. The
  Weaknesses bullet sits at 2px.
- A newer run refused in every section, over an older overview, draws the refused slot. It no
  longer draws ruling D's line again.

Not gaps, with the reason:

- **Pre-reading Overview label (S13).** The table inferred a label over the empty state from
  2a's "Overview empty state". That phrase names the tab's empty state, and neither frame draws
  a label there. HANDOFF §2 forbids reserved space ("absent until there is content").
- **The version surface (S12, 6e).** This is PR 5 in the plan.
- **ModalChrome's shadow, max-height, aside size and title leading.** These belong to the shared
  chrome all four sheets use. Changing them for one sheet would split the family.
- **The phone modal's aside opens the body.** This is a ruled divergence: the contact sheet drew
  the title as `OVER…` with the aside in the 43px header. The lean's reasoning makes the same
  move, and `probe:synopsis-ui` asserts the title whole and the aside drawn once.

Also found by the browser probe rather than the review: the press enabled before the state was
read for the new reading, so for a moment it offered a write with no credit note beside it. The
hook now reports whether its answer is for the key on screen, and the press waits for it.
