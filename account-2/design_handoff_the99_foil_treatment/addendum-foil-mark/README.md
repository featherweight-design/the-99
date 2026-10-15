# Addendum M1 · The foil mark

Hugh's brief, 2026-10-15. A small, subtle "this copy is foil" mark on card tiles and card rows, which today show foil
only through the film (invisible in list views, at a glance and in forced colours). Builds on this folder's R1 and R2
and on the shipped C2 film and slower sweep. **The foil rule is closed**: a card is foil when every owned copy of the
printing it draws is foil, with etched as its own finish (`soleFoilFinish`, `lib/collection/browse.ts`; precons read
`card.printedFoil`).

Canvas: https://claude.ai/artifact/Y3hffxW2QUfLXAH97g5RsD (boards `M-*`, bottom row, under "Foil mark addendum").

| Read | For |
|---|---|
| `M-Main.dc.html` | The calls, six themes, forced colours, the busy row, part-foil, strings, engineering, gaps. Start here. |
| `M-Collection-Desktop.dc.html` | 1300: C1 grid (with the tooltip), C2 list. |
| `M-Collection-Phone.dc.html` | 390: C3 grid, C4 list, C5 the tile name line at 3×. |
| `M-Deck-Desktop.dc.html` | 1300: D1 Card view, D2 List, D3 Shopping (busiest row), D4 precon Collector's Edition. |
| `M-Deck-Phone.dc.html` | 390: D5 Card view, D6 List, D7 Shopping, D8 precon. |
| `STATES-foil-mark.md` | The rule as a table. |
| `foil-mark · copy strings.ts` | Proposed strings for `/copy-review`. |
| `art/` | The card images the boards use. |

Drawn over the shipped pages, Kamigawa theme (the theme of Hugh's screenshots). Dashed pink outlines mark what this
addendum adds; they are annotation, not UI.

## Calls

1. **The mark is a glint**: a four-point star, solid, no outline, from the card-mark family's form rules (bare, solid
   mass, no motion, absent when it has nothing to say). Not a slot box: the box means a bracket fact about the card.
   Path, viewBox 16: `M8 .5C9.2 4.9 11.1 6.8 15.5 8C11.1 9.2 9.2 11.1 8 15.5C6.8 11.1 4.9 9.2 .5 8C4.9 6.8 6.8 4.9 8 .5Z`
2. **Its ink is the film's own colours**, a 135° gradient: foil `#FF8CC6 24%, #FFD66E 38%, #8FEBD2 50%, #8CB4FF 62%,
   #C79BFF 76%`; etched (silver) `#AEBCCD 26%, #F3F7FB 50%, #B7C5D5 74%`. The one mark that is not one flat ink, so it
   reads as the film shrunk to a glyph. No glow, no filter, no motion.
3. **12px everywhere.** It rides the 12–13px name line, like the combo glyph does.
4. **It ends the name**: after the name and its trail (`//`, `×N`), before any fact mark. On a tile that is the name
   line, so the meta line (dot, chip, $, count, lock, facts) never moves. On a row it sits in the name block. No new
   column, no row height change, no caption height change. `flex-none`: the name truncates first (costs 18px: 12 + 6 gap).
5. **Etched is its own variant**: the same glint in silver, spoken and keyed apart.
6. **Part-foil shows nothing.** Same as the film. Card details already spells it out (`×3 · 1 foil`).
7. **Themes**: one recipe, six themes. Weakest measured: `#C79BFF` on kaldheim `--elevated-hover` `#212229`, 7.2:1;
   silver's weakest 8.2:1.
8. **Forced colours**: `fill: CanvasText`. The film is off there, so the glint is the one foil cue left.
   Reduced transparency: unchanged (it is opaque).
9. **Key**: `foil` and `etched` join `CollectionMarkKey` unconditionally (like the fact entries). On a deck and a precon
   they follow the cards in view, like the deck key's other entries. Shopping's own key is unchanged.
10. **Tooltip** through the same `FactTooltip` chrome (pointer-fine, 400ms in, instant out). Enhancement only: the key
    and the spoken clause carry it.
11. **Shopping** is the decklist row component, so it follows. The glint appears only where the card is owned and still
    listed (copies sleeved elsewhere). On the busiest desktop row the name already truncates as shipped; with the glint
    it truncates 18px sooner. The full name stays in the row's label and card details.
12. **About**: none. Cosmetic, per the foil handoff's own ruling; if Hugh wants one it is an edit to the foil entry.

## Engineering

- New `FoilMark` (`cards/foil-mark.tsx`): one inline SVG drawn at 12px, the path above, `fill: url(#id)` from a
  `linearGradient` (x1 0 y1 0 x2 1 y2 1), unique id per instance (`useId`). `@media (forced-colors: active)`:
  `fill: CanvasText`. Takes `finish` and `silent`, like `CardFactMark`.
- `collection/grid-view.tsx`: `nameTrail` gains `FoilMark` after the count when `c.foil`; `nameSpoken` gains the clause.
- `collection/rows-view.tsx`: in the name cell, after the name, before the facts; the row's `aria-label` gains the clause.
- `decks/deck-card-tile.tsx`: `nameTrail` becomes `TwoFacedMark` then `FoilMark` (`card.foil`, the read the film uses).
- `decks/decklist-row.tsx`: after `quantityGlyph` / `fromGlyph`, before `factMarks`, in both name-block branches.
  Shopping follows. `readOnly` rows keep their printed `· foil` word (M4).
- `decks/read-only-card-tile.tsx`: name line, `card.printedFoil`.
- Keys: `CollectionMarkKey` two unconditional entries; `decklist.tsx` and the precon view's key: entries when a card in
  view has that finish.

## Gaps

- **M1** The gradient is a first for a mark. If Hugh wants one flat ink instead, the fallback is the glint in
  `--fg-body` (drawn on M-Main); shape and placement don't change.
- **M2** A precon Collector's Edition puts a glint on all 100 tiles beside a film that already says it. Option: precon
  tiles skip the glint when the edition switch says Collector's Edition. Drawn with the glint, as the brief asks.
- **M3** Etched has 0 rows on staging, so the silver glint is unseen on real data, like the film's G6.
- **M4** The precon list row already prints `MSC 4 · foil` after the printing (shipped). Left as is; could swap to the
  glint for one vocabulary. Hugh's call.
- **M5** Not drawn: tokens (no finish recorded), suggestion and Consider tiles (never foil), the Add panel's search
  rows, card details (already says it).
