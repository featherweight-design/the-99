# The 99 · Strategy focus · R2g, approved (account 2, 2026-10-22)

Canvas: https://claude.ai/artifact/5DXdxuVHyRhgFAEV83mirP · approved by Hugh 2026-10-22 ("larger on a medallion").

Brief: `docs/superpowers/design-briefs/2026-10-22-strategy-focus.md` (#2207), reshaped by Hugh on 2026-10-22 after R1 into
**one swap engine**. The free graph on Analysis, *The deck’s strategy*, shows up to five strategies and lets the player pick a
**focus**; Suggested changes (shipped, 1 credit) reads the focus, its additions lean toward it, and each says how far it moves it.
R1's separate paid read (how it wins, coherence, weak links, its own swaps) and the brief's lean-in tool are dropped. Hugh's rule
for the line: don't overload the reader with information.

Extends `design_handoff_the99_deck_analysis/`, `_analysis_tab/`, `_tuning_hub/`, `_deck_tuning/`. Drawn over the shipped
Analysis tab and Suggested changes (two lists) on Hugh's HD - Avatar Aang, in Low Sun. Cards are cut from Hugh's captures.

## Boards

| Board | What |
|---|---|
| Main | The calls; the whole Analysis tab with a focus picked, 390 and 1300 |
| Focus-Flow | No focus; Suggested changes ready with the focus row; its swaps with the focus chip; two applied; the ring after (`11 +2`) |
| Graph-States | One to four strategies, nothing over the floor, too early to read, typal replaces tribal, landfall as-is |
| Ring-Centre | What sits in the ring: A commander, B count, C top card, **D an icon per strategy (picked)**, E nothing; D's emphasis, **larger on a medallion (picked)**; the icon count |
| Graph-Options | History of the graph's form: A card piles, **B the ring (picked)**, C strip, D bars; names |
| About | New entry "Giving a deck a focus" (chapter 04) |

## Calls

1. **Focus is a free pick on Analysis.** A legend row is the press (44px on the phone); a *Pick a focus* kicker and a radio per
   row say so, the picked row tinted. *Keep it balanced* clears it. Saved on the deck. One line under the graph.
2. **Suggested changes aims at it.** No new tool, no second credit. One manifest row (*This deck's focus · Tokens*), one lead
   sentence (*They aim at Tokens, the deck's focus.*). A focus change counts as new input for the unchanged-state rule.
3. **Swaps show the shift.** An addition toward the focus carries a citation chip in the shipped pattern, kind `focus`, value
   `Tokens 11 → 12`, dashed accent. Rows are the shipped two-list lines: ownership dot between the thumb and the name.
4. **The graph is a ring.** One arc per strategy, sized by count, focus arc pulled out in accent; legend beside it on desktop
   (the pair centred), under it on the phone. The legend's counts do the exact comparing.
5. **The ring's centre is the focus's icon on a medallion** (R2g): an accent disc with an inner keyline and four small
   diamonds (the 99 mark's shape), the icon at 56% of the centre with a faint glow. The same icons replace the legend's colour
   squares (16px, `--fg-muted`, accent when picked). No focus: an empty dashed circle.
6. **The ring after changes counts every pending change** since the last commit, from any source (Suggested changes, a hand
   edit, another tool), because it counts the list. Growth: a lighter accent arc and `+N` in the legend; a cut: `−N`, the arc
   shrinks. Cleared by the next commit.
7. **Tuning keeps its four tools.** Analysis gets one block, last in the reading, above Tuning.

## Icons owed: 35

Any strategy can be the focus, so the whole set is owed: 29 label themes (the 30 `THEMES` less `tribal`, which a typal axis
replaces), 5 type-line axes (Artifacts, Enchantments, Equipment and Auras, Vehicles, Creatures costing 6+) and 1 glyph shared by
every creature type. Five are drawn here (Allies/typal, Spells matter, Tokens, Evasion, +1/+1 counters) as 24-grid line glyphs,
stroke 1.6, round caps; the rest are drawn new in that weight, matching the shipped mana symbols. A theme added later owes an icon.

## Copy (placeholders for /copy-review, except where Hugh set them)

- Heading: *The deck’s strategy* (Hugh). Sub: *The themes your deck is built around and how many cards support each strategy.* (Hugh)
- Kicker: *Pick a focus*. Legend count: *11 cards*, after changes *11 +2 cards*.
- Focus line: *Focus Tokens: Suggested changes builds toward it.* + link *Keep it balanced*. No focus: *No focus yet. Pick one and Suggested changes will build toward it.*
- Nothing over the floor: *No strategy stands out yet. One shows here once five or more cards share a theme, a type or a creature type more often than most Commander decks do. Until then Suggested changes keeps the deck balanced.*
- Too early: *Too early to read. The deck’s strategy shows once it has 30 cards besides lands. This one has 18.*
- Suggested changes: manifest row *This deck's focus · Tokens*; lead *They aim at Tokens, the deck's focus.*; chip `focus · Tokens 11 → 12`.

The generator, `scratch-gen/`, lives on `design-assets` under `account-2/design_handoff_the99_strategy_focus/` and builds every board: `python3 build.py` (local, `out/`), `python3 build.py blob` (canvas, `/_blob` urls from
`blobs.json`), `python3 render.py` (screenshots, broken-image and overflow check). R1's generator is in git history (3c8db5b).
