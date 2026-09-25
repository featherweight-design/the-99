# Swap tools v2: smarter stand-ins and Find a deck (plan)

Brief: the "v2 phase" section of `boards/lanes/swap-tools.md` (Hugh, 2026-09-25). Hugh approved the direction: text
rules plus data we already store, with no per-use model calls and no hand-written card list. Everything stays behind
`SWAP_TOOLS_ENABLED`, and there is no About entry beyond the batched ones.

## What the data can and cannot do (measured on staging, read-only)

- **Synergy is complete.** All 892,400 `commander_support_cards` rows and all 271 pair rows carry `synergy`, ranging
  from −0.85 to 1.00 (mean 0.105). Items 2, 8 and 9 can rank by it with no fallback beyond "the commander's list
  does not carry this card".
- **Spellbook has the combo Hugh named.** Maddening Cacophony + Fraying Sanity is variant `464-5080`. The
  "completes a combo" read is a join from `spellbook_variant_cards` against the deck's cards.
- **The role classifier knows four spell roles**: ramp, draw, removal and wipes. It classifies Runadi as ramp only,
  from `{T}: Add {G}`. "Pump" and "haste" are Hugh's words and are in no stored vocabulary. Neither is "mill", so
  "Joins 9 other mill cards" has nothing to count today. Themes are stored per COMMANDER (`commander_support.tags`),
  never per card. **Items 7 and 11 need a wider card vocabulary from text rules first** (question 5).
- **Bug 1 is eight lands**: Lazotep Quarry, Abandoned Outpost, Timberland Ruins, Archaeological Dig, Heap Gate,
  Ravaged Highlands, Bog Wreckage and Seafloor Debris. Each makes one color repeatably and "any color" once, by
  sacrificing itself.
- **Hugh's decks for verification**: HD - Gishath (96 cards, 37 creatures) and HD - Wizards (65 cards, 21
  creatures), both on staging. They get pulled into a FRESH local Clerk test account, never `--replace` into the
  shared fixture account (see Verification).

## The before picture, on Hugh's own decks

Hugh's 19 decks, pulled from staging into a fresh local account and read through the real `loadStandIns` and
`loadFits`:

- **Plateau, in HD - Gishath.** Yours, free: Abandoned Outpost first, then Command Bridge, Iron Hills, Needle
  Spires and the rest, all at $0.15 in alphabetical order. To buy: Abraded Bluffs, Aether Hub, Alpine Meadow,
  An-Havva Township and the rest, the $0.15 wall.
- **Runadi, in HD - Gishath.** Yours, free: Cultivate first, then Kodama's Reach and Commander's Sphere. By
  Gishath decks: Rampant Growth, then Thunderherd Migration.
- **Maddening Cacophony.** Find a deck lists HD - Avatar Aang, HD - Brago, HD - Gods, HD - Wizards, and so on.
  8 of the 9 decks carry no inclusion figure, so the order is alphabetical, and HD - Wizards (holding Fraying
  Sanity) sits fourth.

## PR boundaries

Each PR stays under ~20 files and ~800 lines. None depends on another open PR (no stacking).

| PR | Items | Visible? | Waits on |
|---|---|---|---|
| **A: two bugs** | 1, 5 | 5 only: the decklist's own hover preview on stand-in rows (desktop) | nothing |
| **B: ranking** | 2, 8, 9, and 6's ORDER | order only; no new words, headings or controls | answers to Q1, Q2, Q4 |
| **C: card vocabulary** | groundwork for 7 and 11, then 7 | order only | Q5, Q6 |
| **D: the visible pieces** | 1's "once", 3, 4, 6's headings, 10, 11 | yes | the Design addendum; Q3, Q7, Q8 |

- **A** ships first, on approval of this plan.
  - `landColors` counts only REPEATABLE mana: an ability that sacrifices its own source adds nothing, so none of
    the eight lands stands in for a two-color original.
  - Stand-in rows in the sheet borrow the shared `HoverPreviewProvider` via `usePreviewRow`, exactly as the
    decklist does.
  - Proof: unit tests on the eight lands; `probe:hover-preview` extended to the stand-ins sheet at 1300 (the preview
    is desktop only by design).
