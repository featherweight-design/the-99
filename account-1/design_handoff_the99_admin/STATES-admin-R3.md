# STATES: Admin R3 (masking personal data)

Every frame is drawn at 900 and 390; TH draws A2 in the six themes. `scene` is the prop on `R3/AdminR3.dc.html`. R2's STATES stand for everything not listed here. `‹ ›` marks illustrative values.

## Accounts list (A)
| Id | Scene | State | What draws |
|---|---|---|---|
| A1 | `list` | masked list | sub `‹6› accounts on ‹production›. Names and emails are masked; Show reveals one account and logs it.`; field `Name, or a whole email`; every row masked (D1, D2), no Clerk id; Show on every row but the owner's. Phone: Show at the row's right (44px); spend moves to the end of the meta line |
| A2 | `revealed` | one account shown among masked neighbours | Colin's row: accent ring, raised surface, full name, email, Clerk id, `Shown and logged · hides at ‹19:42› UTC`, `Hide`. Neighbours unchanged; his `Invited by` stays masked |
| A3 | `hit` | exact email found | field holds the address, accent border; `One account holds this email.`; one masked row with Show |
| A4 | `miss` | no account holds it | `No account holds this email.`; no rows, no column head |
| A5 | `searchFailed` | lookup failed | field and `Press Enter to look up this exact email.` unchanged; full list stays; toast `Couldn’t look up that email.` + `Try again` |
| A6 | `revealFailed` | reveal or its log write refused | row stays masked with `Show`; toast `Couldn’t show ‹Colin R.› Nothing was shown.` + `Try again` |
| A7 | (no frame) | name typed, no `@` | filters masked names as R2's A2 did; `No account matches ‹q›.` unchanged |
| A8 | (no frame) | `@` typed, not yet submitted | list unfiltered; `Press Enter to look up this exact email.` (as A5 without the toast) |
| A9 | (no frame) | reveal in flight | Show holds its pressed state; ≤ 400ms, no spinner |
| A10 | (no frame) | reveal times out (5 min) or view ends | row re-masks; no toast |

## Account page (B)
| Id | Scene | State | What draws |
|---|---|---|---|
| B1 | `account` | masked head | avatar `CR`; h1 `Colin R.`; masked email; role line; no Clerk id; `Show` at the head's right (desktop) or under it (phone). Invites section: inviter and invitees masked; waiting email masked with Revoke; pending sentence names `Colin R.`. History holds an earlier reveal line |
| B2 | `accountRevealed` | revealed and logged | h1 `Colin Reyes`, email, Clerk id, `Shown and logged · hides at ‹19:42› UTC`, `Hide`; the Invites help names the full name; History gains `You showed Colin R.’s name and email` at the top with the accent diamond |

## Other surfaces (C)
| Id | Scene | State | What draws |
|---|---|---|---|
| C1 | `tree` | invite tree masked | masked names; diamond for the owner and the no-name account; waiting leaf `Waiting · by email · n•••@g•••.com` + Revoke; search `Find an account by name` |
| C2 | `group` | group members masked | each member: masked name, masked email, group line; no Clerk id; search `Find an account by name`; pending `Colin R. moves from friends to testers. He gains Overview v2.` |
| C3 | `picker` | add an account override | existing override row masked; picker open: search `Find an account by name`, choices masked name + masked email, `already set`; Check an account select names masked; history masked |
| C4 | (no frame) | model confirm (F3), set-invites confirm, group top-up | every name masked (D1) |
| C5 | (no frame) | costs per account, cap "set by" | masked name in place of the Clerk id; `You` for the viewer |

## Must-not
- an unmasked name, email or Clerk id in a page payload before a Show
- a bulk reveal, or a Show anywhere but a list row and the account head
- a miss that hints at near matches, or a partial email that matches
- a revealed value surviving navigation, reload or 5 minutes
- a Show with no `admin_events` row (the toast fires instead)
