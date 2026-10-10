# Deck printings (collection home epic, sub-project 3)

2026-10-10 · lane: planning · status: **awaiting Hugh's approval**

A deck remembers which printing it means for a card the player owns in more than one printing.
That printing drives the art, the buy tag's figure, Shopping, the Money card, export, and the
I got it preset. Picking it happens in card details, in the shipped Set field, opened from a deck.

## Sources

- Handoff: `design/design_handoff_the99_deck_printings/` at R3 (current canvas
  `The 99 - Deck Printings (R3).dc.html`), approved to ship (Hugh, 2026-10-10).
- Readiness audit: that folder's `READINESS-audit.md`, R3 verdict **YELLOW**, nothing left for
  Design. Its build findings E1 to E10 are build rules here, and are cited by number.
- Hugh's R3 rulings (2026-10-10), recorded in the audit's R3 section:
  - **(a)** an import naming a printing the player does not own appends
    `, N not in your Collection` to the arrival strip (one string, `/copy-review`);
  - **(b)** the Money card prices picks the way the buy tag does, landing with this line;
  - **(c)** I got it on a fallback-priced row presets the in-stock printing behind the figure, and
    never writes the pick;
  - **(d)** the price rule is the pick if it is in stock, else the cheapest in stock, else
    `sold out`, with no new tag style and no new copy.
- Roadmap: `docs/superpowers/plans/2026-10-06-collection-home-roadmap.md`, sub-project 3 and the
  About batching rule.
- Sequencing: Deck stats PR 6, the Money card, is on main (#1361, 64b80fcf8), so this line's schema
  change no longer races it.

## Settled, and not re-derived here

The handoff's rulings stand: owned printings only; no reset (picking another tile is the way
back); no new block, no new picker; one pick per card per deck; ownership stays by card; a pick is
not a deck edit (no pending banner, no Commit, no History line, analysis not stale); versions after
the line record the printing each card showed, older ones show today's art with no marker; the
commander uses the same Set field in its own details; rows, tiles, the card view, the hover
preview and the Shopping row gain no mark, and only the art and a priced figure move.

## Measured on staging (read-only, Hugh's account)

`user_3GkZrrTwOJBdqUpq6GambP0BC8w` on `staging` (`br-polished-pond-a6e63y0b`), 2026-10-10:

| Figure | Value |
|---|---|
| Decks | 21 |
| Card slots (body cards plus commanders) | 1,718 |
| Slots the player owns | 1,499 |
| Slots owned in two or more printings (where the picker opens) | **338** (114 distinct cards) |
| Collection art preferences stored today | 13 |
| Owned printings with a live price row | 3,313 of 3,314 |

Two things follow. The picker is not a corner case: 22.5% of owned slots (about one in four and a
half) can take a pick. And the
D2 fallback (a pick out of stock, so the tag prices the cheapest in stock) is rare on today's feed:
every owned printing of a multi-printing card is stocked. The fallback still has to be right,
because the feed moves daily, but it is a test case, not a frequency to design around.

## Code facts this plan stands on (checked against origin/main at 64b80fcf8)

- `PrintingRegion` (`src/components/cards/printing-region.tsx`) has two roles. `ArtRegionProps`
  (`:71`, owned source) carries `preferred`, `resolvedKey`, `onPick`, `onReset`, `onForget`; the
  choose role (`:98`) is catalog-only. The intro line is `copy.regionIntro(n)` or
  `copy.regionIntroPicked` (`:339`); `Shown now` is `!picked && !p.dormant && key === resolvedKey`
  (`:446`). The handoff's `scope` prop is new.
- Art comes from `resolveOwnedPrintings` / `readOwnedPrintings`
  (`src/lib/collection/owned-printings.ts`), which follows `card_art_preferences`
  (`src/db/schema.ts:311`) through `aggregateCollection`. Deck callers: `getDeckDetail`
  (`src/lib/decks/read.ts:463`, cards and commanders), deck tiles' commander art
  (`read.ts:1332`, `/decks` and Home), `draft-state.ts:613`, `versions.ts:571`.
