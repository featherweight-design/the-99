# Model tiering for Suggested changes and Proposed cuts (2026-10-12)

Two tools, three models: today's `claude-sonnet-5` (effort medium, the `TUNING_MODEL` and `TUNING_EFFORT` both tools use), `claude-sonnet-5-5` and `claude-haiku-5-5`, the last two at the same effort. Real-time prices throughout (what the app pays), staging read-only, nothing in `src/` changed. Harness: `pnpm eval:tuning-model-arms` (Suggested changes) and `pnpm eval:cuts-model --model … --text --realtime` (Proposed cuts). Ledgers: `ledger-model-tiering-tuning.jsonl` ($0.67 of $2) and `ledger-model-tiering-cuts.jsonl` ($1.55 of $2, which includes one $0.081 line that is an estimate, see below).

## Read this first: what this does and does not show

- **Suggested changes has no gold.** Nobody has marked which suggestions are right for these decks, so "accuracy" here is *contract survival* (did the reply pass the app's own checks: legal, in the pool, citations that hold) plus how many suggestions came back. It cannot say whether a rationale is good. The verbatim lines below are there for Hugh to judge that himself.
- **Proposed cuts has gold:** the cuts Hugh actually made (the same ground truth as `metrics-cuts-model.md`). Recall is judged against chance (a model picking at random from the pool).
- **Sonnet 5.5 on Proposed cuts has one trial per deck, not three.** My first run of it was killed by me when the run's spend cap check refused the next chunk; its results were lost and the ledger carries a $0.081 line that is my estimate of that run, not a measured figure. After Hugh's go-ahead via the orchestrator I re-ran it at one trial for each of the five decks (5 answers, $0.186). Five trials against fifteen: treat its recall as an indication only.
- One sample per deck for Suggested changes (12 decks), three trials per deck for Proposed cuts on Sonnet 5 and Haiku 5.5 (5 decks, 15 trials) and one for Sonnet 5.5 (5 trials). Small samples; differences of a few points are noise.

## Results

### Suggested changes (prompt v8, 12 decks, one answer each)

| | Sonnet 5 (today) | Sonnet 5.5 | Haiku 5.5 |
|---|---|---|---|
| Answers that passed the contract | 12 of 12 | 11 of 12 (Eldrazi: its one addition was not legal, answer left empty) | 12 of 12 |
| Suggestions returned, per deck | 8.4 | 5.9 | 2.8 |
| Suggestions kept after the app's checks | 91 of 101 (90%) | 65 of 71 (92%) | 32 of 33 (97%) |
| Dropped by rule | cut:noResultClaim 2, add:citation 2, cut:citation 1, add:addNotLegal 1, add:quotedNote 1 | cut:citation 3, add:citation 2, add:addNotLegal 1 | add:colourIdentity 1 |
| **Cost per call (real time)** | **$0.0326** | **$0.0211** | **$0.0017** |
| Latency p50 / p95 | 25.1 s / 30.3 s | 8.2 s / 13.9 s | 12.9 s / 16.5 s |
| Errors / retries | 0 / 0 | 0 / 1 (Kratos, retried once, $0.0235 for the retry) | 0 / 0 |
| Mean output tokens | 2,292 | 1,068 | 2,521 |

Total spend $0.67 (Sonnet 5 $0.39, Sonnet 5.5 $0.25, Haiku 5.5 $0.02), 36 answers.

### Proposed cuts (5 decks x 3 trials, card text shown, real time)

| | Sonnet 5 (today) | Sonnet 5.5 | Haiku 5.5 |
|---|---|---|---|
| Cuts of Hugh's found | 27 of 174 (16%); 1.8 a trial | 11 of 58 (19%); 2.2 a trial (5 trials only) | 29 of 174 (17%); 1.9 a trial |
| Against chance | 21.7 expected, 1.25x | 8.0 expected, 1.38x | 24.0 expected, 1.21x |
| Suggestions kept of asked | 132 of 141 (94%) | 51 of 52 (98%) | 150 of 156 (96%) |
| **Cost per trial (real time, retries included)** | **$0.0825** | **$0.0371** | **$0.0031** |
| Latency p50 / p95 (per trial, a retry added to its trial) | 42.8 s / 115.7 s (longest 122 s) | 9.2 s / 10.1 s | 17.3 s / 23.0 s |
| Errors / retries | 1 trial never answered (Counter Intelligence trial 2 hit the 6,000-token output ceiling on its first request and again on its retry, and returned nothing); 4 retried requests | 0 / 0 | 0 / 0 |

Per deck (hits of Hugh's cuts, over the three trials): Aang 11 of 57 on both models; Counter Intelligence 3 of 51 (Sonnet 5, including the unanswered trial) against 7 of 51 (Haiku); Prismari 10 of 45 on both; Gods 3 of 18 against 1 of 18; Wizards 0 of 3 on both. Sonnet 5.5, one trial each: Aang 4 of 19, Counter Intelligence 5 of 17, Prismari 1 of 15, Gods 1 of 6, Wizards 0 of 1. Sonnet 5 spent $1.24 on 19 requests, Sonnet 5.5 $0.19 on 5, Haiku $0.047 on 15. For reference the earlier no-card-text Sonnet 5 round found 35 of 174 (20%, 1.26x chance, batch prices, `metrics-cuts-model.md`): every arm here sits near chance.

## Recommendation per tool

**Proposed cuts: Haiku 5.5, if Hugh wants to move.** It found as many of Hugh's cuts as Sonnet 5 (29 against 27 of 174; the difference is noise), kept slightly more of what it asked, never failed to answer, took 17 s instead of a median 43 s (Sonnet 5 had three trials past 100 s, the longest 122 s) and cost 1/27 as much ($0.0031 against $0.0825 a trial). The honest caveat is that cuts recall is poor on every model, so the choice is between equally weak rankers and the cheaper one wins. Sonnet 5.5 (five trials, 2.2 cuts found a trial against 1.8 and 1.9) is not distinguishable from either on this sample; it is the middle choice on cost ($0.037 a trial, half of Sonnet 5) and the fastest (9 s), if Hugh wants to stay in the Sonnet family.

**Suggested changes: Sonnet 5.5 is the cautious move; Haiku 5.5 is the cheap one, and it changes the product.** Sonnet 5.5 kept 92% (against 90%), answers about three times faster (median 8 s against 25 s) and costs about a third less ($0.021 against $0.033), but returns fewer suggestions (5.9 a deck against 8.4) and once returned nothing legal. Haiku 5.5 costs 1/19 as much and passes the contract as often as Sonnet 5 (12 of 12) and drops the fewest, but offers only 2.8 suggestions a deck (six decks got 2: Aang, Goblins, Elves, Brago, Yuriko and Gods). That is a thinner feature, not the same feature cheaper. Whether the thinner lists are worse is a judgement of rationales, which the lines below let Hugh make.

If Hugh decides on cost alone: Haiku 5.5 for Proposed cuts, Sonnet 5.5 for Suggested changes. If he wants no loss of Suggested changes breadth, keep Sonnet 5 there.

## The change, if Hugh picks one

Both tools read one constant today (`TUNING_MODEL` in `src/lib/tuning/limits.ts`; the price table in `src/lib/model/prices.ts` and the cuts run store read the same one).

- **Both tools to one model**: one line, `TUNING_MODEL = "claude-sonnet-5-5"` (or `"claude-haiku-5-5"`). This is the only one-line option, and it moves Proposed cuts and Suggested changes together.
- **Different models per tool** (the recommendation above) needs a second constant, `CUTS_MODEL`, read in `src/app/decks/cuts-actions.ts`, `src/lib/tuning/cuts-run-store.ts` and the `proposed_cuts` row of `prices.ts`: about five lines, not one.
- No production constant was touched by this PR.

## Verbatim: the same five decks, side by side

Every suggestion the model returned for these decks, in the model's own words (`rationaleShort`), before the app's filters. Nothing was picked for how it reads; "drops" names the rules the app applied to that arm's answer.

### HD - Gishath

**Sonnet 5 (today)** — returned 8, kept 8, outcome survived, drops: none

- Add Swiftfoot Boots: Protects and speeds up the commander's attacks.
- Add Exotic Orchard: Fixes mana while adding to a thin land count.
- Add Rogue's Passage: Lets a big dinosaur get through blockers.
- Add Reliquary Tower: Keeps excess cards instead of discarding them.
- Cut Topiary Stomper: A plain ramp piece in an already full ramp suite.
- Cut Runic Armasaur: Narrow draw engine in an already strong draw suite.
- Cut Star of Extinction: Symmetrical removal hurts your own big creatures too.
- Cut Boxing Ring: Niche artifact that doesn't support core roles.

**Sonnet 5.5** — returned 4, kept 4, outcome survived, drops: none

- Add Exotic Orchard: Fixing land for three colours; adds a land slot.
- Add Reliquary Tower: Land that removes the hand-size limit.
- Cut Selesnya Signet: Surplus ramp; a weak two-colour rock.
- Cut Topiary Stomper: Clunky ramp creature in an over-stocked role.

**Haiku 5.5** — returned 4, kept 4, outcome survived, drops: none

- Add Exotic Orchard: Adds a land drop without taking a spell slot.
- Add Swiftfoot Boots: Protects the big dinosaurs from targeted removal.
- Cut Boxing Ring: A noncreature artifact that does little for this creature deck.
- Cut Lightning Greaves: Equipment that costs extra mana for a creature-heavy deck.

### HD - Avatar Aang

**Sonnet 5 (today)** — returned 8, kept 8, outcome survived, drops: none

- Add Swords to Plowshares: One-mana removal closes the gap on removal count.
- Add Fellwar Stone: Early cheap ramp to avoid stumbling into late ramp again.
- Add Command Tower: Five-color fixer to smooth mana across this deck's colors.
- Add Cyclonic Rift: Tempo swing to cover for board presence trouble.
- Cut The Lion-Turtle: Expensive ramp body when ramp count is already high.
- Cut Kyoshi Island Plaza: Slow ramp piece when ramp is already over target.
- Cut Accumulate Wisdom: Multi-turn draw spell when draw is already over target.
- Cut Yip Yip!: Narrow effect that doesn't advance the flip plan.

**Sonnet 5.5** — returned 3, kept 1, outcome survived, drops: cut:citation, cut:citation

- Cut Brainstorm: Low-impact draw spell while draw is over target and hands stall.
- Cut Explore: Small-effect spell in a category that is already over target.
- Cut Water Whip: Sorcery-speed draw that costs tempo when draw is already high.

**Haiku 5.5** — returned 2, kept 2, outcome survived, drops: none

- Add Swords to Plowshares: Cheap instant answer to stop a blocker before the flip.
- Cut Mystical Tutor: Slow tutor adds to a mana-starved start.

### HD - Wizards

**Sonnet 5 (today)** — returned 8, kept 8, outcome survived, drops: none

- Add Thought Vessel: Fills the last gap in the ramp suite.
- Add Cyclonic Rift: Closes the removal gap with a board-clearing bounce.
- Add Mana Drain: A counter that bankrolls the next spell too.
- Add Academy Ruins: Recurs the deck's own artifact engines.
- Cut Peek: A low-impact draw spell in an overfull category.
- Cut Brain Freeze: A mill card out of step with the control plan.
- Cut Mind Bend: A narrow effect with little synergy here.
- Cut Alexi's Cloak: A risky aura that's easy to lose tempo to.

**Sonnet 5.5** — returned 6, kept 6, outcome survived, drops: none

- Add Thought Vessel: Cheap rock that fills the open ramp slot and ignores hand size.
- Add Pongify: Cheap instant answer to one threat; alternative to Reality Shift.
- Add Reliquary Tower: Utility land swapped for an Island; no hand-size worry.
- Cut Island: A basic Island can go, keeping lands in range.
- Cut Peek: Low-impact cantrip in a deck full of draw.
- Cut Mage's Guile: Weak cantrip; draw is already well covered.

**Haiku 5.5** — returned 4, kept 4, outcome survived, drops: none

- Add Thran Dynamo: A colourless mana rock that speeds up this blue shell.
- Add Mana Drain: A blue counter that answers threats for this deck.
- Cut Peek: A low-impact cantrip this deck does not need.
- Cut Preordain: A cheap look the deck has enough selection without.

### HD - Yuriko

**Sonnet 5 (today)** — returned 8, kept 7, outcome survived, drops: cut:noResultClaim

- Add Toxic Deluge: Fills the empty wipe slot with a scalable sweeper.
- Add Swiftfoot Boots: Protects and speeds up the commander.
- Add Baleful Strix: Cheap evasive body that replaces itself.
- Add Polluted Delta: Shores up a land count near the low end.
- Cut Artful Dodge: Weak one-time evasion the deck doesn't need.
- Cut Changeling Outcast: Redundant cheap unblockable body.
- Cut Ornithopter: Low-impact body outclassed by other ninjas.
- Cut Tormented Soul: Vanilla unblockable with nothing extra to offer.

**Sonnet 5.5** — returned 8, kept 8, outcome survived, drops: none

- Add Toxic Deluge: Fills the empty wipe slot with a flexible sweeper.
- Add Undercity Sewers: Dual land with surveil to help the land count and draws.
- Add Dimir Aqueduct: Bounce land adds a land body and fixing.
- Add Morphic Pool: Extra dual land to fix colours and reach the land range.
- Cut Dark Ritual: One-shot ramp when ramp is already over target.
- Cut Lotus Petal: Single-use ramp in a deck with enough ramp.
- Cut Mental Misstep: Narrow counter in an over-stocked removal suite.
- Cut Flusterstorm: Weak lone counter with removal well over target.

**Haiku 5.5** — returned 2, kept 2, outcome survived, drops: none

- Add Toxic Deluge: Adds a black sweeper for the one-short wipe role
- Cut Flusterstorm: Narrow counterspell that only hits instants and sorceries

### HD Tune - Counter Intelligence

**Sonnet 5 (today)** — returned 8, kept 8, outcome survived, drops: none

- Add Blasphemous Act: Fills the empty wipes slot with a cheap sweeper.
- Add Swiftfoot Boots: Cheap protection and haste for the commander.
- Add Lightning Greaves: Faster alternative protection piece for the commander.
- Add Rogue's Passage: Unblockable land to push through key attackers.
- Cut Pentad Prism: Weak one-shot ramp the deck can spare.
- Cut Astral Cornucopia: Slow-scaling rock among many faster ramp pieces.
- Cut Universal Surveillance: Symmetric draw that also helps opponents.
- Cut Lux Cannon: Slow, costly removal piece in a crowded role.

**Sonnet 5.5** — returned 4, kept 4, outcome survived, drops: none

- Add Blasphemous Act: Fills the empty board wipe slot with a cheap red sweeper.
- Add Lightning Greaves: Gives Kilo haste and protection from targeted removal.
- Cut Contagion Clasp: Slow artifact with little impact on the plan.
- Cut Pemmin's Aura: Aura with a risky two-for-one; low impact here.

**Haiku 5.5** — returned 3, kept 3, outcome survived, drops: none

- Add Wrath of God: Adds a sweeper for crowded boards where opponents overcommit
- Cut Tome of Legends: Tome of Legends adds little beside the deck's other draw
- Cut Swan Song: Swan Song is spare removal beside Swords and Dovin's Veto

