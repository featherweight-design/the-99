# Deck Stats, round 1

Design brief, 2026-10-03. A new per-deck surface. No handoff exists for it today.

## The ask

Hugh's rulings, 2026-10-03, in his words (summarized into numbered points below; nothing here
is quoted as a single verbatim block because the ruling arrived as a conversation rather than a
single intake note).

1. **Purpose.** Show what the deck IS and how it's doing. Fun and graphic-forward. Novel things
   other apps don't do are welcome, as long as they are not obtuse.
2. **Stats are facts, Analysis keeps judgment.** The bracket, the findings, and what to change
   stay in Analysis. A Stats figure that could read as a verdict is phrased as a fact instead.
   Stats may link to the Analysis finding that explains a number, but never restates the
   judgment itself.
3. **Per-deck first.** A cross-deck comparison (this deck against your other decks, or against
   the field) is a separate, later feature and is out of scope here.
4. **Round 1 contents**, seven groups:
   - (a) curve and card types
   - (b) color demand (pips) against color supply (mana sources), per color
   - (c) money and ownership: deck value, owned versus to-buy through the claim model, priciest
     cards
   - (d) you versus this commander: curve, land count and roles against the commander index
     average
   - (e) a jobs breakdown from the card labels (ramp, draw, removal, protection, win conditions)
   - (f) win record and trend from logged games
   - (g) results by version
5. **Round 2, out of scope, named so Design leaves room:** deck evolution across versions,
   collection share across versions, opening-hand odds with a sample hand, a shareable snapshot.
6. **Placement is Design's call.** Hugh's concern, stated for the record: the deck page is
   already tab-heavy (Your deck, Analysis, Consider, Games, Versions, plus sub-tabs within some
   of those), especially on phone. No sixth tab unless Design can justify one; folding Stats
   into an existing tab, or into a compact band on an existing surface, is an acceptable answer.
7. **Behind a feature switch**, `DECK_STATS_ENABLED`, following the `*_ENABLED` pattern already
   shipped for `ANALYSIS_TAB_ENABLED` (see "What exists today" below for exactly how that one is
   read). Off means nothing renders - no tab, no band, no data fetch.
8. **No paid model calls.** Everything here is computed from stored data: the decklist, the
   collection, logged games, the commander index, and card labels. Stats draws whether or not
   the deck has been analyzed. A deck with no logged games shows the rest of its facts plus an
   empty state for results.
9. **About entry.** A new feature owes a new About entry and an `ABOUT_VERSION` bump, per the
   standing rule in `AGENTS.md`.

## What exists today (the record)

This section answers, for each round-1 item, whether the data already exists and where, whether
it needs a new derivation, or is blocked - verified against `origin/main` by reading the actual
files and, where the question is about populated data rather than code, by running read-only
`COUNT` queries against **staging** (never production; see the per-item notes).

### The switch pattern to follow

`ANALYSIS_TAB_ENABLED` is read by `analysisTabEnabled()` in `src/lib/decks/analysis-flag.ts:24`:
a single `env.ANALYSIS_TAB_ENABLED === "true"` check, server-side (deliberately not
`NEXT_PUBLIC_*`), defaulting off for anything but the exact string `'true'`. `DECK_STATS_ENABLED`
should be a sibling of this, its own file or its own small function, read the same way.

### (a) Curve and card types - **data exists for curve; card types needs a new derivation**

`src/lib/decks/stats.ts:159-216` already computes `manaCurve()`: eight buckets (mana value 0
through `CURVE_MAX` = 7, the last a ceiling), total non-land copies, the average mana value, and
lands counted separately (excluded from the curve itself, via `isLandFace`). This already feeds
`loadDeckStats` / `loadOneDeckStats` in `src/lib/decks/stats-query.ts:76-193`, which both the
deck page and Home's roll-up call today.

A breakdown by card type (creature, instant, sorcery, artifact, enchantment, planeswalker,
battle, land) does **not** exist as a player-side stat. `typeLine` is already selected by the
same query (`stats-query.ts:93-104`), so a type-bucketing function parallel to `manaCurve()` is a
straightforward addition - no new reads, just a new pure function in `stats.ts` plus a field on
`DeckStats`.

### (b) Color demand (pips) vs supply (mana sources) - **needs a new derivation, lands straightforward, non-land sources moderate**

Pip parsing already exists: `manaNeeds()` (`src/lib/profile/build.ts:274-287`) takes a mana cost
string and returns one array of colors per pip, dropping hybrid halves that can be paid without
color and snow. It is used today only inside `colours()` (`build.ts:289-311`), which reduces pips
to two **sets** - `producibleColors` (colors any land in the deck can make) and `unproducible`
(colors demanded that no land supplies) - never a per-color **count** of demand or supply. There
is no existing figure for "how many red pips does this deck ask for" or "how many sources make
red."

Land-side supply is straightforward: the same `isLandFace` + `colorIdentity` read already used by
`colours()` gives a per-color count of mana-producing lands with no new reads.

