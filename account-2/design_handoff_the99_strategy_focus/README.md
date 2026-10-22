# The 99 · Strategy focus · R2 (account 2, 2026-10-22)

Canvas: https://claude.ai/artifact/5DXdxuVHyRhgFAEV83mirP

Brief: `docs/superpowers/design-briefs/2026-10-22-strategy-focus.md` (#2207), reshaped by Hugh on 2026-10-22 after R1:
**one swap engine.** The free graph on Analysis shows what a deck is built around and lets the player pick a **focus**;
Suggested changes (shipped, 1 credit) reads the focus, its additions lean toward it, and each says how far it moves it.
Less on screen than R1: R1's separate paid read (how it wins, coherence, weak links, its own swaps) is dropped.

Extends `design_handoff_the99_deck_analysis/`, `_analysis_tab/`, `_tuning_hub/`, `_deck_tuning/`. Drawn over the shipped
Analysis tab and Suggested changes (two lists) on Hugh's HD - Avatar Aang, in Low Sun. Cards are cut from Hugh's captures.

## Boards

| Board | What |
|---|---|
| Main | The calls; the whole Analysis tab with a focus picked, 390 and 1300 |
| Graph-Options | Four forms with Tokens as focus: A card piles (picked), B ring around the commander, C one strip, D bars (R1); names |
| Focus-Flow | No focus; Suggested changes ready with the focus row; its swaps with the focus chip; two applied; the graph after (new cards on the pile, `11 +2`) |
| Graph-States | One to four strategies, nothing over the floor, too small, typal replaces tribal, landfall as-is |
| About | New entry "Giving a deck a focus" (chapter 04) |

## Calls

1. **Focus is a free pick on Analysis.** Press a strategy; *Keep it balanced* clears it. Saved on the deck. One line under the graph.
2. **Suggested changes aims at it.** No new tool, no second credit. One manifest row (*This deck's focus · Tokens*), one lead
   sentence. A focus change counts as new input for the unchanged-state rule.
3. **Swaps show the shift.** An addition toward the focus carries a citation chip in the shipped pattern, kind `focus`,
   value `Tokens 11 → 12` (dashed accent). Applying lands the card face up on its pile, outlined, count `11 +2` until the next commit.
4. **Graph: card piles.** A stack per strategy, height by count, a real card from the deck face up on top; the focus pile lit.
5. **Tuning keeps its four tools.** Analysis gets one block, last in the reading, above Tuning.

## Gaps and owed

- Counts and the top card per strategy are fixtures until eng runs the read on staging (top card rule for eng: e.g. the deck's
  highest-EDHREC card in that strategy).
- Copy is placeholder for /copy-review. About switch name is eng's; recapture owed.
- A card can count toward two strategies; piles show counts, not shares, so they don't overstate.

`scratch-gen/` builds every board: `python3 build.py` (local, `out/`), `python3 build.py blob` (canvas, `/_blob` urls from
`blobs.json`), `python3 render.py` (screenshots, broken-image and overflow check). R1's generator is in git history (3c8db5b).
