# Performance research — where the load time goes, and what to do first

Research only: no code changed. Asked for by Hugh (via the-99-d9) on 2026-09-26: the app should
load faster, **card details first** ("should feel instant, but feel slower on initial load"), then
`/decks`, `/decks/[id]` and Home, then the rest.

**The short version.** Three causes account for most of the wait, and none of them is image
loading or JavaScript:

1. **The server and the database are on opposite coasts.** Every Vercel function runs in
   **iad1** (Washington, DC); the Neon database is in **us-west-2** (Oregon). Every database round
   trip crosses the continent. A page makes six to nine of them in sequence, and the card details
   press makes four for an owned card (five for one the player does not own).
2. **One query, the claim model, is expensive and runs three times on Home and on `/decks`.** It
   costs 266ms of database time on Hugh's real collection, 174ms of which is one correlated
   subquery re-scanning a CTE 1,500 times.
3. **Home, `/decks` and the deck page cache none of their user reads between visits** (the
   other routes' main reads go through `cacheForUser`). A revisit to Home or a deck costs the
   same as the first visit: about 1.1s and 1.3s here, more in production.

The card details press is **~250–330ms cold here and ~40ms warm**. The art already arrives with the
dialog (#998), so the wait is all data, and a hover prefetch that fills the provider's existing
cache turns a cold press into the warm one.

## 1 · How this was measured

- **Data**: a scratch Neon branch (`br-cool-rice-a6kuqgmq`) forked from local-dev, holding the
  pull:staging snapshot of Hugh's account: 19 decks, 3,235 collection rows. That is staging's DATA,
  not staging itself: the snapshot is a day old (staging now holds 20 decks) and the database
  compute is local-dev's. So these figures are a **staging-shaped proxy**, good for where the time
  goes and for ranking the options. The decision baseline every later PR is held to is PR 1's,
  measured on staging itself, as AGENTS.md requires. The audit account was
  re-owned onto that snapshot **on the scratch branch only**, so the numbers are real-sized and
  local-dev's fixtures are untouched.
- **Server**: a production build of `main` at `663801b06` (`next build && next start`), with every
  feature switch on, as staging runs.
- **Browser**: Playwright and Chromium on the same machine. Timings come from CDP's network events,
  not the page's own Resource Timing, because Scryfall's CDN sends no `Timing-Allow-Origin`
  (`plans/2026-09-24-image-loading.md` §1).
- **Cold** means an empty HTTP cache and a new browser context. **Warm** means the same route
  loaded again in that context. Server-side caches were warm in both cases: each route was hit
  once before any timing.
- **Round trip to the database from this machine: 33ms median** (`select 1`, 20 samples, p90
  42ms). **Production pays more**: the functions run in iad1 (every `x-vercel-id` reads
  `sfo1::iad1::…`) against a database in Oregon. Continental round trips run 60–70ms, and that
  figure is an estimate, not measured. So the server-side times below understate production,
  roughly in proportion to how many round trips each read makes.
- **Database time per request** was read from `pg_stat_statements`, reset before a single warm
  load of each route.

The harness scripts are not committed, per the brief. Their outputs and the method above are what
the numbers rest on. They are kept in the author's session and can be committed with PR 1 below
if the measurement should be repeatable.

## 2 · What each route costs today

`content` is the first frame where the page draws real content in place of its `LoadingScreen`.
`img` is when the first card image has finished loading. Times are ms from navigation start at
1300×900. The 390×844 run agrees within about 10% everywhere, so it is not repeated here.

| Route | Cold content | Warm content | Soft nav (revisit) | First image, cold / warm | HTML, transferred | DB exec per request |
|---|---|---|---|---|---|---|
| `/` Home | 1,402 | 1,081 | 1,126 | 1,773 / 1,078 | 20 KB (89 KB decoded) | **656ms**, 20 statements |
| `/decks` | 878 | 785 | 754 | 1,256 / 780 | 19 KB (154 KB) | **860ms**, 16 |
| `/decks/[id]` | 1,507 | 1,341 | 1,231 | 1,839 / 1,332 | 45 KB (463 KB) | **1,326ms**, 43 |
| `/collection` | 1,022 | 585 | 525 | 1,430 / 563 | 325 KB (2.5 MB) | 82ms, 12 |
| `/commanders` | 482 | 376 | 329 | 854 / 368 | 62 KB (419 KB) | — |
| `/discover` | 180 | 112 | 337 | 549 / 94 | 368 KB (1.26 MB) | 1.4ms, 9 |
| `/sets` | 136 | 59 | 137 | — | 8 KB (33 KB) | — |

**The card details press**, on `/decks/[id]`, measured from the press:

| | Dialog open | Art painted | Server action time |
|---|---|---|---|
| Cold (first card) | 251–263 | 272–273 | 192–203 |
| Cold (another card) | 318–327 | 320–329 | 226–233 |
| Warm (the same card again) | 38–39 | 40–41 | a background re-read |

What these say:

- **The HTML arrives fast and the content does not.** Time to first byte is 43–230ms everywhere,
  and first paint (the `LoadingScreen`) lands under 300ms. The gap to real content (0.8–1.5s on
  the four priority routes) is the server finishing its reads while the page streams. It is
  server time, not network, JS or images.
- **Images start the moment the data lands** (`imgStart` ≈ `docEnd` on every route), and add
  ~370ms cold (a CDN fetch plus Scryfall's TLS handshake, as #979 found) and ~0 warm (served from
  the browser cache). They are not the bottleneck on any route once the data is late.
- **A revisit costs as much as a first visit.** Soft navigation takes 0.75–1.2s on the priority
  routes, both the first time and on a return, because every forward navigation refetches the
  route. That is what #687 set out to fix.
- **JavaScript**: 578–795 KB transferred per route cold (2.2–3.4 MB decoded). Fully cached warm,
  and Clerk is the largest single chunk (161 KB raw). It adds cold-visit cost but is not what Hugh
  is feeling on each navigation.
- **`/collection` at 1300 cold transfers 21 MB**: 200 card images on the first screen. That is a
  first-visit cost only; they cache.

## 3 · Where the time goes, per route

### Card details (the priority)

`getCardDetail` → `loadCardDetail` (`src/lib/collection/card-detail.ts:337`) makes **four serial
round trips for an owned card and five for an unowned one**.

Owned:
1. `selectCollectionRows`;
2. availability, prices, proxies and the Fits gate, in parallel;
3. bracket flags;
4. combo partners.

Unowned:
1. `selectCollectionRows` (it finds nothing);
2. the `cards` row;
3. printings, with prices, proxies and the gate started beside it (no availability read);
4. bracket flags;
5. combo partners.

Database execution is only **89ms** of it (from `pg_stat_statements` across one press of an owned
card), of which 52ms is the claim model narrowed to that card. The same read run standalone
under `EXPLAIN ANALYZE`, for a card the account does not hold, executes in 43ms (the `/decks` part of this section).
The rest is round trips and auth. At 33ms a trip that comes to ~200ms here. At the estimated
production round trip it is ~400–500ms, which fits "feels slower on initial load".

- Bracket flags and combo partners need only the oracle id, the user and the deck ids. They wait
  on step 1 for no reason. Prices, proxies and the gate could start before step 1 too. On the
  unowned path, `cards` and `printings` are independent. **Four or five serial levels can become
  two.**
- The provider already keeps a per-mount `Map` (`card-detail-provider.tsx:350`), which is why a
  second press takes 38ms. **Nothing fills it before the first press.** The only prefetch is the
  art (`preloadCardArt`, #998), and that is why art and dialog arrive together.
- Not a cost: the payload. The action returns one card, and the fields the modal never reads
  (`cmc`, `setCodes`, `primarySetCode`) are a few bytes.

### `/decks/[id]` (1.3s warm, 43 statements, 1,326ms of database time)

The biggest statements, per request:

| Statement | Source | DB time |
|---|---|---|
| `two_card` combo facts | `lib/profile/candidate-facts.ts:112` | **399ms** |
| Claim model (twice: availability and buy rows) | `lib/decks/availability-query.ts` | 345 + 252ms |
| Near-miss `pair` combos | `lib/combos/near-miss.ts:82` | 173ms |
| Prices for the page's cards | `lib/decks/price` | 139ms |

The page also runs serial awaits that do not depend on each other (`app/decks/[id]/page.tsx`):
- `indexGeneration` (`:118`) waits on `getDeckDetail`.
- Six of wave 1's seven reads could start with `getDeckDetail`; only the synergy read needs it.
- `loadVersionShape` (`:192`) could join wave 2.
- `readShoppingLimit` (`:358`) runs alone at the end.
- The notices read #1043 adds (not yet on the base this was measured on) starts beside the
  stored bracket read, so it adds no level.

### `/decks` (0.8s warm, 860ms of database time) and Home (1.1s warm, 656ms)

The same statement dominates both: the claim model, reached from three call sites.
- `loadDeckBuyRows`, user-wide, **twice** per request (2 calls, 478 rows, 515–643ms together):
  once from `loadShoppingRollup` (`lib/decks/shopping-rollup.ts:74`), and once from
  `listDecksWithStats` (`lib/decks/read.ts:1111`), which reads it only when some deck can flip
  (`canFlip`), true on this account.
- `loadAvailability`, user-wide, once (2,799 rows, 78–142ms): on `/decks` from
  `listDecksWithStats` (`read.ts:1068`, only with `includeInUseElsewhere`, which `/decks` passes);
  on Home from its own step 5 (`app/page.tsx:156`), since Home does not pass that option.

`EXPLAIN (ANALYZE, BUFFERS)` on the real call, against Hugh's snapshot:
- **266ms** execution for `loadDeckBuyRows`, of which **174ms** is one node: `Aggregate` over
  `CTE Scan on claim_decks_all senior_1`, **1,500 loops**. That is the "senior claims" figure,
  computed per (deck, card) row by re-scanning the unindexed CTE. The work is O(n²), and it grows
  with the number of decks.
- ~42ms is the `owned` CTE, which hash-joins a **sequential scan of all 35,558 `cards`** against
  the collection. The join returns 3,015 rows (the snapshot's 3,235 collection rows are before
  that join).
- Even the one-card read the card modal uses executes in **43ms**, because the claim model is
  built user-wide before it is narrowed.

Home also has one avoidable serial level: its step 5 (`loadCollectionPool`, `loadAvailability`,
`app/page.tsx:151`) does not depend on steps 3 or 4. And no read on Home or `/decks` is cached
across requests.

### The rest

`/collection`, `/commanders`, `/discover` and `/sets` are 60–600ms warm. They are cached
(`cacheForUser`) or cheap, and their cost is payload (`/collection` 2.5 MB decoded, `/discover`
1.26 MB) and first-visit images. None needs work before the priority routes.

## 4 · #687, the navigation performance plan: what shipped and what still fits

The spec (`specs/2026-09-16-navigation-performance-design.md:277-291`) planned nine PRs. The
plan (`plans/2026-09-16-navigation-caching.md`) details PRs 1–6 only.

| # | Scope | Status | Still fits? |
|---|---|---|---|
| 1 | Probe and baseline | **Shipped** (#692); the baseline row is in `nav-cost-history.md` | Yes. Its numbers predate most of this report's routes' current shape and should be re-taken |
| 2 | `cacheComponents` on, `instant = false` | Not shipped (`next.config.ts` is `{}`) | Yes. Next is still 16.3.4 |
| 3–6 | Convert routes to `'use cache: private'`; per-segment `prefetch` | Not shipped (no `'use cache'`, `cacheLife` or `prefetch` export in `src`) | The approach fits, but **each PR's inventory is stale**: 10 `cacheForUser` call sites where the plan lists 7 (new: `decks/[id]/changes`, `lib/profile/load.ts:608`, `lib/decks/tuning-read.ts:111`), keys now carry the index generation, and there are 17 `loading.tsx` files, not 16 |
| 7 | Payload composition | Not shipped as a PR; some trims landed via #761 and #820 | Needs re-measuring (section 2) |
| 8 | Deck query time | Not shipped as a PR; the deck page gained two parallel waves elsewhere | Superseded by options 3 and 5 below |
| 9 | Filter state and the final table | Not shipped | Unchanged |

**The revisit problem #687 set out to solve is still there** (section 2's soft-nav column). But
this research ranks it **below** the three fixes to server time, and the reason is the order of
the costs. A cached revisit only helps the second visit, while the first visit still pays every
round trip. And `'use cache: private'` needs an invalidation story per route (the `<Activity>`
ruling in the #687 memory), which is the largest effort on this list.

## 5 · Options, ranked by expected win per unit of effort

Wins are for **production** unless marked "measured".

| Rank | Option | Effort | Expected win |
|---|---|---|---|
| **1** | **Run the functions next to the database.** Set the Vercel function region to `pdx1` (Portland), beside Neon's us-west-2, via `regions` in `vercel.json` or the project setting, on both projects. Alternatively move Neon east, which is a data migration and far more work | **Config only** | Each round trip drops from ~60–70ms (estimated) to a few ms. **Card details: ~200–250ms saved** for an owned card (4 serial trips), ~250–300ms for an unowned one (5). **Deck page and Home: ~400–500ms each** (6–9 serial levels). Every route gains. Hugh's requests already enter at `sfo1`, so pdx1 is also closer to him than iad1. **Measure first**: PR 1 adds the `Server-Timing` needed to confirm the round-trip figure on staging before and after |
| **2** | **Prefetch card details on intent.** On `pointerenter` (desktop, ~100ms debounce) and on press-start (`pointerdown`, touch), call the existing `fetchCard` and file the answer in the provider's `Map`, so the press finds it. No new cache, and no `staleTimes` | Small (provider only) | **Measured: a cold press of 250–330ms becomes the warm path's ~40ms** whenever the pointer rests 250ms+ before the press. `pointerdown` saves ~60–100ms on touch. **Risk:** Next runs server actions **one at a time per client**, so a hover prefetch could queue in front of a real action. Serve the prefetch from a route handler (`GET`) instead of the action, or cap it at one in flight and drop stale requests |
| **3** | **Rewrite the claim model's senior-claims figure as a window function**, over `claim_decks_all` partitioned by oracle id, ordered by `since`. It is O(n log n), where the correlated aggregate is O(n²). Give the `owned` CTE an index path instead of the 35k-row `cards` scan | Medium (one SQL module, but the most probe-covered one in the repo: `probe:claims` has eight mutation cases to keep green) | **Measured basis:** 174ms of 266ms per call is the correlated node, and ~40ms is the scan. Expect ~200ms off each user-wide call. Home and `/decks` each run it three times (see section 3 for the call sites), so **~300–400ms of database time per request**. On a card press the narrowed read (43–52ms) keeps its cost only where the user-wide build remains, so the expected win there is **up to ~40ms**, and every write that re-reads claims gets faster too. The cost grows with deck count, so it only gets worse as Hugh builds decks |
| 4 | **Collapse `loadCardDetail`'s serial levels from 4 (owned) or 5 (unowned) to 2**: start bracket flags, combo partners, prices, proxies and the gate at the top; pair `cards` with `printings` | Small | 2 round trips for an owned card and 3 for an unowned one. For the unowned path that is ~100ms here (measured RTT), ~200ms in production today, a few ms after option 1. **Do it anyway**; it is small and removes the dependence on region |
| 5 | **Deck page: the combo reads.** EXPLAIN and index `candidate-facts.ts`'s `two_card` (399ms) and `near-miss.ts`'s `pair` (173ms), or cache both per (deck list fingerprint, index generation) with `cacheForUser`, as suggestions already are. Both loaders return `Map`s, and `cacheForUser` stores JSON, so a `Map` would come back as `{}` and silently drop the facts. The cached shape has to be an entry array, rebuilt into a `Map` at the render boundary | Medium | ~570ms of database time per deck-page load, which is **~40% of that page's database time**. With the other reads in parallel, the visible win is ~200–400ms |
| 6 | **Deck page and Home: remove the independent serial awaits** listed in section 3 | Small | One to three round trips per page: ~33–100ms here, ~70–200ms in production today |
| 7 | **Cache Home's and `/decks`'s user reads** (`listDecksWithStats`, the shopping roll-up) with `cacheForUser`, invalidated where the deck list already invalidates | Medium (invalidation must be complete: every deck write, every collection replace, every pull) | Removes the dominant work (the claim-model reads inside them) from a warm revisit of `/decks`: **~700ms → roughly 150–250ms**. Home gains less, because it still runs its own `loadAvailability` (`app/page.tsx:156`), `loadCollectionPool`, `getCollectionLastUpdated` and the owned-art resolve, unless those join the cache scope too. Only for revisits within the cache's life |
| 8 | #687 PRs 2–6: Cache Components and `'use cache: private'` | Large | Instant revisits everywhere. Worth it after 1–7, when the first visit is no longer the complaint |
| 9 | Card image preload beyond #998 | — | **Not recommended.** The art already paints within 2–20ms of the dialog (measured). Preconnect was tried and withdrawn in #979 |
| 10 | A smaller card-detail payload | — | **Not recommended.** The unused fields are a few bytes of a one-card reply |

## 6 · Recommended PR sequence

1. **Server-Timing on the deck page, Home, `/decks` and the card-detail action**, plus the
   measurement harness committed as `pnpm measure:load`. This is the before figure every later PR
   is held to, taken on **staging** as AGENTS.md requires. It also settles the one estimate here,
   the production round trip, with a measurement.
2. **The function region to `pdx1`** on the-99-staging first, re-measured with PR 1's timings,
   then production. Config only. A migration-bearing production build still runs
   `vercel-migrate.ts` wherever the build runs, so the region change does not touch it.
3. **The card-detail prefetch on intent** (option 2), with a browser probe that presses a hovered
   card and asserts the dialog opens without a server round trip, and one that presses a real
   action while a prefetch is in flight.
4. **`loadCardDetail` to two levels** (option 4).
5. **The claim model's window function and the `owned` index path** (option 3). `probe:claims`
   must pass all eight mutations unchanged, and `loadDeckBuyRows` must stay agreeing with
   `loadAvailability`.
6. **The deck page's combo reads** (option 5), then **its serial awaits and Home's** (option 6).
7. **User-read caching for Home and `/decks`** (option 7), with its invalidation proved by probe.
8. Only then, **#687's Cache Components line**, with its inventories redone against today's code.

PRs 1–4 are small and between them carry most of the win for card details. PRs 5–6 are where
`/decks`, the deck page and Home get their server time back.

## 7 · Caveats

- Local timings use a 33ms database round trip. Production's is estimated, not measured, and PR 1
  exists to measure it.
- The snapshot is 19 decks (staging has 20). The claim model's cost grows with deck count, so
  staging's figure is at least this one. Production's deck count was not read.
- Server caches were warm in every timing here. A cold `cacheForUser` entry (the first visit
  after a write, or after a catalog refresh) costs more.
- No write was made outside the scratch branch. The branch can be deleted when this PR is read.
