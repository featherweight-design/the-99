# Find a deck read: model eval

Eval for lock 9 of the brief (`docs/superpowers/design-briefs/2026-10-11-find-a-deck-read.md`). It compares
Sonnet 5.5 and Haiku 5.5, both at effort medium, on Hugh's eleven eval cards against his staging decks. Read-only.
The harness is `scripts/eval/fits-read.mts` (`pnpm eval:fits-read`), with its own ledger
(`ledger-find-a-deck.jsonl`) and a $2 cap.

**Status: run 2026-10-12.** Total spend was $1.88 of the $2 cap (ledger), the Haiku rerun and the niche run included. The answers are in `answers/fits-read-2026-10-12-04-45-09-sonnet.json`, `answers/fits-read-2026-10-12-04-46-50-haiku.json` `answers/fits-read-2026-10-12-04-43.json` (sonnet-warm) and `answers/fits-read-2026-10-12-05-07-32-haiku.json` (the Haiku rerun). `answers/fits-read-2026-10-12-04-42.json` is a first Haiku run on the same prompt ($0.045, 14 of 15 kept), made before the arm filenames were fixed; the 04:46 Haiku run is the one reported, so the two Haiku arms compare like for like with Sonnet's. The first Sonnet run's answers were overwritten by the warm run (a filename collision, now fixed), so Sonnet was run again. That second run is the one reported here, and it is why spend reached $1.80 before the rerun, not ~$1.05.

## Three cards, before and after (for Hugh)

"Before" is the picker as it ships today: its first rows, each with the reason it draws. "After" is the read's
lines, verbatim. Haiku is the **rerun** with the basic-land and no-figures rules (prompt version 2, 14 of 14 kept,
none dropped); Sonnet is the version 1 run.

### Ajani Unrelenting (11 candidate decks)

| | Deck | What the row says |
| --- | --- | --- |
| Before | HD Tune - Prismari Artistry | shares the Tokens theme (19 cards) |
| Before | HD - Avatar Aang | shares the Draw theme (15 cards) |
| Before | HD - Omnath | shares the Draw theme (15 cards) |
| Before | HD -Thorin | shares the Tokens theme (15 cards) |
| Haiku | HD - Goblins | Ajani Unrelenting grants haste to the team through its loyalty ability, and its damage spares the Goblin tokens made by Krenko, Mob Boss. Cut: Goblin Grappler. |
| Haiku | HD - Kratos | Ajani Unrelenting deals damage to each creature except your tokens, and Repercussion turns that damage into damage to an opponent for Kratos, God of War's burn plan. Cut: Reckless Impulse. |
| Haiku | HD -Thorin | Plan: "artifacts, legendaries and Sagas turn on the enduring story"; Ajani Unrelenting is a legendary permanent that counts toward Thorin Oakenshield's enduring story, and its loyalty ability gives the Dwarves haste. Cut: Iron Hills Stalwart. |
| Sonnet | (none) | All three of its lines wrote "+1/+1" and were dropped (no figures). |

### Tangle Wire (21 candidate decks)

| | Deck | What the row says |
| --- | --- | --- |
| Before | HD - Avatar Aang, HD - Brago, HD - Eldrazi, HD - Elves | no reason: a colorless card fits every deck, listed by name |
| Haiku | HD - Soldiers | The plan "fills the board with cheap Humans, Soldiers and tokens", so Battle Screech and the token bodies can pay the upkeep tap that Tangle Wire forces, while opponents with fewer creatures run short. Cut: Gustcloak Runner. |
| Sonnet | HD - Kratos | Tangle Wire taps down opposing creatures at upkeep, so with Kratos, God of War haste for all and idle creatures hurting their controllers, tapped ones still deal damage while Ensnaring Bridge style stax holds the table. Cut: Bolt Bend. (Muddled: "tapped ones still deal damage" is not what either card does.) |
| Sonnet | HD - Wizards | Tangle Wire taps lands on each upkeep, letting Baral, Chief of Compliance and counterspells like Counterspell win the mana game while opponents cannot untap into their own answers. Cut: Mind Bend. |
| Sonnet | HD - Goblins | Tangle Wire slows opposing blockers and mana each upkeep, so Krenko, Mob Boss can double the Goblin count and swing wide while Sulfuric Vortex adds pressure. Cut: Wave of Indifference. |