Non-land mana sources (rocks, dorks) are not modeled anywhere. `classifyRoles()`
(`src/lib/recs/roles.ts:28-45`) flags a card `ramp` via text patterns (`{T}: add`, `search your
library for... land... onto the battlefield`, and so on) but does not resolve *which* color a
ramp source produces - that would need a further text parse (e.g. extracting the color out of
`{T}: Add {R}`) that nothing in the repository does today. A round-1 cut that counts lands only,
and reports ramp/rock count as a separate fact without attributing it to a color, is the
straightforward slice; full non-land color attribution is a new, moderate-complexity derivation.

### (c) Money and ownership - **cost-to-buy exists (aggregate); deck value and a per-card list need new derivations**

`loadDeckStats` already carries `cost: DeckShopping | null` per deck
(`stats-query.ts:40-45, 140-146`), sourced from `loadShoppingRollup()`
(`src/lib/decks/shopping-rollup.ts:70`), which is itself built on `loadDeckBuyRows`
(`src/lib/decks/availability-query.ts`) - the same claim-model reader `probe:claims` proves. This
gives copies-to-buy, total cents, and priced-copies (how many of those copies have a price at
all) as **one aggregate per deck**, which is what the item asks for under "owned vs to-buy
through the claim model."

Two things it does not give:
- **Deck value** (what the owned cards are worth) - there is no existing "deck value" or
  "collection value" computation anywhere in `src/lib`. `loadShoppingRollup` prices only the
  copies a deck still has to buy, not the ones it already owns.
- **Priciest cards**, a per-card list - `DeckShopping` is aggregate-only (`copies`, `cents`,
  `pricedCopies`); there is no per-card row kept.

Both are buildable from existing pieces without a new upstream read: `loadPrices()`
(`src/lib/decks/price-query.ts:67`) already resolves per-oracle-id price facts, and `priceOf()`
(`src/lib/decks/price.ts:100`) resolves one card's price from a `PriceState`. A per-card list (for
both owned value and buy cost) is a new derivation that joins the decklist against `loadPrices`
directly, parallel to what `loadShoppingRollup` already does at the aggregate level.

### (d) You vs this commander - **data exists and is populated on staging**

The basis chain that the Analysis tab already reads is exactly this comparison, already built:
`CompositionCandidates` (`src/lib/profile/build.ts:49-54`) resolves pair -> commander -> identity
-> count, first-present-wins, exposed through `pickRoleTargets()` (`build.ts:81-92`) for the four
role targets and the parallel chain in `skeleton()` (`build.ts:315-331`) for the land/curve
composition. The commander-level figures come from `commander_support`
(`src/db/schema.ts:1001-1076`): `avgLand`, `avgBasic`, `avgNonbasic`, `avgCreature`, `avgInstant`,
`avgSorcery`, `avgArtifact`, `avgEnchantment`, `avgPlaneswalker`, `avgBattle` (lines 1043-1052),
`avgCurve` (jsonb, line 1054), and `avgRamp`/`avgDraw`/`avgRemoval`/`avgWipes` (lines 1072-1075).
The identity-bucket fallback is `identity_composition` (`schema.ts:1308`ff, same column shapes,
`avgLand` at line 1311).

Verified populated on **staging** (`THE_99_NEON_STAGING_DIRECT`, read-only transaction, branch
confirmed as `br-polished-pond-a6e63y0b`), read-only `COUNT`s, no production access:

| table | rows | populated |
|---|---|---|
| `commander_support` | 3,468 | 3,467 carry `avg_land` / `avg_ramp` / `avg_curve` |
| `identity_composition` | 19 | all 19 carry role figures (`with_roles > 0`) |
| `commander_pair_support` | 1,717 | (not separately counted; same shape as `commander_support`) |

Stats can read this through the same loader the Analysis tab uses (`src/lib/profile/load.ts`,
`loadSkeletonForCommanders`), or a narrower read of just the composition/role columns if pulling
in the rest of `loadDeckProfile`'s work (bracket flags, combo aggregation, tutor classification,
staples) is unwanted for a page that is not drawing a verdict. That narrower path exists already:
`src/lib/decks/deck-mix.ts` shows the pattern of calling `loadSkeletonForCommanders` directly for
a lighter read than the full profile.

### (e) Jobs breakdown from card labels - **data exists and is populated on staging**

