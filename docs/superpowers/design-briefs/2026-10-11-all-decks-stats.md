# All-decks stats (cross-deck comparison)

Design brief, 2026-10-11. The second part of Deck stats. Round 1 drew one deck at a time and named a cross-deck
comparison as "a separate, later feature" (`2026-10-03-deck-stats.md`, ruling 3, and its out-of-scope list). Hugh
asked on 2026-10-11 for it to be briefed now so it is not lost; Design picks it up when free.

**Hugh has not ruled on scope.** The product questions below are his, and Design should not start until he has
answered them. Everything after them is the record, what engineering has fixed, and what Design owns once the scope
is set. The working title in this brief is "all-decks stats"; two name candidates are under Questions for Hugh.

## Questions for Hugh (product scope, open)

1. **Which comparisons are in?** Three shapes are possible, separately or together:
   - (a) **Your decks side by side**: one view on `/decks` that draws a figure for every deck at once (curve, lands,
     jobs, colors, value, games).
   - (b) **This deck against your other decks**, on the deck's own Stats view: where this deck sits among yours.
   - (c) **This deck against the field**: wider than the shipped "Against the average deck" card, which already
     compares a deck with its own commander's average. The field could be every deck of the same color identity,
     or every Commander deck, from the commander index. Never other accounts' decks (lock 6).
2. **Which round-2 items ride with this feature, if any?** The round-1 brief named four: deck evolution across
   versions, collection share across versions, opening-hand odds with a sample hand, and a shareable snapshot. The
   first two compare a deck with its own past and fit a "comparison" feature; the last two do not compare anything.
   In this feature, a later one, or not at all?
3. **Which decks count?** All 21, or committed decks only? The cart included brews (3 of Hugh's 21 have no
   version). A deck with no games has no results to compare; 15 of 21 have none.
4. **Which figures?** Every Stats card has a cross-deck reading, but not all are worth a row. Engineering's
   ranking by how much the data says on staging today: curve and lands, jobs, colors, value, then results (7 games
   across 6 decks is too thin to compare).
5. **Value across decks: per deck, or what the decks own together?** Summed per deck, Sol Ring counts 20 times
   (it is in 20 decks); Hugh owns 17. A per-deck sum is the honest answer to "what is each deck worth" and the
   wrong answer to "what are my decks worth".
6. **Results across pod sizes.** Hugh's 7 games are 2 in pods of 3, 4 in pods of 4, 1 in a pod of 5. A raw record
   reads the same in all three; Playgroup normalizes to a 4-player baseline (prior art). Raw, or adjusted?
7. **Which switch?** Deck stats ships behind `DECK_STATS_ENABLED`, on for staging and off for production until the
   labels-everywhere work lands (`docs/superpowers/plans/2026-10-08-deck-stats.md:179`). Does this feature ride that
   switch, or carry its own so it can trail it?

### Name candidates

- **Across your decks** (as a view name on `/decks`, and a section name on the deck page).
- **Lineup** (short, reads on a segment control at 390; "your lineup" is how a player talks about decks they own).

"All-decks stats" is engineering's label and is not proposed for the app.

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

**The field (commander index, staging)**
- `commander_support` (`src/db/schema.ts:1146`): 3,467 ok commanders, all 21 of Hugh's among them.
- `identity_composition` (`schema.ts:1471`): 19 rows of average land, type and curve per identity condition.
- `format_staples` (`schema.ts:1423`): 770 rows over 16 conditions (each color pair and mono color, plus `count:3`).
- Evidence benchmarks ("How it plays", Analysis tab) grade against cut points from 34,670 sampled decks, ten per
  commander (`src/lib/benchmarks/cuts.ts:4`). That is the one place the app already places a deck in a population.

**The About entry for round 1**
- `deck-stats` (`src/lib/copy/about.ts:1124`), `since: 11`, follows `DECK_STATS_ENABLED`, and took NO version
  bump because the switch is off in production (comment at `:1130-1138`). `ABOUT_VERSION` is 14 (`:61`).

## What engineering has locked

Only what is fixed regardless of Hugh's answers. Hugh can override any of it.

1. **No model calls.** Every figure is computed from stored data: decklists, `cards`, card labels, prices, logged
   games, versions and the commander index. Drawing it costs nothing and needs no credit.
2. **One definition per figure.** A deck's number in a cross-deck view is the number its own Stats view draws,
   from the same pure function (`manaCurve`, `typeCurve`, `jobTally`, `manaSupply`, `averageComparison`,
   `moneyStats`, `resultsStats`). A cross-deck view never re-derives a figure.
