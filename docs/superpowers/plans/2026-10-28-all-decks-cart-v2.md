# Plan: Shopping for all decks v2

The handoff is `design/design_handoff_the99_all_decks_cart_v2/` (#2308, merged at f7cca28). Orchestrator d9 approved PRs 1, 2, 3 and 8 on 2026-10-28, and accepted the three engineering decisions below.

This plan follows the audit at https://github.com/HartiganHM/the-99/pull/2308#issuecomment-6463752984 (🟡 Yellow). It needs no new switch: the work rides `ALL_DECKS_CART_ENABLED`, with By friend still gated on `SOCIAL_FRIENDS_ENABLED && SPARE_REQUESTS_ENABLED`.

## Gap classification for d9

### (a) Engineering can close these

| # | Gap | Why it is (a) |
|---|---|---|
| A1 | G1: the names of holding decks outside the cart | One extra `decks` select in `loadCart`. The order is decision 1. |
| A2 | "No friends yet" needs the reader's friend count | A small read in `src/lib/social/`, keyed with `friendGeneration`. |
| A3 | G2: `useByFriend`'s three states, so the By friend segment always shows | Logic only. `loaded` already tells the states apart. |
| A4 | The spare key and the By friend segment from first paint, with friend cells as skeleton bars while reading | Drawn in Loading A–D. This is Hugh's "render immediately" requirement. |
| A5 | Export `BAR` from `tile-skeleton` | Reuses an existing part as it is. |
| A6 | `CartFilterSheet` | Each route builds its own sheet on `ui/sheet.tsx`. The cart's is drawn in Controls. |
| A7 | A trailing slot on `ResultLine` for the reading dot and its words | Drawn in Loading and Controls. |
| A8 | The Friend panel: "Any friend" radio above the checkboxes | Drawn. Built on `FilterPanel` with three states (decision 2): no filter, Any friend, or named friends. |
| A9 | Panel folded at 390 | Built from the 1300 specimen. |
| A10 | No match at 1300 | Built from the 390 specimen. |
| A11 | No friends yet at 1300 | Built from the 390 specimen, whose caption says "same block at its width". |
| A12 | Filtered views: By card at 390, By friend at 1300 | Built from the other width's specimen. |
| A13 | G3: `?q ?friend ?owned ?sort` mirrored through `mirrorUrl` | Logic. |
| A14 | G4: the price and cost comparators | Logic. Unpriced and sold-out lines go last in both directions. |
| A15 | A sort param arriving on the wrong view | Logic. It drops to that view's default. |
| A16 | The cart's Ask size (was B1) | README call 3 states the sizes: phone 36px, desktop 28px. At phone that is the spares sheet's shipped `ASK_SIZE.sheet` (36 / radius 9 / 13px) apart from a 72px minimum width; on desktop it is `line`'s 28px height with a 64px minimum width. It is specified, so it is built to the mock as a cart size. |

### (b) New visuals, sent to Design as one batch (see For Design; B1 became A16)

| # | Item | What is new |
|---|---|---|
| B2 | **A failed spares read (G5)** | The handoff's premise is wrong: today a failure is swallowed into "none" and draws Empty-One B ("None of your friends has one … right now"), which is false. No specimen exists for a failed state. My recommendation for the least invention: a toast through the existing `SocialToast` pattern, empty spare cells with no bars, no panels, and the Friend trigger hidden. The toast's text and placement in the cart are still new. |
| B3 | **The sticky By friend panel header** | It is described in prose only, with no specimen at either width. That covers how phone pinning behaves (D5) and how the sticky header looks over scrolled rows. |
| B4 | **G6: a first deck name wider than its cell** | There is no specimen. My recommendation: an ellipsis only when the first name alone cannot fit, `+N` always shown after it, and never a cut in the middle of a name. |

### For /copy-review (not Design)

- "spare available" (Controls A1) has no string.
- "N spare" is not inflected, but shipped copy reads "2 spares".
- "No card matches both" assumes exactly two filters are on.
- The no-match body sentence in Controls D has no string.
- The toast for a failed read (B2).
- Retiring `list.headBy*` means v1's design table must be updated, or `check:copy-drift` fails.

## For Design

These three items go back to Design as one batch. B1, the Ask size, turned out to be specified in README call 3 and is now A16. The handoff is `design/design_handoff_the99_all_decks_cart_v2/`. PRs 4 to 7 wait for the answers.

### B2: A failed spares read

- **Where:** README §Gaps G5, plus `Empty-One.dc.html` ("One spare, none, and no friends") and `Loading.dc.html`.
- **What's missing:**
  - G5 says today's behavior stands: "the shared toast, empty cells, and By friend's none state".
  - In the code, the read swallows a failure (`fetchSpares` returns nothing), so no toast fires.
  - The none state then draws Empty-One B, "None of your friends has one of these … right now", which states something false.
  - There is no specimen for a failed read.
- **Recommendation:**
  - The shared social toast, with its words sent to /copy-review.
  - Empty spare cells with no skeleton bars, and no friend panels.
  - The Friend filter's trigger hidden.
  - No new block on the page. If Design prefers a block, it needs drawing at both widths.

### B3: The sticky By friend panel header

- **Where:** README call 7 ("On desktop, the open panel's header is `position: sticky` at the top of the list box") and call 8 (phone pinning), with `By-Friend.dc.html` ("The long list").
- **What's missing:**
  - No artboard shows a header while it is stuck: its fill, whether it has an edge or shadow, and how it meets the rows passing under it.
  - On the phone, call 8 pins the switch row and the chassis rows. Whether a friend's panel header also sticks under them is not said.
- **Recommendation:**
  - On desktop, the header keeps its own fill and gains a 1px `--border` bottom edge only while stuck.
  - On the phone, panel headers do not stick. Only the controls block pins, as shipped.

### B4: A first deck name wider than its cell

- **Where:** `Row.dc.html`, "+N, opened in place" (C1/C2), and README §Gaps G6 ("drop whole names until `+N` fits").
- **What's missing:** G6 covers dropping whole names. It does not cover a FIRST name that is wider than the cell on its own, where there is no whole name left to drop.
- **Recommendation:** truncate that one name with an ellipsis and always show `+N` after it. This is the only place a name is cut.

## The PRs

There are no stacked PRs: each one merges before the next starts. Each stays under ~20 files and ~800 lines, and each ships on its own behind the switch.

Every UI PR runs the design-review property table and draws both widths in the same PR. Each also adds its routes and states to the feature-acceptance inventory (`docs/superpowers/inventories/all-decks-cart-v2.json`: `/decks/shopping?view=card|deck|friend` at 1300 and 390, plus every state).

1. **Server reads (A1, A2).**
   - Files: `cart-read.ts`, `cart.ts`, `social/friends.ts`, `shopping/page.tsx`, and their tests.
   - `heldIn` is added per line.
   - `friendCount` reads joined on the viewer.
   - The cache key gains `friendGeneration`.
   - Proof: `check:social-reads`, `check:list-cache`, a `.toSQL` test on the user-scoped select, and a staging read.
2. **Client spares states (A3, plus the B2 data half).**
   - Files: `spare-markers.tsx`, `cart-by-friend.tsx`, `cart-view.tsx`, `view-switch.tsx`, and their tests.
   - `fetchSpares` reports a `failed` flag.
   - `useByFriend` has five states: off, reading, none, failed, groups.
   - The segment shows from first paint.
   - `?view=friend` no longer falls back to By card.
   - Nothing new is drawn.
3. **Shared adaptations (A5, A6, A7).**
   - Files: `friend-spares.tsx`, `ui/result-line.tsx`, `ui/filter-chassis.tsx`, `ui/tile-skeleton.tsx`, a new `cart-filter-sheet.tsx`.
   - Proof: the contact sheets of the other chassis routes are unchanged.
4. **Row facts, and By card.**
   - Files: new `cart-facts.tsx` and `cart-columns.tsx`, plus `cart-line.tsx`, `cart-view.tsx`, copy, and the committed design table.
   - Covers the column header, the labelled fact line, the `+N`/`less` inline list and `useNameFit` (B4 once ruled).
5. **By deck.**
   - Files: `cart-deck-group.tsx` and the facts variant.
   - The "This deck · also" column, with the deck's own name excluded from "also".
6. **By friend panels and rows.**
   - Ask above the tag, at the cart's Ask size (A16).
   - The panel figure.
   - Fold state, kept for the visit.
   - The sticky header (B3 once ruled).
   - The single-spare state (Empty-One A).
   - The spare key shown while reading.
7. **Reading, empty and failed states.**
   - Loading A–D: skeleton cells and panels, with buy and checkout live from first paint.
   - Empty-One B and C (A11).
   - The failed state (B2 once ruled).
8. **The chassis frame, search and sort.**
   - Files: `cart-sort.ts` and `cart-chassis.tsx`.
   - `ResultLine` replaces `ListHead`.
   - `?q` and `?sort` are mirrored (A13, A14, A15).
   - v1's design table is updated for `check:copy-drift`.
9. **The Friend and Owned filters (A8).**
   - Desktop gets the anchored panel; phone gets sheet pills, two to a row at equal widths (R1b).
   - `?friend` and `?owned` are mirrored.
   - The Filters button shows a count badge.
10. **One-width states and close-out (A9, A10, A12).**
    - The feature-close contact sheet and `check:shared`.
    - Re-capture the About shots: the `all-decks-cart` entry stands with D6 deferred, but its shots show the old row.
    - Update the pipeline tracker.

Every PR mutation-checks its tests: a named mutation fails each test before it is reverted.

## Engineering decisions (recommended, no Design needed)

1. **G1 ordering.** Holding decks outside the cart come after the cart's own decks, most copies first, then by name. If that read fails, fall back to the shipped "N · in other decks".
2. **The Friend filter has three states.** Clearing filters must bring back every line, so:
   - **Off** (no `?friend`): every line shows.
   - **Any friend** (`?friend=any`): only lines that some friend has a spare of. Its count is that number of lines, the "spare available" figure.
   - **Named friends** (`?friend=<public ids>`): only lines those friends have a spare of. An unknown id is dropped.
   - A chip shows for Any friend and for named friends, and its ✕ returns the filter to off.
3. **A sort param that belongs to another view** drops to the current view's default and is stripped from the URL through `mirrorUrl`.

## Sequencing against (b)

- PRs 1, 2, 3 and 8 touch no (b) item and can start at once.
- B4 gates PR 4, and PR 5 follows PR 4 because it reuses `cart-facts.tsx`.
- B2 and B3 gate PRs 6 and 7.
- If any (b) item goes to Design, I build PRs 1, 2, 3 and 8 while it is out.
