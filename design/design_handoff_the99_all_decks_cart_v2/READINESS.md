# Readiness: Shopping for all decks v2 (self-assessed)

**Verdict: 🟢 Green for build, with G1 and G2 decided in the plan.** This is a design-only handoff. Engineering may add a readiness audit to the PR. Rule its items as an addendum.

| Area | State |
|---|---|
| Calls | Ten, all approved (Hugh, LGTM, 2026-10-27) |
| Decisions | D1–D5 ruled as recommended, R1b applied, D6 (About) deferred by Hugh |
| States | Every state in `STATES-all-decks-cart-v2.md` is drawn at both widths |
| Shipped parts reused | `CartLine`'s name press, `BuyTag` + `useCartGotIt`, `RowEnd`/`rowAsk`, `OtherWaysPress` + the spare marks, `CartDeckGroup`'s header, `FilterChassis` + `ResultLine` + `FilterChipPill`, the chassis sheet, `RowSkeleton`'s bars and `anim-skeleton`, `EmptyState` |
| New parts | The column header row; the labelled fact line; the `+N` / `less` press and its inline list; the friend panel's fold and sticky header; `CartFilters` (search, Friend, Owned) and `CartSort` (per view) filling the chassis slots |
| Tokens, motion, dependencies | None new |
| Copy | Placeholders in `all-decks-cart-v2 · copy strings.ts`, for `/copy-review` |

## Gaps (see README §Gaps)

- **G1, data:** the names of the decks holding owned copies. This is the one new read.
- **G2, state:** `useByFriend`'s three states, so the segment always shows.
- **G3–G6:** URL mirroring, price sort order, the failed read, and name-boundary truncation.

## Not in this round

- The About line (D6). The existing `all-decks-cart` entry stands as it is.
- A failed spares read (G5). The shipped behaviour stands.

### Engineering audit of Addendum R3 (2026-10-29, against origin/main at 0970a3a)

**Verdict: Yellow, all eng-resolvable; built on `feat/cart-v2-r3`.** Five rulings, each where it landed:

1. **The search field's name.** `DeckSearchField` (`src/components/decks/deck-filter-column.tsx`) set `aria-label` to its
   placeholder, so §2.3's `Search cards` name under a `Search` placeholder needed a separate `label` prop. Every other
   caller is unchanged (no `label`, so the name is still the placeholder). The cart passes `filters.search` as the label
   and `filters.searchCompact` (new, "Search", `/copy-review` KEEP) as the compact placeholder (`cart-chassis.tsx`).
2. **The chips row at 16px. RULED: README §2.5's default, the shared change.** `FilterChassis`'s compact form gives the
   chips row `mt-[6px]` over the frame's 10px gap (`src/components/ui/filter-chassis.tsx`), so it reaches /decks,
   /collection and every other compact chassis page; the result line stays 10px under it, and the wide form is unchanged.
   Those pages' compact contact sheets are to be re-shot.
3. **Try again in the sheet's failed line takes `TOUCH_HIT`** (`cart-filter-sheet.tsx`, the board's `.sfail`).
4. **The reading pill follows the README, not the mock's small pill:** after Try again the group shows the shipped
   Loading A pill (44px, round, dashed, `filters.friendReading`) the sheet already drew while the read was out.
5. **The fade** (`cart-view.tsx`, the sticky 36px `md:block` gradient) draws only while
   `scrollHeight - scrollTop - clientHeight > 1` (`hasMoreBelow`), read on the box's scroll, after each render, and by
   one `ResizeObserver` on the box. No transition.

Also built: §1's failure said in the sheet (`FriendOffer`'s new `failed` kind; `SpareReadState` holds no toast while the
sheet is open, counts the sheet as having said it, and dismisses a toast up when it opens), and §4's reader with no
friends (the page reads `hasFriend` whenever friends' spares are on; `FriendSparesProvider`'s `noFriends` makes no
spares read and lands every card with none; the spare column closes). No About entry.

