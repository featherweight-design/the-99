# Brief: Deck strategy focus (a deck's top strategies, and leaning into one)

**For:** Claude Design. **Prompt:** to be written by the orchestrator from this brief.
**Research:** lane 9b, 2026-10-18 (`boards/strategy-focus-research-2026-10-18.md`, the "Re-test with type-line axes"
section). The axes code is on branch `strategy-axes` (`src/lib/strategy/axes.ts`, `pnpm measure:strategy`), not yet merged.
**Existing handoffs to extend:** `design/design_handoff_the99_deck_analysis/` (where analysis lives),
`design/design_handoff_the99_analysis_tab/` (the tab's composition; `HANDOFF.md` wins over its README),
`design/design_handoff_the99_tuning_hub/` (the four-tile Tuning landing and its tools),
`design/design_handoff_the99_deck_tuning/` (the suggestion card and the panel those tools reuse).
Where a shipped component and a handoff disagree, the component wins.

## Hugh's ruling (2026-10-22), which binds every screen here

1. **A descriptive radar of a deck's top ~5 strategies on Deck Analysis.** It says what the deck leans on. It never
   judges: no "focused" or "spread thin", no "tuned", no score shown as good or bad.
2. **No model call** for the radar or for lean-in. Both are free.
3. **Lean-in:** the player picks one strategy and gets about 5 to 10 cards that lean into it, owned first, then
   buyable, each paired with a matching cut of a card off that strategy, delivered **through the existing Tuning
   tools**.

## What the score is

Every figure below is computed from the catalog and the deck list. Nothing is generated.

- **Axes.** Two families, scored the same way:
  - **The 30 label themes** already on every card (`card_labels`, `THEMES` in `src/lib/labels/types.ts`): counters,
    tokens, blink, spellslinger, deathTrigger, landfall, poison, goad, and so on. Their reader-facing names already
    exist in the swap tools' copy (`swapToolsCopy`'s `job` map in `src/lib/copy/swap-tools.ts`: "spells matter",
    "death triggers", "+1/+1 counters").
  - **Type-line axes**, read off the card's front face: artifacts, enchantments, voltron (Equipment and Auras),
    vehicles, big creatures (a creature of mana value 6 or more; the catalog holds no power, so this is a named proxy),
    and up to three single creature types (`typal:Elf`, `typal:Dinosaur`), so typal splits by type. Changelings count
    toward each type the deck picks.
- **Score per axis:** `copies × ln(lift)`, where lift is the deck's share of nonland cards on that axis over the
  **whole catalog's** share. An axis held by fewer than **5 copies** scores 0 (a splash, not a plan). An axis the deck
  holds no more of than the catalog scores 0.
- **The radar** draws the top 5 axes by score. Lands are excluded from every count.
- **The baseline is the catalog, not the commander's EDHREC average.** The commander-average column reads near 0
  whenever a deck follows its commander's usual plan, and its peaks are often noise on a tiny share (HD - Soldiers read
  "Bird, 9 copies"). It is not drawn.

## What it reads right, and what it reads wrong

