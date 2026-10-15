# The 99 — Social R2 (the wishlist, and friends' spares) · R1 handoff package

Round 2 of 3 of the social line: your wishlist, getting a card on it, GOT, a friend's wishlist, and "a friend has a
spare" on the deck page's missing cards, Shopping and the cart. Phone and desktop. Behind `SOCIAL_WISHLIST_ENABLED`;
spares and a friend's wishlist also need `SOCIAL_FRIENDS_ENABLED`.

Source of truth: `docs/superpowers/design-briefs/2026-10-15-social-screens.md` (branch `brief/social-screens`).
Builds on Round 1: `design_handoff_the99_social_r1/` (PR #1796).

## Start here

| Read | For |
|---|---|
| **`The 99 - Social R2 (R1).dc.html`** | **Start here: the five calls, the locks, the gaps.** |
| `R1 - Wishlist-Desktop.dc.html` / `R1 - Wishlist-Phone.dc.html` | `/wishlist`, empty first, through GOT and Clear got. |
| `R1 - Add-Desktop.dc.html` / `R1 - Add-Phone.dc.html` | The account menu row and card details' Want it. |
| `R1 - Friend-Desktop.dc.html` / `R1 - Friend-Phone.dc.html` | A friend's page and their wishlist, view only. |
| `R1 - Spares-Desktop.dc.html` / `R1 - Spares-Phone.dc.html` | The spare chip on missing rows, Shopping and the cart; who has them. |
| `README.md` | Each decision with its reason; the gap list. |
| `STATES-social-r2.md` | The matrix. |
| `READINESS.md` | R1's verdict and what engineering needs. |
| `social-r2 · copy strings.ts` | Every new string, for `/copy-review`. |
| `brand/` | The locked brand sheet. |

The same canvas is live as a Design artifact in account 2. Open the `.dc.html` files with `support.js` and `art/` beside them.

## The answer in one line

Your wishlist is `/wishlist`, one row under Friends in the account menu; Want it in card details puts any card on it at
one more than you own; a got line is stamped and waits in Got until cleared; a friend's page shows their wishlist, view
only; and a friend's spare is a chip with their face under the card you're short of.
