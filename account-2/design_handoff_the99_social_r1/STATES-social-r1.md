# STATES — Social R1 (friends and pods)

Every R1 state in the brief's §Every state to draw, plus the ones the design adds. D = desktop board, P = phone board.
Both widths carry every state; where the phone board omits a frame, the desktop frame's rules hold unchanged.

## Placement

| State | Drawn | Rule |
|---|---|---|
| Account menu, switch on | Placement A (popover), B (sheet) | `Friends` second, under About; a link; no badge. |
| Switch off | Placement D | Row absent; `/friends`, `/invite/*` not found. |
| On `/friends` | every Friends frame | No rail slot or tab current. |

## Friends (`/friends`)

| Brief state | Drawn | Rule |
|---|---|---|
| No friends yet | Friends F1 (D, P) | Empty box; no Pods, no Open links. Must not offer search. |
| One friend | Friends F3 | Arrived from Accept: receipt strip, `since today` in `--success`. Pods section appears, empty. |
| Many friends | Friends F4 | By name. A row is initials, display name, `since`, `…`. Nothing else about a friend. |
| A friend since removed | Friends F7 | Absent from the list and from pods you own; no toast. Old game rows keep the snapshot (R3). |
| Changing your name | Friends F5, Invite I4, Landing L2 | Inline field; blur commits a valid value; 30 max. |
| Remove friend confirm | Friends F6 | Delete pane in the row's `…` menu; silent. |

## Invites

| Brief state | Drawn | Rule |
|---|---|---|
| None open | Friends F1 | Section absent. |
| Some open, time left | Friends F2, F4 | `N days left`, then `Under a day left` in `--warning`. |
| 10 open (refused) | Friends F8 | Button held + reason line; race → `tooMany` toast, no retry. |
| Revoked | Friends F2 note | Row leaves at once; no confirm; the link's page then reads ended. |
| Expired | — | Leaves the list; its page reads Landing L3. |
| Redeemed | Friends F3 | Leaves the list; the friend appears. Inviter sees no receipt. |
| Declined | — | Leaves the list, untold. |
| Making a link | Invite I5 | `Making a link…`, held; dialog opens with the token. |
| New link | Invite I1 (D), P1 (P) | QR first; link + Copy; Share on phone; `Works once · expires …`. |
| Copied | Invite I2, P3 | `✓ Copied` 2s, status line. |
| Shared (phone) | Invite P2 | The OS share sheet; nothing recorded. |
| Show an open link | Invite I3, P4 | Same dialog on that token. |
| Create failed | Invite I6, P5 | Toast, `Try again`. |

## The join landing (`/invite/[token]`)

| Brief state | Drawn | Rule |
|---|---|---|
| Signed out | Landing L1 | Public route, reads nothing, no name; Sign in only (invite-only app). |
| Open | Landing L2 | Names the inviter; Accept / Decline; name line; `isn't told if you decline`. |
| Expired | Landing L3 | No name; `Ask for a new one`. |
| Redeemed (already used) | Landing L4 | One ended card, no name. |
| Declined | Landing L4 | Same card. |
| Revoked | Landing L4 | Same card. |
| Not found | Landing L4 | Same card, by design (`readInvite` null). |
| Your own link | Landing L5 | No Accept/Decline; Copy link; the link stays open. |
| Already friends | Landing L6 | Names the friend; no Accept; opening it spends the link (G4). |
| Accepted, and where you land | Friends F3 | `/friends` with the receipt. |
| After Decline | Landing L7 | `Invite declined`; Go to Home. |
| Accept failed | Landing L8 | Toast, `Try again`; card stays. Spent mid-press → redraws L4. |

## Pods

| Brief state | Drawn | Rule |
|---|---|---|
| No pods | Pods P1 (D, P) | Empty box under the section head; New pod in the head. |
| Create | Pods P1, P1b (P) | Inline field; Create disabled while empty; 40 max. |
| A pod with only you | Pods P2 | `Just you · yours`; one chip; next-step line. |
| A pod you own | Pods P3 | ✕ on each other member, no confirm; + Add friends. |
| Add members | Pods P4 | Your friends not in the pod; held at 0; two empties in note. |
| A pod you're in, not owner | Pods P5 | Chips only; menu = Leave pod. |
| Not a friend after a hand-on | Pods P5, P11 | Name + `not a friend`; nothing to press but the owner's ✕. |
| Owner's menu | Pods P6 | Rename · Leave pod · Delete pod. |
| After you leave, the owner changes | Pods P7 (confirm), P11 (new owner's view) | Confirm names the next owner; nobody told. |
| Last member leaving deletes | Pods P8 | `Leave and delete`. |
| Delete (owner) | Pods P9 | `No friendship changes, and nobody is told.` |
| Rename | Pods P10 | Head becomes the field. |
| Spares shared on / off | Pods P3 (on), P5 (off) | Per pod, per reader, unticked by default. |
| Pod write failed | — | Toast, `We couldn't change that pod. Try again.` |

## R2 additions

| State | Drawn | Rule |
|---|---|---|
| No commander chosen | R2 Friends F1 (D, P) | Dashed + tile and `Choose your commander`; initials everywhere. |
| Picker, before typing | R2 Friends F2 | Your decks' commanders first; one press picks and closes. |
| Picker, searching | R2 Friends F3 | Any catalog commander, pips; `Use initials instead` once set. |
| Faces in rows and chips | R2 Friends F4, F5 | 40px rows with commander name; 26px chips; initials fallback (Jo). |
| Name edit | R2 Friends F6 | Only here. |
| Friend link dialog / sheet | R2 Invite I1 to I5, P1 to P5 | `Add a friend`, no name line, `/friend/` path. |
| Friend request card, every state | R2 Landing L1 to L8 (D, P) | Face up: open, no-commander sender (L2b), your own, already friends. Face down: signed out, expired, ended, after Decline. |
| Pods, A or B | R2 Pods (D, P) | Both drawn; Hugh to choose. Add friends list with faces. |
