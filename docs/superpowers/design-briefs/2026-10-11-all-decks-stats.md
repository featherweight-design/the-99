# Lineup (all-decks stats)

Design brief, 2026-10-11. The second part of Deck stats. Round 1 drew one deck at a time and named a cross-deck
comparison as "a separate, later feature" (`2026-10-03-deck-stats.md`, ruling 3, and its out-of-scope list). Hugh
asked on 2026-10-11 for it to be briefed so it is not lost, then ruled on its scope the same day. Design picks it
up when free. The feature is named **Lineup**.

## Rulings 2026-10-11 (Hugh, closed)

1. **No re-hash of the per-deck Deck stats. Lineup-level insight only:** your decks side by side, and this deck
   among yours. "Against the field" is not a focus. The charts below are for Design to explore, all from data the
   app already holds; Hugh wants fun, unique charts in the spirit of Deck stats' Buy chart and the average
   comparison, and **Design is invited to propose more.**
   - **Play recency:** last played, decks not played in a while, and never-played decks as their own group.
   - **Bracket and color spread:** where the lineup is crowded and where it has gaps.
   - **Shared cards:** Sol Ring in 20 decks against 17 owned, the staples every deck leans on, contested copies at
     a glance.
   - **Collection put to work:** collection in decks against idle, value in decks against not, and idle cards your
     commanders would want.
2. **All decks count by default, filterable** (finished only, or include brews). Never-played decks are shown as a
   group, never hidden.
3. **Totals count once per copy owned.** 17 Sol Rings count 17 times, so value and "put to work" match the real
   collection. The shared-cards chart is where the 20-against-17 gap is shown.
4. **Results are raw, with pod sizes shown** (for example "2 of 7 · pods of 3-5"). No adjusted math.
5. **Named Lineup, on `/decks`, behind its own switch `LINEUP_ENABLED`.** Placement on `/decks` is Design's call.
   Hugh flags that sharing a row with the shopping cart and the precons lines is tight on phone.
6. **The round-2 per-deck extras stay out:** version evolution, collection share by version, opening-hand odds
   and the shareable snapshot.

"All-decks stats" is the brief's file name only and is not used in the app.

## What exists today

All paths are on `main`; line numbers read 2026-10-11, and they move.

**The per-deck Stats view (round 1, shipped behind its switch)**
- `src/lib/decks/stats-flag.ts:9` `deckStatsEnabled()`: `'true'` only; off means no Stats segment and no read.
  The deck page starts every Stats read in parallel with the detail (`src/app/decks/[id]/page.tsx:143-163`).
- Curve and types: `manaCurve`, `typeCurve` (`src/lib/decks/stats.ts:203`, `:312`), drawn by `CurveCard`
  (`src/components/decks/deck-stats-view.tsx:45`).
- Jobs: `jobTally` (`src/lib/decks/job-tally.ts:46`) over six rows (ramp, draw, removal, wipes, protection,
  finisher), read from card labels with a rules-text fallback (`src/lib/decks/stats-labels.ts:7`). The app never
  shows the word "labels" to a player (Hugh, 2026-10-10; header of `job-tally.ts`).
- Colors: `manaSupply` (`src/lib/mana/supply.ts:184`): pips asked for against land and other sources, per color.
- Against the average deck: `loadStatsAverage` (`src/lib/decks/stats-average-load.ts:60`) resolves the basis
  chain (pair, commander, identity, count, baseline) through `loadSkeletonForCommanders`
  (`src/lib/profile/load.ts:622`), one call per deck; `averageComparison` (`src/lib/decks/stats-average.ts:89`).
- Money: `moneyStats` (`src/lib/decks/stats-money.ts:52`): owned against to-buy by the Shopping partition, priced
  by the buy tag's rule, with "N of M priced" and the five priciest.
- Results: `resultsStats` (`src/lib/decks/stats-results.ts:51`): record, last five, by version. Pod size is not
  read.

