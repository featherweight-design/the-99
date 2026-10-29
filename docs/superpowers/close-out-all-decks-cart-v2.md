# Close-out walk: Shopping for all decks v2

**Walked:** 2026-10-28, as PR 10 of the line (plan `docs/superpowers/plans/2026-10-28-all-decks-cart-v2.md`). `next dev` ran on `feat/cart-v2-closeout`, off `main` at `f056a6b` (PR 9, #2357, merged), with `ALL_DECKS_CART_ENABLED`, `SOCIAL_FRIENDS_ENABLED` and `SPARE_REQUESTS_ENABLED` on. It read `local-dev` (`br-patient-hall-a6nbonvo`), the branch `.env` names, signed in as the headless audit account. The only write was the contact sheet's About-gate clear on that account's row, which the harness captures first and restores. The browser was Chromium at 390×844 and 1300×900.

On that data the cart holds 7 of 20 decks missing cards, 237 lines, 248 copies and $663.94. The account has **no friends**: `local-dev` held no `friend_links` row at all, so every By friend panel draws Empty-One C on it (see Contact sheet).

- **Contact sheet** (`docs/superpowers/inventories/all-decks-cart-v2.json`): 50 of 63 cells reached and looked at. The 13 that did not reach are the six By friend panel rows at both widths and the desktop Friend panel, all of which need a friend holding a spare (Open items). Seven rows exist at one width only, by design.
- **Companion sheet** (`docs/superpowers/inventories/all-decks-cart-v2-no-friends.json`): 2 of 2 cells. Empty-One C at both widths: the dashed block, `No friends yet`, Go to Friends, `0 friends`.
- **`pnpm check:shared`**: all 9 view and control pairs import and use their control. The inventory's `shares` now lists the eight controls the three views share, and each row names its own in `binding` (the check learned the array form in this PR, documented in `docs/agents/contact-sheet.md`). Its failure path was run once: pointing `facts-rest-deck`'s view at `cart-by-friend.tsx` (which draws no `CartColumns`) failed it, naming that file; removing a row's `binding` failed it, naming the row; the restored inventory passed.

Brief: Hugh's, quoted in the handoff README §Brief (2026-10-27). Handoff: `design/design_handoff_the99_all_decks_cart_v2/` (R1b, #2308) and `addendum-r2/` (#2331). The v1 line's close-out is `docs/superpowers/close-out-all-decks-cart.md`.

## What shipped, PR by PR

| PR | What it shipped | Plan item |
|---|---|---|
| #2324 (PR 1) | `CartLine.heldBy` and `CartPayload.holders`: the decks holding a line's owned copies, named from the claims the availability read already returns (no new query). Order per engineering decision 1. | A1, G1 |
| #2326 (PR 2) | `fetchSpares` reports failed batches; the provider keeps a `failed` set; `useByFriend` returns `groups`, `reading`, `failed` or `none`. Nothing drawn. | A3, B2 (data half) |
| #2327 (PR 8) | `FilterChassis` replaces `ListHead` in all three views: search (`?q`), per-view sort (`?sort`, mirrored, another view's value dropped and stripped), the result line with its reading slot. `cart-sort.ts` comparators, unpriced and sold-out last. | A7, A13, A14, A15 |
| #2330 (PR 8 follow-up, another lane) | Design-review pass on PR 8 (`design-tables/all-decks-cart-v2-pr8.md`, `gap-report-all-decks-cart-v2-pr8.md`), the phone sort sheet as Controls B2 drew it, two missing tests. The sheet was retired by R2 ruling 4 in PR 9. | A6 frame, chassis question |
| #2334 (PR 4) | By card's row facts: desktop columns under `CartColumns`, labelled `NEED` / `SPARE` / `OWN` lines on a phone, the own fact naming where copies are in use, and `fitNames` with the `+N` / `more` / `less` pill (R2 ruling 3). The v2 design table committed. | D1, D2, B4 |
| #2339 (PR 5) | By deck's row facts: `This deck · also`, the `DECK` line, `alsoDecks` excluding the open deck, the shared `CartFactsRow`. | D1, D2 |
| #2341 (PR 6) | By friend's panels and rows: `CartFriendLine`, Ask above the tag at the cart's Ask size, the inflected panel figure, folds kept for the visit, the sticky desktop header (`overflow: clip`, R2 ruling 2), the single-spare state, the spare key while reading. | A16, B3, call 7 |
| #2349 (PR 7) | Reading (Loading A to D, `BAR` exported), Empty-One B and C, the failed read (toast with Try again in By card and By deck, the dashed block in By friend, said once), the per-request friend count (`has-friend.ts`). By friend shows from first paint. | A2, A3, A4, A5, A11, B2 |
| #2357 (PR 9) | Friend filter (off, Any friend, named friends) and Owned filter, mirrored and carried across views; desktop `FilterPanel`s, the phone `CartFilterSheet` with equal-width pills (R1b); the Filters badge; `cart-sort-sheet.tsx` retired for `OrderMenu`'s dropdown. | A6, A8, D3, D4, R1b, R2 ruling 4 |
| PR 10 (this) | The one-width states checked, the feature-close contact sheet, `check:shared` bindings, PR 8's design table corrected, this close-out and the tracker. | A9, A10, A12 |

Plan PR 3 (shared adaptations) never shipped as its own PR: its three parts landed where they were first drawn. The result line's trailing slot (A7) came with PR 8, `BAR`'s export (A5) with PR 7, and `CartFilterSheet` (A6) with PR 9.

## The one-width states (A9, A10, A12)

The plan classes all three as built from the other width's specimen, with no new visual. Each turned out to need no code in this PR: the markup that draws them is the same at both widths, and only widths change.

| State | Drawn at | Built at | Where it comes from | Contact sheet |
|---|---|---|---|---|
| A9: a By friend panel folded, at 390 | 1300 (By-Friend A′) | 390 | `FriendPanel`'s fold press has no breakpoint (PR 6); the phone header simply does not stick | `friend-folded` at both widths: NOT REACHED on this fixture (no friends); unit-tested in `cart-by-friend.test.tsx` |
| A10: the no-match block, at 1300 | 390 (Controls D) | 1300 | `NoMatch` in `cart-view.tsx` has no breakpoint (PR 8, widened for filters in PR 9) | `chassis-no-match` and `filters-no-match` at 1300: ✓, the dashed block with its one fix (a search alone) or Clear all (with a filter on) |
| A12: filtered views, By card at 390 and By friend at 1300 | the other width (Controls C1/C2) | each | the chassis's chips and result line, and the filtered rows, are one tree at both widths (PR 8, PR 9) | `chassis-searched` and `filters-friend-any` at 390: ✓; `filters-friend-carried` at 1300: drawn, but over the failed read (below), so it shows Owned None alone; the Friend half is unit-tested |

## Route inventory

| Surface | 390 | 1300 |
|---|---|---|
| By card at rest, searched, no match, sorted (chassis) | ✓ | ✓ |
| By deck at rest and searched (chassis) | ✓ | ✓ |
| Sort: desktop `OrderMenu`, phone ⇅ dropdown | ✓ | ✓ |
| By card facts: `+N`, opened list, cut name with `more`, nothing owned | ✓ | ✓ |
| By deck facts: column header, `also` with `+N`, opened, alone | ✓ | ✓ |
| By friend panels: rest, stuck header, folded (A9), Ask status | ✗ | ✗ |
| Reading: By card skeleton cells | ✓ | ✓ |
| Reading: By friend skeleton panels | ✗ | ✗ |
| Empty-One B (no friend has a spare) | ✗ | ✗ |
| Empty-One C (no friends yet), companion inventory | ✓ | ✓ |
| Failed read: By card and By deck toast, By friend block | ✓ | ✓ |
| Friend panel (desktop) | — | ✗ |
| Owned panel (desktop) | — | ✓ |
| Filters sheet (phone) | ✓ | — |
| `?friend=any`, carried to By friend, Owned in By deck, filtered no match | ✓ | ✓ |
| Friend trigger reading and after a failed read (desktop) | — | ✓ |

A ✓ is a photographed cell looked at against the board. ✗ is a cell that did not reach its surface on this fixture, with the unit test that holds the state. — is a row drawn at the other width only.

## Rulings, and where they landed

| Ruling | What it says | Landed in |
|---|---|---|
| D1 | Columns on desktop, labelled lines on a phone | #2334 (By card), #2339 (By deck), #2341 (By friend) |
| D2 | `+N` opens the list in place | #2334; reused by #2339 and #2341 |
| D3 | Friend and Owned filters, as drawn | #2357, on the shipped `FilterPanel` (R2 ruling 4) |
| D4 | Filters carry across views; sort is per view | #2327 (search, per-view sort), #2357 (Friend, Owned) |
| D5 | The whole chassis pins on a phone | #2327 (the pinned controls block); by extension the panel folds, #2341 |
| D6 | No About line this round | Deferred. The `all-decks-cart` entry stands (see About) |
| R1b | Friend pills equal width, Any friend spans the row | #2357 (`CartFilterSheet`) |
| R2 ruling 1 (B2) | A failed read is said as a failure: toast in By card and By deck, the dashed block in By friend, said once | #2326 (data), #2349 (states), #2357 (Friend trigger inert, sheet) |
| R2 ruling 2 (B3) | Desktop panel header sticks inside the list box, unchanged when stuck; phone headers do not stick | #2341 |
| R2 ruling 3 (B4) | A first name wider than its cell is cut with an ellipsis; `more` when nothing else is hidden | #2334; reused by #2339 and #2341 |
| R2 ruling 4 | The shipped chassis wins; the phone sort sheet is retired | #2357 (sheet retired); #2330's B2 sheet superseded |
| Eng decision 1 | Holding decks outside the cart come after the cart's own | #2324 |
| Eng decision 2 | The Friend filter has three states | #2357 |
| Eng decision 3 | A sort param from another view drops to the default and is stripped | #2327 |

## About

The `all-decks-cart` entry stands (D6 deferred, no new line). Its pictures were NOT re-captured, because they do not show the cart row: the entry's label (`shopping/all-decks/cart`, `about-pages.ts`) and its legacy shot (`about-locators.mjs`) point at the **`/decks` entry line** (`a[href='/decks/shopping']`) on the `p-decks` and `d-decks2` captures, and v2 did not change that line. Neither capture holds a v1 row. And `pnpm capture:about` refuses any branch that is not a scratch branch (`assertScratchBranch`) and needs `pnpm fixtures:about` to build that branch's account first, writes this PR was not cleared for. A later About round that draws the cart itself would need a new capture.

## Open items

- **Phone: the failed-ask toast and the purchase receipt overlap.** The cart's failed-ask toast and `GotItReceipt` draw over each other on a phone. This predates v2; d9 logged it as a candidate for Hugh.
- **The group chevron is 28px where the board draws 36** (PR 5 kept the shipped By deck chevron). A possible Design note.
- **The phone spare press stays at the shipped 26px** where the board draws 20, per R2 ruling 4 (PR 4's and PR 5's tables).
- **PR 8's design table described the retired sort sheet: fixed here.** `design-tables/all-decks-cart-v2-pr8.md` §6 and its state row now say the sheet is retired and point at PR 9's table.
- **PR 9's forks, recorded in its table:**
  - The desktop Friend panel is the shipped `FilterPanel`: a square box for Any friend, and no "has a spare" head.
  - C1's "· Chris has a spare" clause has no string, so a filtered result line reads `N of M cards`.
  - The sheet's Clear all is the shipped "Clear all filters".
  - A friend id the read does not know is stripped from the URL.
  - Held slots count as drawn rows in By card's figures, so after a purchase the result line at rest reads one card more.
- **No fixture reaches By friend's panels.** `local-dev` has no friendships, so the six By friend panel rows and the desktop Friend panel are unreached in this walk; their states are held by `cart-by-friend.test.tsx`. A walk of them needs an account with a friend holding a spare of a selected line (a scratch branch with a seeded friend, or the `fixtures:about` account's Alex).