- Prices come from `loadPrices` (`src/lib/decks/price-query.ts:67`): one statement, `distinct on
  (oracle_id)` ordered live first, real non-foil first, cheapest, then `scryfall_id`. `PriceFact`
  (`src/lib/decks/price.ts:24`) carries `cents`, `foilCents`, `etchedCents` and `asOf`; the winning
  printing is dropped.
- The deck page prices every row from one `loadPrices` call (`src/app/decks/[id]/page.tsx:346`) and
  hands each row its fact (`:402`, `:441`). The Money card (`src/lib/decks/stats-money.ts`) reads
  the row's fact, and its header already says it follows a pick with no change of its own. So
  pricing the pick inside the deck page's read is the whole of ruling (b).
- Other deck-row price reads: `draft-state.ts:349` (review screen), `versions.ts:571` (version
  diff), `shopping-rollup.ts:78` (deck tile `3 to buy · $18.40` and Home's Commitments row).
  The roll-up makes ONE oracle-keyed `loadPrices` call across every deck (`shopping-rollup.ts:78`),
  so a card picked differently in two decks cannot be priced through an oracle-keyed map.
- Other deck art reads: the review screen (`draft-state.ts:613`), the overview's named-card preview
  (`src/lib/synopsis/read.ts:196`, which must match the card details it opens), and the commander
  change sheet's current commander (`src/lib/commander-change/draft-rows.ts:46`).
- Commanders are not version cards: they live on `deck_versions.commander_oracle_id` /
  `partner_oracle_id` (`schema.ts:597`), and commit writes only body cards into
  `deck_version_cards`.
- `pruneOrphanProxies` (`src/lib/decks/prune-proxies.ts:48`) drops proxies for cards that left a
  deck.
- `deck_proxies` (`schema.ts:531`) is the precedent for a per-(deck, oracle) statement outside
  versioning, and `drizzle/0073_user_data_stamps.sql:116` gives it the `user_data_touch` trigger.
  The proxy action gates on `proxiedMembership(deckId, oracleId)` under a `for update` deck lock
  (`src/app/decks/actions.ts:688`); that membership is commander-inclusive (E1).
- The deck page mounts `CardDetailProvider deckPage deckId=… deckOracleIds={proxyEligibleIds}`
  (`src/components/decks/builder-shell.tsx:1260`). `update-diff.tsx:231` and
  `review-changes.tsx:905` mount `deckPage` with no `deckId`, so they must not offer the pick (E9).
- Import strips the printing: `SET_CODE_RE` (`src/lib/decks/import.ts:176`) removes `(SET) CN`
  before resolving names. Export names the owned printing for body cards and writes commanders by
  name only (`src/lib/decks/export-helpers.ts`, `buildDecklistText`) (E4).
- The arrival strip's clean strings are `deckImportCopy.arrival.clean` / `cleanMobile`
  (`src/lib/copy/deck-import.ts:305`), both ending in provenance (E3).
- Latest migration on main is `0086_deck_cut_items`. Open PR #1362 claims `0087`. This line takes
  **0088**, renumbered at merge if something lands first.
- `ABOUT_VERSION = 11` (`src/lib/copy/about.ts:58`), and `about.test.ts:109` requires every entry's
  `since` to be at most `ABOUT_VERSION`, so an entry cannot land before its bump.

## Calls this plan makes (decided; override if you disagree)

1. **Only a deck pick changes the price. This departs from the handoff, and is flagged to Hugh.**
   The README says one chain (deck pick, then the Collection's pick, then the default) feeds art,
   the price tag, export, Shopping and the preset. Taken literally, that reprices every spoken-for
   card the day this ships, even with no deck pick stored: its figure would move from the cheapest
   printing to the Collection's pick or the default printing. Ruling (d) names "the pick", and the
   audit's migration note says nothing looks different on ship day. So the price follows the
   deck's pick only; with none, the figure is today's. The cost: a card with a Collection art
   preference and no deck pick shows that preference's art over the cheapest printing's figure,
   exactly as `main` does today. If Hugh wants the whole chain priced, it is one argument in PR 3
   (pass the resolver's printing for every card instead of the deck picks).
2. **A pick that leaves the Collection is ignored at read time, not deleted.** The handoff says the
   pick is cleared. Deleting it on every collection write would wipe every deck's picks on a
   Replace upload, which deletes and re-inserts the whole collection in one transaction, and would
   leave Undo unable to bring a pick back (E6). Reading it as absent while the printing is not held
   draws exactly the handoff's state (the deck falls to the Collection's pick, then the default; no
   dormant tile, no notice), costs no trigger on `collection_items`, and makes Undo and re-upload
   restore the pick. Only held picks reach the price read, so a figure never prices a printing the
   art no longer shows. The one visible difference: re-acquiring that exact printing later brings
   the pick back.
3. **A pick goes when its card leaves the deck.** `pruneOrphanProxies`' call sites also prune
   `deck_printings`, so a card removed and later re-added starts with no pick, as a proxy does.
   Version restore leaves the remaining picks alone (E7), as it leaves proxies alone.
4. **"In stock" means the pick's row is live and draws a figure**: `priceState` reads it as
   `priced`, or `foilOnly` (the tag then reads the foil figure with its qualifier, as `main` does
   for a foil-only card). A live pick with no figure in any finish falls back.
5. **Update from list writes no picks.** The drawn surface is the new-deck arrival strip. Update
   from list is a draft edit with its own diff screen, which has no drawn clause. If it is wanted,
   it goes to Design (see the end).
6. **The `Shown now` tile in deck scope names the deck's fallback** (the printing the deck shows
   without its pick), as the handoff draws it. `resolvedKey` is passed as that fallback, not the
   art on screen (audit errata). The label goes to `/copy-review` with the other strings.

## Switch

`DECK_PRINTINGS_ENABLED`, read per request through `deckPrintingsEnabled()` in
`src/lib/decks/printings-flag.ts`, the same shape as `collectionEditEnabled()`: off for anything but
the exact string `'true'`.

Off means `main`: no deck scope reaches the modal, the resolver skips the deck step, prices take no
picks, versions record nothing, import writes no picks and adds no clause, export names what it
names today. Stored picks are kept. Every PR carries a test with the switch off asserting `main`'s
output on its surfaces.

## Migration

**0088 `deck_printings`** (number checked against origin/main and open PRs; regenerate and
re-stamp the local ledger if another lands first):

- `deck_printings (deck_id uuid references decks on delete cascade, oracle_id uuid references
  cards, set_code text not null, collector_number text not null default '', created_at, updated_at,
  primary key (deck_id, oracle_id))`. A side table, not a `deck_cards` column, because neither
  commander is a `deck_cards` row (E2). Lowercase `set_code`, text collector number, matching
  `card_art_preferences`.
- The `user_data_touch` constraint trigger on it, `DEFERRABLE INITIALLY DEFERRED`, as 0073 gives
  `deck_proxies`. Without it Home and `/decks` serve stale commander art, and
  `pnpm check:list-cache` fails.
- `deck_version_cards` gains nullable `set_code` and `collector_number`, and `deck_versions` gains
  nullable `commander_set_code`, `commander_collector_number`, `partner_set_code` and
  `partner_collector_number`, because commanders are not version cards. No backfill: a null reads
  as today's resolver, which is "older versions show today's art". The commit's
  draft-versus-version diff compares oracle id and quantity only and must keep doing so, or a pick
  would read as a deck edit.

## PR boundaries

Five PRs, in order, none stacked, each under about 20 files and 800 lines. Each takes its own
worktree, the pre-open subagent pass and the normal pr-review cycle. PRs 2 to 5 run
`feature-acceptance` on their rows, and PR 5 runs it again for the line.

### PR 1 · The store, the resolver and the write (no UI)

- Migration 0088 and the Drizzle schema for `deck_printings` and the six version columns.
- `deckPrintingsEnabled()` with its test.
- `src/lib/decks/printings.ts`: `readDeckPicks(userId, deckIds)`, membership-scoped like every
  proxy read, and `resolveDeckPrintings(userId, deckId, oracleIds)`: the deck's pick when the player
  still holds that printing (call 2), else `readOwnedPrintings`' answer (the Collection's pick, then
  the default). For a card the player does not own, `readOwnedPrintings` returns nothing (it is
  rooted in `collection_items`), so the resolver falls back to the card's oracle-level printing,
  `cards.scryfall_id` joined to `printings`, which is the printing whose art those rows draw today.
  Every card therefore resolves to a printing, and a version records one for every card, owned or
  not. It also returns which picks are HELD, which is what PR 3 prices. One query for the
  picks, then the existing reader. Fail-soft the way `resolveOwnedPrintings` is.
