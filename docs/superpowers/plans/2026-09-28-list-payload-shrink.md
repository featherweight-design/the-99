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
  **48%** (284KB → 147KB), and filtering stays instant.
- A field trim with no change in behavior takes `/collection` down **24%** on its own. It is the
  safe first PR.
- The recommendation is four PRs (§5). The first is a trim with no behavior change.

## 1 · How this was measured

- **Data.** A scratch Neon branch (`scratch-list-payload`, `br-soft-math-a6xscjmk`, forked from
  local-dev, migrated to main) holding a fresh `pull:staging` snapshot of the reference account:
  20 decks and 3,250 collection rows, which `/collection` collapses to 2,820 cards. Nothing was
  written to staging or production. The catalog and the commander index are local-dev's.
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
- **Time.** On the brief's slow-network table, the repeat-visit time rises about **6ms per
  gzipped KB** above `/commanders` (41KB, 875ms): `/collection` gives (2367−875)/(289−41) and
  `/discover` gives (2644−875)/(357−41) = 5.6. The predicted times below apply that slope. They
  are estimates to be re-measured with `measure:load` after each PR, not results.

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
| `layout`, `quantity`, `printedName`, `facts`, `comboOtherPartners` | ≤2.5KB each | | drawn |

- **`availability` is the costliest raw field.** 1,173 of 2,820 rows carry claims, 1,441 claims in
  all, over only 20 decks. Every claim repeats its deck's uuid and name, plus eight fields no
  list surface reads: `since`, `senior`, `granted`, `pending`, `quantity`, `commander`,
  `versionNumber`, `commanderCopies`. It compresses well, which is why it costs 31KB gzipped
  rather than 455KB.
- **Images are not in the RSC figure, but they share the link.** The grid draws art as a CSS
  background for all 200 windowed tiles at once, with no lazy loading. Five sampled `normal`
  images were 84–156KB each, so a first grid screen asks for roughly 20MB of art. That dwarfs
  the payload on a slow link. It is recorded in §5 as its own item.

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
| + `availability` as the four counts, with claims as indexes into one deck dictionary (id, name) and maturity as the index's sign | 237.0KB | 16% |
| + `imageUri` as the Scryfall id plus its cache stamp, with the prefix restored on the client (the `/discover` stem rule) | 228.3KB | 20% |
| + drop the cache stamp as well | 215.4KB | 24% |
| Positional tuples instead of objects | 216.5KB | 24% (no gain over the line above) |

- **Cost.** One wire type and its decoder. The unused fields are proved unread by removing them
  from the shipped type, so the compiler finds any reader. A grep already confirms none among
  the collection components. Tuples buy nothing over keyed objects once gzip has run, so they
  are not worth their decoder.
- **Dropping the stamp.** It is Scryfall's image cache-buster. Without it a re-scanned image can
  stay stale in the browser, so keeping it (20%) is the default. Hugh decides if 4% more is worth
  that.
- **`/discover` has almost nothing to trim.** Dropping the derivable `rank`, `score` and
  `measurableTotal` saves 2% (362 → 355KB). The dictionary encoding in #497 already took the easy
  bytes.
- **Predicted:** `/collection` about 2.37s → 2.0s (stamp kept) or 1.9s (dropped).

### B · Send the draw-only fields for the first window, and fetch the rest as rows reveal

Every row keeps what filtering, sorting and search read. The fields a row only DRAWS ship for the
first window, and a revealed row fetches them.

| Change | gzip | Saving | Predicted repeat visit |
|---|---:|---:|---:|
| `/discover`: `prose` only for the first 25 rows | 235.7KB | 35% | ~1.9s |
| `/discover`: `prose` and art only for the first 25 | 141.1KB | 61% | ~1.4s |
| `/discover`: every draw-only column only for the first 25 (prose, art, gap line, price, fit parts; derivables dropped) | **109.3KB** | **70%** | **~1.25s** |
| `/collection`: A, plus art, facts, combo partner, layout and printed name for the first 200 only | 150.7KB | 47% | ~1.6s |
| `/collection`: the same with a first window of 60 | 146.7KB | 48% | ~1.55s |

- **Rows stay on the client, so filtering stays instant.** Search, colors, sets, availability
  and every client-side order still run over all rows. Only a row entering the window may need
  its drawn fields.
