# Gap report: invites PR 6b (admin M4, the Invites tab)

Property table: `docs/superpowers/design-tables/invites-pr6b.md`. Agent 2 found 1 visual gap and 0 state gaps.

## Fixed

1. The desktop account row's name, owner pill and joined date are centred in the row (`md:items-center`), not on
   the name's baseline.

## Borrowed from the shipped components (not gaps)

- Admin head: the active tab underlines in `--fg`; tab type and height, the phone head gap, and the sub on the
  phone are all as shipped. The strip SCROLLS at phone width (the board's caption), and the current tab is brought
  into view by moving the strip alone.
- Face tile: initials, as 6a's account section draws them, not commander art.
- Search field chrome and the `Open ›` / `Revoke` text press: the shipped `SearchField` and 6a's press.

## Engineering's calls where the board draws nothing

- A deleted invitee is a `deleted account` row under its inviter. Accounts whose inviter was deleted sit under one
  `deleted account` root, after the founders (README G6).
- Search filters to matching accounts and keeps each match's line from the root, plus everything under the match.
  A waiting invite's address is not searched.
- Empty tree and no-match lines.
- `aria-level` on each treeitem.