- `setDeckPrinting(deckId, oracleId, printing)` server action: switch on; `requireDeck`; the deck
  row locked `for update`; `proxiedMembership(deckId, oracleId)` as the membership gate, so a
  commander is in and a Consider or search result is out (E1); the printing must be one the player
  holds. Upsert. It returns the card's new art (and, from PR 3, its price fact) so the client
  can patch the one row; no `revalidatePath`, since the deck page is heavy and the stamp trigger already
  retires Home and `/decks`.
- `pruneOrphanProxies`' call sites prune `deck_printings` too (call 3).
- Tests: the resolver's steps, the unheld pick and an unowned card; the action's refusals; the prune;
  `check:list-cache` green with the new table.

### PR 2 · Deck art reads the chain, and versions record it

- `getDeckDetail` resolves art through `resolveDeckPrintings` for cards and both commanders. Export
  body lines follow with no change of their own, since export reads the row's printed set
  (`builder-shell.tsx:1961`).
- Deck tiles' commander art (`read.ts:1332`) reads each deck's own pick, so `/decks` and Home
  follow (E2's surfaces the handoff does not name). One picks read for the grid.
- The review screen's art (`draft-state.ts:613`), the overview's named-card preview
  (`synopsis/read.ts:196`) and the commander change sheet's current commander (`draft-rows.ts:46`)
  read the deck's chain, so no deck surface draws a different printing from the card details it
  opens.
- Commit writes each card's resolved printing into `deck_version_cards`, and each commander's into
  the new `deck_versions` columns. A version view draws the recorded printing where present,
  today's resolver where null.
- Tests: switch off is `main` on every surface above, export included; the diff ignores the new
  columns.

### PR 3 · Prices follow the pick

- **The price rule, inside the one statement.** `loadPrices(oracleIds, picks?)` takes an optional
  list of `{ deckId, oracleId, setCode, collectorNumber }`, held picks only (call 2). A `picked`
  CTE joins them to `printings` and `printing_prices` in the same statement, so a pick and its
  fallback share a snapshot (the reason the query is one statement, `price-query.ts:34`). The read
  returns today's oracle-keyed map plus a `(deckId, oracleId)`-keyed map of pick facts, and one
  helper, `priceFor(read, deckId, oracleId)`, answers: the pick's fact when it is in stock (call 4),
  else today's chosen row, which is the cheapest in stock or, with nothing live, the stale row
  `priceState` draws as `sold out`. Called with no picks, the SQL and every figure are `main`'s.
- `PriceFact` gains an OPTIONAL `printing?: { scryfallId, setCode, collectorNumber }`, filled only
  inside `price-query.ts`, so the 39 files that build a fact literally do not move. It is the
  printing behind the figure, which I got it presets from (ruling c), and it is filled on EVERY
  fact `loadPrices` returns, with picks or without, the stale sold-out row and the commanders
  included, so I got it does not depend on this line's switch.
- Callers: the deck page (rows, the Shopping strip and total, the over-limit ring and the Money
  card, whose file does not change: ruling b, asserted by a test feeding it a picked fact); the
  review screen (`draft-state.ts:349`); the version diff (`versions.ts:571`); and the roll-up
  (`shopping-rollup.ts:78`), which passes every deck's held picks and prices each deck's rows
  through `priceFor`, so a deck tile's `to buy`, Home's Commitments row and deck stats
  (`stats-query.ts:132`) agree with that deck's Shopping rows.
- Reviewed and left as they are, because no pick reaches them: `proxy-list.ts:138` (a proxy is
  printed, not bought), tuning (`tuning-read.ts:362`, `tuning-actions.ts:296`), the commander
  change candidates, intake, `/commanders/[slug]`, `read.ts:1479`, `pre-filled-commander.ts`,
  `suggestions-read.ts`. The swap cut card (`swaps/gather.ts:212`) is a deck card and could take
  its pick's price; it is left at today's figure, because the swap compares stand-in prices
  against the card's market price, not the printing in the box.
- Tests: the three states, a foil-only pick, the no-picks byte-identity, a card picked differently
  in two decks priced per deck in the roll-up, and a `.toSQL()` assertion that the picked join is
  qualified (AGENTS.md's correlated-subquery rule).

### PR 4 · The picker in deck scope (UI)

- `PrintingRegion` gains `scope: "collection" | "deck"` on the art role. With `deck`: no reset, no
  dormant tile, the intro slot swaps both strings (D1), and `onPick` writes through
  `setDeckPrinting`. The pinned Set line reads `For this deck` in place of `Your pick`.
- Two things are separated: which deck the card-detail READ resolves against, and whether the
  picker is OFFERED. `CardDetailProvider` gains a read-only `artDeckId`. The review screen
  (`review-changes.tsx`) and the update diff (`update-diff.tsx`) pass it, so their modals draw the
  deck's printing, matching the rows PR 2 gives them, while their region stays `scope="collection"`
  with no deck write (E9). `card-modal.tsx` passes `scope="deck"` only when the provider has a
  `deckId` (the deck page alone), the switch is on and the card is in the deck's membership set.
  `/collection` is unchanged.
- The card-detail read takes the deck's pick when opened with a deck, so the art, the art-column
  price tag (the price of the printing under the art, `no stock` if none) and the Set field move
  together on a pick.
- `builder-shell.tsx` patches the row from the action's answer: the provider gains an art-change
  callback here (only `/collection` and the set grid wire one today), and the deck holds a small
  per-card override for art, printed set and price fact, so rows, tiles, the Shopping total, the
  Money card and the export dialog move in the same frame. On failure the tiles revert and
  `Didn’t save. Try again.` shows, not red. One live-region announcement per pick.
- One or no owned printings: the shipped plain MetaField. Overflow: the shipped search and chips.
- `src/lib/copy/deck-printings.ts` with the five picker strings, through `/copy-review`.
- Inventory `docs/superpowers/inventories/deck-printings.json` (rows below), contact sheet at both
  widths, `check:shared` holding `PrintingRegion` across `/collection` and the deck, and the
  `design-review` property table against R3.

### PR 5 · Import and export

- Import keeps the printing it used to strip: `(SET) CN` is read off a text line before the name
  resolves, and a CSV row already carries its set and collector number (`import.ts:98`). A printing
  the player holds becomes the deck's pick, commander lines included (E4). A printing they do not
  hold falls to the chain and is counted. When two lines name the same card in different
  printings, the first line naming a held printing wins, matching how quantities keep the first
  line (`import.ts:372`).
- The arrival strip composes the shipped clean string with the two clauses, `12 came with the
  printing you own` and Hugh's `, N not in your Collection` (ruling a), on desktop and the phone.
  The combined strings and whether the provenance sentence survives go to `/copy-review` (E3). That
  makes eight new strings for the line, as the audit counts.
- Export's commander lines name the printing the deck shows (body lines already do after PR 2), and
  importing that export round-trips to the same picks (a test).
- Switch off: import writes no picks and adds no clause; export is `main`'s.
- Then the line's close-out: every inventory row walked at both widths in a real browser against a
  `pull:staging` copy, the full contact sheet, and the E8 phone states the handoff did not draw.

## About entry and the ABOUT_VERSION bump (named task)

- **Entry:** `deck-printings`, `Choosing a printing for a deck`, chapter 03 after `export`,
  `width: 'plate'` (E10: the handoff's object omits `width`, which `AboutEntry` requires),
  `switch: 'DECK_PRINTINGS_ENABLED'` (`AboutSwitch` gains the member), the caption and three key
  lines from `about-entry/about · deck printings entry.ts` through `/prose-pass`, and the
  `deckPrinting` specimen: the shipped Set field and region in deck scope, static, on fixture props.
- **Where it lands:** in the epic's single batched About PR, which is the last PR of the I got it
  line (its plan is the sibling doc PR, `2026-10-10-i-got-it.md`), with **the one `ABOUT_VERSION`
  bump**. Entry, specimen and bump land together there, so nothing ships without a caller. It
  cannot land earlier: `about.test.ts` refuses an entry whose `since` is above the current version,
  and the roadmap batches the epic's entries into one bump at its close.
- **Coordination, flagged:** the collection screens plan's PR 8 bumps on its own (11 to 12). If it
  merges first, this entry and I got it's take the next number in one bump, and the sheet reads
  `2 new` rather than the `7 new` the handoff draws. Holding all seven for one bump needs that lane
  to hand its five entries to the batched PR.

## Route × viewport inventory

Every cell is ticked against the running app at close-out. Rows reached by a press carry their steps
in `deck-printings.json`.

| Surface | 390 | 1300 | PR | Shares with |
|---|---|---|---|---|
| Card details from a deck card: Set field, nothing picked (`N printings you own ▾`) | ☐ | ☐ | 4 | `PrintingRegion` |
| Open, nothing picked: deck intro, `Shown now` on the fallback, no preselection | ☐ | ☐ | 4 | `PrintingRegion` |
| Picked: `For this deck · of N`, picked intro, art + price tag + Set move together | ☐ | ☐ | 4 | `PrintingRegion` |
| Save failed: tiles revert, `Didn’t save. Try again.` | ☐ | ☐ | 4 | — |
| One or no owned printings: plain MetaField | ☐ | ☐ | 4 | — |
| Overflow (over 12 owned printings): search and chips | ☐ | ☐ | 4 | `PrintingRegion` |
| Commander's details: same Set field | ☐ | ☐ | 4 | `PrintingRegion` |
| Negative: Consider tile and search result under the deck provider offer no pick | ☐ | ☐ | 4 | — |
| `update-diff` and `review-changes` modals: the deck's art, and no pick offered | ☐ | ☐ | 4 | — |
| Negative: card details from `/collection` keep the collection wording and reset | ☐ | ☐ | 4 | `PrintingRegion` |
| `/decks/[id]` rows, tiles, card view, hover preview: art follows the pick, no mark | ☐ | ☐ | 2 | — |
| Review screen, overview named-card preview, commander change sheet: the deck's printing | ☐ | ☐ | 2 | — |
| Shopping, spoken-for row: pick in stock / pick sold out (cheapest figure) / none in stock | ☐ | ☐ | 3 | `BuyTag` |
| Shopping strip total and over-limit ring use the figure shown | ☐ | ☐ | 3 | — |
| Deck stats Money card follows the pick | ☐ | ☐ | 3 | — |
| `/decks` tile: commander art and `to buy` figure | ☐ | ☐ | 2, 3 | — |
| `/` Home: deck tile commander art and Commitments figure | ☐ | ☐ | 2, 3 | — |
| Version view: a post-line version's recorded printing; an older version's today art | ☐ | ☐ | 2 | — |
| After a pick: no pending banner, no Commit, no History line, analysis not stale | ☐ | ☐ | 4 | — |
| `/decks/import` arrival strip: printing clause, not-owned clause, both, neither | ☐ | ☐ | 5 | — |
| Export dialog decklist: printings named, commander lines included | ☐ | ☐ | 2, 5 | — |
| Switch off: every row above is main's, picks kept | ☐ | ☐ | every | — |
| `/about`: the entry, switch on and off | ☐ | ☐ | I got it's About PR | — |

## Left for Design

Nothing blocks the build. Two items are recorded:

- **Update from list** writes no picks (call 5). If the clause is wanted on the update diff, that is
  a drawn surface, so it is Design's.
- **Phone states the handoff did not draw at 390** (E8: save failed, overflow, pick left the
  Collection, commander head, deck tiles) are shipped components and are covered by the contact
  sheet. A divergence found there goes to Design rather than being improvised.

`/copy-review` owns the five picker strings, the `Shown now` label in deck scope, and the two import
clauses with their composition (E3).

## Out of scope

- Unowned printings as picks (R2 review: owned only).
- A reset control, a dormant tile, or any mark on rows.
- Pricing a collection art preference without a deck pick (call 1).
