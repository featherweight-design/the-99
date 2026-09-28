# List payload shrink — `/collection` and `/discover`

Plan only: no code changed. Asked for by Hugh (via the-99-d9) on 2026-09-28, after the
navigation-pending measurements in
`docs/superpowers/design-briefs/2026-09-28-navigation-pending-escalation.md` §2. On Slow 4G with a
4× CPU throttle, `/collection` (289KB RSC) and `/discover` (357KB) take 2.3–2.6s on every visit,
cached chunks or not. Every other route stays under 1s on a repeat visit.

**The short version.**

- Both payloads ship the whole list, and every row carries what a row DRAWS. Only the first window
  draws: 200 of 2,820 cards on `/collection`, and 25 of 3,069 commanders on `/discover`.
- On `/discover`, two draw-only columns are 64% of the wire: the generated sentence (`prose`)
  and the art URL. On `/collection` the art URL is the largest single field.
- Keep every row for filtering, sorting and search, and send the draw-only fields for the first
  window only. That cuts `/discover` by **70%** (362KB → 109KB gzipped) and `/collection` by
  **46%** (284KB → 153KB), and filtering stays instant.
- A field trim with no change in behavior takes `/collection` down **20%** on its own. The image
  cache stamp stays (§3).
- The grid's ART is the largest byte cost of all, and none of it is in the RSC figure: every one of
  the 200 windowed tiles fetches a ~110KB `normal` image at once, about **22MB**. Loading art only
  for tiles near the viewport takes a first desktop screen to about 2MB. No smaller Scryfall size is
  sharp at the tile's width, so the saving comes from loading less, not from smaller files (§2).
- The recommendation is four PRs (§5). The first is the lazy art. The second is the trim. Neither
  changes behavior.

## 1 · How this was measured