**A whole-account roll-up already exists, with no caller**
- `loadDeckStats` (`src/lib/decks/stats-query.ts:84`) returns record, color spread, curve and cost for every deck
  of a user in a FIXED number of reads (its header: "Home's roll-up over every deck therefore costs the same round
  trips as a single deck page"). `sumPlayRecords` and `sumColourSpreads` (`src/lib/decks/stats.ts:73`, `:142`) add
  them up. It shipped in #524 for a Home roll-up that was never drawn; nothing calls it today. It covers part of
  the seven groups: the curve without card types, the to-buy cost without the owned value, and the record without
  trend or versions. Its color figure is the identity spread, not pips against sources. Jobs and the average are
  absent.

**`/decks` and its cache**
- `src/app/decks/page.tsx:46`: the whole payload (`listDecksWithStats`, `loadShoppingRollup`, `listFolders`) is
  cached per reader by `cachePageForUser` (`src/lib/cache/page-cache.ts:48`), keyed on the reader's
  `user_data_stamps` row (moved at commit by the `user_data_touch` trigger), the catalog generation, the deployment
  and the switches (`switches()`, `page-cache.ts:36`). `pnpm check:list-cache` fails when the page reads a per-user
  table the stamp does not cover. `DECK_STATS_ENABLED` is not in `switches()` today, because `/decks` reads nothing
  behind it.
- The deck tile already carries a bracket chip (last analyzed bracket, `src/lib/profile/stored-sql.ts:16`) and the
  To buy figure from the shopping roll-up.

**The commander index (staging; "against the field" is not a Lineup focus, ruling 1, but idle cards your
commanders would want read `commander_support_cards`)**
- `commander_support` (`src/db/schema.ts:1146`): 3,467 ok commanders, all 21 of Hugh's among them.
- `identity_composition` (`schema.ts:1471`): 19 rows of average land, type and curve per identity condition.
- `format_staples` (`schema.ts:1423`): 770 rows over 16 conditions (each color pair and mono color, plus `count:3`).
- Evidence benchmarks ("How it plays", Analysis tab) grade against cut points from 34,670 sampled decks, ten per
  commander (`src/lib/benchmarks/cuts.ts:4`). The samples are synthesized read-only by `pnpm measure:benchmarks`
  and only the cut points are kept, hand-pasted into that file. That is the one place the app already places a
  deck in a population.

**The About entry for round 1**
- `deck-stats` (`src/lib/copy/about.ts:1124`), `since: 11`, follows `DECK_STATS_ENABLED`, and took NO version
  bump because the switch is off in production (comment at `:1130-1138`). `ABOUT_VERSION` is 14 (`:61`).

## What engineering has locked

Engineering's reading of the rulings. Hugh can override any of it.

1. **No model calls.** Every figure is computed from stored data: decklists, the collection, `cards`, card labels,
   prices, logged games, the claim model and the commander index. Drawing it costs nothing and needs no credit.
2. **One definition per figure.** Where Lineup shows a per-deck number (a bracket, a last-played date, a record),
   it is the number the deck's own surfaces show, from the same function (`resultsStats`, `storedPermitsSql`,
   `listDecksWithStats`). Lineup never re-derives one.
3. **Per copy owned, from the collection** (ruling 3). "Put to work" splits each owned copy into in a deck or idle
   by `min(owned, needed by decks)`; a card the decks need more of than the player owns adds its shortfall to the
   shared-cards gap, never to a total. Which deck holds a contested copy is the claim model's
   (`claimModel`, `src/lib/decks/availability-query.ts:58`), not Lineup's.
4. **A fixed number of reads, not one per deck.** The `loadDeckStats` pattern: one decklist read, one collection
   read, one price read, one games read, one index read for "idle cards your commanders would want".
5. **The `/decks` payload stays cached by `cachePageForUser`.** Any new per-user table it reads passes
   `check:list-cache`; `LINEUP_ENABLED` joins `switches()` (`src/lib/cache/page-cache.ts:36`); catalog-side inputs
   (labels, prices, the index) must each move the key when they change. Prices and the index do (an ingest or a
   copy stamps `catalog_refreshes`). Labels do on production, where they arrive by `db:copy:labels` through the
   copy harness, but NOT on staging, where they are built: `publishWave` (`src/lib/labels/publish.ts`) writes
   `card_labels` with no stamp. Any Lineup figure read from labels therefore needs a label generation in the key,
   or a stamp from the label build, before it is cached.
6. **Behind `LINEUP_ENABLED`, off means no read**, the `deckStatsEnabled` shape: server-side, `'true'` only.
7. **Facts, not judgment.** The bracket, findings and what to change stay in Analysis. A gap or a crowd in the
   lineup is stated as a count ("no deck at bracket 2"), never as advice or a verdict.

