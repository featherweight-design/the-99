# Gap report: Social R2 PR A (the other-ways press, the Shopping key's spare item)

Design table: `docs/superpowers/design-tables/social-r2-spares-markers.md` (the line-2 press of the foil addendum, #1875).
Agent 2 (verify) reported 3 visual gaps and 2 state gaps. Two visual gaps were fixed; the rest are kept, each with its reason.

## Fixed

1. **Phone hit width** (`spare-markers.tsx`). The press sat in a `min-w-[44px]` hit, which added up to 6px each side of a
   press narrower than 44px and widened the gap to the buy tag. The hit keeps its 44px height and is now as wide as the
   press it draws.
2. **Pressed state** (`spare-markers.tsx`). An `--elevated` fill and a dashed outline were carried over from S3's
   superseded marker. #1875 draws no pressed state on the new row; the fill is gone, and `aria-expanded` still says the
   modal is open.

## Kept

1. **The gap between the press and the buy tag** is the row shell's own (9px on the phone, 10px from md, `ROW_GAP`), not
   the 6px of an action group. The two-line row (foil PR 2, #1886) places ⇄ and the tag as siblings in the shell, and
   that layout is its PR's to change, not this one's. Every item on line 2 shares the one gap.
2. **The key item's type** is the shipped `ITEM` style (10.5px, 7px gap), which every item in the grid takes, where the
   desktop board draws 11.5px with a 6px gap. One grid, one item style (foil PR 2 built the grid).
3. **All rows draw the press** for a spare (decklist-row.tsx, `tag === "buy"`). #1875's D2 and D6 frames leave it off;
   its text and Social S4 put it on All's missing rows, and d9 ruled to follow the text (call 2). Recorded in the PR's
   `## Settled`.
4. **A spare unshared mid-visit stays drawn until the next load.** The provider reads once per set of cards, and the
   spares-only modal draws that read. Spares are view-only and the stand-ins modal re-reads its own card, so the cost is
   one stale glyph; a re-read on every open would put a request behind each press.

## PR B (the cart, S5)

Checked against the table's cart section: the glyph-only press before each line's buy tag, the spares-only modal
(hosted inside the cart's card-detail provider, which its card name opens), the key item beside the view switch in
either view, and nothing at all with the switch off. No gaps. The contact sheet is
`docs/superpowers/inventories/social-r2-spares-cart.json`, at 390 and 1300.
