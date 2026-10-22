# W4: combos one piece away, and a card's combos (backend)

Hugh-approved through d9, 2026-10-22. Backend only: the UI waits on Design prompt 17. Stopping
point: the backend PRs merged, behind a switch that is off in production and excluded from
"All features".

## What already exists (verified 2026-10-22)

The brief asked for Spellbook's steps and mana to be stored. **They already are**:
#820 (`drizzle/0050_messy_spirit.sql`) added `steps` (Spellbook's `description`), `mana_needed`,
`mana_value_needed` and `notable_prerequisites` to `spellbook_variants`. The ingest fills them
for every variant (`src/lib/spellbook/transform.ts:134-151`), floors guard them (`stepsShare`,
`manaValueShare`, `seed.ts`), and `db:copy:combos` copies whole rows. On staging, all 112,323
variants carry `steps` and `mana_value_needed`, and the newest `computed_at` is 2026-10-19.

**So W4 has no ingest, migration-of-catalog or copy change, and nothing to run on staging.** The
work is two reads.

Reads already in the tree that this builds on rather than restates:

- `anySizeComboQuery` + `shapeComboFacts` (`src/lib/synopsis/combo-facts.ts`): every
  template-free, infinite or game-ending variant of 2 to 6 pieces a deck holds all of, or is one
  piece short of. The missing piece is already filtered to one the deck could add (not
  command-zone-only, Commander-legal, inside the commanders' identity via `fitsIdentity`). It
  feeds the Overview's prompt and is capped at 3 there (`MAX_NEAR_COMBO_FACTS`).
- `loadCardComboPartners` (`src/lib/combos/near-miss.ts:498`): a card's TWO-CARD combos only, one
  line per partner, with `inDeck | owned | notOwned`. No steps, no mana, no larger combos.
- `loadAvailability` (`src/lib/decks/availability-query.ts:359`): owned, free and the claims
  (which deck holds each copy), with seniority applied.
- `loadPrices` + `cheapestNow` (`src/lib/decks/price-query.ts`): the cents the buy tag draws.

"A combo" keeps the app's one definition: what a variant PRODUCES decides
(`isInfiniteOrGameEnding`, plus the mandatory-loop rule), never its card count, and a variant
with a template requirement is out because a template cannot be checked against a list.

## Measured on staging (read-only)

Near-misses per deck, across staging's 41 decks with a commander, using the query's rules
(template-free, the missing piece inside the commanders' identity). The produces filter was not
applied, so these are upper bounds:

| Pieces | Decks with any | Median per deck | p90 | Max |
|---|---|---|---|---|
| 2 | 39 | 21 | 47 | 54 |
| 3 | 37 | 9 | 66 | 182 |
| 4 | 16 | 1.5 | 5 | 5 |

A card's variants: 7,345 cards appear in any; median 9, p99 749, max 6,089 (Ashnod's Altar). With
the 3-piece, template-free limit: median 3, max 2,097.

**Both reads therefore rank and cap.** Unranked, either list is unusable on a real deck or a
popular card.

## The switch

`NEAR_COMBOS_ENABLED`, kind `feature`, no parent. Off (unset) in production, set on staging when
the UI lands, and listed in `ALL_FEATURES_EXCLUDED` with the reason "backend only until Design
prompt 17's surface ships". Wired the registry's way: `nearCombosEnabled(env)`, `SWITCH_FLAGS`,
the admin label, and a generated migration for the `flag_overrides_switch_check` constraint. Both
loaders take `env` and return the empty answer when the switch is off.

## Read A: combos this deck is one piece away from

`loadNearCombos({ userId, deckId, env, cap })` in `src/lib/combos/near-combos.ts`.

1. Read the deck's present cards and commanders, then run `anySizeComboQuery` unchanged.
2. A new pure `shapeNearCombos(rows, identity, commanderIds)` beside `shapeComboFacts` keeps
   every gap-1 variant that passes the SAME missing-piece rules, extracted into one shared
   predicate so the Overview's facts and this read cannot disagree. It keeps full detail:
   variant id, pieces (oracle id, name, held), the missing piece, `produces`, `steps`,
   `mana_needed`, `mana_value_needed`, `notable_prerequisites`.
3. One `loadAvailability` call (`excludeDeckId` = this deck) and one `loadPrices` call over the
   distinct missing pieces. Each missing piece gets exactly one `where`:
   - `spare`: the reader owns a copy no deck claims (`free > 0`);
   - `elsewhere`: every owned copy is claimed, carrying the claiming deck(s) by id and name;
   - `buy`: not owned, carrying `cheapestNow` cents, or null when no price is stocked.
4. Rank bucket by bucket: `spare`, then `elsewhere`, then a priced `buy`, then an unpriced one.
   Inside each bucket, `pickTop`'s one-per-outcome lead (so twenty variants of one loop cannot fill
   the cap), each part cheapest first and then the existing `byRank` order (fewest pieces, free
   mana, uses the commander, lower mana, stable id). The lead is applied PER BUCKET: applied across
   the whole list, it lifted a $4 buy above a spare (found by the probe on 8 of local-dev's 20 decks).
   Default `cap` 20; the caller may lower it.

The answer also carries `total` (before the cap) so a surface can say "and N more" without a
second read.

## Read B: combos a card is in, and which pieces the reader holds

`loadCardCombos({ userId, oracleId, deckOracleIds?, env, cap })`, same module.

1. Variants containing the card: template-free, 2 to `MAX_COMBO_PIECES` pieces, produces passes
   the same definition. Pruned card-first through `spellbook_variant_cards_oracle_idx`, as
   `near-miss.ts`'s reads are.
2. For every piece other than the card: `inDeck` (in `deckOracleIds`, commanders counting only
   as commanders when `must_be_commander`), else `spare` / `elsewhere` / `notOwned` from one
   `loadAvailability` call over the distinct pieces. Steps and mana as in read A.
3. Rank: fewest pieces the reader is MISSING first, then `byRank`, with the one-per-outcome lead.
   Default `cap` 12, plus `total`.

`loadCardComboPartners` and its two-card marker stay as shipped. Read B is the richer read that
Design prompt 17's card-details block will move to; replacing the old one is that UI PR's call.

## Callers

Neither read has a UI caller until prompt 17. They are not exported through a route or action
in this line: an unused endpoint is surface without a reader. The proof that they work is a
probe, read-only, against a local server's database holding a `pull:staging` copy:
`pnpm probe:near-combos` prints read A for each of the account's decks (counts per `where`, the
top 5) and read B for three cards (one with a deck in scope), and asserts the invariants below.