## What Design owns

- **Placement on `/decks`** (ruling 5): a segment beside the tiles, a section, a sheet or a route, at 1300 and 390,
  against Hugh's flag that a row shared with the cart and precons lines is tight on phone.
- **The charts.** The four families in ruling 1, and any more Design proposes. Each from data listed under
  Fixtures; anything that needs data the app does not hold comes back as a question, not a drawing.
- **The filter** (ruling 2): all decks, finished only, include brews. Where it sits, and what each chart does when
  it narrows the lineup.
- **This deck among yours.** How one deck is picked out of the lineup (from a tile, or on the deck page), and
  whether that reaches the deck page at all.
- **Thin data.** One deck; no games logged; no deck analyzed; a colorless deck; a partner deck.
- **Links.** Every deck in a chart leads to that deck; every card in the shared-cards chart opens its card.
- **Copy.** Every string is a placeholder for `/copy-review`. No verdict words; "select" and "unselect", never
  "tick"; the word "labels" never appears.
- **The About entry** (below).

## Open questions for Design

1. **One chart per figure, or one card per deck?** A row per figure answers "which deck was played last"; a card
   per deck answers "what is this deck like", and the tile grid already does that.
2. **Never-played as a group** (ruling 2): 15 of 21 decks have no game. On a recency chart that group is most of
   the lineup; how is it drawn so it is visible without swamping the 6 that have dates?
3. **Bracket spread with 7 decks never analyzed.** The analyzed bracket is a set (`[4, 5]`, `[1, 2]`), not one
   number. How does a deck spanning two brackets sit on the spread, and where do the 7 unanalyzed go?
4. **The 20-against-17 gap.** Sol Ring is wanted 20 times and owned 17. How is "wanted more than owned" drawn so it
   reads as a count, not a warning?
5. **Idle cards your commanders would want.** 144 idle cards appear in at least one of these commanders' index
   lists at 20% inclusion or more, 67 at 40%. Where is the cut, and does the chart name the commander?
6. **Results line** (ruling 4): "2 of 7 · pods of 3-5" for the lineup. Per deck as well, or only in total?

## Fixtures (staging, read-only, 2026-10-11)

Account `user_3GkZrrTwOJBdqUpq6GambP0BC8w`, Neon project `misty-rain-01681654`, branch `br-polished-pond-a6e63y0b`.
Nothing was written. The figures below are read by SQL, not by the app's loaders, so they approximate the app's in
three named ways: commanders are excluded from mana value, jobs and value; jobs count raw labels (no freshness
filter, no rules-text fallback); value is each card's cheapest current printing at the newest `as_of`, not the
deck's printing picks. Lands are cards whose type line contains Land.

