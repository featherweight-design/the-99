# Evidence benchmarks (priority 4c)

Design brief, 2026-10-10. Asks for a Design round on a new block in the Analysis tab. No handoff
exists for it today.

## The ask

Hugh, 2026-10-09 (priority 4c on `boards/priorities.md`): deterministic, model-free graded
benchmarks, each with a card ledger showing which cards earned the grade, built from card labels
and Deck stats math. Five benchmarks (the fourth, since Hugh's 2026-10-10 ruling, is a list of
risks rather than a grade):

1. **Mana velocity**
2. **Card flow**
3. **Interaction speed and cost.** Counterspells count here, and not as removal (Hugh,
   2026-10-10: removal destroys or exiles a card already on the battlefield; a counterspell is
   interaction).
4. **Dependencies** (Hugh, 2026-10-10; it replaces "Graveyard dependence"): each dependency the
   deck has, how strong it is, and the hate that breaks it. A risk, never a score.
5. **Win speed**

The idea comes from the Deckcheck comparison corpus (`boards/deckcheck-corpus-2026-10-09.md`):
Deckcheck heads every deck with a DTI score built from "velocity", "suppression" and a threat
onset turn, and several of the corpus's misses were exactly these figures ("no cheap instant-speed
interaction" on Gishath, "no card draw" on Goblins). Its own mapping, from "For the Overview
accuracy plan": velocity is mana plus card flow, suppression is interaction density and speed, and
threat onset is the combo or win turn.

**No model calls, ever.** Everything here is computed from stored data: the decklist, `cards`,
`card_labels`, and the Spellbook index. A grade costs nothing to draw and nothing to recompute.

## What a benchmark is, and what it is not

- **A benchmark is a judgment.** It grades the deck on one axis, or for Dependencies names the
  risks it carries, and shows the cards behind it. That is why it lives in Analysis: the Deck stats ruling of 2026-10-03 (ruling 2 of
  `2026-10-03-deck-stats.md`) keeps judgment in Analysis and facts in Stats.
- **It is not a second Jobs card.** The Stats Jobs card already counts ramp, draw, removal,
  wipes, protection and win conditions and lists each row's names. A benchmark never shows that
  count as its headline. It weighs cards (a one-mana instant answer is worth more than a
  seven-mana sorcery one), combines inputs the Stats cards keep apart (land count, curve, ramp
  timing), and reads jobs no Stats card reads (counterspells, recursion, self-mill, tutors,
  combos).
- **It is not "Against the average".** That Stats card sets the deck's counts against this
  commander's average deck. A benchmark is graded on one format-wide scale, so two decks with
  different commanders can be read against each other by eye.
- **It is not a finding.** "What is in this deck" holds the five bracket findings (game changers,
  mass land denial, extra turns, two-card infinites, tutors), each a count with a receipt. Those
  feed the bracket; benchmarks never do, and nothing here changes a bracket verdict.

## Measured on staging: which benchmarks discriminate

