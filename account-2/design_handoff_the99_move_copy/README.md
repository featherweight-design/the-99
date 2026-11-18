# The 99 · Move a copy to another deck later (R1, DRAFT)

Issue: featherweight-design/the-99 #2980. Account 2, 2026-11-18. Status: awaiting Hugh's review. No handoff PR until approved.
Canvas: https://claude.ai/artifact/PXKbecyqx4VGUr9FwZxn2Q (boards Main, Details, History, Desktop; frames in art/).
Every frame is the shipped component SSR'd from main with shipped CSS (amonkhet), proposal applied (scratch-gen/proposal.diff).

## Calls
1. **Card details door.** `Change` at the end of the `In your decks` heading of `AvailabilityDetail`, only when `a.owned > 0 && a.free <= 0`
   (someone buys it, or every copy is held). Opens the shipped `CopyChooserDialog` over card details (sheet < md, 520 modal md+).
   Sub: `<card> · ×N in your collection`.
2. **The chooser is unchanged**: `ContestedCardRow`, deck names are the control, gets it / buys it, tap again = Back to first committed.
   Writes `assignCopyFor` (one `card_assignments` row), no list/version change, `revalidateClaims`.
3. **Not in their lists** (new group under the row, same scroller): the player's committed decks that do not list the card.
   - can take it: `Add it` → card into that deck's draft + a pick kept for its commit (`in the draft · gets it on commit`, accent row; foot line with Undo).
   - can't: dashed row, faint reason: `has 99 already`, `outside its colors`, `its commander`. Never hidden.
4. **History door.** `Change` at the end of an add's `Went to …` line (same rule as 1), opens the same chooser. The record never changes;
   after a move: `Went to A. Now B has it.` Opened multi-card entries: each row line gets its own Change (not drawn).
5. Grammar matches the removal chooser (design_handoff_the99_collection_edit/addendum-removal-chooser).

## Questions for Hugh
- Q1 decks that don't list it: **rec. Add it** (draft + kept pick). Alt: name them `not in its list`, no action.
- Q2 outside its colors: **rec. a row each up to two, then one line** `N more decks are outside its colors.` Alt: always a row each.
- Q3 repro: did Mutant Menace already list Fabled Passage? Yes → calls 1/4 fix it; no → call 3.

## Gaps
- G1 card details needs the contested card off a receipt (`loadContestedCard`) plus other committed decks with reason (color identity, 99 count, commander).
- G2 a kept pick for a draft add has no home (assignments need a committed version): pending pick applied at commit, or drop it per Q1.
- G3 History `wentTo` is frozen at arrival; `Now X has it.` and Change need a live read per entry (only entries with a choice).
- G4 strings DRAFT for /copy-review (Change sub, Not in their lists, Add it, in the draft · gets it on commit, has 99 already, outside its colors, its commander, foot lines, Now X has it.). No `claim` in any string.
- G5 amends design_handoff_the99_card_assignments (chooser limited to /changes + receipts).
