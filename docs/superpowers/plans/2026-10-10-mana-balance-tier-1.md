# Mana Balance, tier 1 engine: implementation plan

Plan, 2026-10-10. Sub-project 3 of `2026-10-08-tuning-roadmap.md`. Logic only: no Design round and
no model call, so no cost to approve. Awaiting Hugh's approval before any code.

Rulings this plan applies, none reopened:

- Demand is plain pip counts. Curve weighting is dropped (Deck stats plan, Ruling 10, 2026-10-09).
  The brief's "curve-weighted" wording is stale.
- Supply is `manaSupply()` (`src/lib/mana/supply.ts`) and the source rules from #1323 and #1338,
  unchanged: Treasure, Powerstone and Lander tokens, look-at-top effects and landcyclers are not
  sources (`makesNoManaSource`). The engine calls them and restates none of them.
- Counterspells are not removal (Hugh, 2026-10-10). Mana Balance reads no removal role, so this
  constrains nothing here beyond the staple read below never counting a counterspell as one.
- Missing staples read `format_staples` and `commander_support_cards`, owned cards first. No new
  index, no new table.

## What exists, and what is missing

`manaSupply(rows)` already returns pips per color (`demand`), sources per color split into lands and
non-lands (`supply`), and the card ids behind every figure (`sources`). `loadSourceMana` and the
labels give each non-land source its colors. Deck stats card (b) draws from it.

Missing, and all of this plan: a verdict over those figures (which colors are short, by how much),
the three suggestion kinds each carrying its counted fact, the missing-staple read, and the golden
eval. Nothing here changes `manaSupply()` or card (b).

## The counted rule (decided, override if you disagree; REVISED in PR 1 after measuring)

A color should be at least as common among the deck's colored sources as it is among its colored
pips. Per colored color `c` (W, U, B, R, G; `C` is reported, never judged):

- `sourceCards` = copies of lands and non-land sources that add at least one colored mana. A dual
  counts once here and for both of its colors in `supply[c]`; a colorless-only source is in neither.
- `pipShare[c]` = `demand[c]` over the sum of the colored demands.
- `target[c]` = `sourceCards * pipShare[c]`, rounded to the nearest whole source.
- `gap[c]` = `target[c] - supply[c]` (lands plus non-lands). A color is **short** when
  `gap >= SHORT_BY` (1), and **met** otherwise. A negative gap is cover beyond the share, and is
  what the rebalance suggestion reads to find basics it can move.

The first draft redistributed the colors' summed source units by pip share. Measured on Hugh's 21
staging decks it overstated every gap, because duals inflate the sum: Omnath read "G short by 31",
which no swap closes. The share-of-source-cards rule never penalizes owning duals and always has a
feasible fix. It fires on 0 of 20 judged decks at 1, 2 or 3 sources (the decks are mana-rich), so
the 1-source line is the smallest meaningful unit rather than a tuned figure; the PR 1 body holds
the measurement. The thinnest multicolor covers are Omnath and Counter Intelligence at +0.

Thin data: a deck with no colored pips (all colorless) returns a `colorless` state naming that,
and a deck with pips and no colored source returns `noSources`. Neither refuses (Ruling 6).

## Suggestions, each with its own counted fact

1. **Rebalance.** Swap N basics of a color holding cover beyond its share for the short color. Only basics the deck
   holds are offered (a count read from the rows), N is capped by both the covered color's
   basics and the short color's gap. Fact: `current -> after` supply for both colors, and the pip
   share each is held against.
2. **Trade for ramp.** Replace basics with a rock that makes the short color. The candidate comes
   from the missing-staple read below, so it is a card the commander's decks run, not a name picked
   by the engine. Which basics go: only basics of a color holding cover beyond its share, or basics of a met
   color that produce NONE of the short colors, so removing one never lowers a short color's
   supply. How many: one basic per rock added, and the trade is
   simulated before it is emitted: the engine removes the basics, adds the rock's colors, re-runs
   the counted rule over the new supply (the source count and every target move), and emits the trade
   only when the short color's gap falls and no other color goes from met to
   short. A trade that fails the simulation is not shown. Fact: the sources the trade adds per
   color, the basics it removes, and the before and after gap for every color it touches.
3. **Missing staple.** A ramp card that the deck does not hold, and whose colors (`sourceProduces`)
   include a short color. The source is `commander_support_cards` for this commander when it has
   a page, and its fact is that card's inclusion under this commander, with the commander's deck
   count as the denominator. When the commander has no page, `format_staples` for its identity
   condition serves instead, and its fact is a different claim and says so: `commanders` of
   `commander_total` commanders in that condition recommend it, with `avg_inclusion` as the
   bucket average, never labelled as this commander's rate. The two are never mixed in one list.
   Owned copies are offered first (the collection's available copies, by the same availability
   rule the Add panel uses), then a not-owned one with its buy path. Each carries the sources it
   adds.

