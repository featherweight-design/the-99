# The 99 · Move a copy to another deck later (R1c, APPROVED)

Issue: featherweight-design/the-99 #2980. Account 2, 2026-11-18. Status: APPROVED by Hugh 2026-11-18. Source: design-assets 1cce6ca (account-2), which also holds scratch-gen (proposal.diff, render.tsx).
Canvas: https://claude.ai/artifact/PXKbecyqx4VGUr9FwZxn2Q (boards Main, Details, Scenarios, Other, History, Desktop, Large; frames in art/).
Every frame is the shipped component SSR'd from main with shipped CSS (amonkhet), proposal applied (scratch-gen/proposal.diff).

## Calls
1. **Card details door.** `Change` at the end of the `In your decks` heading of `AvailabilityDetail`, only when `a.owned > 0 && a.free <= 0`
   (someone buys it, or every copy is held). Opens the shipped `CopyChooserDialog` over card details (sheet < md, 520 modal md+).
   Sub: `<card> · ×N in your collection`.
2. **The chooser is unchanged**: `ContestedCardRow`, deck names are the control, gets it / buys it, tap again = Back to first committed.
   Writes `assignCopyFor` (one `card_assignments` row), no list/version change, `revalidateClaims`.
3. **Other decks · N** (R1b, Hugh 2026-11-17): a disclosure under the shipped row, closed by default; closed with a pick, its header names it in accent.
   Open: only committed decks that don't list the card AND whose color identity allows it (outside its colors = never an option; one faint
   foot line says they aren't listed). Decks at 99+ are offered: `99 cards · makes 100` in --avail-over-fg. Rows are the shipped options
   (AllocationMark, name, `N cards`, `adds it`). One choice spans both groups: a pick is accent + `adds it · gets it`, the listing decks
   flip to buys it, the card goes into that deck's draft and gets the copy on commit; tap again undoes. A pick counts toward the row's cap.
   More than 6 decks: shipped SearchField `Find a deck` tops the list; it scrolls inside the chooser.
4. **History door.** `Change` at the end of an add's `Went to …` line (same rule as 1), opens the same chooser. The record never changes;
   after a move: `Went to A. Now B has it.`
4b. **Large entries (R1c, board L, from Hugh's 62-card capture).** Change goes on each card row's own `Went to …` line (RowLine; once per card,
   as `wentTo` is), never on the entry's summary line when it names more than one deck. The summary line adds the link
   `Change where N cards go`, which opens the entry on a new LAST tab `Can move · N` (after the shipped groups) holding only rows with a choice.
5. Grammar matches the removal chooser (design_handoff_the99_collection_edit/addendum-removal-chooser).

## R1b scenarios
M1 3 decks/1 copy, M2 3 decks/2 copies (2 of 2 given), M3 one copy to an Other deck (counts toward the cap), F1/F2 12 other decks + Find.

## Question for Hugh
Did Mutant Menace already list Fabled Passage? Doesn't change the design, only which door fixes the copy.

## Gaps
- G1 card details needs the contested card off a receipt (`loadContestedCard`) plus other committed decks whose color identity allows the card, with card counts.
- G2 a kept pick for a draft add has no home (assignments need a committed version): pending pick applied at commit; one choice across both groups; counts toward the cap (extraGiven in proposal.diff).
- G3 History `wentTo` is frozen at arrival; `Now X has it.` and Change need a live read per entry (only entries with a choice).
- G4 strings DRAFT for /copy-review (Change sub, Change where N cards go, Can move · N, Other decks · N, N cards · makes N+1, adds it, adds it · gets it, Find a deck, foot lines, Now X has it; plural title for 2+ copies). No `claim` in any string.
- G5 amends design_handoff_the99_card_assignments (chooser limited to /changes + receipts).
