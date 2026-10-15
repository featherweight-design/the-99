# Addendum M1 · The foil mark (R2)

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
4. **It sits beside the ownership indicator** (R2, Hugh), so it reads with "you own this" and never among the Game
   Changer and tutor marks. Deck tile, precon tile, decklist and Shopping rows (Social R2's layouts included): right
   after the dot, , one  group. Collection list rows: in the count column, . Collection grid tile
   (no dot, every tile is owned): first on the meta line, before the in-use chip and the facts. No new column; every
   name keeps its full width. Where a deck tile's meta line overflows, the shipped truncation order holds (F8): the
   fact marks drop whole, the glint never does.
5. **Etched is its own variant**: the same glint in silver, spoken and keyed apart.
6. **Part-foil shows nothing.** Same as the film. Card details already spells it out (`×3 · 1 foil`).
7. **Themes**: one recipe, six themes. Weakest measured: `#C79BFF` on kaldheim `--elevated-hover` `#212229`, 7.2:1;
   silver's weakest 8.2:1.
8. **Forced colours**: `fill: CanvasText`. The film is off there, so the glint is the one foil cue left.
   Reduced transparency: unchanged (it is opaque).
9. **Collector's Edition keeps the glint** (R2, Hugh): one rule everywhere, and List view and forced colours have no film.
10. **Precon list rows swap the printed  for the glint** (R2, Hugh): .
11. **Key**: `foil` and `etched` join `CollectionMarkKey` unconditionally (like the fact entries). On a deck and a precon
   they follow the cards in view, like the deck key's other entries. Shopping's own key is unchanged.
12. **Tooltip** through the same `FactTooltip` chrome (pointer-fine, 400ms in, instant out). Enhancement only: the key
    and the spoken clause carry it.
13. **Shopping** is the decklist row, drawn in Social R2's layout (desktop: spare marker beside buy; phone: option B).
    The glint appears only where the card is owned and still listed (copies sleeved elsewhere).
14. **About**: none. Cosmetic, per the foil handoff's own ruling; if Hugh wants one it is an edit to the foil entry.

## Engineering

- New  (): one inline SVG drawn at 12px, the path above,  from a
   (x1 0 y1 0 x2 1 y2 1), unique id per instance (). :
  . Takes  and , like .
- : first child of the marks line, before the availability chip and facts, when ;
   gains the clause.
- : in the count cell after  (desktop and phone); the row's  gains the clause.
- : right after the ownership dot on the meta line (), .
- : right after the ownership dot, before the name block, in one  group, in every
  branch (desktop, phone, Shopping, and Social R2's option B row when it ships).  rows drop the printed
   and draw the glint from .
- : right after the dot, .
- Keys:  two unconditional entries; , the Shopping view and the precon view's key:
  entries when a card in view has that finish.

## Gaps

- **M1** The gradient is a first for a mark. If Hugh wants one flat ink instead, the fallback is the glint in
   (drawn on M-Main); shape and placement don't change.
- **M2** Closed (Hugh, R2): Collector's Edition tiles keep the glint.
- **M3** Etched has 0 rows on staging, so the silver glint is unseen on real data, like the film's G6.
- **M4** Closed (Hugh, R2): the precon list row swaps  for the glint.
- **M5** Not drawn: tokens (no finish recorded), suggestion and Consider tiles (never foil), the Add panel's search
  rows, card details (already says it).
- **M6** The busiest desktop Shopping row (a 590px column at 1300) squeezes the name to one letter once Social R2's
  spare marker joins every other mark, glint or not. Proposed:  on the name, and the fact marks become
  the deck tile's wrapping, clipping group (audit F8) so a mark that does not fit drops whole; dropped marks stay in the
  row's label. Hugh's call: it touches the row beyond the glint.
