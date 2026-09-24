# All brackets: the reference sheet (Analysis tab addendum)

**Canvas:** `The 99 - Brackets Sheet.dc.html` (1a–1e). **Body component:** `Brackets Sheet.dc.html`
(`phone`, `unrolled`, `yours`: `12` · `2` · `3` · `4` · `45`, `theme`).
**Source of truth:** verdict `HANDOFF.md` (the deleted limits table) and `READINESS.md` item 8; analysis tab
`READINESS.md`, "Still owed". Built on `main`: `src/lib/bracket/rules.ts`, `sources.ts`, `types.ts`,
`components/decks/receipt-modal.tsx` (`ModalChrome`), `bracket-climb.tsx`, `provenance-panel.tsx`,
`lib/copy/deck-analysis.ts`. No About entry, since the Analysis tab's entry already covers this surface.

## Entry point (1a)

`see all brackets →` goes in the climb's foot: a row under the rungs box, at its right edge, on every analyzed climb.
It is the opener style: mono 11 `--accent` on a dotted underline, with the arrow.
- **Pressed** (and hover at 1300): `--accent-hover` text, a solid underline, and an `--accent` 12% tint on the hit area (radius 6).
- **390:** the target is 44px tall, pulled back into the section gap (`-4px -8px -6px 0`). **1300:** 28px.
- `aria-haspopup="dialog"`. Focus goes back to the link on close. Focus-visible is the climb's 2px `--accent` ring.
- Local state, not persisted, the same as provenance.

## Chrome

`ModalChrome`, unchanged. **`width={700}`**. At 560 each bracket gets about 130px next to the 156px label column,
and `where your cards are` clips. 760 is the receipt's width.
- Title **All brackets**, aside **as we apply them**, close label **Close all brackets**. No mark.
- `--surface-raised` ground.
- Phone: sheet from 52, header pinned to 43.
- `mark` must be optional on `ModalChrome`, which it already is.

## The grid

A `role="table"` of 4 rules × brackets 1–3, then tutors, then one Optimized · cEDH row.

| | Exhibition | Core | Upgraded |
|---|---|---|---|
| Game changers | 0 allowed | 0 allowed | **3 allowed** |
| Mass land denial | 0 allowed | 0 allowed | 0 allowed |
| Extra turns | 0 allowed | no cap | no cap |
| Two-card infinites | 0 allowed | 0 allowed | no cap |
| Tutors | *no limit, at any bracket* (one cell) |||
| Optimized · cEDH | *no card limits on any of the four* (one cell) |||

- **Every figure comes from a constant:**
  - `GAME_CHANGER_LIMIT`
  - `MASS_LAND_DENIAL_LIMIT`
  - `EXTRA_TURN_LIMIT_BRACKET_1`, plus `counted: false` at 2 and 3
  - `COMBO_POLICY`
  
  Build the cells from these constants and never type them out by hand. The climb's `Allowances` already maps
  them to `allowed(n)` and `noCap`.
- **Cells hold a figure only.** Explanations are one full-width line under a row. At 1300 the line is indented to
  the bracket columns, and at 390 it spans the whole width.
- A row gets an explanation line only if it has a `no cap` cell or an allowance above zero. That means game
  changers, extra turns and two-card infinites.
- `no cap` is `--fg-faint` on a 1px dashed `--border-dashed` underline.
- **Tutors** sit under a dashed rule, in one merged cell with the findings' `no limit` chip.
  - `no cap` means a rule exists and sets no number.
  - `no limit` means there is no rule at all.
- **Optimized · cEDH** is a row on `--surface-sunken` showing both chip marks.

## The reader's bracket (1d)

This uses the climb's treatment:
- The column gets `YOURS_TINT` (12% of the rank's ink).
- The header gets a 2px inset ink rule along its top, and the name is drawn in ink.
- `climb.roleHere` / `roleHereShort` sits under the name.
- Figures keep their neutral ink.

Ranges:
- **A range marks both columns.** A `[1,2]` deck gets two tinted columns.
- `[4]` / `[4,5]` tint the Optimized · cEDH row and add a 2px ink rule on its left edge.
- The label shows only on the row, not on each mark.

## Calls on the open questions

1. **Which three:** 1, 2 and 3, the only brackets with card limits (`verdict.limits` stops at 3). 4 and 5
   share one row, so a deck there can still find itself. It is a row and not two columns, because two
   columns would be eight identical cells.
2. **Quote or paraphrase:** paraphrase, with the dated source in the foot (`BRACKET_RULES_SOURCE`: title,
   link, and `rulesChecked(lastChecked)`). The cells are the app's readings, not Wizards' text. The last round's
   unverified quotes were a readiness blocker. The post is revised in place. Bracket names stay verbatim.
3. **Transpose on the phone:** no. With figure-only cells, three columns fit at 88px each.

## Stacked over a card (1e)

Not drawn. No cell names a card. The only control in the body is the external Wizards link, so depth stays
at one. If example cards are ever added, they stack the way the receipt does and nothing new is needed.
