# Card rows addendum L1 · one line

Fast follow to the foil mark addendum's two-line card row (#1886). Hugh's verdict live: the information is worth having, but two lines read empty on desktop for a light row. This addendum puts the deck page's card row back on one 34px line from `md` (768px) up, in All and Shopping, and makes it hold the busiest real row.

Canvas: https://claude.ai/artifact/DMQXF285UCEH5P8ntK7aGH (private to Hugh until shared). **Approved by Hugh 2026-10-16.**

## Boards

| Board | What it shows |
|---|---|
| `Main.dc.html` | The calls, row anatomy per view, the brief's four directions with verdicts, engineering, gaps |
| `DropOrder.dc.html` | D1: drop order per view, heavy row at 582 / 400 / 340 and a light row at 340, the +N tooltip, hover preview |
| `All-1300.dc.html` / `All-900.dc.html` | A1 / A2: the shipped deck page, All, two-column grid, one-line rows |
| `Shopping-1300.dc.html` / `Shopping-900.dc.html` | S1 / S2: the same page on Shopping |
| `Phone-390.dc.html` | P1: phone All and Shopping (option B), unchanged except All loses the press |

## Calls

- **L1** One line from `md` up in All and Shopping, 34px, shipped one-line metrics. `TWO_MD`, `TWO_LG`, `TWO_SHELLS` retire, and so does Shopping's `md`–`lg` legacy band.
- **L2** Per-view lead. All: left run, slot, pips (72), ✕. Shopping: left run, marker, press, buy tag (84), ✕. All has no other-ways press at any width; Shopping has no pips and no EDHREC figure.
- **L3** Drop order by the row's own column width: wide ≥480, middle 360–479, tight <360. The name ellipsizes; nothing else shrinks.
  - All: 4th+ mark → +N at every width; middle: marks after the first → +N; tight: all marks → +N, marker word → glyph (+ count).
  - Shopping: middle: all marks → +N, marker word → glyph; tight: +N drops too.
  - Never fold: ownership/glint, name, `//`, `×N`, pips and ✕ (All); marker glyph, press, buy tag and ✕ (Shopping).
- **L4** +N: bare mono 11px in `--fact`, no box or hit area. Fine pointer: FactTooltip lists the folded marks. Press: the row's own press (card details). Folded marks stay in the spoken label.
- **L5** The glint takes the filled ownership dot's place on one-line rows (direction 3a), centred on the 8px slot. Only where the dot would be filled; dashed or proxied rows draw no glint. Phone keeps the shipped placement under the dot.
- **L6** Fixed right-hand columns (direction 4). Marker, press and All's collapsed price flow left of them.
- **L7** Full name on hover is the shipped hover preview (240ms, 252×352). No name tooltip.
- **L8** The 26px press takes `-my-[3px]` so a row holding it stays 34px.
- **L9** Unchanged: over-limit outline and key item, both keys, stepper rows, read-only precon rows, removal / I got it slots (34px on desktop again).
- **L10** Phone stays as shipped (52px All row, option B Shopping), except All loses the press.

L2 and L10's "All has no press" is Hugh's ruling (2026-10-16).

Directions not taken: availability folded into the buy tag (3c; the buy plate is the I got it press). Drawn for Hugh's call: the glint after the name (3b; recommended against).

## Engineering

- `src/components/decks/decklist-row.tsx`: delete the two-line slot tables and shells; from `md` both views use the one-line shell; `ROW_SHELL_SHOPPING`'s `lg` becomes `md`; `PHONE_B` stays below `md`.
- Grid cell becomes `@container`; folds use `@max-[479px]:` and `@max-[359px]:` on marks, three +N spans and the marker word.
- `OtherWaysPress` only `inShopping`; desktop pip track only outside Shopping.
- Ownership slot draws `FoilGlint` instead of a filled `OwnershipDot` for foil rows.
- `AvailabilityMarker` gets a way to hide its word, keeping glyph, count, tooltip and spoken label.
- Update `docs/superpowers/inventories/foil-row.json` for one line at 900 and 1300.

## Gaps

- **L-G1** Combo mark: the combo data exists; wiring it onto deck rows is an engineering task, not a design gap (Hugh, 2026-10-16).
- **L-G2** All carries no other-ways press: ruled by Hugh 2026-10-16, Shopping only until feedback says otherwise.
- **L-G3** Tight tier marker is glyph-only; word stays in tooltip and spoken label.
- **L-G4** Tier widths measured on fixtures; confirm on staging's longest names.
- **L-G5** Fixture marks are illustrative.

Canvas images use the canvas asset store (`/_blob/…`); `art/captain-america.jpg` is the same crop for the handoff.
