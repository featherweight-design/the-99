# Life tracker addendum: the undrawn states (account 2, 2026-11-20)

Canvas: https://claude.ai/artifact/9PFoKAYvCXK8QijxU3XVZs (Version 19), page "Flow · direction C", rows under the icons.
Status: **DRAFT, awaiting Hugh's review.** Everything in the approved handoff stays locked; this only draws the states
READINESS.md listed as 🟡 not drawn.

Table-page boards are drawn over the shipped Rule 0 table (`table-body.tsx`, `table-seat.tsx`, `table-closed.tsx`)
in Low Sun, with the shipped phone tab bar and desktop rail cut from the About captures (`art/tabbar.png`,
`art/rail.png`). Tracker boards are the approved F boards with only the state's change. Generator:
`scratch-gen/gen_states.py`.

| Board | State | What it settles |
|---|---|---|
| S1-Seven-Phone / -Desktop | 7 or 8 seated | `Start the game` stays in place, `aria-disabled`, with the reason under it: "The tracker fits up to 6 players, and 7 are seated. Clear a seat in Seats to start it." The table's own cap stays 8; Log and Close are unchanged. |
| S2-Waiting-Phone / -Desktop | A seat still picking its deck | Doesn't block Start. The sub line says what happens: start now and the seat plays on a plain panel, or wait for their art. The seat itself is the shipped waiting seat (initials, dashed note). |
| S2-WaitingPlay-Phone / -Tablet | That seat in play | A plain panel: `radial-gradient(--elevated, --surface)`, no art, the name plus "no deck" (tablet: "no deck picked"). Not the grey out art, which means out at the table. The same ground replaces the tablet boards' off-theme `.guest #1A2230`. |
| S3-Resume-Phone / -Desktop | A saved game, back on the table page | A reload inside the tracker goes straight back into the game. On the table page, a "Game in progress" card replaces Start: faces with life (out shows Out, the active seat ringed), round and time, "Saved on this device…", **Back to the game**, and **Discard this game** (shipped Undo toast, no confirm). Phone: top of the page. Desktop: top of the right column. Only the device holding the game shows it. |
| S4-Closed-Phone / -Desktop | The table closed mid-game | Play is never interrupted: seats are snapshotted at Start. The shipped closed page adds the same game card above Log this game. |
| S4-ClosedResult-Phone / -Tablet | The result after the close | A note above Log: "You closed the table at 10:12 pm. This game still logs from it until 6 am." Back to the table becomes Back to Friends. After a reseat, the log fills from the snapshotted seats, not the table's new seats. |
| S5-EndGame-Phone / -Tablet | Ending a game by hand | Table tab › End game asks "How did it end?": one art tile per player still in ("Colin won") plus **A draw**. One tap goes to the result. On the tablet the sheet covers the holder's half. |
| S5-Draw-Phone / -Tablet | The draw finish screen | Split hero art of the drawn players with an equals mark, "A draw", how and when. "Out, last first" lists the rest. Log this game prefills `result: draw` with no `won` seat; earlier outs log a loss. The tablet result is the phone column, centred (READINESS). |

## Rules for engineering

- **Draw triggers:** End game › A draw, or the last players all go out in the same change (the result waits for the
  2-second pending changes to land; if nobody is left, it's a draw).
- **Snapshot:** seats, decks and art are copied at Start. A reseat, a deck change, a late deck pick or a close
  doesn't change a running game. The log prefill uses the snapshot's players, which matters once seat numbers are
  reshuffled (decision 5 carries seat numbers only: the plan must map the snapshot, not the live seats).
- **Closed table:** a host close keeps logging until morning (`how.logOpen`). If the window has gone, the result's
  Log this game is replaced by the line "This table stopped logging at 6 am. Log it from your deck's Games tab."
  (not drawn; same slot as the closed note).
- **Resume card:** only on the device whose local storage holds the game for this table id.

Copy is DRAFT for `/copy-review`.
