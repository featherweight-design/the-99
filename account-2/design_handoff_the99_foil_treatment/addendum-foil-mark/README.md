# Addendum M1 · The foil mark (R3)

Hugh's brief, 2026-10-15. A small, subtle "this copy is foil" mark on card tiles and card rows, which today show foil
only through the film (invisible in list views, at a glance and in forced colours). Builds on this folder's R1 and R2
and on the shipped C2 film and slower sweep. **The foil rule is closed**: a card is foil when every owned copy of the
printing it draws is foil, with etched as its own finish (`soleFoilFinish`, `lib/collection/browse.ts`; precons read
`card.printedFoil`).

R2 (after Hugh's audit): the glint moves beside the ownership indicator, Collector's Edition keeps it, the precon list
row swaps its printed word for it, and every row is redrawn in Social R2's approved layouts.

R3 (Hugh): All and Shopping share ONE two-line card row at both widths. Line 1: dot, glint, name, `//`, `×N`, the fact
marks (Game Changer, tutor, …), ✕. Line 2, indented under the name: pips and the EDHREC figure, then in use or short,
the one other-ways press (⇄ and the spare glyph) and the buy tag. This is Social R2's phone option B with the fact
marks moved up to line 1, carried to desktop and to All, so no mark can squeeze the name.

Canvas: https://claude.ai/artifact/Y3hffxW2QUfLXAH97g5RsD (boards `M-*`, bottom row, under "Foil mark addendum").

| Read | For |
|---|---|
| `M-Main.dc.html` | The calls, six themes, forced colours, the busy row, part-foil, strings, engineering, gaps. Start here. |
| `M-Collection-Desktop.dc.html` | 1300: C1 grid (with the tooltip), C2 list. |
| `M-Collection-Phone.dc.html` | 390: C3 grid, C4 list, C5 the tile caption at 3×. |
| `M-Deck-Desktop.dc.html` | 1300: D1 Card view, D2 List, D3 Shopping (Social R2 spare marker), D4 precon Collector's Edition, D4b precon list. |
| `M-Deck-Phone.dc.html` | 390: D5 Card view, D6 List, D7 Shopping (Social R2 option B), D8 precon. |
| `STATES-foil-mark.md` | The rule as a table. |
| `foil-mark · copy strings.ts` | Proposed strings for `/copy-review`. |
| `art/` | The card images the boards use. |

Drawn over the shipped pages, Kamigawa theme. Dashed pink outlines mark what this addendum adds; they are annotation.

## Calls

1. **The mark is a glint**: a four-point star, solid, no outline, from the card-mark family's form rules (bare, solid
   mass, no motion, absent when it has nothing to say). Path, viewBox 16:
   `M8 .5C9.2 4.9 11.1 6.8 15.5 8C11.1 9.2 9.2 11.1 8 15.5C6.8 11.1 4.9 9.2 .5 8C4.9 6.8 6.8 4.9 8 .5Z`
2. **Its ink is the film's own colours**, a 135° gradient: foil `#FF8CC6 24%, #FFD66E 38%, #8FEBD2 50%, #8CB4FF 62%,
   #C79BFF 76%`; etched (silver) `#AEBCCD 26%, #F3F7FB 50%, #B7C5D5 74%`. No glow, no filter, no motion.
3. **12px everywhere.**
4. **It sits beside the ownership indicator** (R2, Hugh), so it reads with "you own this" and never among the Game
   Changer and tutor marks. Deck tile, precon tile, decklist and Shopping rows: right after the dot, `● ✦`, one
   `flex-none` group. Collection list rows: in the count column, `×2 ✦`. Collection grid tile (no dot, every tile is
   owned): first on the meta line, before the in-use chip and the facts. No new column; every name keeps its full
   width. Where a deck tile's meta line overflows, the shipped truncation order holds (audit F8): the fact marks drop
   whole, the glint never does.
