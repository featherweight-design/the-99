# STATES — Friend links R1

Every state the brief asks for, plus the ones the design adds. Phone and desktop carry every state; where a desktop
board omits a frame, the phone frame's rule holds unchanged.

## /friends (Friends-Phone, Friends-Desktop)

| State | Drawn | Rule |
|---|---|---|
| 0 requests | F0 | No Waiting on you section, no badge. Add a friend with no line under it. |
| 1 request | F1 | Row: face, FRIEND REQUEST + diamond + age, `Colin wants to be friends`, how they came, Accept / Decline. Badge 1. |
| Several requests | F3 | Newest first; a seen one loses its diamond but still counts. `Waiting on you · 3`, badge 3. Past five: Show all. |
| Accepted / declined | F4 | Receipt in the row's place for the visit; accepted friend joins the list. Badge drops. |
| No friends yet | F5 | Shipped empty card, new first sentence. |
| A newcomer lands | S3 | Shipped receipt band: `Your friend request went to {owner}.` (Q1) |
| A request plus spare asks | — | Friend requests first, then spare requests, then trade matches. |

## Add a friend (Add-Phone, Add-Desktop)

| State | Drawn | Rule |
|---|---|---|
| Link, QR and code | A1 | One screen. Share leads on a phone with a share sheet; Copy leads on desktop. |
| Invites left | A1 | `Someone new to The 99 joins with one of your invites · N invites left` |
| Out of invites | A2 | `Out of invites: players on The 99 can still add you, but someone new can’t join through it yet.` Nothing held. |
| Typing a code | A3 | Focus ring on the next box; Send request off. |
| Six characters | A4 | Send request on. |
| Sending | — | `Sending…`, boxes and press held (in the component). |
| Request sent | A5 | Replaces the boxes, with the friend's face. Enter another code. |
| Not a code | A6 | Danger boxes and line; never says whether the code once existed. |
| Your own code | A7 | `That’s your own code. Type a friend’s.` |
| Already friends | A8 | `Nothing to send.` |
| They had asked you | A9 | Answers their request: friends, success wash; their row leaves Waiting on you. |
| Copy failed | — | Shipped: the field is selected for a long press. |

## Reset (Reset)

| State | Drawn | Rule |
|---|---|---|
| Confirm | R1 | In place: link dims, the box asks; Reset link and code (danger), Keep them. |
| Resetting | R2 | `Resetting…`, held. |
| Done | R3 | New plate, link, code; success line. |
| Failed | — | Shared toast with Try again; the old link and code stay. |

## Opening a link, signed in (Landing)

| State | Drawn | Rule |
|---|---|---|
| Request sent | L1 | Opening sends it. Go to Friends; Withdraw request. |
| Opened again / declined earlier | L2 | Same screen + sent date; nothing new sent (G2, G3). |
| Withdrawn | L3 | Card turns down; owner not told; Send it again. |
| Owner had asked you | L4 | Opening answers it: friends. |
| Already friends | L5 | Shipped title; `Nothing to send.` |
| Your own link | L6 | Shipped own-link card, new body. |
| Reset or not found | L7 | Shipped ended card, face down, names nobody. |

## Opening a link, signed out (Signed-Out)

| State | Drawn | Rule |
|---|---|---|
| Owner has invites | S1 | Card face up on the owner (Q2); Join The 99, Sign in. |
| Owner out of invites | S2 | Sign in alone; fine line says why. |
| Join | — | The shipped newcomer flow (`/join`), unchanged, on the owner's invite (G6). |
| Reset or not found | L7 layout | Ended card, no shell, Sign in. |

## Header avatar (Avatar)

| State | Drawn | Rule |
|---|---|---|
| Signature card chosen | V1 | Art in the header button's accent frame (phone) and the rail's round button. |
| None chosen | V2 | Display name's initials, as Home draws them. |
