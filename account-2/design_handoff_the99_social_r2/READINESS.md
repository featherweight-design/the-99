# READINESS — Social R2 (the wishlist, and friends' spares)

**🟡 Round 3, for Hugh's audit** (round 3 boards are `R3 - *`). Every R2 state is drawn at both widths, empty states first, over the shipped pages Hugh
sent, with every board rendered and measured so none is cut off. Not green until Hugh approves (and picks the icon and
the word) and engineering confirms G1 to G4 and G7 are in the plan.

## Locks held

| Lock | How round 2 holds it |
|---|---|
| Card level, any printing | Tiles name the card; no printing chosen anywhere; one tile per card. |
| Wanted = copies in all | The stepper is the total; `want N · have N` reads against it. |
| Collected | Changed in round 3 at Hugh's direction: a collected card leaves the list, with a one-time strip (G5). |
| Works with no friends | Own switch and tab; no friends line, markers or friend pages (W1, WP1). |
| A friend's wishlist always visible | One quiet line says so; no toggle anywhere. |
| A friend sees card, wanted, collected; never owned | Friend tiles read `wants N` / `✓ collected`. |
| Spares view-only, per pod | A marker, a key item and a list of names, pods and counts; nothing to press but ✕. |
| A spare excludes drafts | The modal's foot line says "none of their decks uses, drafts included". |
| No borrowing, no cart change | Cart figure, buy tags and Mana Pool unchanged (S5). |
| No model calls, no About entry | Nothing typed reaches a prompt; no entry drawn. |
| Matches the shipped UI | Collection head, tabs and grid; card modal and sheet; Shopping key and rows; ModalChrome. |

## What engineering needs

- **G1** name, full card image and price for wishlist tiles (catalog join).
- **G2** one friend by public id, joined to the viewer's friendship.
- **G3** spare markers loaded after the page, uncached; absent on failure.
- **G4** Add to wishlist writes owned + 1.
- **G7** commander image focus applies to every face here.

## Audit first

1. The marker and its modal (S2, S3): quiet enough on a dense row, clear enough from the key.
2. Collection › Wishlist as a tab (W1, WP1).
3. Icon and word: bookmark and Collected are drawn; the options are on the main board.
