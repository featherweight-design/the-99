# List payloads (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **`/discover` ships whole rows for its first window only** (list payload plan, PR 3). The page
  cuts every row outside its URL's first 25 down to the list columns (`cutToWindow`), and the rest
  of each row's draw fields arrive from `GET /api/discovery-fields?sort=&b=&s=` (`b`, the role basis the page's
  payload was counted by, so a later switch flip never mixes bases) — signed in, at most
  `MAX_FIELDS_BATCH` (200) slugs, answered `private, no-store` from the same cached payload the
  page reads (`loadDiscoveryPayload`), so the two cannot disagree about a row. The window is cut
  at the request and never stored: the cache entry stays keyed on the sort (and the role basis) alone. `probe:payload`
  holds what ships to 0.3MB (the worst account measured 0.253MB for `fit` and 0.133MB for `new`,
  against 1.104MB for the whole entry), and fails with every row shipped whole.

  **The server's window must be the client's.** The page finds its first 25 through
  `lib/discovery/window` — the same search, set, order and colour steps the view runs — so a row
  the view draws on arrival always arrived whole. A row it wants and does not have holds the list
  under `aria-busy` with the previous rows standing, and `Show more` goes busy and ignores a press;
  no new visuals (Hugh, option a).

  **The background fetch never renders.** The loop (`ui/use-withheld-fields.ts`, shared with
  `/collection` since PR 4, and `useDrawFields` wraps it) lives outside React state: one
  batch in flight, the reader's waiting rows first, the rest after `requestIdleCallback`, and a
  render only when a batch lands a row the reader is waiting on. A link click, the Navigation
  API's `navigate`, `pagehide` and unmount abort the batch in flight; a `router.push` away is seen
  only at commit.

  **Measured on the slow profile, the batches cost the next navigation nothing**: pressed at the
  same moment after landing (20s or 30s), `/discover` → `/commanders` reads 1.3s on main and on
  this build, with a batch in flight or with the route blocked. What DID move is WHEN a reader can
  press. The page's document went from 1.41MB (~15.5s to arrive) to 528KB (1.6s), so the page is
  usable at ~7.5s instead of ~17.7s, and a press that early queues behind the app's own startup
  downloads (its JS, the fonts, and at the time Clerk's prebuilt UI, no longer fetched since `prefetchUI={false}` on 2026-10-12) and arrives at ~24s. That is startup
  contention, identical with the fields route blocked, and not this feature's cost. It also means
  a harness that presses "2s after the router exists" compares two different moments on two
  builds with different load times; press at a fixed time after landing instead.

- **`/collection` ships whole cards for its first window only** (list payload plan, PR 4), the same
  shape as `/discover`'s and through the same loop. The page reads its URL (`q c t s avail sort
  dir`), finds the first 200 with `lib/collection/window` (`parseBrowseParams`, then the pure
  `filterCards` and `sortCards` the browser runs), and cuts every other card to the columns a
  filter, a search or a sort reads (`cutCollectionWindow`). The art, the facts and the combo
  partners (`COLLECTION_DRAW_KEYS`) arrive from `GET /api/collection-fields?ids=` in batches of up
  to 200 oracle ids, read from the same cached list the page reads (`loadCollectionList`: one
  loader for both, because the data cache keys an entry on the function it wraps). `printedName`,
  `layout` and `manaCost` stay on every card. The browser parses its own first render with the
  same `parseBrowseParams`, so the cards it draws on arrival are the ones shipped whole. The page
  cuts through `pageWindowIds`, which JOINS the availability it reads beside the cached list first:
  that list carries none, and `?avail=` filters on it, so a cut over the bare list called every
  card free and drew a busy list on every availability URL (the pre-open pass found it).

  **A withheld card is marked by the decoder** (`withheld: true`, from the wire card's own shape),
  never by the fields present on a row afterwards, because a printing pick lays an `imageUri` over
  a row whether it was drawn or not. Fetched fields sit UNDER the row, so a pick's art wins, and
  they are held against the list the page decoded (`served`), not the pick-patched one, or every
  pick would drop them. A reveal or a filter reaching cards whose fields have not landed keeps the
  cards already drawn under `aria-busy`, and `Show more` ignores a press while it waits; no new
  visuals, as on `/discover`. `probe:payload` holds the shipped wire to 1.05MB (0.959MB measured,
  153.6KB gzipped, against 1.122MB with every card whole).

  **Its grid's art waits for the page**, except the first screen's: once the server draws the grid
  (`?view=grid`, or a desktop default), a lazy img still starts on the HTML parse, and on the slow
  profile ~2.4MB of art landed before hydration and held the page at ~20s against ~6s. The tile
  draws `HydratedImg` with the first `GRID_EAGER_TILES` (4) eager; the server cannot know the
  width, so that is a fixed count rather than columns times rows. 4 is measured: it hydrates as
  fast as the bare page at both widths, where 12 cost ~4.7s at 1300.