Measured on staging, read-only, 53 lists (21 of the busiest account's decks, 22 precons, 10 EDHREC averages). Before the run, 41 of them were labeled
with an expected plan (38 focused, 3 spread); the other 12 had no clear expected plan and are not counted below.

**Right: 34 of the 38 lists expected to have a plan read that plan as their top axis.** Examples: Keen Engineering,
artifacts (43 copies); HD - Gishath, Dinosaur (26); HD - Elves, Elf (44); HD - Brago, blink (17); Prismari Artistry,
spellslinger (17); Scrappy Survivors, voltron (30).

**Wrong, three adjacent reads and one miss.** Design should draw for these, because a player will see them:
- **Adjacent:** HD - Eldrazi reads artifacts, not Eldrazi. Tramplesaurus Rex reads Dinosaur, not big creatures.
  Limit Break reads artifacts, not voltron. The plan is in the top 5 but not first.
- **Miss: landfall.** World Shaper reads Insect, not landfall. Landfall's payoffs are counted, but the lands that
  trigger it are excluded with every land, so a landfall deck under-reads.
- **Broad themes can top a list with no sharp plan.** In the earlier label-only run, before the type-line axes,
  Kaalia's average read "evasion, 30 copies". True, but not a strategy a player would name. Evasion, protection and
  pump can still lead a list whose plan the axes have no word for. See open call 4.

## Why there is no verdict

The score was tested as a verdict twice and failed both times:
- It does **not** separate precons from tuned decks, against either baseline. Hugh's `HD Tune` decks (median 46.3) sit
  *below* the newest precons (56.9) and only just above precons a year or two older (42.3). A tune changes power more than plan, and a strategy score cannot see power.
- "Focused vs spread" has no tested threshold: only 3 lists were expected to be spread, and two of those turned out to
  have plans.

So the radar's figures are **relative within one deck**: which axes lead, and by how much. A figure must never be
drawn against a scale that implies a good or bad number, a target, or a comparison with other decks.

## Lean-in: the rule the server will apply

The player picks one axis from the radar. The server returns adds and cuts, both free.

**Candidates (adds), by axis:**
- On a **label theme**: cards carrying that theme in `card_labels`. On a **type-line axis**: cards whose front face
  matches it (an artifact, an Equipment or Aura, an Elf or a changeling, and so on).
- Always: inside the commander's color identity, legal in Commander, not already in the deck, nonland.
- Ranked by the commander's EDHREC data (`commander_support_cards` inclusion and synergy) where the commander has it,
  then by catalog popularity.
- **Owned first.** Cards the player holds a free copy of (not every copy committed to another deck) fill the list
  first. Buyable cards follow, each with its price (the same price the buy tag shows).
- **5 to 10 adds.** Fewer when the axis runs out of candidates; the shortfall is a state to draw.

**Cuts, one per add:**
- From the deck's nonland cards that do **not** count toward the chosen axis.
- Never the commander, never a locked card.
- Lowest first by how little the card does for the deck's other top axes (a card on none of the top 5 goes first).
- Each pair keeps the deck's count where it was. A deck over 100 is Proposed cuts' job and is out of scope here.

**What the player gets.** Each add with its cut, accepted or dismissed one pair at a time, in the same accept and
dismiss grammar Suggested changes already uses (`suggestion-card.tsx`). An accepted pair edits the deck exactly
as an accepted suggestion does today.

## Where it lives (surfaces Design extends)

| # | Surface | Handoff | What is new |
|---|---|---|---|
| A | **The Analysis tab** | `analysis_tab` (`HANDOFF.md`) | The radar: up to 5 axes, each with its name and its copy count. Its place in the tab's composition is Design's call (open call 1). |
| B | **The Tuning landing** | `tuning_hub` (canvas A) | Lean-in's way in. Either a fifth tile, or the radar's axes are the door (open call 2). |
| C | **The lean-in result** | `tuning_hub`, `deck_tuning` | The picked axis, then the add/cut pairs. Reuses the suggestion card. |
| D | **History** | `tuning_hub` (canvas C, H1 to H4) | Whether a lean-in run is recorded like the other tools (open call 6). |

Every screen at 390 and desktop. Mobile and desktop ship in the same PR.

## Every state to draw

**The radar (A):**
1. A deck with 5 or more scoring axes: the top 5.
2. A deck with 1 to 4 scoring axes: only those. Not padded to 5.
3. A deck with no axis over the floor: no radar, and a statement only. It must not say "unfocused".
4. A deck too small to read (under about 30 nonland cards, a fresh brew): a statement only.
5. A typal axis and a label theme on the same cards (Elves read both `typal:Elf` and `tribal`). Eng proposes the
   typal axis replaces `tribal` whenever one is drawn; Design confirms how it reads.

**Lean-in (B, C):**
6. Picking the axis.
7. A full result: about 8 pairs, owned adds first, then buyable adds with their prices.
8. All adds owned.
9. Short: fewer than 5 candidates for the axis (a narrow creature type).
10. No candidates at all (every legal card on the axis is already in the deck).
11. Cuts run out before adds (most of the deck already sits on the axis): adds shown without a cut, or capped at the
    cuts available. Design's call.
12. A pair accepted, and a pair dismissed.
13. The deck changes after the result was read (the same stale treatment the other tools use).

## Open calls for Design

1. **The radar's form.** A literal radar (spider chart) with 3 to 5 spokes reads badly with 1 or 2 axes and invites
   reading its area as a score. Ranked bars or a labeled list say the same thing. Design picks, and the pick must
   survive states 2 and 3 without implying a grade.
2. **Lean-in's door.** A fifth Tuning tile (the landing is 2 × 2 from `md` up and one stacked column at 390 today), or each radar axis pressable straight
   into lean-in, or both.
3. **Its name.** "Lean" is already taken on this tab: `LeanLine` is "How we determined this bracket". "Lean in" next to
   it would collide. Design proposes a name; `/copy-review` settles wording.
4. **Broad themes.** Evasion, protection, pump, haste and draw can lead a deck with no sharp plan. Eng proposes keeping
   them on the radar but not offering them for lean-in. Design rules.
5. **Axis names.** The label themes have reader names in the swap tools' copy. The type-line axes need them: "Artifacts",
   "Enchantments", "Equipment and Auras", "Vehicles", "Big creatures", and a creature type's plural ("Elves"). Big
   creatures is mana value 6 or more, not power; the name must not promise power.
6. **History.** Lean-in is free, like Mana Balance's free count. Whether its runs land in History is Design's call.
7. **Landfall.** Its miss is known. Either draw it as-is, or add a short line where a deck's landfall payoffs show but
   the axis under-reads. Eng's preference is as-is.
8. **The bracket.** An add can move the deck's bracket (a Game Changer, a combo piece). Eng can mark which adds do,
   from the bracket rules, at no model call. Whether the pair shows it, and whether such adds are held back, is
   Design's call.

## Not in scope

- Any verdict: focused, spread, tuned, a grade, a target figure, or a comparison with other decks or precons.
- The commander-average baseline.
- A model call, or a credit.
- The missing half of a combo as a lean-in add, from the original idea. Not in Hugh's ruling.
- An About entry: owed at the feature's launch per the About rule; Hugh decides whether it is one.

## What eng builds before the handoff lands

Backend only, behind a new switch off in production: the axes, a per-deck strategy-scores read, and the lean-in
candidate and cut rules, all pure and tested. The UI waits on this handoff.