Read-only, on staging (`br-polished-pond-a6e63y0b`, branch asserted inside a read-only
transaction), over every deck `user_3GkZrrTwOJBdqUpq6GambP0BC8w` owns: 21 decks. Labels are the
FRESH ones (`freshLabels`, the app's own filter); combos are `anySizeComboQuery`'s rule (2 to 6
pieces, template-free, infinite or game-ending, every piece held, a must-be-commander piece only
from the command zone). The scratch scripts were never committed. These are the draft definitions
the figures were taken with; section "What eng locks" says which parts are fixed.

| Deck | Lands | Avg MV | Velocity pts | Velocity index | Flow pts | Interaction cards | weighted | cheap instant | counterspells (of all interaction) | Graveyard share (Dependencies counts these cards, not the share) | Combos | Combo by T8 | Unlabeled (eng only) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HD - Avatar Aang | 36 | 2.7 | 8.25 | 4.0 | 22 | 7 | 17 | 3 | 1 | 5% | 2 | 18% | 1 |
| HD - Brago | 35 | 3.61 | 6 | 2.35 | 16 | 17 | 23 | 2 | 2 | 8% | 12 | 42% | 2 |
| HD - Eldrazi | 38 | 4.74 | 9 | 2.47 | 15 | 21 | 28 | 2 | 3 | 10% | 1 | 5% | 2 |
| HD - Elves | 29 | 2.53 | 15.5 | 6.94 | 7 | 8 | 10 | 0 | 0 | 7% | 0 | none | 3 |
| HD - Gishath | 36 | 4.29 | 9.75 | 2.87 | 15 | 18 | 23 | 0 | 0 | 3% | 4 | 28% | 0 |
| HD - Goblins | 34 | 2.18 | 4.25 | 3.05 | 1 | 28 | 56 | 9 | 1 | 6% | 2 | 8% | 2 |
| HD - Gods | 37 | 3.26 | 7.25 | 3.02 | 26 | 9 | 17 | 3 | 2 | 11% | 0 | none | 1 |
| HD - Kratos | 35 | 3.25 | 7.25 | 2.99 | 6 | 12 | 23 | 4 | 1 | 3% | 3 | 5% | 6 |
| HD - Omnath | 38 | 3.7 | 17.75 | 5.52 | 26 | 6 | 10 | 2 | 1 | 6% | 9 | 8% | 2 |
| HD - Soldiers | 35 | 2.69 | 5.5 | 2.97 | 5 | 12 | 23 | 5 | 1 | 9% | 0 | none | 8 |
| HD - Tovolar | 34 | 2.88 | 12 | 5.01 | 11 | 10 | 18 | 2 | 0 | 9% | 0 | none | 3 |
| HD - Wizards | 35 | 2.53 | 5.75 | 3.25 | 33 | 23 | 50 | 10 | 18 | 5% | 2 | 14% | 2 |
| HD - Yuriko | 26 | 2.99 | 6.5 | 2.79 | 25 | 18 | 45 | 11 | 12 | 11% | 0 | none | 4 |
| HD - Zombies | 34 | 2.55 | 4.25 | 2.61 | 13 | 8 | 17 | 3 | 0 | 17% | 0 | none | 5 |
| HD -Thorin | 35 | 2.8 | 10 | 4.46 | 13 | 15 | 30 | 5 | 1 | 2% | 0 | none | 3 |
| HD Tune - Blood Rites | 37 | 2.98 | 7 | 3.22 | 18 | 11 | 18 | 1 | 0 | 13% | 1 | 2% | 0 |
| HD Tune - Counter Intelligence | 38 | 2.77 | 9.5 | 4.4 | 16 | 12 | 26 | 5 | 3 | 2% | 17 | 29% | 3 |
| HD Tune - Mutant Menace | 37 | 2.73 | 10.5 | 4.81 | 13 | 10 | 25 | 6 | 5 | 13% | 1 | 15% | 2 |
| HD Tune - Prismari Artistry | 38 | 4.03 | 5.5 | 2.03 | 18 | 10 | 21 | 3 | 1 | 15% | 0 | none | 0 |
| HD Tune - Scrappy Survivors | 35 | 2.97 | 6.5 | 3.02 | 20 | 6 | 7 | 0 | 0 | 20% (commander) | 0 | none | 1 |
| HD Tune - Sultai Arisen | 40 | 3.29 | 9 | 3.6 | 13 | 8 | 15 | 2 | 1 | 50% (commander) | 0 | none | 1 |

The draft definitions behind each column:

- **Velocity pts:** each nonland card with a ramp job, excluding `costReduction`, scores 1 at mana
  value 2 or less and 0.5 at mana value 3 (nothing above), halved when its only ramp is
  `burstMana`. **Velocity index:** (lands × 7 / 99 + velocity pts) / average nonland mana value.
- **Flow pts:** each card with a draw job whose `affects` is not `opponents`, 2 when any such job
  is `repeatable` and 1 when it is `oneShot`, doubled again for a commander.
- **Interaction:** each card with a `removal`, `wipes` or `counterspell` job. Weighted is 1, plus
  1 for instant speed (an instant, or flash), plus 1 for mana value 2 or less. Cheap instant is
  both. Counterspells counts the cards with a `counterspell` job among ALL interaction cards, not
  among the cheap instant ones. Commanders included.
- **Graveyard share:** cards with a `recursion` job, a self or each-player `mill` job, a
  `cardsInGraveyard` threshold, or a graveyard keyword (flashback, escape, delve, unearth,
  disturb, retrace, embalm, eternalize, jump-start, aftermath, threshold, dredge, scavenge,
  encore, craft), among nonland cards plus commanders, over nonland cards plus commanders. Lands
  are on neither side.
- **Combo by T8:** the chance at least one assembled combo has every non-commander piece among
  the first 14 cards (seven, then a draw a turn through turn 8 on the play), each tutor seen
  standing in for one missing piece. Mana is not checked in this figure.

**What the table says, benchmark by benchmark:**

1. **Mana velocity discriminates.** The index runs 2.03 to 6.94 (median 3.05). Elves 6.94,
   Omnath 5.52 and Tovolar 5.01 lead; Prismari Artistry 2.03, Brago 2.35 and Eldrazi 2.47 trail.
   Raw ramp counts would not show that: Eldrazi carries 19 ramp cards and still trails, because
   its average nonland mana value is 4.74.
2. **Card flow discriminates the most.** 1 to 33 (median 15). Goblins scores 1 (its only card
   with a draw job is Mind Stone), which is Deckcheck's "no card draw" finding read off our own
   data. Wizards 33, Gods and Omnath 26.
3. **Interaction discriminates, and its cheap-instant figure is the sharpest single number in the
   table.** Weighted 7 to 56. Cheap instant 0 to 11: Gishath has 18 interaction cards and 0 of
   them are cheap and instant, which is Deckcheck's "no cheap instant-speed interaction" finding
   exactly. Ten of Yuriko's 11 cheap instant answers are counterspells (Counterspell, Flusterstorm,
   Swan Song, Mental Misstep and others; the eleventh is Tyrant's Scorn), so **counting counterspells here is load-bearing**:
   without them Yuriko and Wizards would read as nearly defenseless.
4. **Graveyard alone flags too few decks, which is why it became Dependencies.** 15 of 21 decks
   sit at 11% or under, then Blood Rites and Mutant Menace 13%, Prismari 15%, Zombies 17%, Scrappy
   Survivors 20% and Sultai Arisen 50%. The two at the top are also the only two whose commander
   reads the graveyard (Dogmeat, Teval). The next section measures the other rows.
5. **Win speed discriminates only where a combo exists.** 11 of 21 decks assemble at least one
   counted combo; the chance one is assembled by turn 8 runs 2% (Blood Rites) to 42% (Brago),
   with Counter Intelligence 29% and Gishath 28%. The other 10 decks have no combo line, and for
   those nothing model-free in this round gives a turn: a combat deck's threat onset needs a
   goldfish, which is evidence phase 3 (`priorities.md`, FUTURE, Hugh 2026-10-09). A turn-count
   model that ignored drawing the pieces put every combo deck at turn 3 to 5 and was dropped as
   meaningless.

## Dependencies: one benchmark, a row per dependency

Hugh, 2026-10-10: "Graveyard dependence" becomes a general **Dependencies** benchmark. It lists
each dependency the deck has, how strong it is, and the hate that breaks it, with the graveyard
as one row. Most decks gain nothing from a graveyard-only figure: on staging, 14 of 21 decks
carry fewer than 8 graveyard cards.

**It is a risk, never a score.** A row says what an opponent's card can take away. More rows, or
a heavier row, is never better or worse as a grade, and nothing on the surface invites the
reader to raise or lower it.

Seven candidate rows were measured on the same staging data as the table above (21 decks,
fresh labels, read-only). Each count is copies among the nonland 99, plus the commanders where
the column says so:

- **Graveyard** (hate: Rest in Peace, Bojuka Bog, Dauthi Voidwalker). The graveyard rule above:
  a `recursion` job, a self or each-player `mill` job, a `cardsInGraveyard` threshold, or a
  graveyard keyword. Commanders included.
- **Artifacts** (hate: artifact wipes such as Vandalblast, Null Rod, Collector Ouphe). Three
  figures: artifact cards (front-face type), artifact PAYOFFS (oracle text naming "artifacts you
  control", "for each artifact", "whenever an artifact", "artifact spells", or "number of
  artifacts"; an `artifacts` threshold; or affinity, improvise or metalcraft), and artifacts with
  a job whose trigger is `activated`, which is exactly what Null Rod and Collector Ouphe stop.
- **Enchantments** (hate: enchantment wipes such as Back to Nature, Farewell). Enchantment cards,
  and enchantment payoffs by the same oracle-text pattern (enchantments you control, constellation,
  enchantment spells, aura spells).
- **Creatures** (hate: creature board wipes). Creature cards, and creature PAYOFFS: a repeatable
  `tribal` or `pump` job not restricted to the card itself, or a repeatable `tokens` job.
- **Activated abilities** (hate: Cursed Totem). Creatures with a job whose trigger is
  `activated` (mana dorks, Krenko, Elvish Archdruid), commanders included.
- **Combat-only win path** (hate: fogs, Propaganda, Ghostly Prison). The routes that win without
  combat: a repeatable `drain`, `poison` or opponent `mill` job, "you win the game" or "loses the
  game" in oracle text, and assembled combos (the win-speed set). Repeatable only: a one-shot
  Lightning Bolt is reach, not a route.
- **The commander** (hate: repeated commander removal). The commander's repeatable jobs, cards in
  the 99 whose text names a commander, and assembled combos that use it.

| Deck | Graveyard | Artifacts / payoffs / activated | Enchantments / payoffs | Creatures / payoffs | Creatures with activated abilities | Other win routes / combos | Commander: repeatable jobs / 99 cards naming it / combos with it |
|---|---|---|---|---|---|---|---|
| HD - Avatar Aang | 3 | 6 / 0 / 2 | 9 / 0 | 22 / 6 | 4 | 0 / 2 | 3 / 1 / 2 |
| HD - Brago | 5 | 14 / 1 / 6 | 5 / 0 | 30 / 1 | 3 | 1 / 12 | 2 / 2 / 2 |
| HD - Eldrazi | 6 | 38 / 3 / 20 | 1 / 0 | 23 / 10 | 7 | 1 / 1 | 1 / 0 / 0 |
| HD - Elves | 5 | 5 / 0 / 1 | 9 / 0 | 42 / 20 | 23 (commander) | 0 / 0 | 3 / 0 / 0 |
| HD - Gishath | 2 | 7 / 0 / 5 | 8 / 0 | 37 / 18 | 8 | 2 / 4 | 2 / 3 / 0 |
| HD - Goblins | 4 | 3 / 1 / 3 | 7 / 0 | 30 / 18 | 21 (commander) | 9 / 2 | 2 / 1 / 2 |
| HD - Gods | 7 | 9 / 0 / 6 | 18 / 1 | 26 / 4 | 7 (commander) | 8 / 0 | 4 / 5 / 0 |
| HD - Kratos | 2 | 16 / 0 / 5 | 9 / 0 | 22 / 9 | 3 | 14 / 3 | 2 / 3 / 0 |
| HD - Omnath | 4 | 2 / 0 / 1 | 6 / 0 | 43 / 15 | 8 | 6 / 9 | 4 / 1 / 0 |
| HD - Soldiers | 6 | 7 / 0 / 6 | 7 / 0 | 36 / 18 | 8 | 0 / 0 | 2 / 1 / 0 |
| HD - Tovolar | 6 | 5 / 0 / 4 | 7 / 0 | 34 / 15 | 11 | 3 / 0 | 2 / 1 / 0 |
| HD - Wizards | 3 | 7 / 2 / 6 | 7 / 0 | 21 / 5 | 9 | 4 / 2 | 3 / 1 / 0 |
| HD - Yuriko | 8 | 7 / 1 / 6 | 1 / 0 | 30 / 10 | 6 | 3 / 0 | 3 / 1 / 0 |
| HD - Zombies | 11 | 9 / 0 / 6 | 6 / 0 | 33 / 22 | 16 (commander) | 6 / 0 | 2 / 1 / 0 |
| HD -Thorin | 1 | 20 / 2 / 4 | 5 / 0 | 30 / 25 | 5 | 2 / 0 | 2 / 1 / 0 |
| HD Tune - Blood Rites | 8 | 10 / 0 / 6 | 5 / 0 | 33 / 17 | 8 | 7 / 1 | 4 / 2 / 0 |
| HD Tune - Counter Intelligence | 1 | 37 / 15 / 21 | 3 / 0 | 20 / 6 | 9 | 3 / 17 | 1 / 2 / 5 |
| HD Tune - Mutant Menace | 8 | 10 / 0 / 6 | 9 / 0 | 28 / 3 | 8 | 11 / 1 | 2 / 1 / 0 |
| HD Tune - Prismari Artistry | 9 | 5 / 1 / 3 | 0 / 0 | 24 / 12 | 4 | 2 / 0 | 4 / 3 / 0 |
| HD Tune - Scrappy Survivors | 13 (commander) | 12 / 2 / 5 | 26 / 9 | 20 / 17 | 2 | 0 / 0 | 2 / 2 / 0 |
| HD Tune - Sultai Arisen | 30 (commander) | 4 / 0 / 3 | 4 / 0 | 31 / 5 | 11 | 5 / 0 | 4 / 2 / 0 |

**Six rows discriminate, and the commander row does not.**

| Row | Spread on staging | Shows on (draft cut) |
|---|---|---|
| Graveyard | 1 to 30 cards; two with the commander | 7 decks; heavy on Sultai Arisen (30, Teval) and Scrappy Survivors (13, Dogmeat) |
| Artifacts | 2 to 38 artifacts, 0 to 15 payoffs, 1 to 21 activated | 4 decks; heavy on Counter Intelligence (37, 15 payoffs) and Eldrazi (38) |
| Enchantments | 0 to 26 enchantments, 0 to 9 payoffs | 2 decks; heavy on Scrappy Survivors (26, 9 payoffs), light on Gods (18) |
| Creatures | 1 to 25 payoffs | 10 decks; heavy on Thorin (25), Zombies (22), Elves (20) |
| Activated abilities | 2 to 23 creatures | 4 decks, each with an activated commander; heavy on Elves (23), Goblins (21), Zombies (16) |
| Combat-only | 0 to 14 other routes, 0 to 17 combos | 5 decks; no other route at all on Elves, Soldiers, Scrappy Survivors |

The commander row is dropped. Every commander reads as an engine (1 to 4 repeatable jobs, median
2), the 99's cards that name a commander are mostly incidental (0 to 5, and Gods' 5 include
Arcane Signet and Jeska's Will), and combos using the commander exist on 4 decks. Nothing
model-free separates a deck BUILT AROUND its commander from one merely LED by it. Commander
dependence stays where it already is: the Overview's assessment rates it every time (Overview
plan 3.1 and 11.2).

The draft cut that produced the last column, to be re-derived by the plan like every other
constant: graveyard 8 or more, or the commander (heavy at 13 or the commander); artifacts 3
payoffs or 15 artifacts (heavy at 10 payoffs or 30); enchantments 3 payoffs or 15 (heavy at 8 or
25); creatures 15 payoffs (heavy at 20); activated 12 or the commander (heavy at 15); combat-only
when the deck has no combo and at most 2 other routes (heavy at 0). Under it, every row a deck
draws, per deck:

- **None:** Avatar Aang, Brago, Wizards. Three decks draw no row at all, which is a state.
- **One:** Eldrazi (artifacts heavy), Gishath (creatures), Kratos (artifacts), Omnath
  (creatures), Tovolar (creatures), Yuriko (graveyard), Counter Intelligence (artifacts heavy),
  Mutant Menace (graveyard), Sultai Arisen (graveyard heavy).
- **Two:** Goblins (creatures, activated heavy), Gods (enchantments, activated), Soldiers
  (creatures, combat-only heavy), Blood Rites (graveyard, creatures), Prismari Artistry
  (graveyard, combat-only).
- **Three:** Elves (creatures heavy, activated heavy, combat-only heavy), Zombies (graveyard,
  creatures heavy, activated heavy), Thorin (artifacts, creatures heavy, combat-only).
- **Four:** Scrappy Survivors (graveyard heavy, enchantments heavy, creatures, combat-only heavy).

## What eng locks (decided; override if you disagree)

1. **Placement is the Analysis tab, inside the reading.** Not Deck stats (grades are judgment),
   not a new tab (the deck page is already tab-heavy; Deck stats ruling 6). Where in the tab is
   Design's.
2. **Benchmarks belong to the reading.** They are computed from the list the reading was taken
   from (`DeckProfile.cards`), drawn with the verdict, stale with it under the existing banner,
   and refreshed by Re-analyze. Before a first Analyze the tab draws its empty state exactly as
   today, with no benchmarks. One staleness story per tab: a live grade beside a stale verdict
   would read as part of the old reading. The bracket reading is itself free, so this asks a
   press of the reader and no credit.
3. **Three graded benchmarks, one risk list and one conditional.** Velocity, card flow and
   interaction always grade. Dependencies lists rows and never grades. **Win speed grades only when the deck assembles a counted
   combo**, and otherwise draws a stated "no combo line" state, never a grade and never a guess.
   A combat threat-onset turn waits for phase 3.
4. **Five ordered steps per graded benchmark, on one format-wide scale.** Dependencies is not
   graded; its rows have two strengths, light and heavy, cut on the same format-wide basis. The cut points are
   fixed constants, derived once from the commander index (the benchmark computed on each
   commander's average deck from `commander_support_cards`), with the derivation printed by a
   measure script as `db:build:staples` prints its own. Never from Hugh's 21 decks, which are too
   few, and never per commander, which is "Against the average"'s job.
5. **Dependencies is a risk, never a score.** Six rows: graveyard, artifacts, enchantments,
   creatures, activated abilities and combat-only win path, each computed as in the section
   above. A row is drawn only when the deck reaches its light cut; a deck below every cut draws
   the stated "no dependencies" state (three decks on staging). Each row names the hate that
   breaks it, as a fixed list per row in code, never generated. No total, no count of rows as a
   figure, and no row is "better" heavy or light. The commander row is not built (measured: it
   does not discriminate); commander dependence stays in the Overview's assessment.
6. **Every grade and every Dependencies row has a ledger, and every ledger line is a card.** A line carries the card, what
   it contributed, and why (for interaction: "instant, 1 mana"; for velocity: "ramp, 2 mana";
   for win speed: the combo, its pieces and what it produces, plus the tutors that can find a
   piece). A ledger simply lists its cards.
   **Players never see the word "label"** (Hugh, 2026-10-10). A card with no fresh label (0 to 8
   per deck on staging) is read from its rules text, silently, the way the fill already falls
   back to the classifier: the text reader's roles (ramp, draw, removal, wipes) and the oracle-text
   rules above. A job the text reader cannot see (a theme job such as `tribal` or `drain`) is
   simply not counted for that card. The text reader gives roles only, so the fallback fixes the
   missing fields: a text-read draw card scores as `oneShot` and `self` (1 flow point); a
   text-read ramp card scores by mana value alone, as if it were not `costReduction` or
   `burstMana`; and "counter target" text reads as a counterspell, never as removal, whatever
   `classifyRoles` does with it for its own callers (it keeps counterspells in removal on
   purpose, `src/lib/recs/roles.ts`). No surface says a card was unlabeled, and there is no
   unlabeled or partial state to draw.
7. **One reader per figure, shared.** The interaction reading replaces the Overview fact's
   `interactionCounts` (`src/lib/synopsis/facts-extra.ts`), which counts by the text classifier,
   so the Overview prompt and the benchmark can never disagree. The win-speed combo set is
   `anySizeComboQuery`'s rule, the one the Overview facts already use. `expectedCastTurn` stays
   the one cast-turn model; whether velocity's ledger shows the commander's expected turn is
   Design's call.
8. **Deterministic to the card.** The same list and the same labels always give the same grade.
   The combo odds are computed exactly or from a fixed seed, never a fresh random draw.
9. **Behind its own switch,** `DECK_BENCHMARKS_ENABLED`, the `analysisTabEnabled()` pattern
   (`src/lib/decks/analysis-flag.ts`). Off means not computed and not drawn. It ships after
   labels everywhere (4a) is on, since every benchmark but win speed reads labels.
10. **The definitions above are drafts; the plan fixes the constants.** The shape is locked (what
    each benchmark reads and that it weighs speed and cost); the weights and the turn-8 horizon
    are the plan's, re-measured on staging.

## Which label readings can be trusted (from `boards/labels-accuracy-check-2026-10-10.md`)

- **Removal, wipes and counterspells: trusted.** After the counterspell ruling, removal reads 122
  labels-right to 3 classifier-right. Interaction is the strongest benchmark.
- **Draw: trusted once opponent draws are dropped.** Thought-Knot Seer, Vendilion Clique and
  Prismari Command's loot are the known errors, all `affects: opponents`; card flow already
  drops those jobs (follow-up 2 of that check, applied here).
- **Ramp: the weakest role.** Velocity already excludes `costReduction`. It must also drop a
  `fetchesLand` job whose card puts the land into the hand (Expedition Map, Sylvan Scrying,
  landcycling). No label field records where a land search puts the land (`to` is null on every
  kind but `recursion` and `tutor`), so this filter reads the oracle text: no "onto the
  battlefield" means the hand. It also inherits the two rocks labeled `land` (Ebony Fly, Planar Atlas). Those are
  follow-up 3 of the check, and velocity ships after it or applies the same filter.
- **Graveyard jobs, theme jobs and tutors: NOT audited.** `recursion`, `mill`, the
  `cardsInGraveyard` and `artifacts` thresholds, `tribal`, `pump`, `tokens`, `drain`, `poison`, the `activated`
  trigger and `tutor` were outside that check. Every Dependencies row reads one of them
  (artifact payoffs through the `artifacts` threshold; enchantment payoffs alone are pure oracle
  text), and win speed's tutor
  credit need the same free spot check (judge each differing card from its rules text) before
  the switch goes on. One staging example to start from: Deconstruct is read as Elves ramp. And one
  open scope call for the plan: lands that use the graveyard (Cephalid Coliseum, Memorial to
  Folly in Sultai Arisen) are left out of the measured share, numerator and denominator alike;
  counting them means counting lands on both sides.
- **Combos: trusted, with one stated limit.** Spellbook's forced-or-optional flags are not stored
  (Overview plan 11.3, decision 4), so Gishath's Marauding Raptor + Polyraptor loop, which draws
  the game when no outlet is out, counts as a combo line. The win-speed ledger names each combo
  by what it produces and never calls it a win.

## What Design owns

1. **Where the block sits in the Analysis tab**, at 1300 and 390, against what is there now: the
   stale banner, the verdict with the overview beside it, the climb, "What is in this deck", and
   Suggested changes under the reading. Phone and desktop ship in the same PR.
2. **How a grade is drawn, and how a dependency is drawn.** Five steps per graded benchmark;
   the form (a scale, a meter, a word, a letter) is Design's. Dependencies is drawn as a list of
   rows, each with its strength (light or heavy), its hate and its ledger, and must not read as
   a score: no meter shared with the grades, no total.
3. **The ledger's entry point and form.** The tab already has one pattern for "a count and the
   cards behind it": the findings tiles and their receipt (`FindingsBlock`, `ReceiptModal`). The
   brief's recommendation is to reuse that receipt rather than draw a new sheet, and to open a
   card from a ledger line with the existing card-detail trigger. Design may differ, with a
   reason.
4. **The win-speed and Dependencies states:** a combo deck (grade, the combos, the odds) and a
   no-combo deck (the stated "no combo line" state), and how the second avoids reading as a
   failing grade; a deck with no dependency row, one row, and four rows (the staging maximum),
   and how "no dependencies" avoids reading as a clean bill of health.
5. **The thin states:** a tiny decklist; a deck whose every benchmark sits in the lowest step.
6. **Whether a benchmark links to the Stats card it builds on** (velocity to Mana colors or Curve,
   card flow and interaction to Jobs). Stats may already link into Analysis (Deck stats PR 8,
   finding links); this is the reverse direction, and optional.
7. **The About entry,** drawn on the per-entry artboard
   (`design/design_handoff_the99_about/`). It is batched with the claim tap-through at the close
   of the evidence line under one `ABOUT_VERSION` bump (Overview plan section 8 and 11.3,
   decision 2), so Design draws the entry now and eng ships it at the line's close.

## Surfaces this changes

- **The Analysis tab, desktop and phone:** a new block inside the reading.
- **The ledger:** the findings receipt reused, or a new sheet if Design rules one.
- **The card-detail opener:** a new entry point (a ledger line), no change to the detail itself.
- **The About page:** one entry, batched at the evidence line's close.
- **Unchanged:** Deck stats (no card added or changed, unless Design takes item 6), the bracket
  verdict, the climb and the findings, the Overview's rendering (its interaction fact moves to
  the shared reader, which is invisible), and the Analyze and Re-analyze presses.

## Deliverables

- 1300 and 390 frames for: a populated reading (Gishath is a good fixture: zero cheap instant
  interaction, a combo line); a no-combo deck (Elves: top velocity, low flow, no combo); and
  one deck per Dependencies row and state:
  graveyard heavy (Sultai Arisen, commander-driven), artifacts heavy (Counter Intelligence),
  enchantments heavy (Scrappy Survivors, which also carries the four-row maximum), creatures
  heavy (Thorin), activated abilities heavy (Elves, commander included), combat-only heavy
  (Soldiers), and no dependency row (Wizards); the stale reading under the banner; and the pre-Analyze empty state, unchanged.
- One ledger open per benchmark, at both widths.
- A states table (`STATES-*.md`) in the format of
  `design/design_handoff_the99_analysis_tab/STATES-analysis-tab.md`.
- A copy strings file, every string a PLACEHOLDER owed to `/copy-review`, including each
  benchmark's name and the five step words.
- The About entry's artboard frame and copy.

## Out of scope

- Goldfish turn estimates: engine-ready and threat-onset turns for combat decks (evidence
  phase 3, FUTURE).
- Any change to the bracket, its findings or the climb.
- Cross-deck comparison of benchmarks (the same rule as Deck stats ruling 3).
- A combined DTI-style headline score across the five. Each benchmark stands alone; a sum of a
  risk and four strengths would mean nothing.
- Mandatory-loop detection (Overview plan 11.3, decision 4).

## Copy rules

US English. No em dashes. Every string is a PLACEHOLDER; `/copy-review` resolves wording, not this
brief and not its handoff.

## Where it lives

- `src/components/decks/analysis-panel.tsx`: the tab's layout (banner, `Verdict`, `FindingsBlock`,
  Suggested changes).
