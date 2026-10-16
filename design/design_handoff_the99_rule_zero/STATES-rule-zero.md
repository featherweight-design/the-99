# STATES — Rule 0 table check

Every state in the brief's §Every state to draw, and the ones the design adds. Phone frames are on the `*-Phone`
boards (E, U, T, S, L), desktop frames on the `*-Desktop` boards (F, V, D, W, H). Both widths carry every state; where
a desktop board omits a frame, the phone frame's rule holds unchanged at 1300.

## Entry

| State | Drawn | Rule |
|---|---|---|
| Switch off (or friends off) | E4 | Absent: no pod row, no Home card, the table link is not found. No space kept. |
| A pod, no open table | E1, F1 | `Rule 0 check` row at the foot of the pod card, for any member. Opens setup. |
| A pod with an open table | E2, F2 | The row becomes `Tonight's table` with faces and closing time; opens the table. One per pod. |
| Seated, didn't set it | E3, F3 | Home's Friends section: the table card until it closes. |

## Setup

| State | Drawn | Rule |
|---|---|---|
| Choosing the pod | E1 | The pod is chosen by starting from its card. |
| Choosing who plays | U1, V1 | Members as art seats, You in; tap to seat; footer count and `Next: decks`. |
| Fewer than 2 seated | U2 | Next held; `Seat one more player. A game seats 2 to 8.` |
| 8 seated | U2 rule | Unseated tiles held; `A game seats up to 8.` |
| A member with no decks | U1 (Chris) | Dimmed, `no decks yet`, not seatable. |
| A member not on the app | U1, V1 | Dashed row into Add a friend › Invite someone new. Not redesigned. |
| A deck for each seat | U3, V2 | One row per seat; friends' decks by name and commander only; `Set the table`. |
| A friend's decks | U4, V3 | Same sheet, back arrow; `Leave it to Peter`. |
| A seated member who isn't your friend | U3 (Max) | `Max picks his own`; no control; their decks are never listed (G3). |

## The read

| State | Drawn | Rule |
|---|---|---|
| Balanced | T1, D1 | Every seat within a bracket's distance of zero from the middle; headline says so; no tags. |
| One outlier, high | T2, D2 | Amber, ▲, `Above the table`; sentence and lifted counts on the seat. |
| One outlier, low | T3, D3 | Steel blue, ▼, `Below the table`; the sentence says counts can miss cards. |
| Two outliers (2, 3, 3, 4) | T4, D4 | Both flagged, each in its own ink. |
| Two-seat split | T5, D5 | Violet `Split` on both; no band on the rail. |
| Range seat, undeclared | T6 (Peter), D6 | Range chip; `not declared · measured from Core`; a span on the rail. |
| Range seat, declared | T6 (Colin), D6 | The answer's chip; `declared Optimized · reads Optimized or cEDH`. |
| Range seat, drifted declaration | T7, D7 | Range chip; `declared Exhibition, outside this reading · measured from Optimized`. Never compared as a 1. |
| No reading yet (short of 100) | T8 (Peter), T10 | `87 of 100 cards`, a bar; left out of the read. |
| Not legal now (over 100) | T8 (Max) | `101 cards, over 100`; its old reading is not used. |
| A reading from before an edit | T8 (Colin) | Chip kept, `from before its last change` in warning. |
| Legal, never read | T9, D9 | `Reading this deck` with a spinner; joins in a second or two. |
| Waiting for its player | T10 (Max) | `picks their own deck on their phone`. |
| Not enough decks to compare | T10, D10 | `Nothing to compare yet.`; no rail. |

## The suggestion and other seats

| State | Drawn | Rule |
|---|---|---|
| The suggestion (high) | S1, W1 | On the flagged seat, its own player only: up to three own read decks nearer the middle, `Swap in`. |
| The suggestion (low) | S6 | Same, the other way. No nearer deck: block absent. |
| After a swap, the swapper's phone | S2, W2 | Seated at once; read redraws; toast `Swapped to Sai Thopters.` with Undo; `changed just now`. |
| Change deck | S3, W3 | Own seat only; sheet (phone) / anchored panel (desktop); nearest first. |
| What another seat sees | S4, W4 | Same read; own seat is the only control; non-friend seat shows its chosen deck only. |
| After a swap, another seat's phone | S5, W5 | On the next check (20 s poll, focus, refresh): changed dot on the seat and `Since you looked` on the read. |

## Logging and after the night

| State | Drawn | Rule |
|---|---|---|
| Logging from the table | L1, H1 | `Log this game` under the seats / closing the read's column. |
| The pre-filled game log | L2, H2 | Your seated deck's Games tab, form open: from-the-table line, pod size = seated, every other seat with its deck. |
| Games switch off | L3 | No log button, no space kept; the table still works. |
| Expired | L4, H3 | `This table has closed`; logged games stay; pod row and Home card gone. |
| Save refused | — | Unchanged: the log form's shipped refusal. A table action that fails uses the shared toast. |
