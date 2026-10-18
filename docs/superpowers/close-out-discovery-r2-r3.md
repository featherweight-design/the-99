# Close-out walk: Discovery R2 and R3

**Walked:** 2026-10-17, on `main` at a44562574, with every Discovery R2 and R3 PR merged. The server was `next start`
on scratch branch `br-ancient-rice` (a child of local-dev, deleted once this was recorded). The browser was Chromium
at 390×844 and 1300×900. Nothing was written to staging or production.

Plan: `docs/superpowers/plans/2026-10-16-discovery-r2-r3.md`. Inventory:
`docs/superpowers/inventories/discovery-r2-r3.json`, whose `unmounted` list is empty since #2067.

## Route inventory

| Surface | 390 | 1300 | Pass |
|---|---|---|---|
| A deck's `?tool=` landings: Proposed cuts, Suggested changes, Mana Balance (R2·2b) | ✓ | ✓ | audit account, Aang's deck |
| Page landings: Help me choose, Precons, Wishlist, Collection Sync, Lineup, Friends (R2·3) | ✓ | ✓ | audit account |
| Find a deck's landing (deferred until a card opens) | ✓ | ✓ | audit account |
| About's Tools and Reference tabs, and "Take the tour →" (R2·6b, R3·2) | ✓ | ✓ | audit account |
| The ? and its panel or sheet (R2·8) | ✓ | ✓ | audit account |
| The ? over card details (R2·9) | — | ✓ | audit account; desktop only by design |
| The doors: `/decks` and Home with no decks, `/commanders`' guided banner (R3·4) | ✓ | ✓ | onboarding probe account, cards and no decks |
| The tour, first run and taken again (R3·1b, R3·2) | ✓ | ✓ | `probe:tour`, 129 ok on #2053's head |
| Friends on the first-run checklist: to do, link, done (R3·3) | ✓ | ✓ | #2032's walk |
| Fixture-bound landings: Top off, Matchups, Cheaper stand-ins, A friend has a spare | ✓ | ✓ | `probe:tool-landing` |

**Switches off:** every route renders. The gated pages 404 by design (Help me choose, Precons, Wishlist, Friends).
A deck's `?tool=` is stripped with no halo. About draws only the tools that are still on. No ? is drawn. The server
logged no errors.

**Six themes:** at 1300, every theme was checked on the deck landing's halo, the help panel over `/collection` and
About's Tools. The halo, the panel's links and About's accents take each theme's accent, and nothing is lost against
its surface.

**Friend spares, re-timed on the deployed staging server (R2·6b):** median `toolFits` span 181ms, so Try it stays.

## Findings

1. **Find a deck at 390 haloes the door only once All details opens.** The board draws the full sheet, not the
   arrival from the peek. Asked of Design (design follow-ups 2026-10-18, item 8). Nothing was built ahead of the answer.
2. **The replay's dashboard step 1 and its phone dock over the unlocked tab bar are not drawn.** They were built from
   the drawn steps' geometry and the handoff's "12px above the tab bar" rule. Asked of Design (items 9 and 10).
3. **Two tabs could both open the tour.** Fixed by #2058 (an atomic claim in `spendTourAction`).
4. **Script-written data stays cached on that same account (fixture only).** The walk re-seeded the probe account
   with `db:seed:collection`, which revalidates no tag, so `/commanders` served that account's own earlier ranking
   until the build's data cache was cleared. `cacheForUser` keys on the user id. This is not a reader-facing defect.

## Open

- **The About entries ship in the launch-end batch** (ruled 2026-09-21). There are two: "Getting help", and the
  what's-new entry for the redesign. Both are drafted in the lane board's `about-drafts-discovery-2026-10-18.md`, and
  `ABOUT_VERSION` moves from 14 to 16 with them. Under the design pipeline's rule this close-out does not pass until
  they ship. This is the last open item.
