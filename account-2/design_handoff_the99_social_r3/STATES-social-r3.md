# STATES — Social R3 (opponents and matchups)

Every R3 state in the brief's §Every state to draw › Game log, the four Hugh named in his brief message, and the ones
the design adds. D = desktop board (F, M frames), P = phone board (P, MP frames). Both widths carry every state; where
the phone board omits a frame, the desktop frame's rule holds unchanged.

## The log form (Across the table)

| State | Drawn | Rule |
|---|---|---|
| Games off (switch, or friends off) | F9, P8 | Row absent, no space kept. The form is the shipped form. |
| No friends: only anyone seats | F1, P1 | Field reads `Any commander`; commanders only; no pods; nothing points at friends. |
| No pod | F1, F5, F6 | No `Seat a pod` chips. |
| Picker before typing, with friends | F2, P2 | Friends by face, name, deck count; typing adds Commanders under them. |
| A friend's deck | F3, P3 | Friend → decks (name and commander), newest first; one press seats both. |
| A friend with no decks | F4 | One sentence, then `Pick a commander` and `Just Jo`. |
| A friend alone / with another commander | F3, F5 | `Just Dave`; `Another commander` searches the catalog. A friend seat has no label. |
| Anyone by commander, without a label | F8 (last seat) | Seated at once; `Add a name` under it. |
| Anyone by commander, with a label | F1 (Lee), F5 typing, P4 | Label field in place, 30 max, counter shown. |
| A friend already seated | F2 rule | Dimmed `seated`, `aria-disabled`. |
| Pod quick-seat | F7, P6 | Seats the pod's friends, sets pod size; `Which deck?` per seat; a non-friend leaves a dashed seat. |
| Who won on a loss | F6, P5 | Trophy per seat (phone: `Won` pill); one at most; press again clears; leaving Lost clears it. |
| Full pod | F8, P7 | Pod 8, seven seats, `7 of 7 seats`; no dashed seat. |
| More opponents than seats | F8, P7 | Cannot be sent: seats are pod minus one. Smaller pod sizes held (`aria-disabled`), one line says why. |
| Seats full, pod smaller | F8 rule | Lowering drops empty seats first, then holds. |
| Save refused | — | Unchanged: `MutationError` under the buttons, nothing cleared (STATES-log-form state 12). A friend seat that no longer resolves (`SeatRefused`) is this refusal. |

## The Games tab

| State | Drawn | Rule |
|---|---|---|
| No games | — | The shipped empty state; Matchups absent. |
| Games, no opponents recorded | M1, MP1 | `recorded in 0 of N games` and one dashed line; no switch. |
| Mostly one-game cells, by commander | M2, MP2 | One square per game; caption line when most rows are one game. |
| By colors | M3 | Pips plus the identity's name; a game counts once per identity. |
| By friend, every row one game | M4, MP3 | Snapshot name; face from the commander played; labels are not friends. |
| A row past ten games | M5, MP4 | `7 W · 5 L` beside `12 games`. |
| A friend later removed | M2, M4 (Alex) | Reads exactly as before: snapshot name and deck. |
| A deck renamed since | M2 (Dave's `Sokka Tempo`) | History keeps the logged name; the picker shows today's (F3). |
| A friend's account deleted | Gap G5 | One row per game under the same name; not drawn. |
| History row with opponents | M2, MP2 | `vs` line under the marks; trophy before the winner. |
| History row without | M1, M2 (older games) | No line, nothing reserved. |
