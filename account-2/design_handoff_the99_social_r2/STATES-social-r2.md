# STATES — Social R2 (the wishlist, and friends' spares)

Every R2 state in the brief's §Every state to draw, plus the ones the design adds. Frames are named on the boards:
W (Wishlist), A (Add), P (Friend), S (Spares); phone frames add P (WP, AP, PP, SP). Both widths carry every state.

## Placement and switches

| State | Drawn | Rule |
|---|---|---|
| Account menu, friends on | A1, AP1 | `Wishlist` after Friends; a link; no badge. |
| Account menu, friends off | A2 | `Wishlist` after About. |
| Wishlist switch off | A2 note, P6 | No row, no Want it, `/wishlist` and `/friends/[id]` not found; friend rows as Round 1. |
| Wishlist on, friends off | W1, WP1 | No friends line, no spare chip, no friend page. The page is complete. |

## Wishlist, yours (`/wishlist`)

| Brief state | Drawn | Rule |
|---|---|---|
| Empty | W1, W2, WP1, WP2 | Search, then the empty card naming Want it and GOT. Friends line only once you have a friend. |
| One line | W3, WP3 | Arrives at the top of Wanted with a short wash. |
| Quantity above 1 | W4 (Jace, Rootha) | `want − N +`, 1 to 99, − held at 1. |
| Partly owned | W4 (Rootha) | `have 1 of 3`, one pip per copy up to six. |
| GOT | W4, WP4 | Stamp on the art, `got · have 2 of 2` in `--success`, moved to Got. Stays until cleared. |
| Clearing a line | W5, WP5 | ✕, no confirm, row collapses; failure restores it and toasts. |
| Clearing every got line | W6, WP6 | `Clear got` in the Got head; receipt strip. |
| Wishlist on, friends off | W1 | As above. |
| Adding from the page | W3, WP3 | Card search row; `Want` → `✓ Wanted`; on-list cards show their want. |
| A write fails | W5 note, A4 note | Old value back; shared `ToastFrame`, `role="alert"`. |

## Getting a card on it

| State | Drawn | Rule |
|---|---|---|
| Not on the list | A3, AP3 | `Want it`, outlined, star; desktop footer row, phone column foot. |
| Just added | A4, AP4 | First press = owned + 1. Becomes the line: star, Wishlist link, have, stepper, ✕. |
| On the list and got | A5, AP5 | `--success`, GOT stamp, `have 2 of 2`. |
| From a deck's Shopping view | A6, AP6 | Same control; Shopping, the buy tag and the cart untouched. |
| Phone teaser | AP2 | Unchanged; no Want it (G6). |

## Wishlist, a friend's (`/friends/[publicId]`)

| Brief state | Drawn | Rule |
|---|---|---|
| Reaching it | P1, PP1 | The friend row is a link with ›; the … menu stays its own button. |
| Empty | P2, PP2 | `Dave's wishlist is empty` and one sentence. |
| Lines | P3, PP3 | Card, `wants N`; never an owned count. View only. |
| GOT lines | P3, PP3 | Stamp, `got · wanted N`, in place. |
| No commander chosen | P4, PP4 | Gradient banner, initials. |
| No longer friends (also a stranger, a bad id) | P5, PP5 | One card, `Go to Friends`; nobody was told. |

## Spares (view only)

| Brief state | Drawn | Rule |
|---|---|---|
| None | S1, SP1 | Chip absent, never `0`. Page exactly as shipped. |
| One friend | S2, S4, SP2, SP4 | Face + `Dave has 1 spare`. |
| Several friends on one card | S2, SP2 | Two: `Dave and Priya have spares`; three or more: `3 friends have spares`, three faces. |
| Pressed | S3, SP3 | Popover / sheet: face, name (to their page), count; foot line; nothing else to press. |
| Shopping's intro | S2, SP2 | `Friends have spares of N.` appended; absent at zero. |
| All view | S4, SP4 | Missing rows only. |
| Shopping for all decks | S5, SP5 | Under the deck line; nothing in the cart moves. |
| Your wishlist's lines | W4, WP4 | Wanted lines only, never got ones. |
| Unshare or unfriend mid-visit | S6, SP6 | Gone on the next read, silently; an open popover keeps what it read. |
| The read failed | S1 note | Absent, never an error on a deck page. |
