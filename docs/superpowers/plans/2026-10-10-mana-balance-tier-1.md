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

## The counted rule (decided, override if you disagree)

Per colored color `c` (W, U, B, R, G; `C` is reported, never judged):

- `pipShare[c]` = `demand[c]` over the sum of the colored demands.
- `budget` = the sum of `supply[c].lands + supply[c].nonland` over the colored colors. A dual
  counts in both colors, as in card (b), so the budget is color-source units, not cards.
- `target[c]` = `budget * pipShare[c]`, rounded to the nearest whole source.
- `gap[c]` = `target[c] - supply[c]`. A color is **short** when `gap >= 1`, **over-served** when
  `gap <= -1`. Every other color is balanced and named as such.

The budget redistributes the deck's own sources by what its spells ask for, so the rule needs no
outside table and no curve. Every figure it prints is a count (pips, sources, target, gap), which
is the "shown rather than asserted" requirement. The `>= 1` line is a starting point; the golden
eval below is where it is tested against Hugh's read of HD - Gishath before it is fixed.

Thin data: a deck with no colored pips (all colorless) returns a `colorless` state naming that,
and a deck with no sources returns `noSources`. Neither refuses (Ruling 6).

## Suggestions, each with its own counted fact

1. **Rebalance.** Swap N basics of an over-served color for the short color. Only basics the deck
   holds are offered (a count read from the rows), N is capped by both the over-served color's
   basics and the short color's gap. Fact: `current -> after` supply for both colors, and the pip
   share each is held against.
2. **Trade for ramp.** Replace basics with a rock that makes the short color. The candidate comes
   from the missing-staple read below, so it is a card the commander's decks run, not a name picked
   by the engine. Fact: the sources the trade adds per color, and the basics it removes.
3. **Missing staple.** A ramp card `commander_support_cards` lists for this commander (or
   `format_staples` for its bucket when the commander has too few decks) that the deck does not
   hold, and whose colors (`sourceProduces`) include a short color. Owned copies are offered
   first (the collection's available copies, by the same availability rule the Add panel uses),
   then a not-owned one with its buy path. Fact: the card's inclusion rate under this commander,
   and the sources it adds.

Never offered: a card already in the deck, a card outside the commander's color identity, the
commander, a locked card (`card_assignments`, as Suggested changes enforces it, a hard filter and
not a prompt line), and any card `makesNoManaSource` rejects. Candidate colors come through
`sourceProduces`, so a suggestion cannot claim a color the shared rule does not give the card.

## PR boundaries

Two PRs, no stacking. PR 2 starts after PR 1 merges.

**PR 1: the counting engine and its golden check.** `src/lib/tuning/mana-balance.ts`:
`readManaBalance(rows, deckColors)` over `manaSupply()`'s output, returning the per-color
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
