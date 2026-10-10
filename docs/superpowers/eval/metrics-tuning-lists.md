# Suggested changes, two lists, and the label basis: the shared eval (2026-10-10)

**Spent $0.8445 of the $3 cap** (two Batch runs of 24 answers: $0.4285 and $0.4160; no retries, no errors, 48 of 48 survived). One prompt revision used, as allowed.

**What it answers**

- *Per-run cost of the new contract.* Run 2 averaged $0.0173 an answer at batch prices, about $0.035 at real-time prices, against the $0.049 real-time basis the approval was written on (the old one-rationale-per-swap answer). The two lists cost no more than the swaps did.
- *Does the contract hold?* Yes after one revision. Run 1 lost 13 additions across the 24 answers to `citation`: the model cited a staple's "in 415 of 431 commanders' decks" as a `mix` citation, which names a target from the targets list and cannot hold. Revision 1 tells the model to cite a staple with a `decklist` citation. Run 2 lost 10 additions to `citation` or `denominator` (6 citation, 4 denominator, both arms) and 2 to legality (`colourIdentity`, `addNotLegal`); kept per answer rose to 3.5 to 3.8 additions and 3.8 to 4.3 cuts (five is the ceiling).
- *Switch off versus on (same decks, same contract, run 2).* On kept slightly more (3.83 additions and 4.33 cuts against 3.50 and 3.83) and cost slightly less ($0.1986 against $0.2174 for 12). All 12 decks answered in both arms. The answers are different cards: the lists share 0 to 5 of 4 to 6 names deck by deck, and the mix citations quote the arm's own basis (Wizards removal "17 of 18" off, "6 of 4" on; Omnath ramp "20 of 9" off, "33 of 19" on), which the validator checks against the pack the arm was shown, so a citation is never checked against the other basis. One sample per deck cannot separate the basis from ordinary run-to-run variation in WHICH cards come back; what it does show is that neither arm breaks the contract and that the on arm's evidence moves the way PR 8 measured.
- *Counterspells as removal (run 2 only).* A rationale that talks about a counterspell in removal terms ("removal is already past its target" over Mental Misstep) appeared 6 times off and 3 times on; Yuriko is 4 of the off hits and none of the on hits. Under labels a counterspell is not removal, so the pack no longer tags it that way. Three on-arm hits across two decks remain (Mana Drain and Ixidor's Will on Wizards; Molten Influence on Goblins), where the model reads "removal" from the deck's wider count, not from a tag. The check is a substring match on counterspell oracle text, so it over-reports.
- *Decks to watch.* Wizards: on arm 5 additions and 5 cuts kept, no mix citation survived (it cited decklist and games instead). Yuriko: removal "8 of 7" on, "17 of 8" off. Gishath and Omnath: ramp cited at the on-basis figures.

Run 1 is prompt v8 as first written; run 2 is revision 1 (staples cited as decklist citations). 12 of Hugh's staging decks, one sample per deck, Batch API, sonnet-5 at medium effort, `pnpm eval:tuning-lists`. Ledger: `ledger-tuning-lists.jsonl` (cap $3).

# Suggested changes, two lists: switch off vs on (2026-10-10T15-58-52-133Z-tuning-lists-lists)

| arm | n | survived | adds returned | cuts returned | adds kept | cuts kept | out tok (mean) | in tok (mean) | $ (batch) |
|---|---|---|---|---|---|---|---|---|---|
| off | 12 | 12 | 3.92 | 4.08 | 3.08 | 3.83 | 2478 | 4765 | $0.2058 |
| on | 12 | 12 | 4.17 | 4.67 | 3.58 | 4.25 | 2751 | 4801 | $0.2227 |

## Drops by rule
- **off**: add:citation 9, cut:cardExists 1, cut:citation 1
- **on**: add:citation 4, cut:noResultClaim 1, add:denominator 1, add:colourIdentity 1, cut:citation 1, cut:denominator 1

## Per deck: kept adds/cuts, mix citations, counterspell named as removal
| deck | off adds/cuts | on adds/cuts | off mix cites | on mix cites | same additions | same cuts |
|---|---|---|---|---|---|---|
| HD - Wizards | 3/4 | 2/5 | 6 | 2 | 0/3 | 1/6 |
| HD - Yuriko | 4/4 | 4/4 | 5 | 5 | 2/4 | 1/4 |
| HD - Gishath | 5/5 | 0/4 | 2 | 4 | 2/5 | 1/5 |
| HD - Omnath | 3/4 | 4/4 | 4 | 5 | 1/4 | 1/4 |
| HD - Eldrazi | 2/2 | 4/4 | 1 | 4 | 1/4 | 1/4 |
| HD Tune - Counter Intelligence | 1/3 | 4/5 | 9 | 8 | 4/4 | 1/6 |
| HD - Avatar Aang | 4/4 | 4/4 | 0 | 1 | 1/4 | 0/4 |
| HD - Elves | 4/4 | 4/4 | 10 | 8 | 3/4 | 1/4 |
| HD - Goblins | 0/4 | 4/5 | 4 | 12 | 2/5 | 2/5 |
| HD - Gods | 2/3 | 3/3 | 3 | 1 | 2/4 | 2/4 |
| HD - Kratos | 4/4 | 5/4 | 2 | 9 | 2/5 | 1/5 |
| HD - Zombies | 5/5 | 5/5 | 6 | 0 | 5/6 | 5/6 |

Counterspells named as removal: **5**

## Detail
- HD - Wizards mix cites off: ramp: 4 of 5; removal: 17 of 18; land: 35 of 34, a range rather than a finish line; draw: 20 of 12; draw: 20 of 12; draw: 20 of 12 | on: wipes: 0 of 0; draw: 23 of 12
- off / HD - Yuriko: An Offer You Can't Refuse (a counterspell) is discussed as removal: "The deck already leans on efficient counterspells like Counterspell and Swan Song; this adds another flexible answer that can also hit noncreature permanents, broadening what the removal suite can stop."
- off / HD - Yuriko: Mental Misstep (a counterspell) is discussed as removal: "This counter only matters against one-mana spells, which is a narrow window in a Commander pod full of higher-cost threats, and removal is already far past its target in this list."
- off / HD - Yuriko: Dispel (a counterspell) is discussed as removal: "A one-mana answer limited to instants is situational, and with so much removal already in the deck, it's one of the weaker slots to keep around."
- off / HD - Yuriko: Spell Pierce (a counterspell) is discussed as removal: "This card fades badly once opponents have mana up, and the deck doesn't need another situational counterspell when removal already sits well above its target."
- HD - Yuriko mix cites off: wipes: 0 of 1; removal: 17 of 8; removal: 17 of 8; removal: 17 of 8; ramp: 8 of 5 | on: wipes: 0 of 1; ramp: 9 of 7; ramp: 9 of 7; draw: 15 of 10; removal: 8 of 7
- HD - Gishath mix cites off: removal: 6 of 5; wipes: 1 of 1 | on: Swiftfoot Boots: in 415 of 431 commanders' decks; Reliquary Tower: in 421 of 431 commanders' decks; Exotic Orchard: in 431 of 431 commanders' decks; Rogue's Passage: in 319 of 431 commanders' decks
- on / HD - Omnath: Divert Disaster (a counterspell) is discussed as removal: "Removal already exceeds its target, and this narrow conditional counter rarely lines up well with the deck's land-based plan."
- HD - Omnath mix cites off: ramp: 20 of 9; ramp: 20 of 9; draw: 17 of 7; ramp: 20 of 9 | on: wipes: 0 of 1; ramp: 33 of 19; ramp: 33 of 19; removal: 5 of 3; ramp: 33 of 19
- HD - Eldrazi mix cites off: ramp: 16 of 17 | on: ramp: 19 of 22; ramp: 19 of 22; ramp: 19 of 22; ramp: 19 of 22
- HD Tune - Counter Intelligence mix cites off: wipes 0 of 1; Lightning Greaves: in 407 of 431 commanders' decks; Swiftfoot Boots: in 415 of 431 commanders' decks; draw 12 of 9; Reliquary Tower: in 421 of 431 commanders' decks; ramp 12 of 9; ramp 12 of 9; draw 12 of 9; draw 12 of 9 | on: wipes: 1 of 2; draw: 10 of 9; ramp: 19 of 12; ramp: 19 of 12; ramp: 19 of 12; ramp: 19 of 12; ramp: 19 of 12; draw: 10 of 9
- HD - Avatar Aang mix cites off: none | on: ramp: 17 of 12
- HD - Elves mix cites off: draw 4 of 8; draw 4 of 8; ramp 17 of 11; draw 4 of 8; ramp 17 of 11; draw 4 of 8; ramp 17 of 11; ramp 17 of 11; ramp 17 of 11; wipes 1 of 0 | on: draw 4 of 9; draw 4 of 9; draw 4 of 9; draw 4 of 9; ramp 21 of 15; ramp 21 of 15; ramp 21 of 15; removal 8 of 4
- HD - Goblins mix cites off: Professional Face-Breaker: in 247 of 356 commanders' decks; Torbran, Thane of Red Fell: in 187 of 356 commanders' decks; Big Score: in 344 of 356 commanders' decks; Swiftfoot Boots: in 329 of 356 commanders' decks | on: draw 1 of 4; draw 1 of 4; ramp 7 of 9; draw 1 of 4; ramp 7 of 9; draw 1 of 4; draw 1 of 4; removal 25 of 9; removal 25 of 9; removal 25 of 9; removal 25 of 9; wipes 2 of 1
- HD - Gods mix cites off: draw 13 of 8; removal 6 of 6; draw 13 of 8 | on: wipes: 1 of 2
- HD - Kratos mix cites off: ramp: 8 of 9; removal: 5 of 4 | on: ramp: 11 of 14; ramp: 11 of 14; ramp: 11 of 14; ramp: 11 of 14; removal: 9 of 5; wipes: 4 of 2; wipes: 4 of 2; draw: 6 of 5; draw: 6 of 5
- HD - Zombies mix cites off: wipes: 0 of 1; wipes: 0 of 1; ramp: 6 of 7; draw: 9 of 8; removal: 9 of 5; draw: 9 of 8 | on: none

---

# Suggested changes, two lists: switch off vs on (2026-10-10T16-03-32-168Z-tuning-lists-lists-rev1)

| arm | n | survived | adds returned | cuts returned | adds kept | cuts kept | out tok (mean) | in tok (mean) | $ (batch) |
|---|---|---|---|---|---|---|---|---|---|
| off | 12 | 12 | 4.25 | 4.42 | 3.50 | 3.83 | 2655 | 4843 | $0.2174 |
| on | 12 | 12 | 4.33 | 4.67 | 3.83 | 4.33 | 2335 | 4879 | $0.1986 |

## Drops by rule
- **off**: add:citation 4, cut:citation 3, add:denominator 2, add:colourIdentity 1, cut:quotedNote 1
- **on**: add:denominator 2, add:citation 2, cut:noResultClaim 1, add:addNotLegal 1

## Per deck: kept adds/cuts, mix citations, counterspell named as removal
| deck | off adds/cuts | on adds/cuts | off mix cites | on mix cites | same additions | same cuts |
|---|---|---|---|---|---|---|
| HD - Wizards | 3/4 | 5/5 | 6 | 0 | 1/6 | 0/6 |
| HD - Yuriko | 5/5 | 4/4 | 8 | 4 | 3/6 | 1/6 |
| HD - Gishath | 4/4 | 4/4 | 4 | 4 | 3/4 | 1/4 |
| HD - Omnath | 4/4 | 3/5 | 8 | 8 | 1/4 | 3/6 |
| HD - Eldrazi | 1/3 | 4/4 | 0 | 8 | 1/4 | 1/4 |
| HD Tune - Counter Intelligence | 3/3 | 5/5 | 4 | 6 | 3/5 | 2/6 |
| HD - Avatar Aang | 3/3 | 3/4 | 2 | 0 | 2/5 | 1/4 |
| HD - Elves | 3/4 | 4/4 | 8 | 6 | 1/4 | 0/4 |
| HD - Goblins | 5/5 | 5/5 | 1 | 14 | 0/6 | 5/6 |
| HD - Gods | 2/3 | 2/4 | 0 | 5 | 2/5 | 1/5 |
| HD - Kratos | 4/3 | 3/3 | 2 | 3 | 1/4 | 1/4 |
| HD - Zombies | 5/5 | 4/5 | 10 | 2 | 5/6 | 1/6 |

Counterspells named as removal: **9**

## Detail
- off / HD - Wizards: Mana Drain (a counterspell) is discussed as removal: "A hard counter that also hands over mana the next turn plays well with Baral's cost reduction, letting you both stop a threat and chain into another spell the same turn."
- on / HD - Wizards: Mana Drain (a counterspell) is discussed as removal: "A premium counterspell that also ramps mana fits Baral's cost-reduction theme and gives a hard answer while still being one short on removal."
- on / HD - Wizards: Ixidor's Will (a counterspell) is discussed as removal: "This conditional bounce spell is weaker than the deck's many dedicated counterspells and removal pieces, and can be cut since removal is already past its target."
- HD - Wizards mix cites off: ramp: 4 of 5; removal: 17 of 18; draw: 20 of 12; draw: 20 of 12; draw: 20 of 12; draw: 20 of 12 | on: none
- off / HD - Yuriko: Mental Misstep (a counterspell) is discussed as removal: "Removal is already well over its usual count for this commander, and this counterspell only hits one-mana spells, which narrows its usefulness as the game goes on."
- off / HD - Yuriko: Dispel (a counterspell) is discussed as removal: "With removal far past its target already, a counterspell that only stops instants is a weak inclusion compared to the broader answers already in the deck."
- off / HD - Yuriko: Negate (a counterspell) is discussed as removal: "The deck is carrying more removal and counterspells than this commander typically needs, and Negate's noncreature-only restriction makes it one of the weaker ones to keep."
- off / HD - Yuriko: Spell Pierce (a counterspell) is discussed as removal: "Removal is well above its usual mark, and this tax effect fades fast once opponents have mana up, making it a low-impact pick to cut from an already crowded category."
- HD - Yuriko mix cites off: wipes: 0 of 1; land: 26 of 31; removal: 17 of 8; removal: 17 of 8; removal: 17 of 8; removal: 17 of 8; ramp: 8 of 5; ramp: 8 of 5 | on: wipes: 0 of 1; ramp: 9 of 7; ramp: 9 of 7; draw: 15 of 10
- HD - Gishath mix cites off: removal: 6 of 5; removal: 6 of 5; wipes: 1 of 1; ramp: 9 of 9 | on: wipes: 7 of 2; wipes: 7 of 2; ramp: 22 of 17; ramp: 22 of 17
- HD - Omnath mix cites off: removal: 6 of 5; removal: 6 of 5; draw: 17 of 7; ramp: 20 of 9; ramp: 20 of 9; ramp: 20 of 9; ramp: 20 of 9; draw: 17 of 7 | on: wipes: 0 of 1; ramp: 33 of 19; ramp: 33 of 19; draw: 15 of 7; ramp: 33 of 19; ramp: 33 of 19; ramp: 33 of 19; draw: 15 of 7
- HD - Eldrazi mix cites off: none | on: ramp 19 of 22; ramp 19 of 22; ramp 19 of 22; ramp 19 of 22; removal 17 of 14; wipes 4 of 3; draw 13 of 11; removal 17 of 14
- HD Tune - Counter Intelligence mix cites off: wipes: 0 of 1; ramp: 12 of 9; draw: 12 of 9; ramp: 12 of 9 | on: wipes: 1 of 2; draw: 10 of 9; ramp: 19 of 12; ramp: 19 of 12; draw: 10 of 9; draw: 10 of 9
- HD - Avatar Aang mix cites off: removal: 2 of 3; removal: 2 of 3 | on: none
- HD - Elves mix cites off: draw 4 of 8; draw 4 of 8; draw 4 of 8; draw 4 of 8; ramp 17 of 11; ramp 17 of 11; removal 6 of 3; removal 6 of 3 | on: draw: 4 of 9; draw: 4 of 9; ramp: 21 of 15; ramp: 21 of 15; ramp: 21 of 15; ramp: 21 of 15
- off / HD - Goblins: Molten Influence (a counterspell) is discussed as removal: "With removal already well above its target, this conditional burn spell that needs a delirium-like cost reduction to be efficient is an easy one to let go."
- on / HD - Goblins: Molten Influence (a counterspell) is discussed as removal: "With removal far over its target, Molten Influence's conditional damage boost from basic land types adds little reliability and can be trimmed."
- HD - Goblins mix cites off: draw 3 of 4 | on: draw 1 of 4; draw 1 of 4; ramp 7 of 9; ramp 7 of 9; draw 1 of 4; ramp 7 of 9; draw 1 of 4; ramp 7 of 9; removal 25 of 9; removal 25 of 9; removal 25 of 9; removal 25 of 9; removal 25 of 9; removal 25 of 9
- HD - Gods mix cites off: none | on: wipes 1 of 2; draw 12 of 7; draw 12 of 7; ramp 11 of 10; ramp 11 of 10
- HD - Kratos mix cites off: ramp: 8 of 9; removal: 5 of 4 | on: ramp 11 of 14; ramp 11 of 14; ramp 11 of 14
- HD - Zombies mix cites off: wipes: 0 of 1; wipes: 0 of 1; ramp: 6 of 7; ramp: 6 of 7; draw: 9 of 8; removal: 9 of 5; removal: 9 of 5; removal: 9 of 5; removal: 9 of 5; removal: 9 of 5 | on: wipes: 0 of 3; wipes: 0 of 3

---

# Against Deckcheck's Power Tune (Hugh, 2026-10-10; no new spend)

Source: `boards/deckcheck-tunes-2026-10-10.md`, same bracket. Our picks are run 2 (revision 1), one sample per deck. Deckcheck's additions are not limited to owned cards and ours are, so cuts are the fair comparison.

| deck | Deckcheck cuts we also cut | our other cuts (off / on) | Deckcheck adds we also add |
|---|---|---|---|
| Gishath | Lightmine Field (both arms), Boxing Ring (off), Rite of Passage (off) | Wrathful Raptors; Star of Extinction, Kinjalli's Caller, Otepec Huntmaster (on) | Swords to Plowshares, Heroic Intervention (off) |
| Counter Intelligence | Universal Surveillance (both arms), Empowered Autogenerator (on) | Pentad Prism, Astral Cornucopia, Tome of Legends, Deepglow Skate, Mikaeus | none |
| Goblins | Singe (both), Erratic Explosion (off), Spark Spray (on) | Molten Influence, Dismantle, Crash, Demoralize | Lightning Greaves, Swiftfoot Boots, Chaos Warp, Vandalblast (off arm only) |

**What overlaps.** Cuts: 3 of Deckcheck's 13 Gishath cuts (we name 4 and hit 3 on the off arm, 1 on the on arm), 2 of 13 for Counter Intelligence, 2 to 3 of 20 for Goblins. The cheap, obviously dead cards agree (Lightmine Field, Universal Surveillance, Singe). Adds: the off arm lands the same removal and protection on Gishath and the same equipment and burn package on Goblins; nothing for Counter Intelligence (theirs are unowned fixes and tutors).

**Patterns Deckcheck shows that our lists do not yet make.**
- *Plan-first cuts.* Deckcheck cuts for what the deck is trying to do: Burning Sands as symmetric land sacrifice in Goblins, The Tarrasque and Wakening Sun's Avatar in Gishath because cast-trigger or ward value is lost when cheated in. We cut by role count and weak text (Molten Influence, Singe, Demoralize) and never name an anti-synergy. Nothing in the pack tells the model what each card's trigger needs, so it cannot see these.
- *Tutors for combo pieces.* Counter Intelligence's adds are Trophy Mage, Reshape, Tezzeret the Seeker. We add equipment and wrath effects. The pack has no combo piece list, so a tutor has nothing to point at.
- *Untapped lands for tapped.* Deckcheck cuts six tapped lands in Counter Intelligence for shocks and fetches. Our on arm adds Rogue's Passage and Reliquary Tower (utility lands) and never cuts a tapped land. Tapped share belongs to the Mana Balance tool (Deckcheck's Mana Tune shows the same method), not to these lists.
- *Draw engines for a deck with none.* Deckcheck adds Skullclamp to Goblins and notes it has no draw. Our on arm adds Big Score, Unexpected Windfall, Seize the Spoils and Wayfarer's Bauble to Goblins, so the on-arm basis does see the gap and answers it (its pack reads Goblins draw as "1 of 4"); the off arm, with draw at "3 of 4", adds none.

**Reading.** The label basis moves Goblins toward Deckcheck's draw-engine call and away from its burn-payoff call. The structural gap is evidence the model is never shown: per-card anti-synergy, combo pieces and tapped-land share. That is input work (a later evidence-pack change), not a contract change, and it was not folded into this PR.