- `src/components/decks/findings-block.tsx`, `receipt-modal.tsx`: the count-and-receipt pattern
  the ledger should reuse.
- `src/lib/profile/types.ts`: `DeckProfile.cards` (`ProfileCard`: oracle id, name, type line,
  `cmc`, quantity, layout), the list benchmarks read.
- `src/lib/labels/read.ts` (`readLabels`, `freshLabels`), `src/lib/labels/types.ts` (job kinds,
  `rampKind`, `recurrence`, `affects`, `threshold`), `src/lib/labels/role-sets.ts` (the read-side
  follow-ups land here).
- `src/lib/synopsis/facts-extra.ts`: `interactionCounts` (to be replaced by the shared reader) and
  `expectedCastTurn`.
- `src/lib/synopsis/combo-facts.ts`: `anySizeComboQuery`, `shapeComboFacts`.
- `src/components/decks/deck-stats-view.tsx` and `src/lib/copy/deck-stats.ts`: the Jobs card,
  which the benchmarks must not duplicate.
- `src/lib/decks/analysis-flag.ts`: the switch pattern.
- Inputs (the `boards/` files are the orchestrator's, under `~/.claude/projects/-Users-huey-Projects-the-99/boards/`, not in the repo): `boards/deckcheck-corpus-2026-10-09.md`, `boards/labels-accuracy-check-2026-10-10.md`,
  `docs/superpowers/plans/2026-10-10-overview-accuracy.md` (sections 8 and 11),
  `docs/superpowers/design-briefs/2026-10-03-deck-stats.md`.
