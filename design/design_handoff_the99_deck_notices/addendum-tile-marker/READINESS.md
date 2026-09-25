# Readiness — tile marker addendum

## For Hugh

1. **Data notices in `--fact`, not red.** Drawn so a list change doesn't read as a broken deck. Red for both
   is a one-line change (and one key entry).
2. **The key line on /decks, at both widths.** The mark ships glossed, the way the card marks were. It's drawn
   only when a shown tile has a mark.
3. **Read legality keeps its red mark on the tile** (no dot state at 18px). The header still shows read vs
   unread.

## For engineering

1. The mark sits above the tile's overlay link so it can be hovered; its click forwards to the deck (§2).
2. `NoticeSummary` carries the unread data count beside a legality kind, for the spoken name and the *both*
   tooltip.
3. `DecksMarkKey` reads `shown`, not `decks`, so a filter that hides every marked tile removes the line.
4. Re-measure the yield with `probe:notices-tile`. Expected to fall under the 330 floor, so `YIELD` would be
   deleted (§5).
5. `status-style.test.ts`: add the mark's glyph on its tint at ≥ 3:1 (graphic), both inks.
