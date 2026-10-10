# Proposed cuts: the free tier's recall (baseline)

Output of `pnpm eval:cuts` on 2026-10-10 against staging, read-only. This is the baseline the model tier is scored against, on the same ground truth (`scripts/eval/lib/cuts-truth.mts`). The ranking it scores lives in `scripts/eval/lib/cuts-ranking.mts`; the app no longer ranks.


**Answer: yes, the free tier misses most of the cuts Hugh made, and does little better than chance.** Its top K holds 10 of 58 (17%), 1.1x what chance would hold (9.1); the top 2K holds 19 (33%). With roles read from card labels it holds 11 (1.2x chance); with weights tuned on four decks and scored on the fifth it holds 12 (1.3x). Caveats: five decks, one player; a basic land counts as cut only when v2 holds none of it, so a trimmed basic count is not a cut here; a v1 to v2 removal is often a swap for a better card rather than a card the deck was too big for (see the split below).

| Deck | Cut (K) | Pool | In top K | In top 2K | Not listed at all |
|---|---|---|---|---|---|
| HD - Avatar Aang | 19 | 93 | 3 | 7 | 0 |
| HD Tune - Counter Intelligence | 17 | 110 | 4 | 7 | 0 |
| HD Tune - Prismari Artistry | 15 | 102 | 3 | 5 | 0 |
| HD - Gods | 6 | 92 | 0 | 0 | 0 |
| HD - Wizards | 1 | 66 | 0 | 0 | 0 |

## 1. Upgrade swaps against net reductions

A removal is a swap when v2 added a card that fills one of its roles (each add pairs once).

| Kind | Cuts | In top K | Chance |
|---|---|---|---|
| Swapped for the same role | 17 | 5 (29%) | 2.7 |
| Net reduction | 41 | 5 (12%) | 6.5 |

## 2. Roles from card labels instead of the classifier

Top K: 10 of 58 with classifier roles, 11 with label roles. Top 2K: 19 against 21. Decks without a label profile (no support list or skeleton): none.

| Deck | Classifier | Labels |
|---|---|---|
| HD - Avatar Aang | 3 | 4 |
| HD Tune - Counter Intelligence | 4 | 4 |
| HD Tune - Prismari Artistry | 3 | 3 |
| HD - Gods | 0 | 0 |
| HD - Wizards | 0 | 0 |

## 3. Weights tuned on four decks, scored on the fifth

Grid of 1771 weight sets (steps of 0.05, summing to 1), best top-K hits on the four training decks, scored on the held-out one. Untuned: 10 of 58. Held out: 12 of 58.

| Held-out deck | Cuts | Untuned | Held-out | Weights chosen (inclusion / role / curve / bracket) | Training hits |
|---|---|---|---|---|---|
| HD - Avatar Aang | 19 | 3 | 4 | 0.05 / 0.05 / 0.9 / 0 | 13 of 39 |
| HD Tune - Counter Intelligence | 17 | 4 | 5 | 0.05 / 0 / 0.05 / 0.9 | 9 of 41 |
| HD Tune - Prismari Artistry | 15 | 3 | 3 | 0.05 / 0 / 0.15 / 0.8 | 13 of 43 |
| HD - Gods | 6 | 0 | 0 | 0.05 / 0.05 / 0.9 / 0 | 17 of 52 |
| HD - Wizards | 1 | 0 | 0 | 0.05 / 0.05 / 0.9 / 0 | 17 of 57 |

## Missed cuts (untuned)

- **HD - Avatar Aang**: Allies at Last: rank 56, inclusion; Beifong's Bounty Hunters: rank 29, offList; Boiling Rock Rioter: rank 39, inclusion; Dai Li Indoctrination: rank 48, inclusion; Earth King's Lieutenant: rank 66, inclusion; Fire Lord Zuko: rank 79, inclusion; Hakoda, Selfless Commander: rank 77, inclusion; Hama, the Bloodbender: rank 50, offList; Heartless Act: rank 22, inclusion; Jasmine Dragon Tea Shop: rank 84, inclusion; Jet, Freedom Fighter: rank 51, offList; Jet, Rebel Leader: rank 32, offList; Smellerbee, Rebel Fighter: rank 33, offList; Sokka, Tenacious Tactician: rank 82, inclusion; Swamp: rank 93, roleSurplus; Wartime Protestors: rank 53, inclusion
- **HD Tune - Counter Intelligence**: Anim Pakal, Thousandth Moon: rank 29, inclusion; Cyberdrive Awakener: rank 58, inclusion; Depthshaker Titan: rank 35, inclusion; Long-Range Sensor: rank 55, inclusion; Lost Jitte: rank 34, inclusion; Organic Extinction: rank 110, inclusion; Orochi Hatchery: rank 33, offList; Patrolling Peacemaker: rank 83, inclusion; Solar Array: rank 41, inclusion; Threefold Thunderhulk: rank 39, inclusion; Titan Forge: rank 36, inclusion; Uthros Research Craft: rank 47, roleSurplus; Wake the Past: rank 48, inclusion
- **HD Tune - Prismari Artistry**: Abrade: rank 32, inclusion; Aether Gale: rank 47, inclusion; Arcane Denial: rank 58, inclusion; Archmage Emeritus: rank 35, curve; Blasphemous Act: rank 92, inclusion; Brudiclad, Telchor Engineer: rank 63, inclusion; Chain Reaction: rank 18, inclusion; Determined Iteration: rank 75, inclusion; Harmonic Prodigy: rank 24, inclusion; Lightning Greaves: rank 70, inclusion; Rousing Refrain: rank 59, inclusion; Surge to Victory: rank 74, roleSurplus
- **HD - Gods**: Adarkar Wastes: rank 53, inclusion; Altar of the Pantheon: rank 29, inclusion; Fellwar Stone: rank 31, inclusion; Herald's Horn: rank 37, inclusion; Kratos, God of War: rank 61, inclusion; Reliquary Tower: rank 77, inclusion
- **HD - Wizards**: Pemmin's Aura: rank 26, offList

## HD - Gishath, asked for 5 cuts as if 5 over

Missing signals: none. Support list: 246 cards, 21327 decks. Candidates: 81 of 84 cards.

Commander proposed: no.
Game Changers held: none; proposed: none.

| # | Card | Score | Reason | Opens gap |
|---|---|---|---|---|
| 1 | Walking Ballista | 0.760 | {"kind":"offList","listed":246,"deckCount":21327} |  |
| 2 | Fiery Confluence | 0.553 | {"kind":"offList","listed":246,"deckCount":21327} |  |
| 3 | Bellowing Aegisaur | 0.550 | {"kind":"offList","listed":246,"deckCount":21327} |  |
| 4 | Up the Beanstalk | 0.513 | {"kind":"inclusion","pct":7.1,"deckCount":21327} |  |
| 5 | Titanoth Rex | 0.500 | {"kind":"offList","listed":246,"deckCount":21327} |  |
| 6 | Barroom Brawl | 0.495 | {"kind":"offList","listed":246,"deckCount":21327} |  |
| 7 | Boxing Ring | 0.495 | {"kind":"offList","listed":246,"deckCount":21327} |  |
| 8 | Shatterskull Smashing // Shatterskull, the Hammer Pass | 0.495 | {"kind":"offList","listed":246,"deckCount":21327} |  |
| 9 | Goreclaw, Terror of Qal Sisma | 0.493 | {"kind":"offList","listed":246,"deckCount":21327} |  |
| 10 | Lightmine Field | 0.493 | {"kind":"offList","listed":246,"deckCount":21327} |  |
