# Proposed cuts, model tier: recall against the cuts Hugh made

Outputs of `pnpm eval:cuts-model` on 2026-10-10 against staging (read-only), Sonnet 5 at effort medium, batch prices, three trials per deck, scored against the same ground truth as the free tier's baseline (`metrics-cuts.md`: 10 of 58, 17%, 1.1x chance). The model sees the facts and the card names, no Key cards, and by default no intent.

These rounds ran before the facts sorted cards by name, so the card list reached the model in the database's row order. The app sends it alphabetically; recall was not re-measured under that order.

Reading: per trial the model finds about 11.7 of 58 cuts (20%), 1.26x chance; the free tier found 10 of 58 (1.1x). Showing the model the deck's own v2 note (240 characters, a leakage diagnostic: the note names cards it cut) lifts that to 15 of 58 (26%), 1.7x chance. On this ground truth the model tier is a small step above the free tier, not a large one; most of Hugh's v1 to v2 changes are swaps whose reason sits in the replacement, which no cut list can see.

Measured cost, not estimated: 15 answers cost $0.22 at batch prices ($0.015 each, up to about 4,000 output tokens on a 19-cut deck); the plan's $5.70 estimate for the whole eval was about 25 times too high against that round, and ten times too high against the $0.50 spent on both rounds. Ledger after both rounds: $0.50 of the $15 ceiling.

## Round 1, no intent

Run 2026-10-10T08-22-17-616Z-round1. Model claude-sonnet-5 at effort medium, batch, 3 trial(s) per deck, no intent, no Key cards.

**35 of 174 cuts found** across 15 answers (15 answered), 20% against the free tier's 17% (10 of 58) and chance 27.8. Swaps 10 of 51, net reductions 25 of 123. Cost $0.224; ledger total $0.24 of $15.

| Deck | Trial | Cut (K) | Asked | Kept | Hits | Dropped | Cost | Out tokens |
|---|---|---|---|---|---|---|---|---|
| HD - Avatar Aang | 0 | 19 | 19 | 19 | 7 | none | $0.0223 | 3164 |
| HD - Avatar Aang | 1 | 19 | 19 | 19 | 8 | none | $0.0217 | 3040 |
| HD - Avatar Aang | 2 | 19 | 19 | 19 | 2 | none | $0.0188 | 2467 |
| HD Tune - Counter Intelligence | 0 | 17 | 17 | 17 | 3 | none | $0.0187 | 2364 |
| HD Tune - Counter Intelligence | 1 | 17 | 17 | 17 | 3 | none | $0.0197 | 2562 |
| HD Tune - Counter Intelligence | 2 | 17 | 17 | 17 | 6 | none | $0.0183 | 2272 |
| HD Tune - Prismari Artistry | 0 | 15 | 16 | 16 | 1 | none | $0.0207 | 2841 |
| HD Tune - Prismari Artistry | 1 | 15 | 16 | 16 | 1 | none | $0.0207 | 2824 |
| HD Tune - Prismari Artistry | 2 | 15 | 16 | 16 | 4 | none | $0.0158 | 1863 |
| HD - Gods | 0 | 6 | 6 | 6 | 0 | none | $0.0106 | 938 |
| HD - Gods | 1 | 6 | 6 | 6 | 0 | none | $0.0097 | 762 |
| HD - Gods | 2 | 6 | 6 | 6 | 0 | none | $0.0098 | 774 |
| HD - Wizards | 0 | 1 | 1 | 1 | 0 | none | $0.0056 | 95 |
| HD - Wizards | 1 | 1 | 1 | 1 | 0 | none | $0.0056 | 101 |
| HD - Wizards | 2 | 1 | 1 | 1 | 0 | none | $0.0056 | 93 |

## Round 1, leakage diagnostic (the v2 note shown as intent)

**45 of 174 cuts found** across 15 answers (15 answered), 26% against the free tier's 17% (10 of 58) and chance 25.9. Swaps 9 of 51, net reductions 36 of 123. Cost $0.263; ledger total $0.50 of $15.