### Throes of Chaos (10 candidate decks)

| | Deck | What the row says |
| --- | --- | --- |
| Before | HD - Avatar Aang, HD - Gishath, HD - Goblins, HD - Gods | no reason, listed by name |
| Haiku | HD - Omnath | Retrace lets Throes of Chaos return from the graveyard by discarding a spare land, so extra lands feed the "land-recursion effects keep the land engine running" plan while cascade casts a free spell. Cut: Ashaya, Soul of the Wild. |
| Sonnet | HD - Avatar Aang | Cascade off Throes of Chaos can hit a cheap Lesson such as Airbending Lesson for free, and retrace turns spare lands into repeat casts that feed Avatar Aang // Aang, Master of Elements with more bending triggers. Cut: Crashing Wave. |

**The Haiku rerun** (`answers/fits-read-2026-10-12-05-07-32-haiku.json`, $0.045): 14 of 14 lines kept, no basic land
cut, no figure drop, 0 of 14 stale. Its cost per press is unchanged ($0.0006 to $0.0072); its latency was 2.5 to 21 s.

## Method

- **Engine.** `src/lib/swaps/fits-read.ts` (pure: candidates, prompt, schema, validator) and
  `src/lib/swaps/fits-read-load.ts` (inputs). The candidates are `loadFits`' open set, refused for a card that is not
  commander-legal. Each candidate keeps its `need` from `shapeFits`.
- **Plan text.** Each deck's plan is the newest passing Overview of any contract (`readShownSynopsis`): its prose
  and `primer.strategy`, with the marks drawn as names. A deck with no Overview gets its commander and its leading
  themes instead, counted over its own cards' labels. `deck_profiles.profile.themes` is always null, so it can't
  be the source.
- **Prompt.** Decks are keyed `D1…` and cards `C1…`, one key per card across every block. No deck name is sent.
  Each list card carries its label kinds. The two layouts:
  - `per-press`: the system prompt holds the rules; the user message holds the card, each candidate's need and
    inclusion line, and the candidates' blocks.
  - `cached-decks`: the system prompt holds the rules plus every deck's block, byte-stable and cached; the user
    message holds the card and the candidate keys with their lines.
- **Arms.**
  - `haiku`: claude-haiku-5-5, effort medium, per-press.
  - `sonnet`: claude-sonnet-5-5, effort medium, per-press.
  - `sonnet-warm`: claude-sonnet-5-5, effort medium, cached-decks. It runs Ajani Unrelenting, Mind's Eye and Tangle
    Wire back to back, so the second and third read the cache the first wrote.

  Every arm caps output at 8,000 tokens and takes one sample per card.
- **Validator** (`validFitsRead`). Each failure drops that deck and is counted by reason:
  - `unknownDeck`, `notCandidate`, `duplicateDeck`;
  - `cardOutsideDeck`, for a card named by key or outright;
  - `cutCommander`, `cutSelf`, `cutKeyCard`, `cutLocked`, `cutNotInDeck`, `cutBasicLand`;
  - `falseQuote`;
  - `noCitation`;
  - `figureOrScore`, `tooLong`, `malformed`;
  - `keywordClaim` (a keyword credited to a card whose text and keywords lack it) and `noCut` (no cut while the deck holds a card that may be one), both added after the runs below;
  - `jobMismatch`;
  - `tooMany`.
- **Scoring** (blind, per deck, lock 9). Each kept pick is scored on five questions:
  1. Does it name a real interaction with the deck's own cards or plan?
  2. Is every citation valid?
  3. Does it leave out the decks where the card doesn't fit?
  4. Is the cut defensible?
  5. Does it say something the free row doesn't?

## Coverage

The newest passing Overview per deck, re-measured at the start of each run.

| Run | v2 (contracts 11, 12) | Older | None |
| --- | --- | --- | --- |
| Brief, 2026-10-11 | 4 | 8 | 9 |
| Dry run, 2026-10-11 | 20 | 1 | 0 |
| Paid run, 2026-10-12 | 20 | 1 | 0 |

## Candidates and input size (dry run)

