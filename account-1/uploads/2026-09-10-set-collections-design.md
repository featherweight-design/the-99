# Set Collections — design

**Date:** 2026-09-10
**Status:** design approved, awaiting Design handoff
**Routes:** `/collection/sets`, `/collection/sets/[code]`

## The problem

There is no good way to answer "which cards from this set do I still need?" Colin's
account of doing it by hand: upload a ManaBox export to Moxfield, open a separate list of
the set's cards, and compare the two visually. His words — "very annoying and tedious."

The two halves exist separately and nowhere together. Sites list every card in a set. Apps
filter a collection down to one set. Neither merges the two, so the missing cards — the
only thing the reader actually wants — are never shown. The reference he named is the
PokemonTCG Pocket set view: a grid where owned cards render normally and missing ones are
blank rectangles carrying their collector number, so the gaps are the page.

The 99 is a Commander deck companion, and set completion is a different job — collecting,
not deckbuilding. It earns a place here only because the data it needs is already in the
database and the reader is already uploading their collection.

## What we already have

No new ingest, and no new upstream dependency.

| Table | What it gives us |
|---|---|
| `sets` | `name`, `set_type`, `released_at`, `card_count`, `icon_svg_uri`, `digital` |
| `printings` | Every printing in existence — `set_code`, `collector_number` (text), `image_uri_small`, `finishes`, `is_variant` |
| `collection_items` | Holdings keyed `(user_id, oracle_id, set_code, collector_number, finish)` |
| `printing_prices` | ManaPool price per printing, with settled absence and staleness semantics |

## Rulings

These were settled during brainstorming. Do not reopen them without Hugh.

1. **The base numbered run drives the completion figure.** Variants render in their own
   section below the grid with their own count, so a set is achievable rather than
   permanently unfinishable.
2. **Child routes under Collection, not a view mode and not a sixth nav pillar.**
   `/collection/sets` and `/collection/sets/[code]`, entered from `/collection`. See
   "Why not a view mode" below.
3. **One cell per collector number; any finish fills it.** A foil #42 completes #42. Foil
   ownership is a mark on the cell, not a second cell.
4. **Holdings with no collector number resolve by `oracle_id` within the set.** Pasted
   lists and Name/Qty CSVs carry no number; ignoring them would show cards you own as
   blank, which is the one defect that destroys trust in the figure.
5. **The index lists sets you hold cards in, plus a search that reaches any set.** So a
   set can be opened at 0%.
6. **Missing cells render the real art, dimmed.** We have `image_uri_small` for every card
   whether owned or not, which the Pokémon app does not — seeing what you are missing
   beats reading a number.