| Deck | Trial | Cut (K) | Asked | Kept | Hits | Dropped | Cost | Out tokens |
|---|---|---|---|---|---|---|---|---|
| HD - Avatar Aang | 0 | 19 | 19 | 18 | 5 | cardExists | $0.0261 | 3908 |
| HD - Avatar Aang | 1 | 19 | 14 | 13 | 2 | cardExists | $0.0268 | 4049 |
| HD - Avatar Aang | 2 | 19 | 19 | 18 | 8 | cardExists | $0.0220 | 3078 |
| HD Tune - Counter Intelligence | 0 | 17 | 17 | 17 | 5 | none | $0.0184 | 2267 |
| HD Tune - Counter Intelligence | 1 | 17 | 17 | 17 | 2 | none | $0.0268 | 3941 |
| HD Tune - Counter Intelligence | 2 | 17 | 17 | 17 | 5 | none | $0.0219 | 2975 |
| HD Tune - Prismari Artistry | 0 | 15 | 16 | 16 | 4 | none | $0.0205 | 2778 |
| HD Tune - Prismari Artistry | 1 | 15 | 16 | 16 | 3 | none | $0.0246 | 3612 |
| HD Tune - Prismari Artistry | 2 | 15 | 16 | 16 | 1 | none | $0.0179 | 2259 |
| HD - Gods | 0 | 6 | 6 | 4 | 3 | cardExists, cardExists | $0.0131 | 1422 |
| HD - Gods | 1 | 6 | 6 | 4 | 1 | cardExists, cardExists | $0.0147 | 1739 |
| HD - Gods | 2 | 6 | 6 | 6 | 3 | none | $0.0123 | 1261 |
| HD - Wizards | 0 | 1 | 1 | 1 | 1 | none | $0.0062 | 207 |
| HD - Wizards | 1 | 1 | 1 | 1 | 1 | none | $0.0060 | 159 |
| HD - Wizards | 2 | 1 | 1 | 1 | 1 | none | $0.0061 | 173 |

## Round 2: card text, and Opus

Three trials per deck, no intent, batch prices. "Held-out" is Gods plus Wizards (7 cuts, 21 over three trials); the other three decks are where the one prompt change (type, mana value and oracle text per card) was looked at.

| Configuration | All five decks | Three decks | Held-out two | Cost |
|---|---|---|---|---|
| Sonnet 5, facts only: no type, mana value or text (round 1) | 35 of 174 (20%) | 35 of 153 | 0 of 21 | $0.22 |
| Sonnet 5, type, mana value and text | 43 of 174 (25%) | 43 of 153 | 0 of 21 | $0.34 |
| Opus 5.5, type and mana value, no text | 47 of 174 (27%) | 47 of 153 | 0 of 21 | $0.55 |
| Opus 5.5, type, mana value and text | 46 of 174 (26%) | 46 of 153 | 0 of 21 | $0.77 |

Chance is about 27 per 174, so Sonnet is 1.3x and the better rows 1.6x to 1.7x. The free tier was 1.1x. The rows differ in more than the model: the first has neither type nor mana value, the Opus rows without text have them, and the Sonnet rows do not isolate them from text. Read it as: adding type, mana value and text moved Sonnet from 20% to 25%, and Opus sits at 26% to 27% with or without text. Spend on this ledger: $2.17 of the $15 ceiling. The Opus rows are priced at an ASSUMED Opus 5.5 rate ($5 and $25 per million tokens, the Opus 5 rate), so those two costs are an estimate until the bill is checked.

The "Dropped" columns count the harness's own name resolution, which sees only the offered cards; the app does the same, so a name outside the deck drops as `cardExists` in both.

**The held-out decks are not a test.** Seven cuts, none found by any configuration. Gods is a theme change ("removing mana intensive mana rocks and increasing mana pool to skew towards mountains") and Wizards is one card moved to another deck for its utility there. Neither reads off a list.