Input tokens were counted on the free count-tokens endpoint, structured-output schema included.

| Card | Candidates | Plan sources (v2/older/none) | Per-press tokens | Cached-decks tokens |
| --- | --- | --- | --- | --- |
| Ajani Unrelenting | 11 | 10/1/0 | 35,220 | 63,080 |
| Maddening Cacophony | 10 | 9/1/0 | 31,125 | |
| Maddening Hex | 11 | 10/1/0 | 35,095 | |
| Mind's Eye | 21 | 20/1/0 | 63,285 | 63,369 |
| Molten Collapse | 1 | 1/0/0 | 4,574 | |
| Throes of Chaos | 10 | 9/1/0 | 32,095 | |
| Time Stretch | 10 | 9/1/0 | 31,088 | |
| Tangle Wire | 21 | 20/1/0 | 63,261 | 63,340 |
| Kwia Vigorbloom | 4 | 3/1/0 | 14,352 | |
| Future Sight | 10 | 9/1/0 | 31,107 | |
| Barrowgoyf | 6 | 6/0/0 | 19,104 | |

## Per card, side by side

Kept picks only. A dropped pick is counted under its reason. Names are drawn from the keys; no deck name was sent to
the model.

### Ajani Unrelenting (11 candidate decks)

| Model | Deck | Sentence | Cut |
|---|---|---|---|
| Haiku 5.5 | HD - Goblins | Ajani Unrelenting gives the whole team haste and extra power through its pump ability, so the tokens Krenko, Mob Boss makes attack the turn they arrive. | Wave of Indifference |
| Haiku 5.5 | HD - Kratos | Each loyalty activation of Ajani Unrelenting makes a token that Kratos, God of War punishes at end step if it sits idle, so the table takes damage. | Wrenn's Resolve |
| Haiku 5.5 | HD Tune - Prismari Artistry | Each loyalty activation of Ajani Unrelenting adds a Cadet body, and its team haste lets Ovika, Enigma Goliath attack in the turn it arrives. | Abstract Performance |
| Haiku 5.5 | HD - Gishath | The team pump from Ajani Unrelenting raises the combat damage that Gishath, Sun's Avatar deals to players, so more Dinosaurs drop in from the reveal. | Runic Armasaur |
| Sonnet 5.5 | (none kept; 3 returned, dropped: figureOrScore 3) | | |

### Maddening Cacophony (10 candidate decks)

| Model | Deck | Sentence | Cut |
|---|---|---|---|
| Haiku 5.5 | (none kept; 1 returned, dropped: figureOrScore 1) | | |
| Sonnet 5.5 | HD - Wizards | Maddening Cacophony can empty a library at instant-like pace with kicker, giving Jace, Wielder of Mysteries and Brain Freeze a mill finish that backs up the plan to draw from an empty library with Laboratory Maniac. | Mind Bend |
| Sonnet 5.5 | (also dropped: falseQuote 1) | | |

### Maddening Hex (11 candidate decks)

| Model | Deck | Sentence | Cut |
|---|---|---|---|
| Haiku 5.5 | HD - Kratos | Each noncreature spell an opponent casts makes Maddening Hex burn them, advancing the plan of "burning the table out" alongside Torbran, Thane of Red Fell as another drain source. | Wrenn's Resolve |
| Sonnet 5.5 | HD - Kratos | Torbran, Thane of Red Fell adds extra damage to each roll from Maddening Hex, so every noncreature spell an opponent casts feeds the burn-the-table plan alongside Repercussion. | Embrace the Unknown |
| Sonnet 5.5 | HD Tune - Scrappy Survivors | Maddening Hex is a cheap Aura that triggers Sram, Senior Edificer and Kor Spiritdancer when cast, while pinging opponents as it hops between them. | Inventory Management |

### Mind's Eye (21 candidate decks)

