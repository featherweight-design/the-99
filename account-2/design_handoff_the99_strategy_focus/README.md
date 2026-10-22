# The 99 · Strategy focus · R2d (account 2, 2026-10-22)

Canvas: https://claude.ai/artifact/5DXdxuVHyRhgFAEV83mirP

Brief: `docs/superpowers/design-briefs/2026-10-22-strategy-focus.md` (#2207), reshaped by Hugh on 2026-10-22 after R1:
**one swap engine.** The free graph on Analysis, *The deck’s strategy*, lets the player pick a **focus**;
Suggested changes (shipped, 1 credit) reads the focus, its additions lean toward it, and each says how far it moves it.
Less on screen than R1: R1's separate paid read (how it wins, coherence, weak links, its own swaps) is dropped.

Extends `design_handoff_the99_deck_analysis/`, `_analysis_tab/`, `_tuning_hub/`, `_deck_tuning/`. Drawn over the shipped
Analysis tab and Suggested changes (two lists) on Hugh's HD - Avatar Aang, in Low Sun. Cards are cut from Hugh's captures.

## Boards

| Board | What |
|---|---|
| Main | The calls; the whole Analysis tab with a focus picked (ring), 390 and 1300 |
| Graph-Options | Four forms with Tokens as focus: A card piles (picked), B ring around the commander, C one strip, D bars (R1); A on the phone: A1 piles on their side (picked), A2 swipe row, A3 five standing (R2, cramped); names |
| Focus-Flow | No focus; Suggested changes ready with the focus row; its swaps with the focus chip; two applied; the ring after (focus arc grows, `11 +2`) |
| Graph-States | One to four strategies, nothing over the floor, too small, typal replaces tribal, landfall as-is |
| About | New entry "Giving a deck a focus" (chapter 04) |

## Calls

1. **Focus is a free pick on Analysis.** Press a strategy; *Keep it balanced* clears it. Saved on the deck. One line under the graph.
2. **Suggested changes aims at it.** No new tool, no second credit. One manifest row (*This deck's focus · Tokens*), one lead
   sentence. A focus change counts as new input for the unchanged-state rule.
3. **Swaps show the shift.** An addition toward the focus carries a citation chip in the shipped pattern, kind `focus`,
   value `Tokens 11 → 12` (dashed accent). Applying lands the card face up on its pile, outlined, count `11 +2` until the next commit.
4. **Graph: the ring around the commander** (R2c, Hugh found the piles busy). Commander art at the centre, one arc per strategy,
   focus arc pulled out in accent; the legend carries names and counts and is the press. An applied addition grows the focus arc
   in a lighter accent, legend `11 +2`. Piles (with the phone's on-their-side form), strip and bars stay on Graph-Options.
5. **Tuning keeps its four tools.** Analysis gets one block, last in the reading, above Tuning.
6. **R2d (Hugh's notes, 20:45).** Heading *The deck’s strategy*; sub *The themes your deck is built around and how many cards support each strategy.*
   The legend is the pick: a *Pick a focus* kicker and a radio per row, the picked row tinted. The ring and legend centre
   on desktop. Focus line: *Focus Tokens: Suggested changes builds toward it. Keep it balanced* / *No focus yet. Pick one
   and Suggested changes will build toward it.* Ownership dot sits between the thumb and the name, as shipped. Empty states
   are one box: *No strategy stands out yet.* (five or more cards sharing a theme, type or creature type more often than
   most Commander decks) and *Too early to read.* (30 cards besides lands).
7. **The ring after changes counts every pending change** since the last commit, from any source (Suggested changes, a hand
   edit, another tool), because it counts the list. Lighter arc and `+N` for growth; a cut shows `−N` with the arc shrinking.

## Gaps and owed

- Counts and the top card per strategy are fixtures until eng runs the read on staging (top card rule for eng: e.g. the deck's
  highest-EDHREC card in that strategy).
- Copy is placeholder for /copy-review. About switch name is eng's; recapture owed.
- A card can count toward two strategies; piles show counts, not shares, so they don't overstate.

`scratch-gen/` builds every board: `python3 build.py` (local, `out/`), `python3 build.py blob` (canvas, `/_blob` urls from
`blobs.json`), `python3 render.py` (screenshots, broken-image and overflow check). R1's generator is in git history (3c8db5b).
