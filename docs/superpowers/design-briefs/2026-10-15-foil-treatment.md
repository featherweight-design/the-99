# Brief: a foil treatment on card tiles

2026-10-15. Hugh wants foil cards to read as foil in tile view, with a sheen over the art. He wants it most noticeable on the Marvel Collector's Edition precons, where every card is foil.

This is a cosmetic change, so it gets no About entry (decided below). It is grounded in the code on `main` and in read-only counts from staging.

## The problem

Every tile in the app draws a foil card exactly as it draws a plain one. The only foil signals today are words:
- Collection's quantity line: `×2 foil`, `×3 · 1 foil` (`collection.ts`, `entryQtyAllFoil` / `entryQtyMixed`).
- A precon's read-only list: `SET 123 · foil` (`decklist-row.tsx`, `printedFoil`, #1709).

A Collector's Edition precon is all foil. Its box is the reason people buy it, and the app draws it as a grid of matte cards.

## Where "this copy is foil" is known, per tile

This decides which tiles CAN carry the treatment. It differs by surface.

| Surface | Component | Knows foil? | From |
|---|---|---|---|
| Collection grid | `components/collection/grid-view.tsx` | **Yes**, per printing: `finishes` counts, e.g. `{nonfoil: 3, foil: 1}` (`lib/collection/browse.ts`) | `collection_items.finish` (`nonfoil` / `foil` / `etched`) |
| A precon's read-only list and tiles | `read-only-card-tile.tsx`, `precons/open-precon-view.tsx` | **Yes**, for the edition shown: `printedFoil` | `precon_cards.foil_quantity` (MTGJSON's `isFoil`) |
| A deck's Card view | `deck-card-tile.tsx` | **No.** `deck_printings` stores a pinned printing's `set_code` and `collector_number`, with no finish | none today |
| A deck's tokens | `token-tile.tsx` | **No.** `token_printing_holdings` names a printing, with no finish | none today |
| Suggestion tiles | `suggestion-tile.tsx` | Not applicable: a suggestion is a card you may not own | none |

**The deck Card view is the gap that matters.** A deck started from a Collector's Edition with "I own this precon" puts 100 foil copies in the collection (the add writes each copy at its own finish), then pins the deck to the box's printings. But a pin names a printing, not a finish. The tile cannot tell "the foil copy I own" from "this printing".

Engineering's answer, not Design's: a deck tile is foil when every copy the player owns of its pinned printing is foil. For a CE start that is exactly right. For a printing held in both finishes it is a rule Design should see (open question 6). No schema change is needed, and the claim model is untouched: this is read beside the chain that already picks the art (`lib/decks/printings.ts`, `selectCollectionRows`).