## Why this ground truth may not measure the feature

Proposed cuts is "this list is over 100, which cards come out". The truth set here is "which cards did Hugh swap out between v1 and v2", and the two differ:

- **Most removals are swaps or theme changes.** Every deck added as many cards as it cut (the notes: a proliferate rebuild, a five-colour mana fix, a mountain skew, upgrades to a precon), and 17 of the 58 cuts have a replacement of the same role. The reason a card left lives in the card that came in, which a cut-only call is never shown.
- **No deck was over 100.** The "pre-cut list" is v1 plus the cards v2 added, a list Hugh never held. The model is asked to cut `|added|` cards from it, and some of the added cards are ones Hugh chose on purpose.
- **Intent is the signal the product has and this truth withholds.** A player pressing Look deeper on an over-100 deck can say what the deck is for. Showing the model Hugh's v2 note moved Sonnet from 20% to 26%, and those notes name cards.
- **It cannot tell a defensible cut from a different one.** A model that proposes a sensible cut Hugh did not make scores a miss.

A better truth set, in order of cost:

1. **Hugh trims two or three real over-100 lists by hand**, writing nothing but the final 100 (a few minutes a deck). The scored question becomes what the product asks. Any deck over 100 on staging or a new one he pads on purpose with 8 to 12 cards he would cut.
2. **Blind read.** The model proposes cuts for his over-100 lists and Hugh marks each one fine, close or wrong, as for the tuning prompt (`report.md`). No ground truth needed, and it measures reasons too.
3. **Decks with a net-reduction history.** By the same-role pairing 41 of the 58 cuts have no replacement of the same role, but every deck here added about as many cards as it cut, so none is a clean trim.

The recall numbers above are a floor for the free-versus-model comparison and no more.

## Prompt v2: the deck's plan first (2026-10-10, `pnpm eval:cuts-plan`)

Hugh's blind read of v1 found the model at 1.06x a random draw (11 of 36 picks rated Cut it), and Deckcheck, handed the same lists, found 15 of his 39 real removals to the model's 7 of 36 by reasoning from the deck's plan first and card efficiency second. v2 gives the model that signal: the combos the deck assembles or is one card short of (the Overview's Spellbook read, `loadComboFacts`), the commander's text, the colours the deck's spells actually need and the basics it runs, each card's combo state, whether a land enters tapped and the colours it needs; the prompt orders the choice (plan, then the least efficient of cards doing the same job) and demotes role counts, curve and EDHREC inclusion to context. Four new cite kinds (combo, cost, tapped, colour) are checked by the same validator that checks the old six. Per-card role surplus and "opens a gap" lines were removed from the card lines. Nothing in the prompt protects a recently added card.

One Batch API sample per deck on the shipped call path (Sonnet 5, effort medium, 8,000 output tokens), score = picks found in the cards Hugh actually removed. The lists are the previous version plus the newest version's additions (HD Tune - Mutant Menace: its one committed version plus the draft's additions, Hugh's removals being what the draft dropped). Spend $0.508 of the $0.75 cap; the ledger is `ledger-cuts.jsonl`.

| Deck | Hugh removed | Old prompt (v1) | New prompt (v2) | Deckcheck |
|---|---|---|---|---|
| HD - Gods | 6 | 0 of 6 | 1 of 6 | 1 of 6 |
| HD Tune - Counter Intelligence | 17 | 6 of 14 | 6 of 13 | 11 of 17 |
| HD Tune - Prismari Artistry | 15 | 1 of 16 | 4 of 16 | 3 of 16 |
| HD - Avatar Aang | 19 | 7 of 19 | 11 of 19 | 11 of 24 |
| **The four together** | 57 | **14 of 55 (25%)** | **22 of 54 (41%)** | **26 of 63 (41%)** |
| HD Tune - Mutant Menace | 47 | 20 of 47 (after a retry) | 0 at the app's ceiling; 29 of 46 at an eval-only 16,000 | none |

Reading, with what it does not show:

- v2 finds 22 of 54 picks where v1 found 14 of 55, level with Deckcheck's 26 of 63 on the same four decks. One sample per deck, so a swing of two or three hits on a small deck (Gods) is noise; the Aang gain (7 to 11) and the Prismari gain (1 to 4) are the larger moves.
- Aang is where the new fact shows: 7 of the 11 hits are the black cards Hugh dropped (Azula, Beifong's Bounty Hunters, Boiling Rock Rioter, Hama, Heartless Act, Dai Li Indoctrination, Northern Air Temple), each reasoned from "black is barely used", which is the colour-weight fact (`Nonland cards by the colour their cost needs: W 24, U 24, G 22, R 16, B 8`). Deckcheck reached the same cards by treating the deck as four-colour.
- Counter Intelligence did not move (6 and 6) and the model still trails Deckcheck's 11. Four of its 17 answers were dropped by the validator for a cite that was not true (a `tapped` cite on Talismans, which are not lands); the validator did its job, and the prompt's wording of that cite is a candidate for the next round.
- (The table ran before two review fixes that change facts the model saw: `{2/B}` and `{B/P}` pips no longer count as needing black in the colour totals, and a capped combo list now tells the model not to cite "in no combo". Neither is re-measured.)
- (Unmeasured follow-up, no new paid run: after this table the prompt was told to lead every reason with the plan or the efficiency fact and to stop giving "not on the commander's EDHREC list", a role surplus or a crowded curve slot as the main reason.) The reasons above still lean on "not on the commander's EDHREC list" and on role counts more than the ordering asks for. Of the Mutant Menace picks, 8 cite the deck being over a role target. The ordering is a request, not an enforcement.
- Against Hugh's blind ratings (the three decks that had a sheet), 23 of the 35 new picks were cards he had rated: 6 Cut it, 7 Maybe, 10 Keep it, a Cut it share of 26% against v1's 31% of 36. The other 12 new picks were not on the sheet, so v1's rated picks and v2's are different samples; this does not say v2 is worse, and it does not say it is better. The truth set above (what Hugh actually removed) is the comparison that covers every pick.
- **A 47-over deck does not fit the output ceiling.** Mutant Menace is 147 cards, 47 over; v2's answer was truncated at `max_tokens` 8,000 on both attempts (v1's first attempt was too, and its retry happened to fit at 6,961). The eval-only run with 16,000 tokens answered in one pass ($0.098). The ceiling and the reservation price are shared with Suggested changes (`FEATURE_CALLS.proposed_cuts.maxTokens`), so they stay at 8,000, and the PR instead caps a run at 20 cuts (`MAX_CUTS_PER_RUN`, enforced in the prompt, the reply's bound and the validator), says how many remain, and the player runs it again after cutting. The 20-cut cap is unmeasured: Counter Intelligence's 17-cut answer used 7,467 of the 8,000 tokens, so a 20-cut answer may still truncate on some decks. The Mutant Menace figures above are the uncapped 47-cut ask.
- The Deckcheck column is what Deckcheck returned on the same lists (Gods, Counter Intelligence and Prismari from `scripts/eval` mock lists; Aang's 24 slots, 21 distinct cards, include five basic lands and score 11 on Hugh's list by the orchestrator's count). It is a comparison point, not a truth: Hugh's own removals are.

Calls: Aang and Mutant Menace under v1 $0.139 (Mutant Menace needed its retry); all five decks under v2 $0.271 (Counter Intelligence's four dropped cites included, Mutant Menace twice at 8,000 tokens $0.119 of it); Mutant Menace at 16,000 tokens $0.098. Total $0.508.

### The v2 picks Hugh asked to read

#### HD - Avatar Aang Hugh removed: 19
[HUGH] Azula, Cunning Usurper :: Off-color card needing black, a color the deck barely uses, and it is not on the commander's EDHREC list at all.
[HUGH] Beifong's Bounty Hunters :: Needs black and green but black is barely used in this deck, and the card is not on the commander's EDHREC list.
[HUGH] Boiling Rock Rioter :: Needs black, a color this deck barely supports, and has low EDHREC inclusion among commander decks.
[HUGH] Hama, the Bloodbender :: Needs blue and black, pulling into a color the deck barely uses, and is not on the commander's EDHREC list.
[HUGH] Heartless Act :: Needs black, a splashed color with only 8 cards needing it, and has very low EDHREC inclusion.
       Iroh's Demonstration :: Needs red and has very low EDHREC inclusion among commander decks running this card.
[HUGH] Dai Li Indoctrination :: Needs black, a color barely supported by the deck, and has low EDHREC inclusion.
[HUGH] Northern Air Temple :: Needs black, a splashed color with only 8 cards needing it, and is not on the commander's EDHREC list.
       Rockalanche :: Needs green and has very low EDHREC inclusion among commander decks running this card.
       Southern Air Temple :: Needs white but has very low EDHREC inclusion, suggesting weaker support among builders of this commander.
       Sandbenders' Storm :: Needs white and has low EDHREC inclusion among decks running this commander.
[HUGH] Allies at Last :: Needs green and has low EDHREC inclusion among decks running this commander.
       Yip Yip! :: Needs white and has very low EDHREC inclusion among decks running this commander.
       Accumulate Wisdom :: Needs blue and has low EDHREC inclusion among decks running this commander.
       Octopus Form :: Needs blue and has low EDHREC inclusion among decks running this commander.
[HUGH] Jet, Freedom Fighter :: Needs white and red and is not on the commander's EDHREC list at all.
[HUGH] Smellerbee, Rebel Fighter :: Needs red and is not on the commander's EDHREC list at all.
[HUGH] Wartime Protestors :: Needs red and has low EDHREC inclusion among decks running this commander.
       Crescent Island Temple :: Needs red and is not on the commander's EDHREC list at all.
dropped: 
#### HD Tune - Mutant Menace Hugh removed: 47
[HUGH] Bramble Sovereign :: Copies creatures entering but has no link to milling, rad counters, or the commander's +1/+1 counter trigger; not on this commander's EDHREC list.
[HUGH] Cackling Counterpart :: A one-time copy spell with no mill or counter synergy, costing 3 mana for a single token; not on this commander's EDHREC list.
       Champion of Lambholt :: Pure combat-power payoff unrelated to milling or counters; not on this commander's EDHREC list and sits at a crowded mana value.
[HUGH] Croaking Counterpart :: Clone effect with no tie to mill or counters; not on this commander's EDHREC list and costs 3 mana for a shrunk copy.
[HUGH] Cryptoplasm :: Copy-shifter with no mill or counter payoff; not on this commander's EDHREC list.
[HUGH] Doppelgang :: Mass-copy sorcery unrelated to the mill/counter plan; not on this commander's EDHREC list.
[HUGH] Double Major :: Copy-spell with no connection to milling or counters; not on this commander's EDHREC list.
       Glasspool Mimic // Glasspool Shore :: Clone creature with no mill or counter synergy; not on this commander's EDHREC list.
[HUGH] Mimic Vat :: Token-copy engine unrelated to the mill or counter plan; not on this commander's EDHREC list.
[HUGH] Mirror Image :: Simple clone with no mill or counter payoff; not on this commander's EDHREC list.
       Phyrexian Metamorph :: Copy effect that does nothing for milling or counters; not on this commander's EDHREC list.
[HUGH] Quasiduplicate :: Copy spell disconnected from the mill/counter plan; not on this commander's EDHREC list.
[HUGH] Renegade Doppelganger :: Temporary copy ability with no mill or counter synergy; not on this commander's EDHREC list.
[HUGH] Repudiate // Replicate :: Split card whose copy half and counter-ability half don't feed milling or counters; not on this commander's EDHREC list.
[HUGH] Rite of Replication :: Expensive clone effect unrelated to mill or counters; not on this commander's EDHREC list.
[HUGH] See Double :: Copy spell with no tie to the mill/counter plan; not on this commander's EDHREC list.
[HUGH] Sublime Epiphany :: Modal spell whose main upside is copying a creature, which the plan doesn't use; not on this commander's EDHREC list and sits at a crowded mana value.
[HUGH] Herald's Horn :: Tribal cost-reducer with no tie to milling, rad, or +1/+1 counters; not on this commander's EDHREC list.
[HUGH] Vanquisher's Banner :: Tribal draw engine unrelated to the mill/counter plan, and the deck already exceeds its draw target of 8 with 12 draw cards.
       Wishclaw Talisman :: Tutor that hands the artifact to an opponent, working against the deck's own plan; not on this commander's EDHREC list.
       Veil of Summer :: Protection/draw spell unrelated to milling or counters; draw is already over its target of 8 with 12 cards.
       An Offer You Can't Refuse :: Gives the countered spell's controller two Treasures, handing an opponent ramp, while removal is already over its target of 5 at 10 cards.
[HUGH] Young Deathclaws :: Low-inclusion graveyard payoff with little tie to the mill/counter plan, at a crowded mana value.
[HUGH] Vat Emergence :: Reanimation spell with only a minor proliferate upside; not on this commander's EDHREC list and sits at a crowded mana value.
[HUGH] Lumbering Megasloth :: A twelve-mana creature whose only real payoff is trample, at the deck's most overbuilt curve slot.
[HUGH] Agent Frank Horrigan :: Seven-mana body whose only tie to the plan is proliferate, at the deck's most overbuilt curve slot.
       Court of Cunning :: Monarch mill effect with very low adoption, at an already crowded mana value.
[HUGH] Fetid Pools :: Always enters tapped while the deck already runs far more lands than its 35-land target.
[HUGH] Mortuary Mire :: Always enters tapped while the deck already runs far more lands than its 35-land target.
       Opulent Palace :: Always enters tapped while the deck already runs far more lands than its 35-land target.
[HUGH] Path of Ancestry :: Always enters tapped while the deck already runs far more lands than its 35-land target.
[HUGH] Temple of Deceit :: Always enters tapped while the deck already runs far more lands than its 35-land target.
[HUGH] Temple of Malady :: Always enters tapped while the deck already runs far more lands than its 35-land target.
[HUGH] Temple of Mystery :: Always enters tapped while the deck already runs far more lands than its 35-land target.
       Swarmyard :: Regenerates creature types the deck barely runs, with low adoption, while lands are already well over target.
       Diamond City :: Colorless utility land not on this commander's EDHREC list, while lands are already well over the 35 target.
[HUGH] Temple of the False God :: Only produces colorless mana for a three-color deck, with modest adoption, while lands are already well over target.
       Muddle the Mixture :: Niche transmute counterspell not on this commander's EDHREC list, while removal is already over its target of 5 at 10 cards.
[HUGH] Casualties of War :: Six-mana removal at an already crowded curve slot, while removal is already over its target of 5 at 10 cards.
[HUGH] Alpha Deathclaw :: Removal creature at an already crowded curve slot, while removal is already over its target of 5 at 10 cards.
       Bred for the Hunt :: Very low adoption draw payoff, while draw is already over its target of 8 at 12 cards.
       Drown in Ichor :: Very low adoption removal spell, while removal is already over its target of 5 at 10 cards.
       Talisman of Curiosity :: A pain-dealing mana rock redundant with other fixing, while ramp is already over its target of 7 at 11 cards.
       Talisman of Dominance :: A pain-dealing mana rock redundant with other fixing, while ramp is already over its target of 7 at 11 cards.
       Talisman of Resilience :: A pain-dealing mana rock redundant with other fixing, while ramp is already over its target of 7 at 11 cards.
       Ash Barrens :: Only colorless mana or a slow landcycle for a three-color deck, with modest adoption, while lands are already well over target.
dropped: citeMismatch:Insatiable Avarice

