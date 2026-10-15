# READINESS — Social R3 (opponents and matchups)

**🟢 Approved.** Hugh approved R1 on 2026-10-15 with one change: the stand-in pictures became real commander art
(Zimone, Rootha, Jace, Heroes in a Half Shell, Sai, Captain America), cropped from the app's precon grid, with the
Colors boards using those commanders' own identities. G4 (no label-only anyone seat) and G5 (a deleted account's
friend rows) ship as drawn. Engineering still confirms G1, G6, G7 and G9 (commander image focus, which also covers Social R1) in the plan.

## Locks held

| Lock | How R1 holds it |
|---|---|
| Seats from 1 upward, fewer than the pod | Seats are pod minus one; the form never offers more; a smaller pod is held when seats are full. |
| Friend / friend's deck / anyone (commander + label ≤ 30) | One picker gives all three; the label only on an anyone seat, `maxLength` 30. |
| Optional won on a loss, at most one | Trophy per seat on Lost only; a press moves it; cleared when the result changes. |
| Snapshot at log time | History and matchups draw only the snapshot; removed friend and renamed deck drawn; no live face after the picker. |
| A friend's deck only through your friendship | The picker lists your friends' decks and nothing else; `listFriendDecks` on pick. |
| Matchups by commander, identity and friend, counts with totals, never a rate | Squares or `W · L` counts beside `N games`; denominator on the heading; ordered by games then name. |
| No model calls | The label is typed and drawn; nothing reaches a prompt. |
| Phone and desktop parity | Every state at both widths; 44px presses; the switch and pills inside 44px bands. |
| Accessibility | Seats are buttons with names; trophies `aria-pressed`; pod sizes held with `aria-disabled` and a `role="status"` line; the picker is a dialog with a listbox; squares `role="img"` with a spoken record. |

## Open questions, called

1 a section of the form under Result and Pod size, drawn as the table, one dashed seat · 2 one picker, one field for
friends and commanders, a friend opens their decks, anyone gets a label inline, pod chips quick-seat · 3 a trophy per
seat on a loss · 4 Matchups between findings and History, one list at a time · 5 one square per game, counts past ten.

## Engineering needs

- The seat row and picker in `game-log-form.tsx`, sending `opponents` to `logGame` (already accepted behind the switch).
- `listFriends`, `listPods` (member count) and `listPodSeats` for the form; `listFriendDecks` on pick (G7).
- `listGameOpponents` and `summarizeMatchups` into the Games panel; the `vs` line in `game-history-row.tsx`.
- A catalog commander search for the picker (the new-deck picker's search, without the owned-only filter).

## For the audit

Decisions 1 (where the row sits and that You is drawn), 3 (the trophy) and 5 (squares, not ratios) are the calls most
worth checking. G4 and G5 need a word from Hugh.