`readLabels()` (`src/lib/labels/read.ts:29-39`) takes oracle ids and returns a `Map<string,
Job[]>` of fresh labels, dropping stale rows (input hash mismatch) and malformed jobs. A `Job`'s
`kind` is drawn from the same vocabulary the rest of the app uses for roles and themes
(`src/lib/labels/types.ts:40, 47-52): role-space jobs include `ramp`, `draw`, `removal`,
`wipes`, `land`, `tutor`, `counterspell`; theme-space jobs include `protection` and `finisher`
(the closest existing vocabulary member to "win conditions") among many others. This exactly
covers "ramp, draw, removal, protection, win conditions."

`standInLabelsEnabled()` (`read.ts:18`, gated on `STAND_IN_LABELS_ENABLED`) is a **different
feature's** switch - the stand-ins sheet - not a gate on the `card_labels` table itself. Stats
would be a new, independent caller of `readLabels()`, unaffected by that flag.

Verified populated on staging: `card_labels` carries 32,099 rows, one per distinct oracle id
(read-only `COUNT`, same staging connection as above). A deck's jobs breakdown is a straight
`readLabels()` call over that deck's oracle ids, tallying `Job.kind` the same way `colourSpread`
tallies colors.

### (f) Win record and trend - **record exists; trend needs a new derivation**

`playRecord()` and `recordFromCounts()` (`src/lib/decks/stats.ts:30-67`) already compute
wins/losses/draws/played, and `loadDeckStats` (`stats-query.ts:76-193`) already reads
`deck_games` grouped by result (`stats-query.ts:118-126`) to feed it - this is live on the deck
page and Home today.

A **trend** (most of Hugh's "and trend from logged games") does not exist as a figure - the
grouped read discards `playedAt`. `deck_games.playedAt` (`schema.ts`, the column beside
`versionId`) is already stored, so a trend (recent N games' record against lifetime, or a
win-rate-over-time series) is a new query ordering by `playedAt` rather than grouping it away,
and a new pure function alongside `recordFromCounts`. No new column, no new table.

### (g) Results by version - **column exists; needs a new grouped query**

`deck_games.versionId` (`src/db/schema.ts:633-658`, specifically line 643) already stores which
version was live when a game was logged - nullable, `on delete set null`, deliberately: "games
logged before versioning shipped were played by a list nobody recorded, and null is the accurate
value." Today's `loadDeckStats` groups games by `result` alone, not by `(versionId, result)`, so
this is a new `group by` on an existing column, not a new field.

Verified on staging: `deck_games` carries 6 rows total, 5 with a `version_id` set and 1 null,
confirming both the populated case and the pre-versioning null case actually occur and need a
visible "before versioning" bucket rather than being silently dropped or miscounted as version 1.
`deck_versions` carries 26 rows across the account's decks. This is a thin dataset to design
against for layout density; Design should not assume every deck has many versions or many games.

## Deliverables

- 390 and 1300 frames for every state Stats can be in: populated with games logged, populated
  with no games logged (the empty state for (f) and (g), facts for (a)-(e) still drawn), a brand
  new deck with a tiny decklist (thin-data case), and a deck with no commander-index figures at
  all (every rung of the (d) chain absent, i.e. a colorless or very fresh commander) so the
  degraded case is drawn rather than assumed.
- The placement decision itself, with its rationale: a sixth tab, a fold into an existing tab, or
  a compact band, and why, against the tab-crowding concern in ruling 6.
- A states table (`STATES-*.md`), matching the format of recent handoffs
  (`design/design_handoff_the99_analysis_tab/STATES-analysis-tab.md` is the reference).
- A copy strings file, every string a PLACEHOLDER owed to `/copy-review`.
- The About entry's artboard frame and its copy strings (same file or a sibling, Design's call),
  following `design/design_handoff_the99_analysis_tab/ABOUT-entry.md`'s template.

## Out of scope (round 2, named so this round leaves room)

- Deck evolution across versions (how the list itself changed, not just results).
- Collection share across versions (how much of the list you owned at each version).
- Opening-hand odds with a sample hand.
- A shareable snapshot of the Stats surface.
- Cross-deck comparison of any kind (ruling 3).

## Copy rules

US English. No em dashes. Every new string in this round's deliverable is a PLACEHOLDER;
`/copy-review` resolves wording, not this brief or its handoff.

## Where it lives

- `src/lib/decks/stats.ts`, `src/lib/decks/stats-query.ts`: curve, color spread, play record, the
  shopping aggregate - the existing half of round 1's data.
- `src/lib/profile/build.ts`: `manaNeeds`, `colours`, the composition/role basis chain
  (`CompositionCandidates`, `pickRoleTargets`, `skeleton`) - the (d) comparison and the pip
  parsing (b) builds on.
- `src/lib/profile/load.ts`, `src/lib/decks/deck-mix.ts`: the lighter read path into the basis
  chain, if Stats should not pay for the rest of `loadDeckProfile`.
- `src/lib/decks/shopping-rollup.ts`, `src/lib/decks/availability-query.ts`,
  `src/lib/decks/price-query.ts`, `src/lib/decks/price.ts`: the claim-model and pricing readers
  (c) builds on.
- `src/lib/labels/read.ts`, `src/lib/labels/types.ts`: the jobs breakdown (e).
- `src/db/schema.ts`: `deckGames` (line 633, `versionId` at 643), `commanderSupport` (1001),
  `identityComposition` (1308), `cardLabels` (2199).
- `src/lib/decks/analysis-flag.ts`: the `*_ENABLED` pattern `DECK_STATS_ENABLED` should follow.
- `src/lib/decks/builder-tab-specs.ts`, `src/components/decks/builder-tabs.tsx`: the existing tab
  list, for Design's placement decision against ruling 6.
- `src/lib/copy/about.ts`: `ABOUT_VERSION` (currently 9).
- Intake: Hugh's rulings, 2026-10-03 (verbal, recorded in full above; no separate intake file).
