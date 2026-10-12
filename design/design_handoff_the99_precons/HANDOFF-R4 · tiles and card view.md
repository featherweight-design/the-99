# Commander precons, R4 addendum: tiles and Card view

**Status: R1, for review (Hugh).** Canvas `The 99 - Precons R4 · Tiles and Grid.dc.html` (C0, T1–T4, G0–G1, each at 900 and 390). Frame `Precons Tiles.dc.html` (`scene`, `phone`, `theme`). STATES §T and §G. Copy `precons-tiles · copy strings.ts`.

**Parent:** R2 (list, open precon) and R3 (built-from link), which stand. R4 adds a view to each surface and changes nothing else. Rulings (Hugh, 2026-10-12): add a tile view of all precons; tiles are likely the default; an open precon gets a grid of its cards, like a deck's card view.

**Gated by `PRECONS_ENABLED`.** No new switch, no About entry, no `ABOUT_VERSION` bump. One key line in `about · precons.ts` changes, because the default changed.

---

## 1 · Default: tiles

**Recommendation: tiles are the default.**
- The list is for browsing, and a precon is known by its face commander. The commander's card names it, shows its colors and its art.
- Rows read more per screen: about 6 rows at 390 against 4 tiles (two 2-up rows). That is why rows stay one press away and are remembered per browser.
- Most owned works the same in both views. The figure is on every tile.

## 2 · The switch

