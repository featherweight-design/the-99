# READINESS: Upgrade this precon (R2d, self-assessed)

**Verdict (Design's own): Yellow until Hugh approves R2c, rules on G13, and engineering answers G1, G5, G8, G9 and G12.** Everything is drawn at 390 and 1300 over the shipped open precon page; the flow reuses S1's sheet and dialog.

| Area | Ready? | Note |
|---|---|---|
| Page button | Yes | B as a bare button, shipped line-pulse on first view |
| Intro and stepper | Yes | S1 chrome; stepper presses back |
| Commander | Needs eng (G8, G10, G11) | A1 cards inside the flow |
| Bracket | Needs eng (G12) | Shipped climb rungs and marks; 2 / 3 / 4 |
| Strategy and confirm | Yes, G3/G4 | Foot press is the confirm; same picks ask in the foot |
| Wait / failed | Yes | v2's clock |
| Results / kept | Needs eng (G1, G2, G9) | Commander group, bracket as chosen |
| Start | Needs eng (G5, G11) | S1 with Commander fact |
| Copy | DRAFT | `precon-upgrade · copy strings.ts` |

## Gaps for engineering
- **G1 · Short runs.** A short run is refunded, so `readUpgrades` drops it. Keep refunded-short runs readable as results.
- **G2 · The buy total** counts only the adds the reader doesn't own, read when the page draws.
- **G3 · Glyphs.** A map from slug to glyph is owed; slugs with no glyph get the dashed fallback.
- **G4 · Blurbs** describe what this deck does with the strategy (DRAFT).
- **G5 · Start with swaps.** `createDeckFromPrecon` takes a run id and links the deck (R3), so v0 stays the box.
- **G7 · Signed-out return** carries the three picks.
- **G8 · Into the 99 or out.** Drawn: the box's commander goes into the 99, in the alternate's slot. If the run takes it out, the slot is one of the 12 to 18 swaps.
- **G9 · Runs keyed by commander, bracket and strategy.** The same-picks ask compares all three, and the request hash includes them.
- **G10 · Strategies per commander** (and per bracket where it matters). An alternate with no backed strategy drops the Commander step.
- **G11 · Start with an alternate** sets the commander and moves the box's one into the 99.
- **G12 · Bracket as an input.** The run aims at the chosen bracket and holds the deck there (Game Changer limit, combo checks), and the result says `as chosen`. If it can't, the run is short (R2) and refunded. Today the bracket is only measured before and after.
- **G13 · The new deck's Overview (Hugh's ruling needed).** The carry-over attaches only to the precon's exact list, so an upgraded deck starts with no Overview. Proposed: Start writes one for the new list and commander, included in the 2 credits: a second model call, with `playerText` rules as for any Overview. If it isn't included, the deck page's shipped Write an Overview covers it at the usual cost.
- **G14 · History.** Every done run stays readable, including refunded short ones (G1), listed newest first for this reader and precon. Opening one costs nothing. Without delete, rows accumulate as Help me choose's do.
- **G15 · I own this precon with swaps.** `startPreconOwned` adds the box's own list (`preconDeckCards`) and tokens, never the draft's swapped list. The cut cards came in the box, so they're added. The added cards are added only if the reader already owns them (and then nothing changes). The S1 `You own` fact counts the same way.
- **G16 · Try another strategy** starts a new 2-credit run, keeping the commander and bracket. Its result goes to History beside the last one.