| Deck | Identity | Analyzed bracket | Avg MV (nonland) | Lands | Ramp | Draw | Removal | Value | Games (W) | Versions |
|---|---|---|---|---|---|---|---|---|---|---|
| HD - Avatar Aang | WUBRG | 3 | 2.70 | 36 | 18 | 15 | 6 | $100.40 | 1 (0) | 2 |
| HD - Brago | WU | 4 | 3.61 | 35 | 7 | 13 | 12 | $176.31 | 0 | 1 |
| HD - Eldrazi | colorless | 3 | 4.78 | 39 | 24 | 18 | 18 | $264.61 | 0 | 1 |
| HD - Elves | G | none | 2.53 | 29 | 21 | 4 | 8 | $56.41 | 0 | 1 |
| HD - Gishath | WRG | 4 | 4.34 | 38 | 26 | 8 | 14 | $126.80 | 0 | 0 |
| HD - Goblins | R | 4-5 (declared 4) | 2.18 | 34 | 8 | 1 | 25 | $46.64 | 0 | 1 |
| HD - Gods (Kratos + Atreus) | WUR | 4-5 (declared 4) | 3.24 | 39 | 14 | 13 | 6 | $432.67 | 1 (1) | 2 |
| HD - Kratos | R | 3 | 3.27 | 37 | 12 | 7 | 9 | $245.79 | 0 | 0 |
| HD - Omnath | WURG | 3 | 3.70 | 38 | 38 | 17 | 6 | $274.61 | 1 (0) | 1 |
| HD - Soldiers | W | none | 2.69 | 35 | 8 | 5 | 10 | $41.35 | 0 | 1 |
| HD - Tovolar | RG | 1-2 (declared 2) | 2.88 | 35 | 15 | 4 | 10 | $112.22 | 2 (0) | 1 |
| HD - Wizards | U | 4 | 2.53 | 35 | 11 | 24 | 6 | $53.67 | 0 | 2 |
| HD - Yuriko | UB | 2 | 2.99 | 27 | 11 | 15 | 8 | $252.60 | 0 | 1 |
| HD - Zombies | B | none | 2.55 | 34 | 8 | 8 | 8 | $42.47 | 0 | 1 |
| HD -Thorin | WR | 1-2 (declared 2) | 2.80 | 35 | 18 | 7 | 12 | $103.86 | 0 | 0 |
| HD Tune - Blood Rites | WB | none | 2.98 | 37 | 10 | 13 | 9 | $129.86 | 1 (0) | 1 |
| HD Tune - Counter Intelligence | WUR | 3 | 2.77 | 38 | 21 | 10 | 8 | $98.13 | 0 | 2 |
| HD Tune - Mutant Menace | UBG | none | 2.72 | 38 | 18 | 9 | 5 | $169.85 | 0 | 1 |
| HD Tune - Prismari Artistry | UR | 1-2 | 4.03 | 38 | 22 | 17 | 8 | $76.06 | 0 | 2 |
| HD Tune - Scrappy Survivors | WRG | none | 2.97 | 35 | 18 | 12 | 3 | $109.64 | 1 (1) | 1 |
| HD Tune - Sultai Arisen | UBG | none | 3.29 | 40 | 20 | 10 | 6 | $112.09 | 0 | 1 |

**Lineup figures (per copy owned, nonbasic cards; same approximations as above)**
- **Collection put to work:** 3,924 owned copies of 2,920 cards. 1,344 copies (1,152 cards) are in a deck;
  2,580 copies are idle. By cheapest current price: about $2,134 of value in decks, about $934 idle.
- **Wanted more than owned:** 77 cards are needed by the decks in more copies than the player owns (Sol Ring: 20
  wanted, 17 owned). No card assignments exist on this account, so every contested copy is placed by seniority.
- **Idle cards the commanders would want:** 144 idle cards sit in one of these 22 commanders' index lists
  (`commander_support_cards.inclusion`, a percent) at 20% or more, 67 at 40% or more.
- **Play recency:** last played, newest first: Scrappy Survivors 2026-10-05, Omnath 2026-09-28, Avatar Aang
  2026-09-26, Gods 2026-09-25, Tovolar 2026-09-12, Blood Rites 2026-09-12. The other 15 decks have never been
  played. Pods: 2 games of 3, 4 of 4, 1 of 5.

**The spread, for drawing to real numbers**
- **Identity:** 1 colorless, 6 mono, 6 two-color, 6 three-color, 1 four-color, 1 five-color. Decks playing each
  color: W 10, U 10, B 6, R 11, G 8. One partner deck (Gods).
- **Brackets:** 14 analyzed, 7 never analyzed. Of the 14: bracket 3 alone 5, bracket 4 alone 3, 4-5 two, 1-2 three,
  2 alone one. 4 decks carry a declared bracket.
- **Curve:** average nonland mana value 2.18 to 4.78, median 2.97. Lands 27 to 40, median 36.
- **Jobs:** ramp 7 to 38, draw 1 to 24, removal 3 to 25. Wipes, protection and finisher rows are small or empty on
  most decks (finisher is empty on 12 of 21).
- **Value:** $41.35 to $432.67, $3,026 summed per deck (a per-deck sum counts a shared card once per deck; ruling 3 counts per copy owned instead, below).
  The cart's to-buy figure, from the shopping brief, is 7 of 21 decks and $843.99.
- **Overlap:** 1,366 distinct nonbasic cards across the 21 decks; 157 are in two or more decks and 13 in five or
  more. Most shared: Sol Ring 20, Arcane Signet 18, Command Tower 14, Exotic Orchard 8, Mind Stone 8, Fabled
  Passage 6, Rogue's Passage 6, Swords to Plowshares 6.
- **Games:** 7 games across 6 decks, 2 wins, 2026-07-17 to 2026-10-05. 15 decks have none. One game has no version
  on record.