**Etched** is a third finish in `collection_items`. Staging holds 0 etched rows today. It is real on Scryfall (some Commander Legends and Collector's Edition printings) and is drawn differently in print: a matte, metallic frame, not a rainbow sheen.

## Staging, read-only (2026-10-15)

- **Collector's Edition boxes:** every one is 100 of 100 foil. The Marvel set (MSC) has Avengers Assemble, Doom Prevails, The Fantastic Four and Wakanda Forever Collector's Editions, at 80 to 91 distinct foil rows each. The fixture to draw is **Avengers Assemble Collector's Edition (MSC)**: 100 cards, all foil, 90 distinct.
- **Collection:** Hugh's account holds 2,995 distinct cards, 4,616 copies. 142 cards are foil (186 copies), 0 are etched. On a 200-tile Collection window that is **about 10 foil tiles** on average, so most screens show a few.
- **His decks today:** at most 12 of 99 cards have any foil copy in the collection ("HD - Avatar Aang"). A started CE deck would be **100 of 100**: that is the case Hugh means, and the one the paint budget is set by.

## Tile surfaces that draw card art

- **Deck Card view** (`deck-card-tile.tsx`): up to about 100 tiles. The art is a `FadingImg` (`ui/hydrated-art.tsx`), with a 1px inset ring drawn OVER it as a sibling span (`rounded-[inherit]`).
- **Collection grid** (`collection/grid-view.tsx`): a 200-card first window, revealed in batches. The art is `HydratedImg`, with the same ring span over it. The first 4 tiles are eager (`GRID_EAGER_TILES`).
- **Precon open view** (`read-only-card-tile.tsx`): 100 tiles, `HydratedImg` plus the ring.
- **Tokens** (`token-tile.tsx`): a handful per deck, `HydratedImg` plus the ring.

So the overlay's home is the **ring span every tile already draws over its art**, or a sibling of it. That span is one absolutely positioned element per tile, already composited above the image. No new image is needed.

The art-fade primitive (`ui/art-layer.tsx` `ArtLayer`, wrapping `ArrivingArt` in `ui/art-wash-near.tsx`) is used for background-art thumbs and plates, not for these img tiles. Its arrival matters here only so far as a sheen should not paint before the art does (see States).

## Constraints the treatment inherits

- **The Scryfall corner matte.** `normal` images are JPEGs, and the area outside the card's rounded corner is a painted matte: white on some printings, black on others. Any box drawing a full card image needs `border-radius` ≥ **3.1% of its rendered width** on every corner nothing else clips. An overlay must inherit the tile's radius (`rounded-[inherit]`, as the ring does). A square-cornered sheen would paint over the matte notch and show it.
- **Reduced motion** (`prefers-reduced-motion: reduce`, `globals.css` around line 1069): every app animation is listed there and stops. A foil sheen in motion must join that list and become static.
- **Reduced transparency** (`prefers-reduced-transparency: reduce`, around line 1172): the art wash already lowers itself there. A translucent sheen should do the same: lower, or fall back to a non-translucent mark (open question 4).
- **Forced colors:** the system owns the palette, so the overlay should drop out entirely, as the wash's rule beside it does.

## Locked (do not reopen)

- **Only copies that are actually foil get it.** That means a foil (or etched) row in the collection, a precon edition's foil copy, or a deck tile whose pinned printing the player owns only in foil. Never "this printing exists in foil". Never on a suggestion, a commander you do not own, or a card in a draft you do not hold.
- **No new image downloads.** The sheen is drawn over the art already loaded: CSS gradients and blend modes, no second texture image per tile.
- **Reduced motion means static.** If the treatment moves, it stops.
- **It holds on a 200-tile grid.** A Collection window or a fully foil CE deck must scroll with no jank on a mid-range phone. In practice:
  - no per-tile JavaScript animation loop;
  - no per-tile `filter` or `backdrop-filter`;
  - motion, if any, is compositor-only (`transform` or `opacity` of the overlay) and limited to tiles on screen.
  - Engineering proves it with `pnpm measure:load` on deployed staging, slow profile, Collection and a CE deck, before and after.
- **No change to what a tile says.** The `· foil` label and the quantity line stay. The sheen adds to them; it never replaces a word.

## Open for Design to call

1. **Static or animated.** A fixed angled highlight, or a sheen that moves: on a slow loop, or once on arrival. Hugh asked for "noticeable"; the CE grid is 100 foil tiles at once, where constant motion is a lot.
2. **Hover and tilt on desktop.** A sheen that follows the pointer or tilts the card on hover, as foil reads in hand. Only the hovered tile would animate, which is cheap.
3. **Phone.** There is no hover. Options: static only, a sheen on scroll into view, or one that follows device tilt (that needs a motion permission prompt on iOS, likely ruling it out).
4. **Intensity per theme.** Six themes (`project_theme_system_run`), light and dark grounds. One rainbow gradient will read loud on some and vanish on others. Is the sheen tuned per theme, and what is the reduced-transparency fallback (a thin foil edge, or a small mark)?
5. **Etched against foil.** Draw etched differently (a cooler, flatter metallic band, as printed), or the same, or not at all until staging holds an etched copy (0 today)?
6. **A printing held in both finishes.** On the Collection grid, a tile holding `×3 · 1 foil` is one tile for one printing. Does a mixed tile get the sheen, a partial one (one corner, a strip), or none? On a deck tile, the rule above gives the sheen only when every owned copy is foil. Agree that, or prefer "any".
7. **Where else.** Card details, the zoom and the hover preview draw one card large. They are outside this brief unless Design wants them. A sheen at full size is a different, richer drawing.

## States to draw

- A foil tile at rest, at desktop and phone width, on a dark and a light theme.
- A foil tile hovered (desktop), if hover is chosen.
- An etched tile, if drawn differently.
- A mixed-finish Collection tile (`×3 · 1 foil`).
- A full CE deck: 100 foil tiles, in a screenful at 1300 and at 390. This is the busiest case and the one Hugh named.
- A Collection screen with about 10 foils among 200: the common case.
- Reduced motion: static.
- Reduced transparency: lowered or the fallback mark.
- Forced colors: no overlay.
- Art still arriving: the sheen waits for the art, so it never paints over the sunken ground of a tile still loading.
- No art (`noArt`, the text tile): no sheen.
- A pinned printing the player no longer owns in foil: no sheen.

## About entry

**None.** This restyles surfaces the reader already knows and adds no capability. It is the card-captions case on record (Hugh, 2026-09-15): a cosmetic change owes no entry and no version bump. If Design wants it mentioned, it is an ordinary edit to an existing entry that covers that surface (`decklist-marks`, `browse` or `precons`) at the next version, never a new entry. Hugh may overrule.