- **B**: the ladder and synergy, all from text and stored figures.
  - Lands sort by rung, then synergy, then price:
    1. untapped, no drawback;
    2. untapped with a condition (check, fast, slow, pain, shock, pay life);
    3. enters tapped;
    4. one-shot or utility.

    The rung is read from `drawbacks()`, which already parses every one of those conditions.
  - Spells sort same card type first (Q4), then synergy, then price.
  - Find a deck ranks by the deck's commander (or pair) synergy for the card.
  - `gather.ts` and `fits.ts` select `synergy` beside `inclusion`.
  - No copy changes: the fact line still quotes inclusion, since a synergy percentage is not a figure a reader
    knows (Q2).
- **C**: new text-rule roles in `recs/roles.ts`, with a measure script printing each rule's catalog hits and a
  fixture per rule, the same discipline as `measure:tutors`. The fill, the bracket system and the analysis read
  `classifyRoles` too, so the new roles land in a SEPARATE classifier (`cardThemes`) rather than widening `Role`.
  That keeps every existing reader's figures fixed. Then stand-ins match on shared roles plus themes (Q6).
- **D** follows the Design addendum. It also brings the "completes a combo" read (10) and the theme count (11),
  shipped WITH the line that draws them rather than as payload with no caller.

## Waits on the Design addendum

Per the brief, one prompt through Hugh:

- the row's mana line: "makes white and red, untapped", including how a one-shot reads ("once");
- the type-group headings for 6;
- the "Show all" control and the curated count for 3 (a new control, so it is Design's, even though the brief lists
  it under data);
- Find a deck's reason line for 10 and 11.

## Questions for Hugh (product calls)

1. **Pain lands and shocks: rung 1 or 2?** A painland taps for colorless with no drawback and hurts only for color;
   a shockland is untapped only if you pay 2 life. Proposed: both rung 2, with checklands and fastlands, since
   each asks something of you.
2. **Show synergy, or keep showing inclusion?** B changes the ORDER to synergy, while rows still say "in 41% of
   Gishath decks". Proposed: keep the inclusion words (people know what they mean), and order by synergy silently.
   The alternative is a reworded fact line, which goes to Design.
3. **How many before "Show all"?** Proposed: 5 per group.
4. **"Same type first": which types?** Proposed: creature, instant, sorcery, artifact, enchantment and
   planeswalker, by the front face's first card type. An artifact creature counts as a creature, since that is what
   Gishath counts. Other types are listed below, not hidden.
5. **Which themes should cards be read for?** This drives both 7 (Runadi) and 11 ("joins 9 other mill cards").
   Proposed first set, each a text rule with a measured catalog count before it ships: +1/+1 counters, pump and
   anthems, haste and evasion granting, tokens, mill, sacrifice outlets, graveyard recursion, protection, and
   tutors (the existing `classifyTutor`). Anything to add or drop?
6. **Matching "all roles": strict or ranked?** Strict (share every role) empties most lists. Proposed: a stand-in
   must share at least one, and more shared ranks higher. Runadi's best stand-ins would then share ramp and
   counters, and be creatures (Q4).
7. **Find a deck's order: does a combo outrank synergy?** Proposed: a deck where the card completes a combo leads,
   then a theme it joins, then synergy.
8. **"Completes a combo" means every other piece is already in the deck, commander included.** Should a deck one
   card short also be named ("one card from a combo with X")? Proposed: complete only, for now.
9. **One-shot lands (bug 1): hidden, or listed last as "once"?** A fixes the colors, so they stop qualifying.
   Listing them in rung 4 labeled "once" needs the Design line. Proposed: hidden in A, revisited in D.

## Verification

- Hugh's real decks, pulled from staging:
  - `PULL_FROM_USER_ID=<Hugh> PULL_TARGET_URL=<local-dev> PULL_TARGET_BRANCH=<local-dev id> pnpm pull:staging`;
  - into a NEW Clerk dev test account (`…+clerk_test`), so the shared fixture account is never replaced.
- Every PR runs a before/after on HD - Gishath and HD - Wizards and names the top stand-ins:
  - Plateau: no Abandoned Outpost, untapped duals first;
  - Runadi: creatures first;
  - the $0.15 wall: ordered by rung then synergy, not the alphabet.
- Find a deck on Maddening Cacophony must lead with HD - Wizards once D lands.
- Probes are extended in place (`probe:swap-engine`, `probe:swap-sheet`, `probe:swap-fits-data`). Each new rule
  gets a mutation that fails it.
- Measure on staging, mutate on local-dev.