- **Versions:** 23 across 21 decks; 3 brews with none, 5 decks with two, none with more.

## Prior art

Verified by fetch unless marked snippet. The finding: **no deck site found draws a player's own decks side by side
as figures.** Comparison elsewhere is two decks at a time, or one deck against a population.

- **Deckcheck** (deckcheck.co/articles/howto, fetched): `Compare` puts two deck links side by side (matching
  cards, adds and cuts, curve and cost difference); "not a multi-deck view". Per deck it shows average mana value,
  total cost, a Threat Index and bracket, and benchmark tiers. Its wishlist shows "cost to finish" for each deck,
  the one per-deck list across decks.
- **Deck Compare - MTG** (addons.mozilla.org/firefox/addon/deck-compare-mtg, fetched; a third-party extension over
  Moxfield, Archidekt and others): two-deck diff with a similarity figure, and a cross-compare mode over pasted
  lists showing most-played cards, an average decklist and the curve. Its existence says the sites themselves do
  not offer this.
- **Moxfield**: no cross-deck stats view found. Its feedback board asks for completion and availability across
  decks (moxfield.nolt.io/2554, snippet).
- **Archidekt**: no cross-deck view found; a forum request asks for a side-by-side version comparison
  (archidekt.com/forum/thread/7059508/1, snippet). Version comparison is out of Lineup (ruling 6).
- **EDHREC**: the field, per commander ("Average Type Distribution", per draftsim.com/how-to-use-edhrec, snippet)
  and format-wide (card frequencies by type and function, edhrec.com/articles/the-deck-of-many-things-card-
  frequencies-by-type-and-function-across-edh, snippet). This is what `identity_composition` and
  `format_staples` already hold.
- **Playgroup.gg** (playgroup.gg/commander/precons, snippet): win rates per commander and precon, normalized to a
  4-player baseline of 25%, with a minimum of 20 games before a deck is ranked. Hugh chose raw results with pod
  sizes shown instead (ruling 4).
- **Not found:** a product drawing one player's decks as a distribution, a "this deck among yours" marker, or a
  shared-card count across a player's decks.

## The About entry owed

Lineup is a new capability a reader would not find unaided, so it owes its own entry in the round that ships it
(`AGENTS.md`, "No FEATURE launches without an About entry"), drawn on the per-entry artboard in
`design/design_handoff_the99_about/`. It ships behind `LINEUP_ENABLED`, so the entry names that switch: `src/proxy.ts`
keys the About gate on the entries the deployment's switches draw, and turning the switch on is what announces it,
as `deck-stats` is announced by its own (`src/lib/copy/about.ts:1130-1138`). The plan adds `LINEUP_ENABLED` to the
`AboutSwitch` union (`about.ts:71`) and names the entry as a task beside the PR boundaries.

## Paths

- Round 1 brief and handoffs: `docs/superpowers/design-briefs/2026-10-03-deck-stats.md`,
  `design/design_handoff_the99_deck_stats_view/`, `design/design_handoff_the99_deck_stats_mana/`.
- Figures: `src/lib/decks/stats.ts`, `stats-query.ts`, `stats-average.ts`, `stats-average-load.ts`,
  `stats-money.ts`, `stats-results.ts`, `stats-labels.ts`, `job-tally.ts`; `src/lib/mana/supply.ts`.
- Views: `src/components/decks/deck-stats-view.tsx`, `deck-stats-average.tsx`, `deck-stats-money.tsx`,
  `deck-stats-results.tsx`; `/decks`: `src/app/decks/page.tsx`, `src/components/decks/decks-view.tsx`.
- Cache: `src/lib/cache/page-cache.ts`, `scripts/check-list-cache.mjs`.
- The field: `src/db/schema.ts` (`commanderSupport` 1146, `formatStaples` 1423, `identityComposition` 1471),
  `src/lib/benchmarks/cuts.ts`.
- About: `src/lib/copy/about.ts` (`ABOUT_VERSION` 61, `deck-stats` 1124).

## Deliverable

A handoff in `design/design_handoff_the99_lineup/`: Lineup's placement on `/decks` and its charts at 1300 and 390
on the 21-deck fixture above, the filter in each state, the thin states (one deck, no games, never analyzed,
colorless, partner), the `STATES` rows, a copy strings file of placeholders, and the About entry on the per-entry
artboard.