- **Data.** A scratch Neon branch (`scratch-list-payload`, `br-soft-math-a6xscjmk`, forked from
  local-dev, migrated to main) holding a fresh `pull:staging` snapshot of the reference account:
  20 decks and 3,250 collection rows, which `/collection` collapses to 2,820 cards. Nothing was
  written to staging or production. The catalog and the commander index are local-dev's.
  **That matters for `/discover`**, whose rows and sentences come from the index: its figures here
  are a local-dev index under a staging collection. PR 3 re-measures on a scratch fork of STAGING
  (the account's rows copied onto the fixture login there), and its PR states both. `/collection`'s
  figures depend on the account's own cards and read catalog fields both databases share, and
  #1107 measured them again on the same copy: 228.8KB gzipped against the 228.3KB predicted.
- **Server.** `next start` of `main` at `4237f1f` (not `next dev`, whose payloads differ).
- **Capture.** Signed in as the fixture account in a real browser, each route's RSC payload was
  fetched with `RSC: 1` from inside the page and saved whole. This is the full route tree. A
  client navigation sends a little less, because the shared layouts are omitted, but the list
  line is the same bytes.
- **Sizes.** "gzip" is `gzip -9` of the bytes as fetched. It matches the brief's wire figures
  (`/collection` 292KB here against 289KB, `/discover` 367KB against 357KB), so it stands in for
  the wire.
- **Costing a field.** A field's cost is how much the list line's gzip shrinks when that field is
  removed from every row. Raw size is not the cost: a long URL that repeats compresses to little,
  and a short unique id does not.
- **Costing an option.** Each option is priced by transforming the captured rows the way the
  change would, then compressing the result. The figures are what the change would ship, not an
  estimate of it.
- **Time.** On the brief's slow-network table, each route's repeat-visit time rises with its
  payload above `/commanders` (41KB, 875ms): **6.0ms per gzipped KB** for `/collection`
  ((2367−875)/(289−41)) and **5.6ms** for `/discover` ((2644−875)/(357−41)). Each route's
  predictions below apply its own slope. They are estimates to be re-measured with `measure:load`
  after each PR, not results.

## 2 · What is in each payload

### `/collection` — 2,820 rows, 284KB gzipped (1.78MB raw)

The page (`src/app/collection/page.tsx:48-84`) ships `BrowseListCard[]` (`browse.ts:264`) plus
`availability`, which is attached per request outside the `cacheForUser` entry. It adds
`ownedSets` (218 sets, 3.7KB) and two booleans. Every filter and sort runs on the client
(`browser.tsx:428-429`). The list draws `PAGE_SIZE = 200` rows (`browser.tsx:60`) with Show more,
and all 2,820 ship.

| Field | gzip saving if dropped | raw | Read by the client for |
|---|---:|---:|---|
| `imageUri` | 93.1KB | 271KB | grid tile art only; rows view never draws it |
| `oracleId` | 69.1KB | 107KB | key, open, modal fetch |
| `name` | 41.3KB | 52KB | name, search, name sort |
| `availability` | 30.8KB | 455KB | the four counts, plus `claims[].mature/id/name` |
| `typeLine` | 16.6KB | 56KB | rows view, type filter |
| `keywords` | 12.3KB | 24KB | **nothing** |
| `setCounts` | 9.3KB | 34KB | Set ▾ counts |
| `setCodes` | 8.3KB | 21KB | set filter; it is exactly the keys of `setCounts` |
| `manaCost` | 8.2KB | 22KB | rows view pips |
| `primarySetCode` | 7.6KB | 14KB | set label, set sort |
| `colorIdentity` | 6.1KB | 15KB | color filter, grid fallback wash |
| `rarity` | 4.2KB | 23KB | dot, sort |
| `cmc` | 3.0KB | 3KB | **nothing** |
| `comboPartner` | 2.6KB | 5KB | `.name` only; `.oracleId` is unread |
| `preferredPrinting` | 2.6KB | 12KB | **nothing** (the modal reads its own fetched card) |
| `layout`, `printedName` | 2.5KB, 2.1KB | | drawn, and read by search (`matchesName` → `printedNameOf`, `browse.ts:745,822`) and by the name sort and every sort's tiebreak (`printedFaceName`, `browse.ts:765-769,892,921`) |
| `quantity`, `facts`, `comboOtherPartners` | ≤2.2KB each | | drawn |

- **`availability` is the costliest raw field.** 1,173 of 2,820 rows carry claims, 1,441 claims in
  all, over only 20 decks. Every claim repeats its deck's uuid and name, plus nine fields no
  list surface reads: `since`, `senior`, `granted`, `pending`, `quantity`, `commander`,
  `locked`, `versionNumber`, `commanderCopies`. It compresses well, which is why it costs 31KB gzipped
  rather than 455KB.
- **Images are not in the RSC figure, but they share the link.** The grid draws art as a CSS
  background (`grid-view.tsx:95`) on all 200 windowed tiles. A browser fetches a CSS background
  for every rendered element, whether or not it is in view. So opening the grid asks for 200
  images at once, and Scryfall sends each one with a one-year `max-age`: every FIRST visit pays in
  full, and a repeat visit mostly hits the browser cache.

  **Which size is sharp enough.** The tile width comes from the grid's own CSS, not a browser
  measurement. At 390 it is two columns in a 362px track with a 12px gap: **175px**. At 1300 the
  track is 1,300 − 62 (rail) − 68 (padding) = 1,170px. A 178px floor with 20px gaps fits six
  columns: **178px**. The tile's aspect is 63/88, so the art is about 245px tall. Scryfall's sizes
  against that, with bytes averaged over 39 of the first 200 cards, fetched once each:

  | Size | Pixels | Mean bytes | Pixels per CSS px at a 178px tile | Sharp at |
  |---|---|---:|---:|---|
  | `small` (`printings.image_uri_small`) | 146×204 | 14.1KB | 0.82 | nothing; it is upscaled even at 1× |
  | `normal` (shipped) | 488×680 | 109.7KB | 2.74 | 1× and 2×; about 0.93 of a 3× phone's 525 device px |
  | `large` | 672×936 | 179.8KB | 3.78 | 3× |

  `small` sits under the tile's own CSS width, so a `srcset` or `image-set()` offering it at 1×
  would still draw a soft card, on the widest screens most of all. `normal` is the right file.
  `art_crop` is the art alone, without the frame and the name, and the tile draws the whole card,
  so it is a design change rather than a size choice. The saving here comes from **how many**
  images load, not how big they are.

  **First-screen bytes.** With art loaded only near the viewport, the first screen holds about three
  rows. That is ~18 tiles at 1300 and ~6 at 390, which is derived from the tile height and the
  page's furniture, not counted. So:

  | | Today (all 200) | Lazy, 1300 (~18) | Lazy, 390 (~6) |
  |---|---:|---:|---:|
  | `normal` | ~21.9MB | ~2.0MB | ~0.66MB |

  An observer margin of one extra screen would roughly double the lazy figures and still cut the
  total by about 80–90%. Rows view draws no art (`rows-view.tsx` reads no `imageUri`), so this
  item is the grid's alone.

### `/discover` — 3,069 rows, 362KB gzipped (1.03MB raw)

The page (`src/app/discover/page.tsx:33-91`) ships one ranking, dictionary-encoded
(`src/lib/discovery/encode.ts`, cached per sort under `cacheForUser`), plus `printedIn` for
`Printed in ▾` (398 sets and one index array per row, 12KB). The list draws `REVEAL_STEP = 25`
rows and all 3,069 ship. Search, colors, match, Printed in and four of the five orders are
client-only. Only `o=new` makes a round trip, and it ships a whole second list of 1,487 rows
(177KB), which `useDiscoveryCache` then holds for the visit.

| Column | gzip saving if dropped | raw | Read by the client for |
|---|---:|---:|---|
| `prose` | 129.0KB | 415KB | the row's sentence; 2,754 rows carry one, averaging 148 characters |
| `artCropUri` (stem stripped) | 104.4KB | 175KB | the row's art wash |
| `slug` | 34.2KB | 70KB | key, link, Printed in lookup |
| `name` | 31.8KB | 76KB | title, search, name sort |
| `gapSlot` | 15.8KB | 44KB | the gap line |
| `price` | 10.1KB | 86KB | the price figure |
| `deckCount` | 9.0KB | 10KB | popularity figure and sort |
| `releasedAt` | 9.0KB | 37KB | Recent sort only |
| `rank` | 8.2KB | 11KB | drawn; always the row's index + 1 |
| `colorIdentity` | 5.4KB | 24KB | pips, color filter |
| `score`, `measurableTotal`, `fitPool`, `fitRoles`, `fitSynergy` | ≤0.6KB each | | fit bar; `score` and `measurableTotal` are derivable |

- **List meta** that no `/discover` client reads: `freePoolSize`, `poolExcluded`, `availOk`. It is
  small, and dropping it is a tidy-up rather than a saving.
- **There are no precomputed alternate rankings here.** `/discover` already ships one ranking per
  payload. The precomputed rankings the prompt names live on `/commanders` (`commanders-view.tsx`
  ships the free ranking as a delta), and that whole route is 44.7KB gzipped. §3 covers it.

## 3 · Options

Each option is priced on the capture. "Saving" is against the shipped list line. The predicted
repeat-visit time uses the §1 slope and is an estimate.

### A · Trim fields (no behavior change)

| Change | `/collection` rows gzip | Saving |
|---|---:|---:|
| Shipped | 283.7KB | — |
| Drop `keywords`, `cmc`, `preferredPrinting`, `setCodes` (derive from `setCounts`), `comboPartner.oracleId` | 255.8KB | 10% |
| + `availability` as the four counts, with claims as indexes into one deck dictionary (id, name), each claim `index * 2 + sleeved` (a sign would lose deck 0's: `-0` serialises as `0`) | 237.0KB | 16% |
| + `imageUri` as the Scryfall id plus its cache stamp (the `?NNN` query Scryfall puts on its own image URLs), with the prefix restored on the client; a URL of any other shape crosses whole | 228.3KB | 20% |
| + drop the cache stamp as well | 215.4KB | 24% |
| Positional tuples instead of objects | 216.5KB | 24% (no gain over the line above) |

- **Cost.** One wire type and its decoder. The unused fields are proved unread by removing them
  from the shipped type, so the compiler finds any reader. A grep already confirms none among
  the collection components. Tuples buy nothing over keyed objects once gzip has run, so they
  are not worth their decoder.
- **The stamp stays.** It is Scryfall's image cache-buster, and the one-year `max-age` above is
  why it matters. Without it a re-scanned image stays stale in the browser for up to a year. That
  is a correctness cost, and 4% of the payload does not buy it.
- **`/discover` has almost nothing to trim, and #1107 trims none of it.** Dropping `rank`, `score`
  and `measurableTotal` would save 2% (362 → 355KB), and none of the three is safely derivable:
  `score` and `measurableTotal` would need a second copy of `computeFit` on the client, and `rank`
  is the SERVER's order, which `CommanderRow` deliberately draws after the client reorders by
  name, recent or popularity. So all three stay. The dictionary encoding in #497 already took the
  easy bytes.
- **Predicted:** `/collection` about 2.37s → 2.04s.

### B · Send the draw-only fields for the first window, and fetch the rest as rows reveal

Every row keeps what filtering, sorting and search read. The fields a row only DRAWS ship for the
first window, and a revealed row fetches them.

| Change | gzip | Saving | Predicted repeat visit |
|---|---:|---:|---:|
| `/discover`: `prose` only for the first 25 rows | 235.7KB | 35% | ~1.9s |
| `/discover`: `prose` and art only for the first 25 | 141.1KB | 61% | ~1.4s |
| `/discover`: every draw-only column only for the first 25 (prose, art, gap line, price, fit parts; derivables dropped) | **109.3KB** | **70%** | **~1.25s** |
| `/collection`: A, plus art, facts and combo partner for the first 200 only | 153.3KB | 46% | ~1.6s |
| `/collection`: the same with a first window of 60 | 149.4KB | 47% | ~1.55s |

- **Rows stay on the client, so filtering stays instant.** Search, colors, sets, availability
  and every client-side order still run over all rows. Only a row entering the window may need
  its drawn fields. Every field a filter, a search or a sort reads stays on every row. That is
  why `printedName` and `layout` are NOT deferred on `/collection`: search and the name sort read
  both, so deferring them would drop Secret Lair renames from search and reshuffle name order as
  batches arrived.
- **A fetch per reveal.** Show more, a filter or a search that brings new rows into the window
  fetches their drawn fields in one batch, keyed by slug or oracle id. On the slow profile that
  is one round trip (~560ms) with skeleton rows, against today's 2.4s (`/collection`) and 2.6s
  (`/discover`) on every visit.
- **The batch is a GET route handler, never a server action.** Next runs a page's server
  actions one at a time (AGENTS.md, `probe:card-prefetch`), so a read issued as an action would
  queue with the reader's writes. The card prefetch also recorded a pending action slowing the
  NEXT action on the page (a press went 315 → 815ms; `card-detail-provider.tsx:16-22`, where
  the mechanism inside Next is noted as not pinned down).
- **The batch's source is the FULL list, kept in the cache; the window is cut at the request.**
  `/discover` caches `{ encoded, oracleIds }` under `discoveryKey(sort)`, which is deliberately
  independent of `q`, colors and `p`, and that stays true. The entry keeps every column for every
  row (about 0.5MB of the 2MB ceiling, which `probe:payload` guards). The page, and only the page,
  blanks the draw-only columns of every row outside the URL's first window before it ships. The
  batch route reads the same entry and returns those columns for the ids asked, so it costs one
  cache hit and never recomputes, and no URL-dependent window ever reaches a shared entry.
  `/collection` does the same with its `browse-6` entry.
- **The route follows `/api/card-detail`'s contract.** The reader comes from the Clerk session,
  never the request. The ids are validated (format, a cap per batch) and answered only from that
  reader's own cached list, so an id outside it returns nothing. The response is
  `Cache-Control: private, no-store`, because every field is user-dependent.
- **The server must know the first window.** It is the window of the URL's own sort and
  filters.
  - **`/collection`** filters and sorts through the pure `filterCards` / `sortCards` in
    `browse.ts`. The server can run the same two functions over the URL's `q c t s avail sort
    dir`, so both sides agree by construction.
  - **`/discover`** computes its window inside the client-only `discovery-view.tsx`, with a
    module-private `ordered` (:100), an inline search, `filterByColors` and `isPrintedIn`
    (:275-305). The server page calls none of them; its `parseLaneParams` feeds only
    `discoverSort`. So PR #3 first extracts that window logic into a shared module both sides
    import. It is a pure move, and it is listed in §5.
  - **The view does not change the window.** Grid and rows draw the same first 200 cards, so the
    window's fields ship whatever the view. Rows view simply does not draw the art it received,
    200 rows' worth. The view resolves from `?view=`, then localStorage, then the viewport
    (`browser.tsx:286`), which the server cannot know. So the plan does not tailor the payload
    to the view.
- **The printing-pick patch** (`collection-client.tsx:56-75`) layers art over rows. It has to
  layer over fetched fields too, which is one merge in the same place.
- **Cost.** A route per surface, a small per-visit cache of fetched fields (the discovery-cache
  rule: component-held, one visit, a fresh server payload wins), and skeleton rows for the
  pending batch. This option is where the savings are.

### C · Send the first window only, and page the rest from the server

| Change | gzip | Saving |
|---|---:|---:|
| `/discover`: 25 rows only | 9.6KB | 97% |
| `/discover`: 100 rows only | 18.8KB | 95% |
| `/collection`: 200 rows only | 17.6KB | 94% |

- **This option needs D.** The client no longer holds the list, so every search keystroke, color
  pip, set, availability chip and sort is a server round trip.
- **It changes the page's feel, not just its weight.** Those controls are instant today. On the
  slow profile each would cost at least one round trip (~560ms). The count lines, the
  "Drop … and you get N back" fixes and Printed in's promised counts are all client-computed
  over the whole list today, and each would need a server answer.
- **The saving over B** is about 100KB on `/discover` (~0.55s) and 136KB on `/collection`
  (~0.8s), once per visit on the slow profile. It is bought with a round trip on every control
  press. Not recommended.

### D · Move filtering and sorting to the server

- **This option is C's other half.** Alone, with the whole list still shipped, it saves nothing.
- **It costs a round trip per control press**, and it rebuilds the counts and suggestions in §C
  as server answers.
- Not recommended: B keeps filtering on the client and gives up only 100–136KB of C's saving.

### E · Drop the precomputed alternate rankings

- **`/discover` ships none**, so there is nothing to drop there. Its second ranking (`o=new`,
  177KB) is fetched only when asked for.
- **`/commanders` ships the free ranking as a delta**, and the whole route is 44.7KB gzipped.
  Dropping the delta would put a round trip on every All/Free flip to save a few KB, on a route
  that is not slow.
- Not recommended. The rule in AGENTS.md ("Caching a list a reader flips between") stays.

### F · Defer data no row draws until asked

- **This option is already mostly done.** #497 took the modal's data (`printings`, `oracleText`,
  the back image) out of the list and fetches it on click.
- **What remains** is B's draw-only fields, plus `/discover`'s `deckIdentities` (read only by the
  filtered-empty clause) and the three unread meta fields. Together those are under 2KB.

## 4 · Interactions

- **The list cache (#1079, `cachePageForUser`).** It serves Home and `/decks` from a per-reader
  stamp and is not used by `/collection` or `/discover`. It removes SERVER time, which is not the
  problem on these two routes: on a fast connection `/collection` answers in ~350ms and
  `/discover` in ~120ms, and the slow-network wait is the payload crossing the link and being
  parsed. So #1079 and this work neither overlap nor conflict. B's route handlers read the
  existing `cacheForUser` entries, not the page cache. Smaller payloads also bring both routes
  well under the data cache's 2MB entry ceiling, which keeps a page-cache migration open for
  later.
- **The discovery cache (`useDiscoveryCache`).** It holds whole rankings for one visit. Under B it
  holds the slimmer rankings, and a sibling map holds the draw-only fields fetched this visit,
  keyed by slug. A cached ranking reused on a flip back to `bestfit` reuses the fields already
  fetched. The `o=new` payload shrinks by the same share (177KB today). The cache's rules are
  unchanged: one visit, a fresh server payload wins, and the URL is written on a hit.
- **`probe:payload`** (`scripts/probe-payload-size.mts`) holds `/discover` and the `/commanders`
  owned lane under a 1.6MB raw budget. It does NOT cover `/collection`, and no workflow runs it:
  it is a by-hand check against a database. PR #3 lowers the `/discover` budget to what it
  ships. PR #2 adds a `/collection` budget (through `loadBrowseCards` and the wire encoder), and
  #4 lowers it. So a regression fails the probe, which each PR's body shows run. Wiring it into
  CI would need a database in CI, and that is out of scope here.

## 5 · PR boundaries and recommendation

**Recommended:** the lazy art first, then A, then B on each route. C, D and E are not
recommended, and §3 gives the reasons above with their measured cost.

| # | PR | Measured saving | Predicted slow repeat visit | Behavior change |
|---|---|---:|---:|---|
| 1 | **Lazy grid art on `/collection`**: tile art loads as tiles near the viewport (an `<img loading="lazy">` in place of the CSS background, or an IntersectionObserver), not all 200 at once; the file stays `normal` (§2) | not in the RSC figure: a first grid screen goes from ~21.9MB of art to ~2.0MB at 1300 and ~0.66MB at 390 | unchanged (the art is cached on a repeat visit); a first visit's art wait, read from `measure:load`'s first-card-image column | none visible |
| 2 | **`/collection` trim** (A with the stamp kept): drop the four unread fields and the `setCodes` duplicate, slim `availability` onto a deck dictionary, stem the image URL; `/discover` drops its derivables and three unread meta fields | `/collection` −20%, `/discover` −2% | ~2.0s / ~2.6s | none |
| 3 | **`/discover` first window** (B): extract the window logic (`ordered`, search, colors, Printed in) out of `discovery-view.tsx` into a shared module first, as a pure move; then every draw-only column for the URL's first 25, and a GET route returns the rest by slug in batches; skeleton rows while a batch is pending; the discovery cache keeps fetched fields per visit | −70% (362 → 109KB) | ~1.25s | revealed rows can show a skeleton for one round trip |
| 4 | **`/collection` first window** (B on top of #2): art, facts and combo partner for the URL's first window (`printedName` and `layout` stay on every row, because search and sort read them); a GET route by oracle id; the printing-pick patch merges over fetched fields | −46% of today (284 → 153KB) | ~1.6s | same as #3 |

- **Ordering.** #1 goes first. It is the smallest change and saves by far the most bytes, about
  20MB on a first desktop visit against about 55KB of gzipped RSC for the trim. It does not move the repeat-visit
  figure in the brief, because Scryfall's one-year `max-age` already serves repeat visits their
  art from the cache. It moves the first visit, and what a phone on a metered plan pays. #2 is
  safe and follows. #3 carries the most RSC saving and is independent of #2. #4 builds on #2's
  wire type.
- **None of these needs a design round.** No layout changes. The skeleton row for a pending batch
  reuses each list's existing loading row, the "logic changes need no Design round" ruling. If
  Hugh wants the pending state drawn, that is the one question for Design.
- **Every PR carries the before/after table:**
  - `measure:load` on a `pull:staging` scratch branch under the brief's slow profile, repeat
    visits at 1300 and 390;
  - the gzipped payload from this plan's method;
  - the `probe:payload` budget it sets or lowers, and that probe's run.
- **#3 and #4 each get a browser probe that presses Show more, a filter and a search**, and
  asserts that newly revealed rows draw their fetched fields. The mutation check drops the fetch
  and watches the probe fail on the rows past the first window.

## 6 · Decisions (Hugh, 2026-09-28, via d9)

1. **All four PRs, in the order in §5, the lazy art first.**
2. **Revealed rows show the list's existing loading row for one round trip** on #3 and #4,
   when Show more or a filter brings in rows the first payload did not draw.
3. **The image cache stamp stays** (§3), as the plan's default.