- **The shipped `ViewToggle` well** (`ui/view-toggle.tsx`): `≣` Rows, `▦` Tiles, in that order, as /collection's Rows · Grid and the deck's List · Card.
- **Not /decks' `Tiles · Stats`.** That is a text switch between two different reads of your decks. This is one list drawn two ways, which is the job the well already does.
- **900:** in the wide chassis, after sort (`ml-[2px]`, as /collection). The chassis is search · pips · sort · well.
- **390:** on the search row, to the right of the search field, where /collection's compact bar puts it. The second row keeps pips and sort, so neither row overflows at 358px.
- **State:** `?view=rows` in the URL (Tiles is the default, so it isn't written), mirrored as `q`, `colour` and `sort` are. Stored per browser as `the99:precons:view`, beside `the99:precons:order`.
- **Names:** spoken, never drawn: `Rows view`, `Tiles view` (placeholders).

## 3 · The tile (`PreconTile`)

`DeckCardTile`'s anatomy with nothing new invented: `TILE_SHELL`, `TILE_ART_RATIO`, `TILE_ART_CLIP`, and `CardTileCaption` with `nameSub`. Nothing is drawn over the art. The whole tile is the link to the precon, through the name stretched over it as in `PreconRow`.

- **Art:** the first commander's full card (`imageUri`, Scryfall `normal`), loaded lazily, `object-cover`, with the 1px inner edge. The card prints the commander's name, so the caption doesn't repeat it. The commander is still spoken in the link's name.
- **Matte:** the shell's 9/10px radius, with the art box's bottom corners clipped by `TILE_ART_CLIP`. At 390 the art is 174px wide (3.1% = 5.4px). At 900 it's 205px (6.4px). Both clear.
- **Caption (three lines, `CARD_TILE_CAPTION_SUB_H`, 70/65):**
  - meta: `you own` in `--fg-faint`, then `31 of 66` 600 `--fg`;
  - name: the precon's name, truncated as shipped, never wrapped;
  - sub: the identity pips, 8px at 390 and 9px at 900, then `SET · Mon YYYY` in `--fg-faint`.
- **No bar, no verdict word, no status colour** on the figure. 88 of 88 and 18 of 67 are drawn the same way.
- **Foot:** only drawn when present. It carries the row's own extra lines, in the row's order. It's a 1px `--border` top rule, then one line each:
  - **a deck** (R2 R2/R6, R3 K9): the deck name in 12/11.5 `--fg`, underlined at 55% `--accent`, which opens the deck; under it, mono 9.5 `--fg-muted` `built from this · 73 shared` (linked) or `84 shared`. Linked decks come first, one line per deck. Min-height 44 at 390, 34 at 900.
  - **twin:** mono 9.5 `--fg-faint` `also sold as a Collector's Edition`.
  - **unmapped:** mono 9.5 `--fg-faint` `1 card not in our catalog yet` (R5).
- **Row heights:** the grid stretches each tile to its row. Art and caption line up across every row, and only the foot differs.

## 4 · Twins and partners

- **Twin:** one tile for both editions, under the plain edition's name, with the twin foot. Search matches either name, and the twin URL redirects (R2 call 4). Applies to all 16 twins.
- **Partners (5 precons):** both commanders' cards in the one 63:88 box, staggered. The first is top-left, the second bottom-right, each 66% of the box's width, on the `--surface-sunken` plate. The second has a 1px `--surface-sunken` outline where it overlaps the first.
  - Each card rounds at 5px. That's at least 3.1% of a 135px card at 900 (4.2px) and of 115px at 390 (3.6px).
  - The caption is unchanged. The link's name says both commanders.
- **Missing art:** the plate prints the commander's name, 12.5 `--fg-muted`, over mono 9 `--fg-locked` `no card image yet`. The image would have carried the name. A partner with one image missing draws the plate in that card's place.

## 5 · Density and what sits above

- **900:** 4 columns, gap 12, padding 18 22 8. Tiles are 205px.
- **390:** 2 columns, gap 10, padding 16 16 24. Tiles are 174px. A 3-up grid (115px) can't hold `you own 31 of 66` and a precon name on one line each.
- **Above the grid:** the header, the chassis, the result line and the empty band (L2), all as R2. The year heads stay in Newest and drop in Most owned, as with rows.
- **Loading:** skeleton tiles (`TILE_SHELL` on `--surface-sunken`), four per year at 900 and two at 390, in place of R2 L5's skeleton rails.

## 6 · The open precon in Card view

- **Default: List** (R2, as shipped).
  - On the list you are choosing among 197. Here you have chosen, and the page's job is which of its cards you own.
  - 100 cards as tiles is about six screens at 900. The 2-column rows hold them in two.
  - Card view is one press away. It's stored per browser as `the99:precons:openView`, separate from the deck page's stored view: one is a reading choice and the other a building one.
- **The switch:** the deck page's `ViewToggle` (`≣` List view · `▦` Card view, `viewToggleCopy.deck`), at the right end of the list-note line under the own box.
  - The header, `Start a deck from this`, R3's `Link a deck`, the own box and its `Unlink` all sit above the switch, so nothing moves between views.
  - At 390 the dock is unchanged.
- **The grid:** `DeckCardTile`'s read-only form, in the same groups as the list (`DecklistGroup` headers, counts and notes unchanged). Commander or Commanders first, then the types, A–Z within each.
  - 4-up at 900, 2-up at 390, the list's tile sizes.
- **The read-only tile** draws only what the list row draws:
  - **meta:** the ownership dot (filled `--success`, or dashed 1px `--fg-faint`). When the card isn't owned, the words `not owned` follow in mono `--fg-faint`. The read-only tile has no buy tag to carry it, and a lone 8px dot is too quiet at tile density.
  - **name:** as shipped.
  - **nameSub:** the precon's printing, `CMM 312`.
  - **Absent:** the `✕` column, buy tag, availability chip, proxy mark, lock and draft edge.
  - **Kept:** the hover preview (desktop) and card details on press, on the precon's printing (O6).
  - No dimming and no verdict.
- **Basics:** one tile per basic name, at the foot of Lands, after the other lands.
  - A dashed 1px `--border-dashed` shell, no fill and no dot.
  - meta: `×15` `--fg-body` and `basic · not counted`.
  - The art is the first printing's, and the nameSub is `CMM · first of 3 arts`.
  - It is one tile, not one per art, because `byCard` merges by oracle id. The count of arts needs `byCard` to keep the printings it merges (gap G-R4-2).
  - Lands' count and note are unchanged: `41` · `you own 22 of 26 · 15 basics not counted`.
- **Partners:** the Commanders group holds two tiles, with the note `you own both`, `you own neither` or `you own 1 of 2` (V2).

## Gaps for Hugh

- **G-R4-1 · counts.** This round uses Hugh's figures: 197 rows and 16 twins. The brief's measurement was 197 listed, 12 twins and 185 rows. The page draws `rows.length` either way. The year counts are R2's (illustrative).
- **G-R4-2 · arts.** `first of 3 arts` needs the art count per basic, which `byCard` drops today. Otherwise the sub reads `CMM 287` like any other card.
- **G-R4-3 · About specimen.** The entry's specimen is `PreconRow`. With tiles as the default, `PreconTile` might be the better specimen. The key line is updated either way.
- **G-R4-4 · rows default.** If Hugh prefers rows as the default, nothing else changes: the stored key, the URL value (`?view=tiles`) and the About line flip.

## Not done

- Not drawn: loading skeleton tiles, the unmapped foot, the no-match and feed-unavailable states over tiles (as R2 L3/L4, whose bodies don't change with the view), and Most owned in tiles.
- Drawn in Kaldheim only.
