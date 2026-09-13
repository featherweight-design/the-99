# Set Collections — design

**Date:** 2026-09-10 · amended 2026-09-11 after the design round
**Status:** handoff landed (R3) and audited 🟢 Green — ready to build
**Routes:** `/collection/sets`, `/collection/sets/[code]`
**Handoff:** `design/design_handoff_the99_set_collections/`
**Readiness:** `docs/superpowers/readiness-set-collections.md`

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
4. **Holdings with a set but no collector number resolve by `oracle_id` within that set,
   and the cell says so.** A CSV lacking a collector-number column still names the set, and
   ignoring those rows would show cards you own as blank — the one defect that destroys
   trust in the figure. **A pasted list is different and cannot be rescued:**
   `parsePasteList` writes `setCode: ""` as well as an empty collector number
   (`src/lib/manabox/paste.ts:49`), so a pasted holding names no set and belongs to no set
   page. That is a property of paste entry, not of this feature; a reader whose collection
   is entirely pasted sees an empty index and the first-run copy explains why.
   **Amended 2026-09-11 (design R2):** this ruling originally carried no mark on the filled
   cell. Hugh overruled that during the design round — an unpinned fill is not an error to
   disclose but the one moment the app can usefully ask which printing you hold. The cell
   carries an outlined brand diamond and mono `BY NAME`, the unset half of `printing_picker`'s
   shipped `Your pick` mark (`printing-region.tsx:573`). It never lands on a missing cell, it
   is a mark and never a control, and it is quieter than `◆ FOIL`. See handoff decision 13.
5. **The index lists sets you hold cards in, plus a search that reaches any set.** So a
   set can be opened at 0%.
6. **Missing cells render the real art, dimmed.** We have `image_uri_small` for every card
   whether owned or not, which the Pokémon app does not — seeing what you are missing
   beats reading a number.
