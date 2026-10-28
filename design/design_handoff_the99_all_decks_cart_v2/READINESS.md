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
