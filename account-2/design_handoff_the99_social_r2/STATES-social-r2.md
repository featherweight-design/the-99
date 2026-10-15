# STATES — Social R2 (the wishlist, and friends' spares) · round 2

Frames are named on the boards: W (Wishlist), D (Details), P (Friend), S (Spares); phone frames add P (WP, DP, PP, SP).

## Placement and switches

| State | Drawn | Rule |
|---|---|---|
| Wishlist on | W1–W4, WP1–WP4 | Collection › Wishlist, fifth tab after History. No account-menu row. |
| Wishlist off | — | No tab, no Add to wishlist, `/collection/wishlist` and `/friends/[id]` not found. |
| Wishlist on, friends off or no friend | W1, WP1 | No friends line, no spare marker, no friend page. |

## Your wishlist

| State | Drawn | Rule |
|---|---|---|
| Empty | W1, WP1 | Search, then one card: `Nothing on your wishlist yet` and what it is for. |
| Adding from search | W2, WP2 | `Add to wishlist` (phone `Add` → `Added`); one more than you hold. |
| Cards on the list | W3, WP3 | Collection grid, full cards; caption `want N · have N`; spare marker after the name. |
| Collected | W4, WP4 | Moved to Collected, `✓ collected · have N` in `--success`; Clear collected. |
| A write fails | note | Old value back; shared `ToastFrame`, `role="alert"`. |

## Card details

| State | Drawn | Rule |
|---|---|---|
| Not on the list | D1, DP1 | Footer link `Add to wishlist`, outlined bookmark. |
| On the list | D2, DP2 | `On your wishlist ›`, filled; box section `In your wishlist`: stepper, have, Remove. |
| Collected | D3, DP3 | `✓ collected` in `--success`. |
| From Shopping | D4 | Same link; Shopping unchanged; no Bought this card. |

## A friend's wishlist

| State | Drawn | Rule |
|---|---|---|
| Reaching it | P1, PP1 | `/friends` row is a link with ›; … menu stays. |
| Lines | P2, PP2 | Round 1 head (face, name, since), no banner; grid, `wants N` / `✓ collected`, view only. |
| Empty | P3, PP3 | `Peter's wishlist is empty` and one sentence. |
| Not a friend | — | Normal not-found page. |

## Spares

| State | Drawn | Rule |
|---|---|---|
| None | S1, SP1 | Nothing added: no marker, no key item. |
| Some | S2, SP2 | `--fact` glyph after the row's marks; key gains `a friend has a spare`. |
| Pressed | S3, SP3 | ModalChrome 560 / sheet from 52px: `Spares of {card}`, friend, pod, count, foot line. |
| All view | S4 | Missing rows only. |
| Shopping for all decks | S5 | Same marker on cart lines; cart unchanged otherwise. |
| Unshare or unfriend mid-visit, a failed read | — | Gone on the next read, silently; absent on failure. |
