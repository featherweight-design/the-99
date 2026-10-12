# Tokens for my deck: implementation plan

Plan, 2026-10-11, priority "New features scoped with Hugh 2026-10-11", item 2. It builds the brief
`docs/superpowers/design-briefs/2026-10-11-tokens-for-my-deck.md` to the approved R2 handoff
`design/design_handoff_the99_tokens/` (build from `The 99 - Tokens (R2).dc.html` and `Tokens R2.dc.html`;
R1 is history) and that handoff's `READINESS-audit.md`. The brief's four rulings and the audit's two
rulings are closed and not reopened here.

## Standing rulings (not re-litigated)

- **Source: Scryfall `all_parts` entries with `component: "token"`, nothing else, $0, no new fetch** (ruling 1, lock 1, lock 3).
- **No emblems, no markers** (ruling 4). **`Copy` is an ordinary token row**, owned, marked, joined and
  bought like any other (Hugh, 2026-10-11; overrides lock 9).
- **A token's identity is its own `oracle_id`, never its name** (lock 2). Owned means the collection holds at least one,
  for every deck (lock 8).
- **A token never changes a deck's card counts, money, status or complete state, the Shopping pill, or the `/decks`
  roll-up** (lock 7). Only the Shopping box's link figure includes joined tokens (audit finding 7).
- **Pressing the buy tag on a token's Shopping row marks it owned and takes it off that deck's Shopping list in one
  save, no confirm** (Hugh, 2026-10-11; audit finding 2).
- **A manual mark never writes the per-account "read" marker.** Before the first upload a token is owned (marked) or
  unknown, never "not owned" (audit finding 5, G2/G2a). An upload replaces upload-sourced rows only and never touches a manual one.
- **The token record carries oracle text**, shown only when name, colors and P/T collide inside one deck (audit finding 4, X7).
- **Vocabulary:** select/unselect, never tick. R2 uses `mark`/`unmark`/`I have one`. Players never see "label". All
  copy through `/copy-review`; US English.

## What the code does today (read 2026-10-11 on `origin/main` b8db17099)

- `printings.oracle_id` references `cards`, and `toCardRow` returns null for a non-game card, so a token has no row
  in either (`src/lib/scryfall/transform.ts`, `src/db/schema.ts:91`). `skipped_printings` keeps only a skipped
  printing's id, layout and name (`schema.ts:166`), written by `seedPrintings` (`seed-printings.ts:248`).
- `all_parts` is read nowhere. `FINGERPRINT_COLUMNS` covers eleven `cards` columns (`src/lib/catalog/fingerprint.ts:17`).
- Upload: `loadMatchInputs` reads `skipped_printings` filtered to `TOKEN_LAYOUTS` (`src/lib/collection/import.ts:~95-111`),
  `matchRows` puts a known token id in `skipped` (`match.ts:~111`), and the row is only counted
  (`csv_uploads.preview_payload.skippedByDesignCount`). `replaceCollection` (`import.ts:136`) is the one confirm write,
  with the upload row as its lock. `collection_items.oracle_id` is a not-null FK to `cards`, so a token cannot be stored there.
- Prices: `seed-prices.ts` drops every feed row whose id is not a known printing; `printing_prices.scryfall_id`
  references `printings` (`schema.ts:190`). 6,039 feed rows on token printings are dropped today (brief, Fixtures).
- Links: `manapoolAddDeckUrl` / `manapoolDeckText` write `N Name` lines only (`src/lib/manapool/links.ts`).
- Shopping: `isShoppingCard` and `commanderShoppingRows` (`src/lib/decks/shopping.ts`); the price strip and box live
  in `price-strip.tsx` and `group-toggle.tsx`. A token is neither a `deck_cards` row nor a `cards` row.
