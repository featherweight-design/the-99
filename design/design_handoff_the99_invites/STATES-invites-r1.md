# STATES — Invites R1 (invite-only launch)

Every state in the brief's §Every state to draw, plus the ones the design adds. Phone and desktop carry every
state; where a desktop board omits a frame, the phone frame's rule holds unchanged.

## Add a friend (Add-Phone, Add-Desktop)

| Brief state | Drawn | Rule |
|---|---|---|
| The chooser | A1, D1 | Two cards; card 2 holds the count (hand + line). Sub: nobody is looked up. |
| Path 1 as today | A3 (making), A4, D3 | Card 1 makes the link (same action, hold, toast); the shipped sheet/dialog + ‹ back. |
| Path 2 with N invites | A5, D4 | QR press (filled), “or”, email field + Send (outlined until an email). Count as the sub. |
| Path 2 at 0 | A2, D2 | Card 2 dashed, greyed, aria-disabled: Out of invites. Card 1 unaffected. |
| 10 friend links open | Friends C6 | Card 1 held with the shipped hold sentence; Add a friend and card 2 stay live. |

## The remote form (Email-Phone, Email-Desktop)

| Brief state | Drawn | Rule |
|---|---|---|
| Empty | A5, D4 | Placeholder; Send outlined. |
| Not an email | E1 | Shape check only, field error line, role alert. No server call. |
| Sending | E3 | Field and both presses held; the same wait for every email (G1). |
| “Invitation sent” | E4 | Replaces the field. Identical whatever happened. Count: −1 left, +1 waiting. |
| Last invite sent | E5 | Same answer; QR press held; Invite someone else gone; “That was your last invite.” |
| Send failed | E6 | Transport only: ToastFrame, Try again; field keeps its text. |

## The invite QR, sender side (QR-Phone, QR-Desktop)

| Brief state | Drawn | Rule |
|---|---|---|
| Live with its countdown | Q1 | Ring drains over 15:00; `mm:ss left`; count reads “1 held by this QR”. |
| Last minute | Q2 | Ring and time in --warning. No extra press. |
| Claimed | Q3 | At the newcomer's Send code: “Invitation sent”, card back; held → waiting. |
| Expired | Q4 | Plate greyed under EXPIRED; invite back; Make a new QR. |
| A new one made | Q5 | Fresh token, full ring. |
| Sheet closed while live | Friends C4 | QR stays live and holding; Show an invite QR re-shows it. |

## The newcomer's phone (Newcomer)

| Brief state | Drawn | Rule |
|---|---|---|
| The email screen | N1 | Sender's card face up; Your email; Send code; fine print (sender won't see it; 15 min). |
| Code sent | N2 (sending), N3 | Send code claims the QR; 6 boxes; address repeated; resend cooldown; other email. |
| Code entered, wrong | N4 | Danger edge + line; cap on tries → N12. |
| Code expired | N5 | Line + Send a new code leads. |
| Handover to sign-up | N6, N7 | Check on the card; Continue to sign-up → Clerk on the ticket, email locked. |
| Landed | N8 | /friends, shipped receipt band “You and Hugh are friends.” |
| Already has an account (after code) | N9 (A, recommended), N10 (B) | For Hugh A. Sender's view unchanged either way. |
| QR expired | N11 | Back dimmed; names nobody; quiet Sign in link. |
| QR used / revoked / not found / too many tries | N12 | One ended card; names nobody. |
| Redeemed after the sender reached 0 | — | Cannot happen: an open QR holds its invite (locked). |

## /friends (Friends-Count)

| Brief state | Drawn | Rule |
|---|---|---|
| Invites left | C1 (D), C3 (P) | Mono line under Add a friend; right-aligned at desktop. |
| With a waiting / held invite | C1, C4 | `· 1 waiting`, `· 1 held by an open QR`. |
| None | C2 (D), C5 (P) | Out of invites, --fg-faint; the press stays live. |

## Uninvited visitors

| Brief state | Drawn | Rule |
|---|---|---|
| Invite-only page, both widths | Invite-Only I1, I2 | Fanned card backs, BY INVITATION; Sign in; invitation-email line. Signed in → Home. |
| Waitlist (option only) | W1, W2, W3 | Not recommended; its own uniform answer. |
| Friend link, no account | Friend-Link L1 (both) | Unchanged but signedOutFine. |

## /admin (Admin-Desktop, Admin-Phone)

| Brief state | Drawn | Rule |
|---|---|---|
| Counts in the list | M1 | Invites (+ waiting) and Invited by columns; “founder”. |
| An account's count set / refilled | M2 | Invites tile; field sets the stock; pending sentence; Save/Undo; history; whom they invited; waiting + Revoke. |
| A group's count | M3 | Top up invites to N: raises, never lowers; no stored group count; history line. |
| The tree | M4 | Invites tab; founders root; rail lines; waiting leaves with Revoke. |

## About

| State | Drawn | Rule |
|---|---|---|
| New entry, desktop and phone | About · Invites Entry | §G template; specimen = the chooser. |
| Friends and pods edit | same board | One sentence; no bump of its own. |
