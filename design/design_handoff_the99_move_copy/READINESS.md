# READINESS · Move a copy to another deck later (#2980)

**Verdict: Yellow.** The UI is fully drawn and approved (Hugh, 2026-11-18). Three backend gaps need answers in the build plan before UI work.

| Gap | What the build needs |
|---|---|
| G1 | Card details needs the contested card off a receipt (`loadContestedCard`), plus the player's other committed decks whose color identity allows the card, with card counts. |
| G2 | An Other decks pick adds the card to that deck's draft, and the copy has to follow at commit. Assignments need a committed version, so a pending pick has to be stored and applied at commit. One choice spans both groups and counts toward the row's cap. |
| G3 | History's `wentTo` is frozen at arrival. `Now X has it.`, Change and `Can move · N` need a live read per entry, but only for entries whose card still has a choice. |
| G4 | New strings are DRAFT for /copy-review (README). A plural title is needed for 2+ copies. |
| G5 | Amends `design_handoff_the99_card_assignments`, which limits the chooser to /changes and receipts. |

Ready as is: Change rule (`owned > 0 && free <= 0`), shipped `CopyChooserDialog` / `ContestedCardRow` / `assignCopyFor` reuse, phone and desktop frames.