5. **Etched is its own variant**: the same glint in silver, spoken and keyed apart.
6. **Part-foil shows nothing.** Same as the film. Card details already spells it out (`×3 · 1 foil`).
7. **Themes**: one recipe, six themes. Weakest: `#C79BFF` on kaldheim `--elevated-hover` `#212229`, 7.2:1; silver 8.2:1.
8. **Forced colours**: `fill: CanvasText`. Reduced transparency: unchanged.
9. **Collector's Edition keeps the glint** (R2, Hugh): one rule everywhere, and List view and forced colours have no film.
10. **Precon list rows swap the printed `· foil` for the glint** (R2, Hugh): `● ✦ … MSC 4`.
11. **Key**: `foil` and `etched` join `CollectionMarkKey` unconditionally. On a deck, its Shopping view and a precon they
    follow the cards in view.
12. **Tooltip** through the same `FactTooltip` chrome (pointer-fine, 400ms in, instant out). Enhancement only.
13. **Card rows are two lines in All and Shopping, at both widths** (R3, Hugh). Line 1: dot, glint, name, `//`, `×N`,
    fact marks, ✕. Line 2: pips · figure, then in use / short, the other-ways press, the buy tag. The name wraps on the
    phone and ellipsizes on desktop, but no mark shares its line except the facts that follow it. On the phone, when
    line 2 holds short, the press and the buy tag at once, the word `edhrec` drops and the figure stays. Desktop rows
    grow from 34px to about 60px. The glint appears in Shopping only where the card is owned and still listed.
14. **About**: none. Cosmetic, per the foil handoff's own ruling.

## Engineering

- New `FoilMark` (`cards/foil-mark.tsx`): one inline SVG drawn at 12px, the path above, `fill: url(#id)` from a
  `linearGradient` (x1 0 y1 0 x2 1 y2 1), unique id per instance (`useId`). `@media (forced-colors: active)`:
  `fill: CanvasText`. Takes `finish` and `silent`, like `CardFactMark`.
- `collection/grid-view.tsx`: first child of the marks line, before the availability chip and facts, when `c.foil`;
  `nameSpoken` gains the clause.
- `collection/rows-view.tsx`: in the count cell after `×N` (desktop and phone); the row's `aria-label` gains the clause.
- `decks/deck-card-tile.tsx`: right after the ownership dot on the meta line (`card.foil`), `flex-none`.
- `decks/decklist-row.tsx` (R3): the row becomes two lines at every width, All and Shopping alike. Social R2's phone
  option B form is used from `md` up too, with the fact marks joining the name line. Line 2 takes the pips, the
  figure, in use / short, the other-ways press and the buy tag. The glint goes right after the ownership dot, before
  the name, in one `flex-none` group. `readOnly` rows drop the printed
  `· {preconsCopy.open.edition.foil}` and draw the glint from `card.printedFoil`.
- `decks/read-only-card-tile.tsx`: right after the dot, `card.printedFoil`.
- Keys: `CollectionMarkKey` two unconditional entries; `decklist.tsx`, the Shopping view and the precon view's key:
  entries when a card in view has that finish.

## Gaps

- **M1** The gradient is a first for a mark. If Hugh wants one flat ink instead, the fallback is the glint in
  `--fg-body` (drawn on M-Main); shape and placement don't change.
- **M2** Closed (Hugh, R2): Collector's Edition tiles keep the glint.
- **M3** Etched has 0 rows on staging, so the silver glint is unseen on real data, like the film's G6.
- **M4** Closed (Hugh, R2): the precon list row swaps `· foil` for the glint.
- **M5** Not drawn: tokens (no finish recorded), suggestion and Consider tiles (never foil), the Add panel's search
  rows, card details (already says it).
- **M6** Closed (Hugh, R3): the busiest Shopping row's squeezed name is answered by the two-line row, not a name floor.
- **M7** The two-line row makes the desktop All list nearly twice as long (about 60px rows against 34px, two columns).
  The precon's read-only list rows stay one line: they carry only the name, pips and printing, and nothing squeezes them.