Never offered: a card already in the deck, a card outside the commander's color identity, the
commander, a locked card (`deck_locks`, read through `src/lib/decks/locks.ts` as Suggested changes does, a hard filter and
not a prompt line), and any card `makesNoManaSource` rejects. Candidate colors come through
`sourceProduces`, so a suggestion cannot claim a color the shared rule does not give the card.

## PR boundaries

Two PRs, no stacking. PR 2 starts after PR 1 merges.

**PR 1: the counting engine and its golden check.** `src/lib/tuning/mana-balance.ts`:
`readManaBalance(rows)` over `manaSupply()`'s output, returning the per-color
`{ demand, pipShare, supply, target, gap, state }` and the `colorless` and `noSources` states. Pure,
no database, no model. A loader beside it assembles the rows the way the deck page does
(`loadSourceMana`, `landProduces`), so the two cannot count differently; the page's own row
builder is reused if it can be lifted without touching card (b), and PR 1 says which. The golden
eval ships here (below), since the counting rule is what it checks. About 6 files.

**PR 2: suggestions and the missing-staple read.** `mana-suggestions.ts` (rebalance, trade, staple)
and `mana-staples.ts` (the `format_staples` and `commander_support_cards` read, owned first), plus
`manaBalanceEnabled()` in `src/lib/tuning/flag.ts` beside `tuningEnabled`: `MANA_BALANCE_ENABLED`
and `ANALYSIS_TAB_ENABLED` both `'true'`, off for anything else, the same shape as the other two.
The eval grows the suggestion expectations for Gishath. About 7 files.

Neither PR has a UI caller: the hub is sub-project 5. The eval script is each PR's caller, and the
switch function in PR 2 is the one export that nothing in the app reads until sub-project 5 mounts
the tool. PR 2's body names that, so it is a recorded exception and not a surprise.

## The switch

`MANA_BALANCE_ENABLED`, read per request on the server, on only for the exact string `'true'`, and
requires `ANALYSIS_TAB_ENABLED` for the reason `tuningEnabled` and `proposedCutsEnabled` do (the tool
mounts on the Analysis tab). Independent of `TUNING_ENABLED` and `PROPOSED_CUTS_ENABLED`. Unset on
production. Tier 1 is the free result and makes no call, so the switch gates the surface and not a
spend.

## The golden-deck eval

HD - Gishath, `904fdc61-e190-4ba5-8e34-2b18fa0584f2`, the same deck and fingerprint
`docs/superpowers/eval/corpus/gishath.json` pins (`listFingerprint`). Tier 1 makes no model call,
so "scoring" is asserting the counted output equals a hand-checked expectation.

- `docs/superpowers/eval/mana-balance-golden.json`: per color, the pips, the sources (lands and
  non-lands, with the card names behind each), the target, the gap and the state, worked out by
  hand from the deck's list and its cards' oracle text. Each expected figure carries the card it
  rests on. In PR 2 it adds the suggestion expectations: which basics the rebalance moves and which
  staple is missing.
- `pnpm eval:mana` (`scripts/eval/mana.mts`): connects to staging read-only (`connectStaging`, the
  `eval:cuts` pattern), refuses when the deck's list no longer matches the pinned fingerprint
  (printing the drift rather than failing on a stale expectation), runs the engine, and prints
  expected against actual per color, exiting non-zero on any difference. It writes nothing and
  calls no model.
- The same script prints the verdict across every staging deck of Hugh's
  (`user_3GkZrrTwOJBdqUpq6GambP0BC8w`) as a measurement: how many decks read a short color, how
  many `noSources`. This is where the `>= 1` line is judged. Every frequency in it is read from
  staging; the script never writes, and the fixtures on `local-dev` are not used.
- Failure path: before PR 1 is believed, the check is run against a mutated engine (a wrong
  target rounding, a dropped dual) and must fail.

## Not in this plan

- Dorks and land search weighted by reliability ("a dork that dies to removal"): the brief asks for
  a caveat tier 1 has no room to draw. `manaSupply()` counts them as sources; the caveat belongs
  to the hub UI and to tier 2. Recorded here so it is not read as forgotten.
- Tier 2 ("Look deeper") and any hub surface: sub-projects 5 and 6.
- The About entry and `ABOUT_VERSION` bump: sub-project 7, batched at the end of the line.