| Model | Deck | Sentence | Cut |
|---|---|---|---|
| Haiku 5.5 | HD - Wizards | Spare mana held on opponents' draw steps lets Mind's Eye draw off each opponent's draw while Counterspell keeps countering, so Baral's counter-looting stays online. | Mind Bend |
| Haiku 5.5 | HD - Yuriko | Holding Counterspell and Negate mana, as Counterspell and Negate do in this deck, leaves spare mana for Mind's Eye to draw on each opponent's draw step. | Flusterstorm |
| Sonnet 5.5 | HD - Wizards | Mind's Eye turns every cantrip and opposing draw into extra cards while Counterspell keeps spells countered, feeding the looting engine on Baral, Chief of Compliance and helping dig toward Laboratory Maniac. | Collective Restraint |
| Sonnet 5.5 | HD - Yuriko | Mind's Eye gives extra cards whenever opponents draw, adding to the card flow from Ninja of the Deep Hours and Satoru Umezawa while Counterspell protects the unblocked ninja attacks. | Blinkmoth Infusion |

### Molten Collapse (1 candidate decks)

| Model | Deck | Sentence | Cut |
|---|---|---|---|
| Haiku 5.5 | (none kept; 0 returned) | | |
| Sonnet 5.5 | (none kept; 0 returned) | | |

### Throes of Chaos (10 candidate decks)

| Model | Deck | Sentence | Cut |
|---|---|---|---|
| Haiku 5.5 | HD - Omnath | Retrace lets Throes of Chaos return from the graveyard by discarding a spare land, fitting the "land-recursion effects keep the land engine running" plan. | Mountain |
| Haiku 5.5 | HD - Gishath | Cascade on Throes of Chaos casts a cheaper spell for free, supporting the plan to "land big trampling Dinosaurs" while spare lands fuel retrace. | Forest |
| Sonnet 5.5 | HD - Avatar Aang | Cascade off Throes of Chaos can hit a cheap Lesson such as Airbending Lesson for free, and retrace turns spare lands into repeat casts that feed Avatar Aang // Aang, Master of Elements with more bending triggers. | Crashing Wave |
| Sonnet 5.5 | (also dropped: figureOrScore 1) | | |

### Time Stretch (10 candidate decks)

| Model | Deck | Sentence | Cut |
|---|---|---|---|
| Haiku 5.5 | HD - Yuriko | Backup plan chains extra turns: Time Stretch adds two more turns beside Temporal Manipulation and Time Warp, letting Yuriko's unblocked ninjas attack again after each hit. | Commandeer |
| Sonnet 5.5 | HD - Yuriko | Time Stretch fits the written backup to "chain extra turns with Temporal Manipulation and Time Warp to attack again", giving Yuriko, the Tiger's Shadow and the ninjas two more attack steps beside Temporal Manipulation. | Shadow of Mortality |

### Tangle Wire (21 candidate decks)

| Model | Deck | Sentence | Cut |
|---|---|---|---|
| Haiku 5.5 | HD - Kratos | Each upkeep Tangle Wire forces the player to tap a permanent, so creatures kept tapped cannot attack and Kratos, God of War damages their controller for not attacking. | Abrade |
| Sonnet 5.5 | HD - Kratos | Tangle Wire taps down opposing creatures at upkeep, so with Kratos, God of War haste for all and idle creatures hurting their controllers, tapped ones still deal damage while Ensnaring Bridge style stax holds the table. | Bolt Bend |
| Sonnet 5.5 | HD - Wizards | Tangle Wire taps lands on each upkeep, letting Baral, Chief of Compliance and counterspells like Counterspell win the mana game while opponents cannot untap into their own answers. | Mind Bend |
| Sonnet 5.5 | HD - Goblins | Tangle Wire slows opposing blockers and mana each upkeep, so Krenko, Mob Boss can double the Goblin count and swing wide while Sulfuric Vortex adds pressure. | Wave of Indifference |

### Kwia Vigorbloom (4 candidate decks)

| Model | Deck | Sentence | Cut |
|---|---|---|---|
| Haiku 5.5 | HD Tune - Scrappy Survivors | The plan to "pile Auras and Equipment onto one creature" suits Kwia Vigorbloom: its lifelink gains life on attack, making a Lotus to fund more Auras. | Forest |
| Haiku 5.5 | (also dropped: noCitation 1) | | |
| Sonnet 5.5 | HD - Omnath | Kwia Vigorbloom turns the life from Omnath, Locus of Creation landfall into Lotus tokens for three mana, and Tatyova, Benthic Druid and Courser of Kruphix give more life triggers to feed a land-heavy engine. | Wastes |
| Sonnet 5.5 | (also dropped: noCitation 1) | | |

