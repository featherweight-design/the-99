# Cold-eyes review — deck import (#42)

Fired after PR 7 (arrival strip + unresolved banner), the point at which the vertical is
reachable end to end: `/decks/import` → paste → deck → arrival strip → unresolved banner.

## Capture — what was possible, and what was not

**A screenshot sweep was not possible, and this is a real gap, not a skipped gate.**

Verified before substituting: this repo has no `@clerk/testing` dependency, no auth bypass in
`requireUserId`, no Playwright config or e2e package, and no test-user credentials in `.env`.
Sign-in happens on Clerk's **hosted Account Portal**, so there is no in-app form to drive —
`src/proxy.ts` allowlists only `/`, `/api/cron/*` and `/api/health`. Standing up an
authenticated headless session is a multi-hour build in its own right.

Substituted a **rendered-DOM capture**: a throwaway vitest harness rendered `ImportEntry` in
three states and `BuilderShell` in the clean-arrival and short-import states, dumping a
depth-indented outline of every element carrying text, a `role`, an `aria-label`, or a
disabled state, tagging `md:hidden` as `[MOBILE-ONLY]` and `hidden md:*` as `[DESKTOP-ONLY]`.
Real components, real strings, real reading order, real viewport split. The harness was
deleted after the run; the reel is at `/tmp/coldeyes.txt`.

## What the substitute cost

The critic returned 12 ranked findings. Verified individually against the source:

| # | Finding | Verdict |
|---|---|---|
| 1 | Group header counts copies while the banner counts lines | **Real — fixed** |
| 2 | Mobile banner says the rows are "not in any count below"; the mobile footnote says they "count toward the 99" | **Real — fixed** |
| 3a | Dangling `Complete` renders as orphaned bold text | False positive — harness artifact |
| 3b | Mobile banner drops the `Complete` consequence desktop carries | **Real — fixed** |
| 4 | Sideboard sentence duplicated | False positive — the two are `md:hidden` / `hidden md:grid`, never co-present |
| 5 | Submit reads `Import 0 cards` on an empty paste | Low — deferred to PR 9 |
| 6 | Quick-add bar buried below 99 rows in mobile DOM order | False positive — it is `sticky bottom-[80px]`, pinned at both widths |
| 7 | Bare "Jund only" status | Low — deferred to PR 9 |
| 8 | Mobile drops the EDHREC attribution and the tap hint | Low — deferred to PR 9 |
| 9 | Three customer-facing names for one concept: `Couldn't identify`, `unmatched`, "couldn't put a card to" | **Real — escalated, not fixed** |
| 10 | `/decks/import` offers no way back | False positive — `Shell` wraps every route with the nav rail and tab bar |
| 11 | Coverage strip reads all zeros beside "nothing needs your attention" | False positive — synthetic fixture used generic `role: "other"` cards |
| 12 | Mobile and desktop subheads diverge | Not a defect — deliberate, handoff-sourced |

**Five of twelve were artifacts of rendering components in isolation** rather than routes with
their real chrome and real data. That is the honest precision figure for this substitute, and
it is the argument for building the authenticated capture before the next epic — every one of
those five cost a verification pass that a screenshot would have answered at a glance.

## The two real copy defects were Design's, shipped verbatim

`bannerMobile` and `footnoteMobile` are both handoff-verbatim, and they contradict each other
on the same mobile journey. The mobile banner is a compression of the desktop line that lost
its qualifier: desktop's "isn't counted in the mix or in either tab below" became "isn't in any
count below", which is a different and false claim, and the compression also dropped the
consequence that unresolved rows hold the deck off Complete.

Restored the qualifier from the desktop string rather than inventing new copy, so the two
viewports now say the same thing at different lengths. **Design owed a ratification.**

Finding 9 was **not** fixed: `unmatched` is a drawn decision with stated rationale — it reuses
the `buy` tag's exact geometry and slot so the two read as one family. Renaming it unilaterally
would break a deliberate visual relationship. Escalated instead.

## Scope re-read

PRs 8 and 9 were re-read against this list before building. Nothing in PR 8's scope was
invalidated. PR 9's reserved polish slot now has named occupants: findings 5, 7 and 8.