- `ABOUT_VERSION` is 14 (`src/lib/copy/about.ts:61`). The latest migration is 0090 (`drizzle/`).
- **Measured today:** the add-deck page at `manapool.com/add-deck?deck=` is server-rendered and echoes each decklist
  line, but matching lines to cards happens in the browser, so the mixed-format question (audit finding 3) needs a
  browser probe, not a curl. PR 2 owns it.

## Data model (migrations, one per PR that needs one)

All catalog tables are built by the existing ingest in each database from the same fetched bytes, so
**the catalog fingerprint does not move and the copy harness is not involved** (lock 4).

| Table | PR | Columns (all new) |
|---|---|---|
| `tokens` | 1 | `oracle_id` uuid pk; `name`; `type_line`; `colors` text[]; `power`, `toughness` text null; `layout`; `oracle_text` text null |
| `token_printings` | 1 | `scryfall_id` uuid pk; `token_oracle_id` fk `tokens`; `set_code`; `collector_number` text; `finishes` text[]; `image_uri`, `image_uri_small`, `art_crop_uri`, `back_image_uri` null |
| `card_tokens` | 1 | pk (`card_oracle_id` fk `cards`, `token_oracle_id` fk `tokens`) |
| `token_printing_prices` | 2 | same shape as `printing_prices`, keyed on `token_printings.scryfall_id` |
| `token_ownership` | 3 | pk (`user_id`, `token_oracle_id`); `quantity` int > 0; `source` text check in (`upload`, `manual`); `updated_at` |
| `token_reads` | 3 | `user_id` pk; `upload_id`; `read_at` (the lock-5 marker; written in `replaceCollection`'s transaction, including an upload with zero tokens) |
| `deck_token_joins` | 4 | pk (`deck_id` fk `decks` cascade, `token_oracle_id` fk `tokens`); `user_id`; `created_at` |

`token_printing_prices` is its own table rather than a relaxed FK on `printing_prices`, because every reader of
`printing_prices` assumes a card printing and the cheapest-to-be-wrong change is the one that touches none of them.
`deck_token_joins` carries `user_id` so no read needs a join to `decks` to scope by player.

**No stored representative printing.** The pictured and sent printing is chosen at read time by `tokenPrice` (the deck price rule over the token's printings), because the rule depends on live prices that move daily; a column would be stale by the next price refresh.

**Token printings, not oracle objects, are the source of truth.** A token printing in `default_cards` carries its
own `oracle_id`, colors, power, toughness, type line, oracle text and images, and a card printing's `all_parts[].id`
is a token printing id. One streaming pass over the file the printings job already reads therefore builds all three
catalog tables; the `oracle_cards` token objects are not needed. (The brief measured 128 of 128 of Hugh's part ids
resolving through `default_cards`; PR 1 re-measured the catalog on the fetched bytes: 7,256 of 7,306 part ids resolve, and the per-deck counts reproduce.)

## Pure rules (unit-tested, no database)

- **`tokenPartIds(raw)`** (`src/lib/tokens/catalog.ts`): from one card printing's `all_parts`, the ids of parts with
  `component === "token"`. A card's own `combo_piece` self-entry and meld parts never qualify.
- **`classifyTokenEntry(raw)` / `isTokenEntry(raw)`** (same module): a printing whose layout is `token` or `double_faced_token`, plus the `reversible_card`
  whose faces say `Token` (the `sld/1969` Mechtitan case the ingest already records, `transform-printings.ts:161-189`).
  `emblem` and `art_series` are excluded. Upload decides "is a token" by resolving to `token_printings`, never by layout.
- **Written in later PRs, not yet in the tree:** `tokenPrice` (PR 2), `tokenOwnership` (PR 3), `tokenKey` and `sameFace` (PR 4).
- **`tokenPrice(printings, prices)`**: the deck price rule (`price-query.ts:52-78`) applied to a token's printings: live
  before stale, real non-foil stock before foil-only, then cheapest, then printing id. It also names the pictured
  and sent printing (R2: "pictured and sent: TLA T9").
- **`tokenKey(token)`** and **`sameFace(a, b)`**: when name, colors and P/T collide inside one deck, show oracle text (X7).
- **`tokenOwnership(read, owned, manual)`** and the three-state **owned / not owned / not known**: `unknown` unless a
  `token_reads` row exists or the token is marked; marked or uploaded-owned is `owned`; read and absent is `not`.

## PR boundaries

Each PR is under about 20 files and 800 lines. Nothing is stacked: open, review, merge, then cut the next from fresh
`main`. The plan file lands with PR 1 (spec, plan and code together; no plan-only PR).

### PR 1: Catalog tokens (data, dark)

Migration 0092 (`tokens`, `token_printings`, `card_tokens`). `src/lib/tokens/catalog.ts` (rules and `TokenCatalogBuilder`), `publish.ts` and a collector in the
`seedPrintings` loop (`seed-printings.ts`) that builds token rows, token printings and maker-to-token links in one
pass over `default_cards`, then publishes them in ONE transaction that clears and refills (the denominators' rule:
a refused run leaves the previous tables standing and exits non-zero). **Floors, measured on the first real run
rather than guessed** (the combos' rule): token printings, distinct tokens, links, and the share of part ids that
resolved. `scripts/check-scryfall-contract.ts` scans for ANY entry with a token part that resolves, not the first
entry. `pnpm probe:tokens` (read-only, staging) reproduces the brief's Fixtures: 21 decks, 121 deck-token pairs, 80
distinct tokens, 61 names, every deck's token and making-card counts, and Aang's four tokens (a part id that stopped resolving shows as a moved count, unless another printing keeps the link, which is correct).

- Files (about 12): migration + journal + snapshot, `schema.ts`, `src/lib/tokens/catalog.ts`, `contract.ts`, `publish.ts` + tests, `seed-printings.ts`,
  `transform-printings.ts`, `check-scryfall-contract.ts`, `scripts/probe-tokens.mts`, `docs/probes.md`, this plan.
- **No switch.** The tables are inert until a reader exists; production's migration applies at its next build
  (`MIGRATE_DATABASE_URL`, Production scope). After merge, dispatch `Catalog refresh job=all` on both environments
  rather than waiting for 09:00 UTC. The evidence that a database is populated is PERSISTED, not the probe: the refresh log's `Tokens: published N tokens, ...` line, and `select count(*) from card_tokens` on that database. `probe:tokens` builds the catalog in memory and is the staging fixture check only.
- Risk: the printings pass is the one with the denominator blast radius. The token collector must not change
  `skippedOrphan`, `upserted` or the `unsizedRunFailure` rule; a test pins all three against the existing fixtures.

### PR 2: Token prices and the link format (data + one probe, dark)

`seed-prices.ts` keeps a feed row whose id is a `token_printings` id and writes `token_printing_prices` in the same
transaction as the card prices; the card path is untouched (the orphan rule gains a second allowed set, it does not
relax) and the token step skips cleanly when the tables are absent. **Measured 2026-10-11, and it changed the design:
Mana Pool's own set code and collector number for a token are NOT Scryfall's on 42% of priced token printings** (1,221 of
2,918: a double-faced token card is listed as `Soldier // Eldrazi`, number `1-17`, under the single token's Scryfall id).
A link line naming Scryfall's set and number was placed by name but not exactly on 4 of 48 probe lines. So the table also
stores the feed's own `product_name`, `product_set` and `product_number`, and a token's link line names THOSE
(`tokenManapoolLine`); a number outside letters, digits and hyphens (`1★`) is one the page cannot place exactly, so
that line degrades to the name alone. `manapoolDeckText` gains an optional per-line `printing: { setCode,
collectorNumber }` that writes `N Name [SET] number`; **no caller passes it yet**, so card lines are byte-identical.
`pnpm probe:manapool-token-link` drives the real add-deck page in a browser with name-only card lines and token lines in
ONE URL and reads `Any Printing` and `Exact` back; a control line naming a printing that does not exist must pull Exact
below Any, so the probe can fail. The token price read is `loadTokenPrices` (the deck price rule over a token's
printings; one printing both pictured and sent).

- `check:manapool` is NOT extended: whether a feed row is a token is knowable only against the Scryfall bulk, and the
  ingest's own report (`Priced N printings and M token printings`) is where a collapse shows. Dropped from the earlier draft.
- Files (about 14): `seed-prices.ts` + test, `schema.ts` + migration 0094, `parse.ts` (product identity), `links.ts` +
  test, `src/lib/tokens/price.ts` + test, `scripts/probe-manapool-token-link.mts`, `docs/probes.md`, `AGENTS.md`.
- **No switch.** Mixed lines work (measured), so PR 5 sends the lines `tokenManapoolLine` builds.
- Risk: **a failed probe is a finding, not a blocker.** The probe reads the page; it never completes a cart.

### PR 3: Ownership (write side, dark)

Migration 0095 (`token_ownership`, `token_reads`). Upload: `loadMatchInputs` resolves uploaded ids against
`token_printings` (skipped cleanly when the token catalog is absent); `matchRows` returns `tokenRows` beside `skipped`
(a token row is still counted skipped, so the review screen's count keeps its meaning, and a token Scryfall files as a
`reversible_card` is recognised by the catalog, not the ledger's layout); the preview payload carries the per-token sums;
`writeUploadTokens` runs inside BOTH confirm transactions (`replaceCollection`'s and the ledger's `applyCollectionChange`),
after the upload stamp and the rows, so a failing token write rolls the whole confirm back. Replace removes only
`source = 'upload'` rows; Add accumulates onto upload rows; a hand mark the upload also read becomes an upload row (G2a);
the `token_reads` marker is written by every confirmed upload, including one with no token, and by nothing else.
`markTokenOwned` / `unmarkTokenOwned` (library functions, `ownership.ts`) never write the marker and never touch an upload
row. **The server actions that wrap them move to PR 4 with the controls that call them**: an action with no caller is
surface with no use, and the switch that gates it does not exist until PR 4. Cache: `/decks/[id]` is already in
`COLLECTION_ROUTES` (dynamic), so a confirm's `invalidateCollectionReaders` retires the deck page; the mark action in PR 4
revalidates that route pattern itself. Home and `/decks` read no token table, so `check:list-cache` is unaffected.

- Files (about 14): migration + snapshot + journal, `schema.ts`, `match.ts` + test, `import.ts`, `write.ts`,
  `actions.ts`, `src/lib/tokens/ownership.ts` + test, `AGENTS.md`, this plan.
- **Mutation checks:** drop the marker write, delete hand marks on Replace, make Add replace, read "not known" as "not owned"
  (each fails a test). **Integration:** proved on a scratch branch of staging (deleted) through the real functions.
- Risk: `replaceCollection` is a destructive path (clean-after-clean review). A token failure must roll the whole confirm
  back; the scratch run proves a bad token leaves no cards written, the upload unconfirmed and the tokens untouched.

### PR 4: Tokens group on the deck page (read side, first UI; introduces the switch)

**Split as planned.** 4a (flag, migration, loader, writes, actions, copy, design table, `probe:deck-tokens`) is dark with no UI; 4b (components, wiring, inventory, contact sheet) is the first thing a reader could see.

`DECK_TOKENS_ENABLED` (server-side, exact `'true'`, `src/lib/decks/tokens-flag.ts`) and a member of `AboutSwitch`
for the entry. Migration 0097 (`deck_token_joins`; 0096 went to deck notes, so take the next free number at the rebase). Loader `loadDeckTokens(deckId, userId)` (`src/lib/tokens/read.ts`):
the deck's makers from `deck_cards` UNION the commanders (as `list_claims` does, G10), tokens via `card_tokens`,
owned state from the pure rule, the pictured printing and price from `tokenPrice`, joins, and oracle text only for
a colliding pair. Components: `TokensGroup` at the foot of Your deck under All (`DecklistGroupHeader` with its note),
the T0 band, `TokenRow` in every state (X1 to X4, X1m), the makers fold with hover preview and click-through and the
scroll box past 9 / 5 names, and the join / `I have one` controls wired to actions. **Card view stays rows (T7);
Stats and `/decks` and Home are unchanged.** `check:collection-routes` and the `COLLECTION_ROUTES` list gain the
deck routes if they were not already covered; `check:list-cache` must stay green (Home and `/decks` never read the
new tables).

- Files (about 18): flag + test, migration + schema, read + test, `TokensGroup`, `TokenRow`, `TokenMakers`, band,
  `decklist.tsx` wiring, `deck-page-switches.tsx`, `page.tsx`, actions + tests, `src/lib/copy/tokens.ts` (the R2
  strings, pruned per audit finding 6), `docs/superpowers/design-tables/tokens.md` (R2 deltas folded in, superseded R1
  rows dropped), inventory JSON.
- Over 20 files means this PR splits **4a** (flag, migration, loader, actions, copy, design table) and **4b**
  (components, wiring, inventory, contact sheet). 4a is dark and has no UI; 4b is the first thing a reader could see.
- Gate: `design-review` property table (enumerate, verify, confirm) before 4b opens; `feature-acceptance` contact sheet at
  900 and 390.

### PR 5: Shopping (joined tokens, the buy press, the link)

The deck's Shopping view gains the `Tokens` group, last, with the shipped Shopping row and a `token · 2/2 R · set #`
sub-line. The buy box figure is what the link buys: the split line keeps the deck's card figure and adds the token
sum (`67 cards · $270.48 · 4 tokens · $0.70`, S2). **`summarisePrices`, `moneyStats`, `shoppingCount`, the status
and the roll-up stay card-only**; the token sum is a separate figure added only in the box. The token's buy tag is
the shipped tag and is pressable: one action marks the token owned (`source: manual`) and deletes that deck's join
in the same write, no confirm; an upload that reads a joined token as owned deletes the join in the upload's
transaction (audit finding 8; unmark does not restore a join). `manapoolAddDeckUrl` sends token lines with set and
number when PR 2's probe passed. A sold-out token draws `buy · sold out` and is left out of the sum (`pricedClause`).
A joined token whose maker is gone stays joined, drawn `from no card in this deck` (G9).

- Files (about 14): Shopping group + row, price strip / box figure, `group-toggle.tsx`, the press action + test, link
  builder + test, `read.ts` extension, copy, `check-copy-drift` quotations, inventory, contact sheet.
- Gate: `design-review` property table; `feature-acceptance`; the box must keep the link above the fold with 14
  tokens (S2).
- Risk: the Shopping read has a client twin (`isShoppingCard` and the server's `loadDeckBuyRows`) that must agree.
  The token group is separate from both, so the unit test asserts card totals are unchanged with tokens joined.

### PR 6: Card details line, the About entry, close-out

One line at the foot of the existing `In this deck` box: `Makes a Food token · In Shopping` and `Tokens ›`, only from
a deck and only when the card makes a token (D1; no Makes block). The About entry from
`about - tokens.ts`, written through `/prose-pass`. **No `ABOUT_VERSION` bump** (orchestrator, 2026-10-11, verified
against the About rule): an entry behind a feature switch is announced when its switch flips, seen by id and not by
version, so it is gated on `DECK_TOKENS_ENABLED` through `AboutSwitch` and the content hash is re-pinned. A
deployment with the switch off shows nothing. A multi-round line
batches its entries at the end of the launch (AGENTS.md), and this line is one launch: the entry is a named task here,
not deferred. `about.test.ts` content hash is re-pinned deliberately. The `feature-acceptance` close-out walks the
inventory below with the switch on, against a `pull:staging` copy.

- Files (about 8): `card-modal.tsx` / its in-this-deck box, copy, `about.ts`, `about.test.ts`, fixtures, inventory, README status.

## The switch

`DECK_TOKENS_ENABLED`: **staging on, production off** until Hugh has read it on staging. Off means NOT RENDERED and
NOT READ: no loader call, no group, no Shopping rows, no card-details line, no About entry. The ingest (PR 1), prices
(PR 2) and ownership writes (PR 3) run regardless, because they are data; a production account's first upload after
PR 3 starts recording tokens whether or not anyone can see them, and the marker is why that is safe. Turning the
switch on in production needs: the catalog tables populated there (the production refresh logged `Tokens: published`, and `card_tokens` is non-empty), the Mana Pool probe passing
there, and one upload on that account so the first screen is not "not known".

## Route and viewport inventory

`docs/superpowers/inventories/tokens.json`, photographed at 900 and 390 by `scripts/contact-sheet.mjs` against a
`pull:staging` copy of Hugh's account, switch on:

| Route | State |
|---|---|
| `/decks/[id]` Your deck, All | Aang read, Aang unknown (before an upload), Omnath (14), Wizards (`Copy` only), a deck with a failed read |
| `/decks/[id]` Your deck, Card view | the group stays rows (T7) |
| `/decks/[id]` Shopping | Aang S1 (complete deck, tokens only), Omnath S2 (67 cards + tokens, link above the fold) |
| Card details, opened from a deck | D1 line, a card that makes nothing (D4), a Food-maker joined (In Shopping) |
| Card details, opened from `/collection` | no line (D2) |
| `/about` and the one-time sheet | the entry, switch on and off |
| **Negative rows** (the group must be absent) | `/decks`, Home, `/collection`, the deck page's Stats tab, with the switch ON |

`pnpm check:shared tokens` applies if a `shares` block is added for the row component used by both Your deck and Shopping.

## Verification, per PR

- Pre-push gate: `pnpm typecheck && pnpm lint && pnpm test`, the stub-DB build, `git fetch && git rebase origin/main`.
- Pre-open pass (`pr-review` §10b) on every code PR, then `precheck.mjs record`; every finding verified before acting.
- `check:list-cache`, `check:collection-routes`, `check:copy-drift` and `check:tokens` (CSS) must stay green; the
  design table is added to `check:copy-drift`'s scan by being under `docs/superpowers/design-tables/`.
- Measure on **staging, read-only**; mutate only on local-dev or a scratch branch I delete. `probe:arrivals` is never
  pointed anywhere but local-dev.
- Mutation check on every test that ships with a fix (revert, see it fail, restore).
- `/copy-review` for every string; the lane resolves it, copy never goes to Hugh.

## Risks and decisions I took

1. **`token_printing_prices` as its own table** (not a relaxed FK). Cost: one more seed branch. Benefit: no existing
   reader of `printing_prices` can see a token.
2. **One pass over `default_cards`, no second download and no `oracle_cards` token objects.** If PR 1's first
   measurement shows a token printing missing a field the surface needs, the fallback is a second pass over
   `oracle_cards`, still no new fetch.
3. **Joins are per deck, ownership is per account** (lock 7 and 8). The cart's "one copy per deck" ruling does not
   apply to tokens; the cart's token line is a later round (brief Open question 7, README "not done this round").
4. **A production deploy with the switch off still migrates and ingests.** Tokens tables are empty on production
   until `Catalog refresh` runs; PR 1's hand-off names the dispatch.
5. **Cosmetic bits in the handoff stay as drawn:** R2's fixture names beyond Aang are illustrative (G1); the
   plan's probes use the brief's read-only staging script, not canvas data (audit finding 9).
6. **PR count is six, seven if PR 4 splits.** Each carries its own tests and none is a plan-only PR.