### Future Sight (10 candidate decks)

| Model | Deck | Sentence | Cut |
|---|---|---|---|
| Haiku 5.5 | (none kept; 0 returned) | | |
| Sonnet 5.5 | (none kept; 3 returned, dropped: jobMismatch 3) | | |

### Barrowgoyf (6 candidate decks)

| Model | Deck | Sentence | Cut |
|---|---|---|---|
| Haiku 5.5 | HD Tune - Sultai Arisen | Barrowgoyf mills on combat damage and can return a creature from those cards, feeding the plan to "spends the graveyard as a second hand" alongside Teval, the Balanced Scale's graveyard recursion. | Wonder |
| Haiku 5.5 | (also dropped: figureOrScore 1) | | |
| Sonnet 5.5 | HD Tune - Sultai Arisen | Barrowgoyf grows from a stocked graveyard, and its combat mill trigger refills the yard so Teval, the Balanced Scale keeps making Zombies as cards leave it and it digs up a creature. | Wonder |
| Sonnet 5.5 | (also dropped: figureOrScore 1) | | |


## Cost, latency and yield per press

| Arm | Cost per press: mean (min to max) | Latency p50 / max | Returned | Kept |
| --- | --- | --- | --- | --- |
| Haiku 5.5, per-press (cold) | $0.0040 ($0.0007 to $0.0071) | 7.8 s / 17.6 s | 16 | 13 |
| Sonnet 5.5, per-press (cold) | $0.0686 ($0.0092 to $0.1305) | 3.0 s / 6.9 s | 22 | 12 |
| Sonnet 5.5, cached decks: first press (cache write) | $0.1620 | 4.1 s | 4 | 4 |
| Sonnet 5.5, cached decks: warm press (cache read) | $0.018 to $0.027 | 3.5 to 10.8 s | 6 | 3 |

- **Per-press layout.** Haiku's cost per press is about 1/17 of Sonnet's. No cache is involved: only the 1.5K
  rules would cache, so warm and cold presses cost the same.
- **Cached-decks layout.** Every deck goes into a cached prefix of about 62K tokens. The prefix lives five minutes,
  so a press is warm only if another press came within that window. The first press writes the cache and costs more
  than a per-press call.
- **Why Haiku is slower.** It has more thinking at effort medium; Sonnet answered faster on every card.

## Validator drops

| Arm | Drops by reason |
| --- | --- |
| Haiku | figureOrScore 2, noCitation 1 |
| Sonnet | figureOrScore 5, jobMismatch 3, falseQuote 1, noCitation 1 |
| Sonnet, warm | cardOutsideDeck 3 |

- **Sonnet's `figureOrScore` drops (all three Ajani picks, plus one each on Throes of Chaos and Barrowgoyf).** The Ajani lines write rules notation with digits ("+1/+1"). The
  rule is the brief's (no figures in the line), so they are dropped. The rerun's prompt says this plainly.