3. **A fixed number of reads, not one per deck.** The `loadDeckStats` pattern: one decklist read, one label read
   over every distinct card (1,366 on Hugh's account), one price read, one games read. The basis chain is one call
   per deck today and must be batched for any shape that shows the field per deck.
4. **The `/decks` payload stays cached by `cachePageForUser`.** Any new per-user table it reads passes
   `check:list-cache`; the feature's switch joins `switches()`; catalog-side inputs (labels, prices, the index) are
   covered by the catalog generation in the key, which engineering confirms for each before the build.
5. **Behind a switch, off means no read**, the `deckStatsEnabled` shape (Question 7 decides which switch).
6. **The field is the commander index.** Never another account's decks, and no new upstream source.
7. **Facts, not judgment.** As in round 1: the bracket, findings and what to change stay in Analysis. A position
   among decks is stated as a position ("the most ramp of your decks"), never as a verdict.

## What Design owns

- **Placement**, after Hugh answers Question 1: a view on `/decks` (a segment beside the tiles, a section, a route),
  a block in the deck's Stats view, or both. At 1300 and 390.
- **Side by side or as a distribution.** 21 decks is too many for 21 full charts and few enough for small
  multiples or one strip per figure with a dot per deck. Which reads at 390?
- **Selecting decks.** Whether a reader can select and unselect decks to compare (a folder? brews?), and what an
  empty selection looks like.
- **This deck among yours**, on the deck page: how one deck is picked out of the others, and how the field is
  drawn beside both.
- **Thin data.** One deck; a deck with no games; a deck never analyzed; a colorless deck; a partner deck.
- **Sorting and links**: whether a figure sorts the decks, and that every deck in a view links to its own Stats.
- **Copy.** Every string is a placeholder for `/copy-review`. No verdict words; "select" and "unselect", never
  "tick"; the word "labels" never appears.
- **The About entry** (below).

## Open questions for Design

1. **One chart per figure, or one card per deck?** A row per figure answers "which deck has the most ramp"; a card
   per deck answers "what is this deck like". The tile grid already does the second.
2. **How is a range drawn when the extremes are far apart?** Average mana value runs 2.18 to 4.78; value $41 to
   $433; ramp 7 to 38. A shared axis flattens the middle; a per-deck scale hides the comparison.
3. **Colors across decks**: the five-color count (how many decks play each color) or each deck's demand against
   supply? The first is one figure; the second is 21.
4. **Where does the field sit?** A band behind your decks, a marker per deck (its commander's average), or a
   separate row. The per-commander average differs for every deck; the identity average is shared by decks of one
   identity only.
5. **Results with 7 games.** Draw them, or hold the row until a threshold of games? If held, what says so?
6. **Version history** (only if Hugh includes Question 2's first two items): Hugh has 23 versions over 21 decks,
   three decks with none and none with more than two. A history view drawn for ten versions will not be seen on
   this account.

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

**The spread, for drawing to real numbers**
- **Identity:** 1 colorless, 6 mono, 6 two-color, 6 three-color, 1 four-color, 1 five-color. Decks playing each
  color: W 10, U 10, B 6, R 11, G 8. One partner deck (Gods).
- **Brackets:** 14 analyzed, 7 never analyzed. Of the 14: bracket 3 alone 5, bracket 4 alone 3, 4-5 two, 1-2 three,
  2 alone one. 4 decks carry a declared bracket.
- **Curve:** average nonland mana value 2.18 to 4.78, median 2.97. Lands 27 to 40, median 36.
- **Jobs:** ramp 7 to 38, draw 1 to 24, removal 3 to 25. Wipes, protection and finisher rows are small or empty on
  most decks (finisher is empty on 12 of 21).
- **Value:** $41.35 to $432.67, $3,026 summed per deck (Question 5: that sum counts shared cards once per deck).
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
  (archidekt.com/forum/thread/7059508/1, snippet). Relevant to Question 2's version items.
- **EDHREC**: the field, per commander ("Average Type Distribution", per draftsim.com/how-to-use-edhrec, snippet)
  and format-wide (card frequencies by type and function, edhrec.com/articles/the-deck-of-many-things-card-
  frequencies-by-type-and-function-across-edh, snippet). This is what `identity_composition` and
  `format_staples` already hold.
- **Playgroup.gg** (playgroup.gg/commander/precons, snippet): win rates per commander and precon, normalized to a
  4-player baseline of 25%, with a minimum of 20 games before a deck is ranked. The nearest precedent for Questions
  6 and Design question 5.
- **Not found:** a product drawing one player's decks as a distribution, a "this deck among yours" marker, or a
  shared-card count across a player's decks.

## The About entry owed

A cross-deck view is a new capability a reader would not find unaided, so it owes an entry in the round that ships
it (`AGENTS.md`, "No FEATURE launches without an About entry"), drawn on the per-entry artboard in
`design/design_handoff_the99_about/`. Two things to know:
- A switch-gated entry is announced by its switch, not by a bump: `src/proxy.ts` keys the About gate on the entries
  the deployment's switches draw, so turning a switch on is what shows the entry (the `deck-stats` comment,
  `about.ts:1130-1138`). The round-1 entry never took a bump for that reason. If this feature rides
  `DECK_STATS_ENABLED`, Design may draw it as an extension of the `deck-stats` entry, announced when that switch
  turns on in production. If it ships on its own switch, it is its own entry, announced by that switch; a bump is
  owed only if it ships with no switch.
- If Hugh folds in round-2 items (Question 2), this becomes a multi-round line and the entry batches at the end of
  the line.

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

## Deliverable (once Hugh has answered)

A handoff in `design/design_handoff_the99_all_decks_stats/`: the chosen shapes at 1300 and 390 on the 21-deck
fixture above, the thin states (one deck, no games, never analyzed, colorless, partner), the `STATES` rows, a copy
strings file of placeholders, and the About entry on the per-entry artboard.