## Tests

- `shapeNearCombos`: a gap-1 variant whose missing piece is off-color, command-zone-only or not
  legal is dropped; a mandatory loop is never offered; the shared predicate is the one
  `shapeComboFacts` uses (a test imports both and runs the same rows).
- `where` assignment: `free > 0` gives `spare` even when other copies are claimed; all copies
  claimed gives `elsewhere` with the deck names; not owned gives `buy` with `cheapestNow`'s cents;
  the deck being read is excluded from claims.
- Ranking: spare before elsewhere before buy; cheaper buy first; unpriced buy last; one per
  outcome leads; `cap` and `total`.
- Read B: the card itself is never listed as a piece; a commander-only piece held as a 99 card is
  not `inDeck`; the cap holds on a card with thousands of variants (fixture of 50).
- Switch off: both loaders return empty without querying (a spy on `db.execute`).
- A `.toSQL()` check that read B's correlated pieces are qualified (AGENTS.md's Drizzle rule).

## PR split

Two PRs, each well under the size limit, no stacking: PR 2 starts after PR 1 merges.

1. **Switch + read A.** The switch (registry, flag, admin label, constraint migration,
   `ALL_FEATURES_EXCLUDED`), the shared missing-piece predicate pulled out of `shapeComboFacts`,
   `shapeNearCombos`, `loadNearCombos`, tests, and `probe:near-combos` (read A half), with
   `docs/probes.md` and an AGENTS.md line.
2. **Read B.** `loadCardCombos`, tests, the probe's read B half.

No UI, so no contact sheet and no About entry in this line; both belong to prompt 17's PRs.

## Out of scope

- Any surface, copy or route.
- Combos that need a template ("any sacrifice outlet").
- Changing the Overview's facts or `loadCardComboPartners`' output.