- **`jobMismatch` (all of Sonnet's Future Sight picks).** Each cites a job the card's labels do not carry.
- **`cardOutsideDeck` (all three of Tangle Wire's picks, cached layout).** With every deck in the prompt, the model
  named cards from another deck. The validator caught every one, but this is a real cost of the cached layout.

## Stale Overviews

The check: a picked deck counts as stale when its Overview names a **Key card** the deck no longer runs, with the
commanders counted as run.

The first runs used every card the Overview's prose names (`content.cards`), threats and weaknesses included, and
left out the commanders. They reported most picks stale (13 of 14 on the first Haiku run, 10 of 12 on Sonnet, 11 of 13 on Haiku). Every name flagged under that rule was the deck's own
commander, or a card the prose names as a threat. Corrected and recounted from the stored answers: **0 of 12
Sonnet picks and 0 of 13 Haiku picks** land on a deck whose Overview names a Key card it no longer runs.
`fits-read-load.ts` now applies the corrected rule.

## Blind scores (lock 9)

Every line a reader would see (the kept lines, 39 across three arms) was put on one sheet with its arm hidden and
the lines shuffled per card, with the rules text of every card named, and scored by a separate agent that never saw
which model wrote which line. The key (`blind/fits-read-key.json`, L01 to L39 to arm) is committed with the scores: the
three-card section above already shows each arm's lines verbatim, so it spoils nothing Hugh would score. Five questions per line (the brief's lock 9): does it name a real interaction with the
deck's own cards or plan, are its citations right, does the card fit the deck, is the cut defensible, and does it say
something the free row does not. The sheet, the scores and the key are in `blind/`.

| Arm | Lines | Interaction real / partial / wrong | Citations ok | Fits | Cut defensible / poor | Adds over the free row |
| --- | --- | --- | --- | --- | --- | --- |
| Sonnet | 12 | 7 / 2 / 3 | 10 | 12 | 9 / 3 | 11 |
| Haiku | 13 | 5 / 7 / 1 | 12 | 13 | 10 / 3 | 12 |
| Haiku rerun (version 2) | 14 | 8 / 6 / 0 | 12 | 14 | 13 / 1 | 14 |

- **Wrong lines.** Sonnet's three: Cacophony for a self-mill win (it mills opponents), Mind's Eye on its own
  cantrips (it triggers on opponents' draws), and the garbled Tangle Wire and Kratos line. Haiku's one is the Kratos
  and Ajani line. The rerun has none.
- **Poor cuts.** Every basic land cut scored poor, which the validator now refuses. The rerun's one poor cut is Ashaya
  on Omnath, a land-engine piece. Two of Sonnet's are Yuriko reveal payoffs (Blinkmoth Infusion, Shadow of Mortality).
- **Partial** is mostly a true but thin link (the scorer's notes are in the scores file). It is the rerun's largest
  bucket, and the place a later prompt round would aim.
- Sonnet's ten dropped lines are not scored: no reader sees them. Its kept share (12 of 22) is the other half of its
  cost.

## The niche cards (lock 9's other eight, Haiku only)

The brief's eight niche cards (Finding 2: owned, in no deck, few index rows) complete lock 9's corpus. Sonnet was not
run on them: both arms would have passed the $2 cap, and the orchestrator chose Haiku alone (2026-10-12, $0.033; the
ledger stands at $1.88). The answers are `answers/fits-read-2026-10-12-06-18-13-haiku.json`, the version 2 prompt.

- **Yield.** 12 lines returned, 11 kept (one `noCitation`), 0 stale. **Mind Swords returned no deck**: an honest no fit
  over 7 candidates, which is the answer the read should give when nothing fits.
- **Blind scores** (same five questions, `blind/fits-read-niche-*`): interaction real / partial / wrong 5 / 5 / 1;
  citations ok 10; fits 9 of 11; cut defensible / poor 8 / 3; adds over the free row 11 of 11.

These are weaker than Hugh's eleven: the niche cards are niche because few decks want them, and the model reaches.

| Card | Deck | The read's line, verbatim | Cut | Scored |
| --- | --- | --- | --- | --- |
| Kavaron Skywarden | HD - Goblins | Sacrifice outlets like Goblin Sledder make nonland permanents leave the battlefield during the turn, which turns on Kavaron Skywarden's end step counter trigger alongside the Goblin token army. | Bloodlust Inciter | real |
| Goldfury Strider | HD -Thorin | Goldfury Strider's trample matches Thorin Oakenshield, and as an artifact creature it helps the story: "artifacts, legendaries and Sagas turn on the enduring story". | Dwarven Mauler | partial: the trample match adds nothing |
| Goldfury Strider | HD Tune - Counter Intelligence | Goldfury Strider is an artifact creature whose pump taps artifacts and creatures, so it fits the plan: "Counters pile onto creatures and artifacts" as Kilo proliferates. | Coretapper | partial, poor cut: it uses no counters |
| Lavamancer's Skill | HD Tune - Scrappy Survivors | As an Aura that dresses a creature, Lavamancer's Skill feeds the plan: "Attack with the dressed creature so Dogmeat, Ever Loyal makes Junk tokens for extra cards." | Acquired Mutation | partial, poor cut |
| Lavamancer's Skill | HD - Gods | Enchanting Flux Channeler, a Wizard, gives it a repeatable two-damage ping, so "Proliferate and All Will Be One turn counters into damage." gains a direct damage outlet. | Aggravated Assault | partial |
| Cephalid Sage | HD Tune - Sultai Arisen | With Teval, the Balanced Scale milling on each attack and Forbidden Alchemy stocking the graveyard, Cephalid Sage reaches threshold and draws three then discards two as a looter. | Arcane Signet | real, poor cut |
| Cephalid Sage | HD Tune - Mutant Menace | Milling from Court of Cunning and Ruin Crab keeps the graveyard past threshold, so Cephalid Sage draws three and discards two each time it enters. | Wishclaw Talisman | **wrong**: Ruin Crab mills opponents |
| Daru Stinger | HD - Soldiers | As a cheap Soldier, Daru Stinger enters bigger off Soldiers revealed like Daru Warchief, then its tap ability removes attackers and blockers that stall the swarm. | Chieftain en-Dal | real |
| Cryotheory Adept | HD - Wizards | Prowess on Cryotheory Adept grows from every counter like Counterspell, advancing the plan of Mono-blue Wizards that counter spells and dig with cheap instants. | Collective Restraint | real |
| Airtight Alibi | HD Tune - Scrappy Survivors | Flash lets Airtight Alibi join the pile of Auras and Equipment onto one creature mid-combat, and its hexproof untap keeps the dressed attacker safe, as the plan's pile-and-attack line requires alongside Uril, the Miststalker. | Wild Growth | real |
| Airtight Alibi | HD - Elves | Flash lets Airtight Alibi land on the biggest Elf mid-combat, giving it hexproof through the attack, which matches the plan's backed by pump and works like Blanchwood Armor with extra protection. | Accelerated Mutation | partial: no tie to the Elves deck |

## Accuracy notes (read by hand, against the cards' rules text)

- **Haiku**
  - **Kratos and Ajani, wrong.** It says Kratos "punishes" idle tokens so "the table takes damage". Kratos damages
    each player for their own creatures that did not attack, so idle tokens hurt their own controller.
  - **Basic lands as cuts, three times.** Mountain (Omnath) and Forest (Gishath, and Kwia on Scrappy Survivors) are a
    poor cut: they change the mana. The validator now refuses them (`cutBasicLand`), and the rerun cut none.
  - **Right:** the Wizards and Mind's Eye line (it draws on opponents' draws while holding counter mana), Time
    Stretch on Yuriko, Barrowgoyf on Sultai, Throes of Chaos retrace on Omnath.
- **Sonnet**
  - **Mind's Eye, wrong.** "Turns every cantrip … into extra cards". Mind's Eye triggers only on opponents' draws.
  - **Tangle Wire and Kratos, muddled.** "Tapped ones still deal damage" is not what either card does.
  - **Kwia, a basic land cut.** Wastes, on Omnath.
  - **Right:** Maddening Hex on Kratos (Torbran) and on Scrappy Survivors (Aura triggers), Throes of Chaos and Aang
    (cascade into Lessons), Time Stretch on Yuriko, Barrowgoyf on Sultai.
- **Both**
  - Each model made about two clear rules errors in 12 to 13 kept lines.
  - Neither model invented a deck card: the validator caught every attempt.
  - Both returned nothing for Molten Collapse (one candidate) and for Future Sight, after Sonnet's drops. That is
    an honest no-fit.

## Recommendation

**Haiku 5.5, per-press layout, at effort medium.** It costs $0.004 a press against Sonnet's $0.07 (up to $0.13 for
a colorless card with 21 candidates). Scored blind, its rerun wrote no wrong line (Sonnet wrote three) and
the more defensible cuts. It kept more of its lines (13 of 16 against 12 of 22), and its 3 to 18 s (p50 7.8 s) fits behind a "Reading…" state. Sonnet's speed is the
only edge it has, and the cached layout that would make it cheap brings its own failure (cards from other decks).

**The single rerun** (approved, run on Haiku for $0.045):
1. A basic land as the cut is refused in the validator (`cutBasicLand`), and the prompt says so.
2. The no-figures rule names the rules notation ("+1/+1" is not allowed; write "a counter").

Result: 14 of 14 lines kept, no drops, no basic land cut (the first run cut a Mountain for Omnath and a Forest for
Gishath). The three-card section at the top quotes it.
