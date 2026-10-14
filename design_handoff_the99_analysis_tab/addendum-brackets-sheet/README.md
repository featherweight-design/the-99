# All brackets: the reference sheet (Analysis tab addendum)

## R3 (2026-09-24): Hugh's review of R2

This replaces R1's grid, the chrome aside and the reader marking. Canvas **3a**, **3b** and **2a**. The link (1a) is unchanged.

- **A reference, not a second climb.** The climb already shows where a deck sits, so the sheet marks nothing: no tint,
  no ink rule and no `roleHere`. The body needs no `permits` or `yours`, and audit finding 1 no longer applies to the sheet.
- **Five bracket columns.** Cells hold the bare figure (`0`, `3`) or `climb.noCap`, under a `cards allowed` corner.
  At 4–5 every cell is `no cap`, which the climb already prints there. `3` is the only `--fg`/600 figure.
  - 1300: `168px repeat(5, 1fr)` in ModalChrome 700, about 98px per column; rule names nowrap. The header is mark 22 over the name, 12/600 `--fg-body`.
  - **390 transposes:** brackets become rows (`116px`: mark 22 + name 11.5/600) and the rules become four columns of about 60px
    (fact mark 16 over a wrapping mono 8.5 uppercase label). Five columns would be about 53px, which is narrower than "Exhibition".
- **Header:** title and close only. The aside is removed.
- **A notes list under the table** replaces the per-row readings, the tutors row and the Optimized · cEDH row. It has six entries:
  the four rules, tutors with the findings' `no limit` chip (audit finding 4), and Optimized and cEDH under both chip marks.
  Each entry has a mark column (48, or 40 at 390), then the name (12.5/600 `--fg`), the reading if there is one
  (12/1.55 `--fg-muted`), and the quote. Entries are split by 1px `--border`.
- **The quote (Hugh's ruling):** 5px under the reading, in Plex Sans italic 400, 12/1.5 (11.5 at 390), `--fg-body`, in curly quotes.
  A mono tag follows on the same line: `Wizards · Feb 2025`, 9.5 (9) `--fg-faint`, 8px gap, nowrap.
  Five quotes come from *Introducing Commander Brackets Beta* (11 Feb 2025) and tutors from the 21 Oct 2025 update.
  The foot adds `Quoted from` and both links.
- **Fact marks are `--fact`.** The canvas inlined SVGs whose paths are `fill="#000"` mask art, so they drew black.
  `FindingMark` masks them in the app, so the app was already correct and only the drawing was wrong.
- **Climb, carried over from R2 (2a):** on the yours rung, the name, the role label and the Allowances rule name and count are
  `var(--fg)`. The ink stays on the mark, border and tint. Exhibition's contrast goes from 3.90 to 9.23 at its lowest (kaldheim).

---

## R1

**Canvas:** `The 99 - Brackets Sheet.dc.html` (3a, 3b, 2a, 1a, 1e). **Body component:** `Brackets Sheet.dc.html`
(`phone`, `unrolled`, `theme`).
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