- **A fetch per reveal.** Show more, a filter or a search that brings new rows into the window
  fetches their drawn fields in one batch, keyed by slug or oracle id. On the slow profile that
  is one round trip (~560ms) with skeleton rows, against today's 2.4s on every visit.
- **The batch is a GET route handler, never a server action.** This is the `probe:card-prefetch`
  lesson: Next runs a page's server actions one at a time, so a read issued as an action queues
  behind the reader's writes, and it made the next action on the page ~800ms slower. The route
  reads through the same `cacheForUser` entry the page does, so it costs one cache hit, not a
  recompute.
- **The server must know the first window.** It is the window of the URL's own sort and
  filters. The server already parses those params on `/discover` (`parseLaneParams`), and
  `/collection` would parse its `q c t s avail sort dir view`. The same pure `filterCards` /
  `sortCards` run on both sides, so they agree by construction. A client whose stored view
  differs from the URL (the collection view toggle falls back to localStorage) gets one fetch
  for its first window. That is the only case where the first paint waits on a fetch.
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
- **The saving over B is about 100KB.** That is roughly 0.6s once per visit on the slow
  profile, bought with a round trip on every control press. Not recommended.

### D · Move filtering and sorting to the server

- **This option is C's other half.** Alone, with the whole list still shipped, it saves nothing.
- **It costs a round trip per control press**, and it rebuilds the counts and suggestions in §C
  as server answers.
- Not recommended: B keeps filtering on the client and gives up only about 100KB of C's saving.

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
- **`probe:payload`** (`scripts/probe-payload-size.mts`) holds both lists under a 1.6MB raw budget.
  Each PR here should lower that budget to what it ships, so a regression fails CI rather than
  a phone.

## 5 · PR boundaries and recommendation

**Recommended:** A, then B on each route, then the image item. C, D and E are not recommended,
and §3 gives the reasons above with their measured cost.

| # | PR | Measured saving | Predicted slow repeat visit | Behavior change |
|---|---|---:|---:|---|
| 1 | **`/collection` trim** (A with the stamp kept): drop the four unread fields and the `setCodes` duplicate, slim `availability` onto a deck dictionary, stem the image URL; `/discover` drops its derivables and three unread meta fields | `/collection` −20%, `/discover` −2% | ~2.0s / ~2.6s | none |
| 2 | **`/discover` first window** (B): every draw-only column for the URL's first 25; a GET route returns the rest by slug in batches; skeleton rows while a batch is pending; the discovery cache keeps fetched fields per visit | −70% (362 → 109KB) | ~1.25s | revealed rows can show a skeleton for one round trip |
| 3 | **`/collection` first window** (B on top of #1): art, facts, combo partner, layout and printed name for the URL's first window; a GET route by oracle id; the printing-pick patch merges over fetched fields | −47% of today (284 → 151KB) | ~1.6s | same as #2 |
| 4 | **Lazy grid art on `/collection`**: tile art loads as tiles near the viewport (IntersectionObserver or `loading="lazy"` on an `<img>`), not all 200 at once | not in the RSC figure; the first grid screen stops asking for ~20MB of art | the image wait, measured by `measure:load`'s first-card-image column | none visible |

- **Ordering.** #1 is safe and lands first. #2 carries the most saving and is independent of #1.
  #3 builds on #1's wire type. #4 is independent and small.
- **None of these needs a design round.** No layout changes. The skeleton row for a pending batch
  reuses each list's existing loading row, the "logic changes need no Design round" ruling. If
  Hugh wants the pending state drawn, that is the one question for Design.
- **Every PR carries the before/after table:**
  - `measure:load` on a `pull:staging` scratch branch under the brief's slow profile, repeat
    visits at 1300 and 390;
  - the gzipped payload from this plan's method;
  - a lowered `probe:payload` budget.
- **#2 and #3 each get a browser probe that presses Show more, a filter and a search**, and
  asserts that newly revealed rows draw their fetched fields. The mutation check drops the fetch
  and watches the probe fail on the rows past the first window.

## 6 · Decisions for Hugh

1. **Approve the four-PR shape**, or pick a subset. #1 alone is a ~20% cut with no behavior
   change. #2 is the largest single win.
2. **Accept a skeleton on revealed rows** (#2, #3): one round trip when Show more or a filter
   brings rows in that the first payload did not draw, against ~1.1s saved on every visit on the
   slow profile.
3. **Keep or drop the image cache stamp** in #1: 4% more on `/collection` against possibly stale
   art after Scryfall re-scans an image.
