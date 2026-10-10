# Mana Balance, tier 1 engine: implementation plan

Plan, 2026-10-10, amended the same day (Hugh's ruling below). Sub-project 3 of
`2026-10-08-tuning-roadmap.md`. Logic only: no Design round and no model call, so no cost to approve.
Approved by Hugh through f0; PR 1 (#1380) merged before the amendment.

## The ruling that reshaped this plan

**Mana Balance shows evidence, not verdicts (Hugh, 2026-10-10).** There is no "short" flag anywhere.
The first version of this plan judged a color by a rule over its sources. Scored against Hugh's play
experience on ten decks, no such rule matched (below), so the tool reports what a player needs to judge
for themselves: counted figures, each beside the published reference where one exists.

Rulings this plan applies, none reopened:

- Demand is plain pip counts, the commander's included, and the figure without it beside it
  (Deckcheck leaves the commander out). Curve weighting is dropped (Deck stats plan, Ruling 10).
- Supply is `manaSupply()` (`src/lib/mana/supply.ts`) and the source rules from #1323 and #1338,
  unchanged: Treasure, Powerstone and Lander tokens, look-at-top effects and landcyclers are not
  sources (`makesNoManaSource`). A dual counts once for each color it makes.
- Counterspells are not removal (Hugh, 2026-10-10). Mana Balance reads no removal role.
- Missing staples read `format_staples` and `commander_support_cards`, owned cards first.

## The evidence the engine reports

Reference: Frank Karsten, "How Many Sources Do You Need to Consistently Cast Your Spells? A 2022
Update", TCGplayer. Its 99-card column (41 lands, free first mulligan, 89 + M% by turn M) is in
`src/lib/mana/karsten.ts`, pasted from the article by Hugh. The article publishes 19 patterns and
nothing beyond: a pattern with more generic mana than the last row for its pips (6C, 6CC) is shown as a
ceiling ("at most 14", the 5C figure), and a pattern with five or more pips has no row and is shown as
having none.

Per color (W, U, B, R, G):

1. **Pips**, with the commander and without it, and each as a share of the colored pips.
2. **Sources**: lands and non-lands, a dual counted for every color it makes (the Colors card's count).
3. **The hardest patterns its cards have**, six at most, most pips first and then least other mana.
   A pattern is Karsten's notation (`1CC`: one other mana and two pips of this color; another color's
   pips count as other mana), with the copies, the card names behind it (the commander marked), and
   the article's requirement beside it. The deck's own source count is the color's, one line up.

For the deck:

4. **Lands**: the count, how many enter tapped always and how many unless a condition holds (read by
   `drawbacks`, the swap tools' reader), against the average mana value.
5. **Land count against Karsten's regression**: lands = 31.42 + 3.13 x average mana value - 0.28 x
   cheap ramp. Average mana value counts the commander as one more card; the constants are as quoted in
   secondary write-ups of his Commander land article, not checked against the article; draw spells are
   not counted in the ramp term, which overstates the figure for a deck that draws.

Thin data: a deck with no colored pip reads `colorless`, and one with pips and no colored source reads
`noSources`. Neither refuses (Ruling 6). Nothing in the output is a verdict.

## Verdict rules rejected (the evidence for the ruling)

Hugh's play experience, `boards/mana-ground-truth-2026-10-10.md`, scored 15 deck-color rows: 3 short
(Gishath green, a hunch on an unplayed deck; Avatar Aang blue, specifically double-blue; Blood Rites
white) and 12 fine (Blood Rites black, Gods blue, Counter Intelligence W/U/R, Scrappy Survivors W/R/G,
Tovolar R/G, Brago W/U). Omnath had no play data; Yuriko was borderline for lean land count, not color.

| Rule | Result on the 15 rows |
|---|---|
| Pip share against share of source units, a dual counted once per color (Deckcheck's; the plan's first draft) | With colorless units in the denominator it flags Omnath G 41 points, Counter Intelligence U 33, Yuriko U 28, Scrappy W 23, Blood Rites B 22; a 5-point margin flags 18 of 20 decks and catches Deckcheck's three. With colored units only, a 10-point margin flags 9 of 20 decks and catches two (Gishath G 22.3, Aang U 11.6) but not Gods U (4.6). No margin separates those from rows Hugh rates fine. Adding Deckcheck's own ten Gishath adds moves green's share from 33.7% to 36.2% (gap 22.3 to 19.8 points): the fix it recommends does not close its gap |
| Pip share against share of source CARDS (merged in #1380) | Flags 0 of 20 decks at 1, 2 or 3 sources. Never wrong, never useful |
| Karsten requirement for the hardest card, N=1 | 13 of 22 rows flagged; finds Aang U and Blood Rites W, wrongly flags six fine rows |
| Karsten requirement for the N-th hardest card, N=2 to 4, sources - T | Best at N=1 and T=5: finds Aang U and Blood Rites W, wrongly flags Scrappy W (20 sources against 30) and Tovolar R; misses Gishath G. A slack chosen after seeing 15 rows is a fit, not a rule. N=2 to 4 with T >= 3 finds Aang U only |
| Commander-color sources against the requirement for the commander's own cost | Flags nothing (Gods R has 22 sources against 18 needed). It cannot reproduce Gods' history from today's list |
| Minority-color source count | Blood Rites W (34% of pips, 24 sources) fails while Scrappy R (18%, 19) and Scrappy W (52%, 20) are fine with fewer |

Why none separates: Aang U (21 sources, 34% of pips) and Gods U (20, 36%) are near-identical by share and
supply with opposite verdicts, and differ only in pattern depth (four double-blue cards against 2CC).
Scrappy W has fewer sources than Blood Rites W and no problems. Deckcheck's Mana Tune on Counter
Intelligence and Brago, both rated fine, flagged blue and white. The Karsten table was also partial when
the rules were scored (11 of 19 rows, the rest taken as lower bounds); the full column is now in, and the
rules were not re-scored because the contrasts above do not depend on it. Count-based signals explain
Aang U and little else, so color-source count may not be what Hugh's failures were: tapped lands,
timing and colorless utility lands are things a count cannot see, and two are now reported as evidence.

Pip counts against Deckcheck's: it leaves the commander out. Gishath green is 55 of 97 without it,
56.7%, its figure exactly; the engine reports both. Gods blue is 28 pips without the commander (29 with),
matching Deckcheck's 28, and its share implies a total of 68 that no variant reproduces.

## Suggestions: on request, for a color the player picks

No suggestion is offered unprompted. A player picks a color ("help me add blue") and the tool shows moves
that add sources of it, each with its counted before and after.

1. **Rebalance.** Swap N basics of another color for the chosen color's. Only basics the deck holds are
   moved, a locked basic never is (`deck_locks`, `liveLockedIds`), and N is the fewest that stops helping.
2. **Trade for a source.** Replace one basic with a staple that makes the chosen color.
3. **Staples.** Mana sources the commander's decks run that this deck does not hold, whose colors include
   the chosen one, owned copies first, then by how often the commander runs them. The number behind each
   is the commander's own inclusion when its page has one, else the identity bucket's share of commanders
   that recommend it, labelled as the bucket's and never as this commander's rate.

Never offered: a card already in the deck, a card outside the commander's identity, the commander, a
locked card, any card `makesNoManaSource` rejects, and a basic as a staple. Every move is simulated
through the engine before it is shown. **The no-worse guard** (replacing the old "no color goes short"):
the chosen color gains at least one source; no other color loses a source it needed, meaning a color
whose count meets Karsten's requirement for its hardest published pattern does not fall below it, and a
color already below it does not fall at all. Karsten is a guard here and never a verdict.

## PR boundaries

Three PRs, no stacking, each after the last merges:

1. **#1380 (merged): the counting engine and its Gishath golden check.** Its verdict rule is replaced by
   PR 2.
2. **PR 2: the evidence engine.** `karsten.ts`, `pattern.ts`, `lands-tapped.ts`, the rewritten
   `mana-balance.ts` and its loader, the golden file and `pnpm eval:mana`, and this amendment. No
   switch yet, no UI.
3. **PR 3: help on request.** `mana-staples.ts`, `mana-suggestions.ts`, the loader that ties them, and
   `manaBalanceEnabled()` in `flag.ts` (`MANA_BALANCE_ENABLED`, with `ANALYSIS_TAB_ENABLED`, the same
   shape as the other two). No UI: the Tuning hub's Design round draws it. The switch is the one export
   nothing in the app reads until the hub mounts the tool.

## The golden-deck eval

HD - Gishath, `904fdc61-e190-4ba5-8e34-2b18fa0584f2`, the list `docs/superpowers/eval/corpus/gishath.json`
pins. `docs/superpowers/eval/mana-balance-golden.json` holds the hand-checked expectation: pips, sources,
the patterns with their cards and Karsten figures, the tapped counts, the average mana value and
Karsten's land figure. `pnpm eval:mana` reads staging read-only, refuses (exit 2) when the list has moved
since the expectation was checked, diffs the engine's output against it (exit 1 on any difference), and
prints every deck of that owner's evidence. It writes nothing and calls no model. Figures cross-checked
against Deckcheck where it reports the same quantity: average mana value (Gishath 4.34, Omnath 3.71,
Brago 3.62), land count (Brago 35, Counter Intelligence 38) and Counter Intelligence's tapped share (10 of
38 lands, 26.3%).

## Not in this plan

- Any verdict, flag or score of a color. Candidates for later, if Hugh wants one, are a land count
  above or below Karsten's regression and the tapped-land share against the curve, shown as facts first.
- Dorks and land search weighted by reliability; tier 2 ("Look deeper"); any hub surface (sub-projects 5
  and 6); the About entry and `ABOUT_VERSION` bump (sub-project 7, batched at the end of the line).