7. **Prices, a cost-to-complete total, and a Mass Entry link-out**, all reusing the
   deck-side ManaPool work (#288, #330). #330 ships no cart — its affordance is
   `manapool.com/add-deck`, and that is what this page reuses.
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

Base run 1–276, extras 277–399 — exactly ruling 1's split. The field rides on the same
`default_cards` entries `transform-printings.ts` already parses, but is **not read today**:
`PrintingRow` carries no `booster`, so the ingest has to be extended before the column can
hold anything.

**`booster` alone is not sufficient, and a set type proves it.** Cards in a Commander
product are not booster-eligible: every printing in `c21` and `otc` carries
`booster: false`, checked live. Taken literally the rule would give every Commander set a
`base_set_size` of 0 and file the entire product under extras — on a page whose search scope
deliberately includes `set_type = commander`. So the boundary is:

> The base run is a set's `booster = true` printings. **When a set has none, the base run is
> its non-variant printings instead** and its extras are the variant ones.

The fallback reuses `is_variant`, which is a poor boundary for a booster set (it flags
full-art basics inside the base run) and a serviceable one for a product that never had a
booster to be in.

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
- The **denominator** is `base_set_size` — the count of base-run printings under the rule
  above. EOE: 276.
- **`(set_code, collector_number)` is unique**, so counting printings and counting distinct
  collector numbers are the same count. Verified against the catalog: zero groups of more
  than one across every printing in the table. Recorded because "a cell is a collector
  number but the denominator counts rows" reads like a units mismatch and is not one.
- A cell is **owned** when the reader holds a matching printing in any finish.
- **Pinned** holdings match on collector number. **Unpinned** holdings (ruling 4) match on
  `oracle_id` within the set.
- Base runs contain duplicate oracle ids — EOE has Plains at both #262 and #268. An
  unpinned holding cannot tell them apart, so it fills the **lowest-numbered unfilled cell**
  for that oracle and stops.
- **Unpinned holdings collapse by `oracle_id` before they are placed.** `finish` is in
  `collection_items`' primary key, so one unpinned card can arrive as a foil row and a
  nonfoil row; letting each claim a cell would fill #262 *and* #268 off a holding that says
  nothing about which printing is owned. Collapsing under-claims when someone really does
  own both, and over-claiming is the worse error on a page that exists to say what you have.
- **Extras** (`booster = false`) are counted and displayed separately and never folded into
  the headline figure.

## Read path

**Index (`/collection/sets`)** — two queries:

1. Sets held: the reader's `collection_items` joined to `printings` and `sets`. It is not
   a count over `collection_items` alone — foil and nonfoil rows collapse to one cell, and
   number-less rows need the same `oracle_id` resolution the grid uses, so the index runs
   the same placement rule rather than a second approximation of it. Ordered by
   `released_at` **descending with nulls last**, then by `code`: the column is nullable
   (`schema.ts:19`) and Postgres sorts nulls first under `desc`, which would lead a
   newest-first list with undated promo sets. `set-filter.ts:93` already orders this way.
2. Search: `sets` by name or code, restricted to collectible `set_type`s (expansion, core,
   commander, draft innovation, masters) and `digital = false`.

**Set page (`/collection/sets/[code]`)** — one catalog query for the set's printings
(~400 rows: name, rarity, collector number, `image_uri_small`, price) and one holdings
query for that reader and set, joined server-side into cells. Roughly 60–80 KB encoded,
well inside the limits established by the payload-shrink work.

**Keep the SQL dumb.** The queries fetch rows; cell placement, completion counting and the
cost figure are pure functions over those rows. That keeps the model unit-testable rather
than needing a live-Postgres probe the way the claim model does.

**Caching:** the page is **not** a function of the reader's collection alone. It also reads
catalog columns (`booster`, `rarity`, `base_set_size`) and ManaPool prices, and both of
those are written by workflows that never call `revalidateUserLists` — the weekly catalog
refresh and the weekly price refresh. The per-reader tag is still the right cache for the
holdings half, and the freshness bound on the other half is stated rather than assumed: a
set re-indexed or re-priced between visits shows its previous figures until the tag's TTL
expires. Both inputs move weekly, so the bound is well inside the cadence. Never Next's
`staleTimes`.

**Card detail:** tapping a cell opens the existing modal — `card-modal.tsx` wired through
`CardDetailProvider` in `src/components/cards/` — rather than a new surface.
`src/lib/collection/card-detail.ts` is that modal's server-side loader, not its trigger.

## Prices

`printing_prices` already defines the states, and they carry over unchanged:

- A printing **absent** from the feed has never been stocked. It is not free and not
  unknown.
- A row with null `price_cents` but a set `price_cents_foil` is **stocked in foil only**.
- A row whose `as_of` trails the newest `as_of` in the table is a **last known** price, not
  a live one.

**Cost to complete** reuses the shipped price model rather than restating it:
`priceState` and `priceOf` in `src/lib/decks/price.ts:80,98` already classify a fact as
`priced`, `foilOnly`, `soldOut` or `absent`. Only `priced` and `foilOnly` are summed —
a `soldOut` row is a last-known price for something nobody is selling, and "has a price row"
would have quoted it. The figure states its own gap: "$X over 193 of the 214 missing", with
the remainder named. It never silently treats an unpriced card as zero, and never drops a
foil-only card it could have costed.

**The link-out is Mass Entry, not a cart.** #330 adds no cart, order or checkout: its
whole-list affordance is a `manapool.com/add-deck` link built in `src/lib/manapool/links.ts`
and fed by `src/lib/decks/shopping.ts`. This page reuses that builder over the missing
cells. The one-selector rule from that work applies: exactly one selection mechanism on the
page, not a per-cell checkbox *and* a "send everything missing" button.

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

## Addendum — the Collection row cost track (§1b)

Added during the design round, and **severable**: it changes `/collection`, not either new
route, and ships or slips on its own PR.

Every other card row in the app states mana cost; the Collection row states colour identity
alone (`rows-view.tsx:81` renders `ColorPips` and no mana value). The identity pips move out
of the leading slot and become a fixed 90px right-aligned track — a 20px mono mana-value disc
then 13px pips — which is `deck-versioning`'s un-shingled track at the size it already ships.
Phone: 76px on the meta line.

Consequences, per handoff decision 21: the name column gains ~74px, which matters because
names truncate today; lands keep an empty disc slot rather than printing `0`, so the track
never ragged-edges and 37 land rows do not assert a figure where there is an absence.

It is recorded here rather than in its own ticket because it was asked for inside this
handoff and is drawn in this canvas. It carries no dependency on the two new routes, and
nothing on the new routes depends on it.

### Correction, 2026-09-13 — the track states a COST, not a value beside an identity

As built, §1b drew a mana-value disc followed by the card's **colour identity** pips. The
premise above is right and the drawing answered it with the wrong two facts. Colour identity
folds in every symbol a card's *abilities* cost, so `Abzan Monument` — cost `{2}`, ability
`{1}{W}{B}{G}` — drew a `2` and three coloured pips and read as a four-colour two-drop. And a
mana value beside identity pips is not the pattern the addendum set out to match: the decklist
row draws the cost itself, through `CostPips`.

The track now renders `CostPips` on the card's own `manaCost`, at the same 12px and the same
five-slot cap the decklist row uses, in the 76/90px cell §1b established. Three consequences,
all deliberate:

- **Colour identity leaves the row.** It was never the thing the addendum asked for, and no
  other card row in the app states it. It is still a filter, and still the grid tile's wash.
- **A land draws nothing**, where §1b kept an empty 20px disc so the track would not
  ragged-edge. The cell's width is fixed by the grid template, so there is nothing to
  ragged-edge; the disc was holding a column that holds itself.
- **The row's spoken name carries `spokenManaCost`**, which says `no mana cost` for a land
  rather than saying nothing. §1b's land branch left silence, and silence is
  indistinguishable from a missing label.

Ruled by Hugh on 2026-09-13 from a screenshot of the two rows side by side; not a Design
round-trip.

## Findings from the readiness audit

Four things the handoff assumes that the shipped code does not currently support. All are
engineering-resolvable — none went back to Design.

**The set icon does not inherit `currentColor`.** Handoff decision 24 and gap 4 assume it
does. It does not: `svgs.scryfall.io/sets/*.svg` is a bare `<path>` with no `fill`, so it
renders black on every theme, not only at 100%. The fix is not a fetch-and-recolour — a
`mask-image` on a span with `background: var(--token)` recolours it arbitrarily and serves
the `--fg-muted` rest state by the same mechanism.

**The colour filter is not a mountable component.** `filter-bar.tsx` builds the desktop pip
row inline and the mobile Color panel separately, so "mounted verbatim, not forked" needs an
extraction first. Per decision 15's own rule, it must come out as a genuinely parameterised
component — a version taking an `isSetPage` flag is the bug that rule exists to prevent.

**Decision 16 names no mechanism.** The stale-page strip requires the page to learn that a
delta exists — and its copy requires the count — while deliberately not re-rendering.
Nothing in the app pushes. A lightweight count fetched on window focus delivers both; the
cost is real and is planned for explicitly.

**Windowing interacts with the strip.** Gap 7 leaves windowing to engineering, which is
right, but a windowed grid and an unrendered delta strip compete for the same scroll
container. Whatever approach is chosen has to hold the sticky head, the `extras ↓` jump and
the strip together.

## Known limitation: the catalog is never reconciled

`seedPrintings` upserts and never deletes, and nothing compares the table against the bulk
file it has just read. A printing Scryfall withdraws stays in `printings` indefinitely, so
a set grid can draw a cell for a card that is no longer in the catalogue, and
`base_set_size` counts it — a denominator one too large, and a cell nobody can buy.

Deliberately not fixed by this feature. Reconciling means deleting catalog rows, and a run
that fails mid-stream would delete live ones; doing it safely needs a staging table and a
swap, which is a change to the ingest rather than to the surface that reads it. Withdrawals
are rare and the damage is one stale cell against a denominator of several hundred.

**Worth a follow-up ticket**, and flagged rather than filed.

## Errata against the handoff

- `READINESS.md` says "seven of the nine grid states" are drawn. `STATES-set-grid.md` draws
  S6–S15 — all ten — plus four edges beyond the spec's list. The line is R2-era, carried
  into R3.
- Gap 2 leaves the duplicate-oracle case's copy unsettled. That is copy content, so it goes
  to `/copy-review` rather than back to Design.

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

**Nullability only protects the first migration.** `seedPrintings` writes in independent
batches and the post-load pass runs after a complete stream, so a refresh that dies halfway
leaves a partially rewritten mix of `booster` values beside the *previous* run's non-null
`base_set_size` — a denominator that no longer describes its numerator, presented as a
percentage. The pass therefore **nulls every denominator before the ingest starts and
repopulates only after the stream completes**. A failed refresh leaves sets reading "not
indexed yet", which is true, instead of a wrong percentage, which is worse.

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
