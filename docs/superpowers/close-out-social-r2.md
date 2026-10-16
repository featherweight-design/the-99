# Close-out walk: Social R2, the wishlist and friends' spares

**Walked:** 2026-10-15, on `main` with every Social R2 PR merged. Two passes:

- **Staging, read-only**, signed in with a Clerk sign-in ticket. It covered the empty wishlist, card details' Add,
  `/friends` with no friends, the all-decks cart and Shopping. `/about` was left out because opening it moves the
  account's seen state.
- **A seeded scratch branch** off local-dev (`br-fancy-water-a6gv7ikz`, deleted once this was recorded). Friends,
  a pod, spare shares and wishlist lines were planted there, and `next dev` ran against it. The browser was
  Chromium at 390×844 and 1300×900, plus 900 for the spares rows.

**Staging held no pods, no spare shares and no wishlist lines** (1 friendship, 3 profiles; `flag_overrides`
empty). So the friend page, the spare marks, the stand-ins modal's friends section, the Shopping key's spare item
and the collected strip were **proven on the seeded branch only**, never against staging's own data.

Plan: `docs/superpowers/plans/2026-10-15-social-r2.md`. Handoff: `design/design_handoff_the99_social_r2/` (the R3
boards win).

## Route inventory

| Surface | 390 | 1300 |
|---|---|---|
| Collection › Wishlist: empty, lines, collected strip (W1 to W4, WP1 to WP4) | ✓ | ✓ |
| Card details' Wishlist section and its stepper (D1 to D3, DP1, DP2) | ✓ | ✓ |
| Friend page and the `>` on friend rows (P1 to P3, PP1 to PP3) | ✓ (finding 1) | ✓ (finding 1) |
| Stand-ins modal: friends section, titles, spares-only host (S1 to S4, O1 to O3) | ✓ | ✓ |
| Shopping row's other-ways press and the key's spare item (SP1 to SP3, S5) | ✓ | ✓ |
| All-decks cart's spare marks | ✓ | ✓ |
| About: `wishlist` and `friend-spares` | ✓ | ✓ |

Inventories: `docs/superpowers/inventories/social-r2.json`, `social-r2-spares.json` and their siblings.

## Cross-route sameness

- `WantStepper` is the one stepper on the Wishlist tab and in card details.
- The other-ways press is one component on deck rows and in the cart, and the Shopping key's spare item is the
  key's own.
- The wishlist tile (`WishlistTileFace`) is shared by the tab and About, but **not** by the friend page (finding 1).

## Findings

1. **The friend page's wishlist tiles cannot be pressed** (#1884). The board says a press opens card details as
   usual, and the page rebuilds the tile instead of using `WishlistTileFace`. Assigned to its owner's lane.
2. **The phone place strip overflowed at 390** (#1879). Five tabs and `+ Add` were wider than the phone, so the
   strip scrolled and Add showed half-cut. **Fixed here:** beside five tabs, the tabs close up and Add is its mark
   alone in a 44px square, named `Add cards` for a screen reader, as WP1 draws its trailing control.
3. **The spares sheet's pods line truncates at 390** (#1872, #1891), `shares with Store league and Th…`. Assigned
   to its owner's lane.
4. **The About `friend-spares` specimen read doubled on desktop** (#1894): `Valakut Awakening // Valakut
   Stoneforge` and then the row's own two-face mark. **Fixed here:** the specimen names the front face at both
   widths, as the phone does. The shipped row is unchanged.
5. **The spares inventory's O1 row assumed Shatterskull Smashing has stand-ins.** On local-dev it has none, so the
   row drew S3. **Fixed here:** the card is `SPARES_BOTH_CARD`, and the note says to press its ⇄ once before
   seeding the spares.

## Seen, not changed

- One combined press keyed `friend has a spare` follows d9's ruling, recorded in #1891's Settled section.
- No `shares` block was added to an inventory. `check:shared` takes one component per inventory, and these
  inventories mix surfaces. Sameness was checked by import, above.
