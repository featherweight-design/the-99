# Plan: Commander precons

2026-10-11. Built from `design/design_handoff_the99_precons/` R2 (READINESS GREEN) and its audit's
findings 3 to 12, against the brief `docs/superpowers/design-briefs/2026-10-11-commander-precons.md`.
Approved by the orchestrator as Hugh's proxy on 2026-10-11, with three amendments (marked **A1** to
**A3**). Five PRs, none stacked, each under ~20 files and ~800 lines.

## PR 1: data (no UI, not behind the switch)

- Migration (0093): `precons` (`file_name` key, name, set code, release date, `twin_of`,
  `unmapped_count`) and `precon_cards` (deck, position, oracle id, the precon's printing, quantity,
  commander flag), and `catalog_sources` admits `precons`. Catalog data: no stamp trigger.
- `catalog:fetch` adds the `precons` source: MTGJSON's index as fetched, then one derived file of
  the kept fields, hashed as our bytes (brief lock 1, the second of its two models).
- **A2** The deck files are re-fetched only when the index's Commander entries move or the cached
  derived file is a week old (`canReuse`). MTGJSON's `meta` moves daily, so the key hashes the
  entries alone. The fetch job keeps the derived file in the Actions cache.
- `db:seed:precons`: maps by id only, drops and counts what the catalog lacks, folds twins, replaces
  both tables in one transaction under the `catalog-ingest` lock, stamps `catalog_refreshes`, and
  refuses under 180 decks or over 1% unmapped copies.
- **A1** On a database without the precon tables it warns and exits 0, and `catalog-sources record`
  records nothing for `precons` there. A refresh that outruns the deploy stays green.
- `check:mtgjson` in `Upstream contract checks`; `measure:precons` against staging.
- **A3** The migration number is taken from fresh `origin/main` at each cut.

### Measured on staging, 2026-10-11 (`pnpm measure:precons`)

- 197 listed, 197 kept, 19,700 copies, 0 unmapped, 0 printings missing.
- **16 twins: 197 stored rows, 181 distinct lists shown**, not the brief's 12 and 185: the four `FIC` Collector's Editions were
  missed. A first rule (identical list, any set) also folded 8 Commander Anthology reprints (`CMA`,
  `CM2`) into their originals; twins are now one set's identical lists, which is what the design's
  `also sold as a Collector's Edition` line says.
- Commanders: every commander is a legal commander.
- **Pairs: 5, and 3 do not pass `canPair`**: the Doctor Who precons (Fourth Doctor + Sarah Jane
  Smith, Thirteenth Doctor + Yasmin Khan, Tenth Doctor + Rose Tyler) pair by `Doctor's companion`,
  which `partner.ts` does not know. Food and Fellowship and Heads I Win, Tails You Lose pass.
- **Not legal in Commander: 2 lists**: Mystic Intellect (`C19`) holds Dockside Extortionist and
  Political Puppets (`CMD`) holds Trade Secrets. Nothing falls outside its commanders' identity.

Both open items are decided before PR 4 builds the start.

## PR 2: the list, `/decks/precons`

`preconsEnabled()` (`PRECONS_ENABLED`, `notFound` when off). Loader through `cachePageForUser`
(`collection_items` and the reader's deck lists for the shared rule), `check:list-cache` extended
to the route. `PreconRow`, `FilterChassis` (search over name, commander and set code; `ColourPips`;
Newest or Most owned stored per browser), `mirrorUrl`, `?from=new`. States L1 to L5. The shared rule
(same commanders and at least 75% of the non-basic ids) is measured against Hugh's six HD Tune decks
before it is a constant. `src/lib/copy/precons.ts` through `/copy-review`; the design table goes
to `docs/superpowers/design-tables/precons.md`. The orchestrator sets `PRECONS_ENABLED` (staging
true, production false) when this merges.

## PR 3: the open precon, `/decks/precons/[fileName]`

A twin's URL redirects to its plain edition. Own box with a neutral bar; `DecklistGroup` and
`DecklistRow` gain a `readOnly` path (the owned dot, the precon's printing in the right slot, card
details on that printing, no deck actions); `BasicsLine`; group notes; two commanders (V2); unmapped
(O4); the docked Start button at 390.

## PR 4: start a deck

`createDeckFromPrecon(fileName, name)` reads the precon server-side, writes its exact list with
counts through the import's write half, extracted into one function both call, and no printing
picks; it redirects with `?from=precon`. `StartPreconDialog` S1 to S1e. The arrival is the shipped
`ArrivalStrip` with a sibling one-trip param and the same dismissal key. Every count is the kept
count, never a literal 100.

## PR 5: the ways in, and the About entry

The `/decks` head cell, built into the cart lane's row container (half width at 900, one 2-up row
of 52px cells at 390, full width alone; a failed summary read keeps the line and drops its meta).
`PreconDoor` on `/decks/new` (N1 to N4). The About entry through `/prose-pass`, the MTGJSON credit
as a key line with its notice verbatim, `switch: 'PRECONS_ENABLED'`, and the next free
`ABOUT_VERSION` at merge. Entry points come last so nothing links to a half-built feature.

## Route and viewport inventory

`docs/superpowers/inventories/precons.json`, grown per PR; every row at 390 and 900.

| Route | Rows |
|---|---|
| `/decks` | P1 two cells, P2 alone, P3 zero decks, P4 switch off |
| `/decks/new` | N1, N2 `helpDoor` off, N3 no owned commanders, N4 `?commander=` |
| `/decks/precons` | L1, L1n, L1o, L1f, L2 empty collection, L3 no match, L4 unreadable, L5 loading |
| `/decks/precons/[fileName]` | O1 Counter Intelligence, O2 Eldrazi Unbound, O3 Wretched Ranks, O4 unmapped, O5 empty collection, O6 card details, V1 Avengers Assemble and its twin URL, V2 Food and Fellowship |
| Start | S1, S1b, S1c, S1d, S1e |
| `/decks/[id]?from=precon` | S2, S2b, S2c |
| `/about` | the precon entry |

Measured on staging as Hugh; anything written goes to local-dev or a scratch branch.
