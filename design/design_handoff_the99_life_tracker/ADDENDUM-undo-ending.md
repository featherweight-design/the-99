# Life tracker addendum: Undo a mistaken ending (account 2, 2026-11-21)

Canvas: https://claude.ai/artifact/9PFoKAYvCXK8QijxU3XVZs (Version 24), page "Flow · direction C", rows from y=19400
("Addendum · Undo a mistaken ending").
Status: **APPROVED by Hugh 2026-11-21.** Everything in the approved handoff and the undrawn-states addendum stays locked;
this only adds a way back from the Result.

The problem: when a change knocks out the second-to-last player, the game ends and the Result opens. The only way back
was the 2-second pending window. One mis-tap on the wrong seat ended a real game for good.

Boards are the approved F10, F11, F18 and S5/S6 boards with only this state's change. Generator:
`scratch-gen/gen_undo.py` (reads the live boards, writes `U*.dc.html`).

| Board | State | What it settles |
|---|---|---|
| U1-Undo-Phone / -Tablet | The Result with Undo | One full-width button right under the winner: the strip's Undo icon, **Undo the last change**, and a mono line naming the change that ended the game ("You −3 life, to 0 · round 4"). 60px tall, the whole row is the button. Tablet: the same column, centred (READINESS). |
| U1-Draw-Phone | A draw from one change | The same row puts every player that change knocked out back ("Colin and you −4 life · round 6"). |
| U1-Six-Tablet | 6 players on the tablet | The column still fits 820px: hero 150px, out rows 50px. |
| U2-Back-Phone / -Tablet | After Undo | The tracker exactly as it was before that change: the seat flips face up at its old life; turn, round, monarch, initiative, counters and history are as they were. The shipped centre-slot toast (`ToastFrame`, `role="status"`, 8 s): **Game back on**, detail "Undid You −3 life · round 4". No action on the toast. |
| U3-Logged-Phone / -Tablet | Someone seated has logged it | Undo is gone. Its slot holds a note: "Colin logged this game at 10:41 pm, so this ending stays." Log this game stays for everyone else. |
| U4-SixAM-Phone / -Tablet | Past 6 am | Undo, Log and Rematch are gone (the table has closed). One note in Undo's slot: "This table stopped logging at 6 am, so this ending stays. Log it from your deck's Games tab." Then Back to Friends. This also draws the lapsed-window line READINESS listed as written but undrawn. |
| U5-Card-Phone / -Desktop | The Result was closed | The S6 Last game card on the table page carries the same Undo row, so a mistake spotted after closing the Result can still be undone. It lands back in the tracker, with the U2 toast. |

## Decisions (for Hugh)

1. **What Undo restores: the last change only.** The change that ended the game is by definition the last one, so one
   tap fixes the mis-tap. A pick from history is one more step at a crowded table, and once play is back the strip's
   Undo and Table › History already reach further back. One control per action.
2. **No confirmation.** Undo only reverses one change and puts the game back exactly as it was; ending it again is the
   same tap that ended it. A confirm would add a second tap to the fix, not to the mistake.
3. **Still offered after the result is saved?** Yes. The saved table result (Hugh's 2026-11-20 ruling: a server record
   so everyone seated gets the prefill) is taken back by Undo and written again when the game next ends.
4. **No longer offered** once any of these happens, and the slot says why (U3, U4):
   - anyone seated logs the game (their `deck_games` row exists, and we can't take back someone else's log);
   - 6 am passes (the table has stopped logging, so a reopened game could never log from it);
   - **Rematch** or **Start the game** starts the next game (S6: Rematch starts it at once). There is no Result then,
     and the table page shows the game in progress, so nothing needs drawing.

## Copy (final, for `/copy-review`)

| Where | Copy |
|---|---|
| Undo button | **Undo the last change** (matches the strip's label) |
| Its line, life | `{Name} −{n} life, to {life} · round {r}` ("You" for the device owner) |
| Its line, commander damage | `{Name} +{n} commander damage from {Commander}, to 21 · round {r}` |
| Its line, poison | `{Name} +{n} poison, to 10 · round {r}` |
| Its line, several in one change | `{A} and {b} −{n} life · round {r}`, or `{A}, {b} and {c} −{n} life · round {r}`; if the amounts differ: `{A} −{n} and {b} −{m} life · round {r}` |
| Its line, concede | `{Name} conceded · round {r}` |
| Its line, End game by hand | `Ended by hand: {Name} won · round {r}` / `Ended by hand: a draw · round {r}` |
| Toast title | **Game back on** |
| Toast detail | `Undid {the line above}` |
| Logged note | `{Name} logged this game at {time}, so this ending stays.` (`You logged…` for the device owner) |
| 6 am note | `This table stopped logging at 6 am, so this ending stays. Log it from your deck's Games tab.` |
| Undo's accessible name | `Undo the last change: {the line}` |

## Rules for engineering

- **The ending change:** the reducer already keeps history entries; the game-ending entry is the one whose landing made
  1 or 0 players left (or End game, or a concede). Undo pops exactly that entry, including every pending delta that
  landed with it (the draw case), and restores the snapshot from before it.
- **Saved result:** Undo deletes or supersedes the table's result record; the next ending writes a new one. If the
  record has been logged against by then (a race with another seat's log), the delete is refused and the Result shows
  the U3 note, with no toast.
- **Logged:** read from the server table result (which seats have logged), checked when the Result or the Last game card
  opens and before Undo writes. The device owner's own log counts at once.
- **6 am:** uses the same `how.logOpen` window as S4; past it the Result is U4 and the card has no Undo.
- **Reduced motion:** the panel's un-flip is the Out flip reversed (0.45 s), off under `prefers-reduced-motion`.
- **Where Undo lives:** the Result and the Last game card only, and only on the device that holds the game.