7. **Prices, a cost-to-complete total, and a cart link-out**, all reusing the deck-side
   ManaPool work (#288, #330).
8. **Three filters: missing-only, rarity, colour.** The colour filter reuses the component
   built for `/collection`.

### Why not a view mode inside `/collection`

`/commanders` shipped as one page with a toggle switching two separate pipelines, and the
verdict after using it was "we smashed it all together and now it's confusing." It was
split into `/commanders` and `/discover` for that reason.

Set completion has the same shape against `/collection`. That page lists cards you **own**;
a set grid lists cards you **don't** — an inverted population, wanting different controls
(rarity and missing-only rather than search and types). A view-mode toggle would reproduce
the defect exactly. Separate routes give the inverted population its own controls, its own
loading state and its own URL, while nesting under `/collection` keeps nav at five items.

## Data model changes

Two columns on `printings`, one on `sets`. One migration, one catalog re-seed.

### `printings.booster` — the main-run boundary

There is no reliable boundary today. `is_variant` cannot serve as one: it is an
art-treatment allowlist (`showcase`, `extendedart`, `borderless`, `etched`) built to pick a
default art, and it misfires at exactly the place that matters. Edge of Eternities' full-art
basics at #262–266 are flagged variant while sitting inside the base run.

Scryfall's `booster` flag is the clean line. Verified against EOE:

| # | Card | `booster` |
|---|---|---|
| 100 | Faller's Faithful | true |
| 262 | Plains (full-art) | true |
| 276 | Forest | true |
| 277 | Adagia, Windswept Bastion (showcase) | **false** |
| 290 | Mm'menon, the Right Hand (showcase) | false |
| 399 | Emissary Escort (promo) | false |

Base run 1–276, extras 277–399 — exactly ruling 1's split. The field is on the same
`default_cards` objects `transform-printings.ts` already parses.

### `printings.rarity` — because rarity is per printing, not per card

`cards.rarity` is oracle-level, taken from one arbitrary printing. Sacred Foundry is
`rare` in `eoe` and `mythic` in `exp`. Ruling 8's rarity filter reading `cards.rarity`
would mislabel cards on the set page.

### `sets.base_set_size` — the denominator, precomputed

The denominator is static per set, so counting ~400 printings per set per request is
waste. Filled by a post-load pass during the catalog refresh, the same pattern
`printings.is_representative` already uses.

## The completion model

- A **cell** is a printing, identified by collector number within the set.
- The **denominator** is `base_set_size` — the count of `booster = true` printings.
  EOE: 276.
- A cell is **owned** when the reader holds a matching printing in any finish.
- **Pinned** holdings match on collector number. **Unpinned** holdings (ruling 4) match on
  `oracle_id` within the set.
- Base runs contain duplicate oracle ids — EOE has Plains at both #262 and #268. An
  unpinned holding cannot tell them apart, so it fills the **lowest-numbered unfilled cell**
  for that oracle and stops. One holding, one cell; quantity is ignored.
- **Extras** (`booster = false`) are counted and displayed separately and never folded into
  the headline figure.

## Read path

**Index (`/collection/sets`)** — two queries:

1. Sets held: `distinct set_code` from the reader's `collection_items`, joined to `sets`,
   owned-cell counts grouped by set, ordered by `released_at` descending.
2. Search: `sets` by name or code, restricted to collectible `set_type`s (expansion, core,
   commander, draft innovation, masters) and `digital = false`.

**Set page (`/collection/sets/[code]`)** — one catalog query for the set's printings
(~400 rows: name, rarity, collector number, `image_uri_small`, price) and one holdings
query for that reader and set, joined server-side into cells. Roughly 60–80 KB encoded,
well inside the limits established by the payload-shrink work.

**Keep the SQL dumb.** The queries fetch rows; cell placement, completion counting and the
cost figure are pure functions over those rows. That keeps the model unit-testable rather
than needing a live-Postgres probe the way the claim model does.

**Caching:** the page's data changes only on collection upload, so it can sit behind the
same per-reader tag as the other list routes. Never Next's `staleTimes`.

**Card detail:** tapping a cell opens the existing modal
(`src/lib/collection/card-detail.ts`) rather than a new surface.

## Prices

`printing_prices` already defines the states, and they carry over unchanged:

- A printing **absent** from the feed has never been stocked. It is not free and not
  unknown.
- A row with null `price_cents` but a set `price_cents_foil` is **stocked in foil only**.
- A row whose `as_of` trails the newest `as_of` in the table is a **last known** price, not
  a live one.

**Cost to complete** sums `price_cents` over missing base-run cells that have a price row,
and states its own gap — "$X over 214 of 276 missing cards". The figure never silently
treats an unpriced card as zero.

**Cart link-out** reuses the #330 checkout builder. The one-selector rule from that work
applies: exactly one selection mechanism on the page, not a per-cell checkbox *and* a
"send everything missing" button.

## Surfaces and states

UI is gated on a design handoff carrying a READINESS verdict. Mobile and desktop parity
ship in the same PR.

**`/collection/sets`**

- First run — no collection uploaded; points at upload like the other locked surfaces.
- Populated — rows with a completion bar, set icon, name, code, release date, `N / M`.
- Search active — results across all collectible sets, including sets at 0%.
- Search, no match.
- A set whose `base_set_size` is still null — **not yet indexed**, never rendered as 0%.

**`/collection/sets/[code]`**

- Loading (its own `loading.tsx`, as every list route here has).
- The grid — base run in collector-number order; owned at full strength; missing dimmed,
  carrying number, name, rarity and price.
- Extras section — its own heading and its own `N / M`.
- 0% — nothing owned from this set.
- 100% — complete. Deserves a distinct treatment; it is the point of the page.
- Missing-only on, which breaks number continuity by design.
- Rarity and colour filters, alone and combined with missing-only.
- Filters combining to zero results.
- Unknown or non-collectible set code in the URL.
- Price absent (unstocked) versus foil-only.

**`/collection`** — one edit: the entry point into the index. Prominence is Design's call.

## Out of scope

On the record so it is not rediscovered mid-build:

- No sharing or comparing collections between readers. Single-reader page.
- No quantity or playset tracking. A cell is binary.
- No manual "mark as owned" control — a second way to own a card would be a second source
  of truth against `collection_items`.
- No `-promos` or paired Commander-deck set codes. Ruling 1 scopes this to one set code.

## Verification

Unit coverage:

- `booster` classification through `transform-printings` — base run, full-art basics inside
  it, showcase and promo extras outside.
- Per-printing `rarity` surviving transform (the Sacred Foundry `rare`/`mythic` case).
- Cell placement — pinned by collector number; unpinned by `oracle_id`; the duplicate-oracle
  case filling the lowest unfilled cell exactly once.
- Completion counting — base-run denominator, extras counted apart.
- Cost to complete — unpriced cards excluded from the sum *and* reflected in the stated
  denominator; foil-only handled as foil-only.

Browser probe: extend `scripts/probe-*.mjs` per visual ruling — dimmed versus full cell
states, the extras heading carrying its own figure, the 100% treatment. Anchored to
structure, not pixels.

## Migration and re-seed order

A half-applied state can present a wrong figure as a right one. If `booster` defaulted to
`false` every set would read 0% owned; if it defaulted to `true` the extras would
contaminate every figure.

So all three columns land **nullable**. A set whose `base_set_size` is null is not yet
indexed and the index says so rather than showing 0%.

1. Migration adds `printings.booster`, `printings.rarity`, `sets.base_set_size` — all
   nullable.
2. Deploy.
3. Catalog re-seed against staging, then production; the post-load pass fills
   `base_set_size`.
4. Confirm via `/api/health` and a spot check that `base_set_size` is non-null.

Safe in either order, and survives a re-seed that dies halfway.

## Next steps

1. Design handoff for the two routes and the `/collection` entry point.
2. READINESS audit.
3. Implementation plan.
