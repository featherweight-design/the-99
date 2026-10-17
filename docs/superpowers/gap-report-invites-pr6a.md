# Gap report: invites PR 6a (admin M1 to M3)

Property table: `docs/superpowers/design-tables/invites-pr6a.md`. Agent 2 found 22 visual gaps and 5 state gaps (M4, the
Invites tab, is PR 6b and out of scope). Borrowed pieces follow the shipped component, as the table's preamble directs.

## Fixed

1. Desktop Invites cell figure, and zero-with-waiting figure: `--fg`.
2. Desktop Invited-by name: `--fg`.
3. Phone meta (part): the invites figure is an `<i>` in `--accent`, zero included (`phoneInviteMeta` returns parts).
4. Phone invites figure accent: as 3.
6. Section labelling: `aria-labelledby` its h2 (`SectionHead` takes an `id`), M2 and M3.
7. Card gap: 10px phone, 12px desktop.
9. Field width: 120px desktop.
10. Field border: `--accent` while edited, `--border-strong` at rest (M2 and M3).
13. Who rows: min-height 44px phone, 40px desktop.
14. Who rows: 13px phone, 13.5px desktop.
15. Invited-by and invited face: 26/28px, radius 7px, `--border-strong`.
16. Waiting face: 26/28px, radius 7px, 1.5px dashed `--border-dashed`.
17. Joined, sent and returns dates: desktop only, inline after the text, gap 10px.
18. Founder: no invited-by row.
19. Open and Revoke: min-height 32px from `md`, 44px on the phone.
20. Waiting address in `b` 500 `--fg` on desktop.
21. Phone waiting line drops how it was sent (`waitingPhone`, new for /copy-review).
22. Phone help line for Top up (`groupHelpPhone`, new for /copy-review).

State gaps 1, 3 and 4 are closed by 10 and 18.

## Kept, with the reason

- **3 (structure)**: the phone meta stays the shipped stacked row's one `·`-joined line at 10.5px. The table names the
  shipped row as the reference where they differ.
- **5**: the Invites tile is the fifth, after the shipped Tuning hub tile, which the board predates; 5 columns at 1300.
- **8, 12 and state gap 4 (pending)**: the board's amber pending sentence describes the group editor, and the shipped
  `GroupEditor` draws a pending bar (accent border, sentence, Undo and Save) instead. The shipped piece is the reference,
  so Save and Undo sit in that bar rather than beside the input.
- **11 and state gap 2**: `INVITES_MAX` is 1,000, decided for the plan (the board's 100 was a placeholder).
- **State gap 5**: with nobody to raise, the bar says Top up changes nothing and the press is disabled. The board draws
  no such state; a field that silently does nothing would be worse.
