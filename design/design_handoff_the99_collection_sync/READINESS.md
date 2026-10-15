# READINESS — Collection Sync (R2)

**🟢 R2, approved by Hugh (LGTM, 2026-10-15).** Hugh audited R1 on 2026-10-15: two changes (the desktop cards' left gutter, `Kept from The 99`), everything
else approved. Both are made in R2; see README §R2.

## Locks held

| Lock | How R1 holds it |
|---|---|
| No data changes before confirm | Every figure is the dry run; choice, follow-up and conflict answers write nothing. |
| Tokens are synced, Replace's way | One line, no choice, no conflict; same transaction; a failure writes nothing. |
| File-only changes taken, app-only kept | `from the file` and `kept from The 99` tiles and lists. |
| A conflict is the player's call, per card or in bulk | Radios per row, nothing pre-picked; two bulk presses acting on all conflicts. |
| One History entry; Revert takes it back | `Sync upload`; shipped Revert and `Revert what’s left`. |
| Replace and Add unchanged | Same words, order and behaviour; Sync third. R2's desktop card layout applies to all three cards (Hugh's call). (Step title: G10.) |
| First-run never shows Sync | First import still skips the choice. |
| Hit targets, keyboard, screen reader | Cards and radios ≥44px; roving radios; held button jumps to the first card left; tiles a polite live region; row names carry the counts. |
| Switch | Off: shipped Replace flow. |

## Open questions, called

1 Sync, `Sync my collection` · 2 three equals, none picked, Sync third, disabled with reason · 3 a section on top of the
review, radios per card, bulk with counts, button held · 4 banner on the step, follow-up after the cards, additions
first · 5 four tiles, agreed in nothing to do · 6 cards · 7 summary clause, `Sync upload` · 8 disabled · 9 one line ·
10 nothing to sync / record tokens.

## For the audit

G1 (the choice figure counts copies), G3 (Revert leaves tokens), G10 (the step title changes) are the three calls most
worth checking. Full gap report in README.
