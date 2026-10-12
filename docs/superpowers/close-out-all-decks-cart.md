# Close-out walk: the all-decks shopping cart

**Walked:** 2026-10-12. `next dev` ran on the 6b branch, rebased on `main` with every other cart PR merged (#1442, #1445, #1452, #1463, #1466, #1479, #1492, #1494). It ran against scratch branch `br-small-morning-a6dv6pbx`, a `pull:staging` copy of Hugh's decks re-owned to the audit account, with `ALL_DECKS_CART_ENABLED`, `SHOPPING_MARK_BOUGHT_ENABLED` and `COLLECTION_EDIT_ENABLED` on. The browser was Chromium at 390×844 (touch) and 1300×900.

Two later 6b fixes landed after the walk, and both are unit-tested and mutation-checked: a stale press drops the chooser back to the plain list, and a pick clears the footer's announcement. #1497 merged as `9f4e2f7`.

On that data the cart holds 7 of 21 decks missing cards, 291 lines, 307 copies and $843.99.

- **Interactive walk:** 22 of 22 checks passed.
- **Contact sheet** (`docs/superpowers/inventories/all-decks-cart.json`): 18 of 18 cells drawn. Two rows exist at one width only by design: the phone's deck select, and A4 at desktop.
- **Scratch branch:** deleted once this was recorded.

Brief: `docs/superpowers/design-briefs/2026-10-11-all-decks-shopping-cart.md`. Handoff: `design/design_handoff_the99_all_decks_cart/`.

## Route inventory

| Surface | 390 | 1300 |
|---|---|---|
| `/decks` entry line into the cart (A1) | ✓ | ✓ |
| `/decks/shopping` by card (A2), the Sol Ring line (S0) | ✓ | ✓ |
| `/decks/shopping?view=deck` by deck (A5) | ✓ | ✓ |
| `/decks/shopping?deck=<id>`, the tile's way in | ✓ | ✓ |
| Deck select: fold (phone), Unselect all to A4 and back | ✓ | ✓ |
| Checkout and the Mana Pool link | ✓ | ✓ |
| I got it on a line: buy key, confirm (S1) | ✓ | ✓ |
| Chooser when fewer are bought than decks (S1b) | ✓ | ✓ |
| Receipt, held slot, Undo (S3 to S5) | ✓ | ✓ |
| About: `all-decks-cart`, behind its switch | ✓ | ✓ |

## What was checked, and how

| Check | Result |
|---|---|
| One screen tall, the list scrolls (Hugh's layout bugs, #1492) | Document height equals the viewport at both widths (844 and 900). The list box scrolls through all 291 lines. The checkout heads the page on the phone and sits under the decks on desktop. |
| The Mana Pool link, pressed | One link, 8,051 characters, for 291 lines (under the 32,000 split). Pressing it opens `manapool.com/add-deck` in a new tab at both widths. |
| Unselect all, then select back | The list's place holds the way back (A4). Select all restores every deck. |
| The chooser on a card nobody owns (S1b) | Star of Extinction, owned 0, wanted by HD - Kratos and HD - Gishath. Stepping to 1 copy turns the list into the chooser, in the claim model's order. Picking HD - Gishath moves the copy, and the footer reads `Tap HD - Gishath again to undo this.` with `Back to first listed`. |
| The press and its receipt (S4) | `Add 1 copy` was enabled with a preset printing (PLST XLN-161). The receipt reads `HD - Gishath is covered, as you picked. HD - Kratos still needs 1.` The totals moved from 307 copies to 306. |
| Undo (S5) | Undo reverted the purchase, and the line was back on the next read. |
| About entry | `#all-decks-cart` draws its specimen with the switch on. |

Screenshots of every surface at both widths are in the contact sheet. The chooser and the receipt were also captured during the walk.

## Follow-ups

- **`added this visit` over-counts after an undo** (from #1479, round 4, declined there as a scope decision). The held map adds every successful press's copies and never subtracts an undone one. A line the read lists again after an Undo then reads `N added this visit` one press high, until the cart is next read. A second press on the same line for a different deck selection keeps only the first press's decks, so it can suppress a held slot for a line the read still lists. The receipt, the collection and History are all correct. The fix is to key the held map per purchase, with the union of their decks, and subtract on a committed undo.

## Seen, not changed

- The chooser previews over the line's decks only. A deck that is short of the card but left out of this visit is not drawn, though seniority can still give it an unpicked copy. `confirm.readAgain` says the read decides, and the receipt names what the read says (lock 7). This is documented on `CartChooser`.
- A card a committed deck holds only in its draft (An Offer You Can't Refuse, in HD Tune - Mutant Menace) keeps the plain list. The claim model does not list that deck, so the chooser would drop it (#1497, round 2).