## Defects seen in the contact sheet

Each is reported, not fixed: none is a small regression of this line's own that a close-out should carry.

1. **Phone: the failed-read toast draws over the open Filters sheet** (`filters-sheet`, 390). The toast sits above the sheet and covers its Owned control. Here the read failed for a fixture reason (below), but any read that fails while the sheet is open draws the same.
2. **Phone: with a filter on, the search placeholder is cut mid-word** (`filters-friend-carried`, `filters-owned-deck`, 390). The Filters button's count badge widens it, and `Search cards` reads `Search car`.
3. **Desktop: the list box's bottom fade erases the bottom edge of the dashed blocks** (`chassis-no-match`, `failed-friend`, the companion's Empty-One C, 1300). The v1 fade (`cart-view.tsx`, the sticky 36px gradient, #1492) is drawn whether or not the list overflows, so v2's no-match, failed and empty blocks lose their bottom dashes and fade out at the foot. It also dims the last By deck group when every group is folded.
4. **A reader with no friends still reads friends' spares** (`reading-card`, `filters-friend-reading`, `failed-card`). While the read is out, By card shows the spare key (`friend has a spare`), the `reading friends' spares` clause and the dashed Friend `reading…` trigger; if it fails, the toast says friends' spares could not be read. The friend count is known at first paint (PR 7 uses it to put Empty-One C ahead of reading in By friend), so By card and By deck could skip all of it.

Fixture artefact, not a defect: `local-dev` is 13 migrations behind `main` (`/api/health`: 174 of 187 applied, 0174 to 0186 pending), and the spares read's spare-request query fails on a missing column (`msp.commander_printing_id`, migration 0174). So every cell that did not stage the read draws the failed read: its toast, the closed spare column, and `?friend=any` dropped (`filters-friend-any`, `filters-friend-carried`).

## Seen, not changed

- **By deck's group headers keep their unfiltered figures under a filter** (`filters-owned-deck`): `HD - Gishath 74 · $125.42` while the result line reads `52 of 237 cards`. The board does not draw a filtered By deck header; recorded as a question, not a defect.
- **At 1300 the page is taller than the viewport by the Fan Content notice** (`facts-plus-deck`, `facts-opened-deck`, where scrolling a row into view moved the whole page and showed the notice). v1's walk measured the document at one screen tall (#1492); the notice under the page (launch epic B1) came later and is not this line's.
- **The desktop `Friends' spares` column header shows for a reader with no friends**, over an empty column. The board does not draw that reader in By card; the column closes only on a failed read (R2 ruling 1).
