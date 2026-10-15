# The 99 — Social R1 (friends and pods) · R1 handoff package

Round 1 of 3 of the social line: where friends live, invites by link and QR, the invite landing, the display name,
removing a friend, pods and the per-pod spares grant. Phone and desktop. Behind `SOCIAL_FRIENDS_ENABLED`.

Source of truth: `docs/superpowers/design-briefs/2026-10-15-social-screens.md` (branch `brief/social-screens`).

## Start here

| Read | For |
|---|---|
| **`The 99 - Social R1 (R1).dc.html`** | **The ten calls, the locks and the gaps, in one board.** |
| `R1 - Placement.dc.html` | The account menu row; the rejected sixth tab; switch off. |
| `R1 - Friends-Desktop.dc.html` / `R1 - Friends-Phone.dc.html` | `/friends`, empty first, through remove and the 10-link hold. |
| `R1 - Invite-Desktop.dc.html` / `R1 - Invite-Phone.dc.html` | The invite dialog and sheet. |
| `R1 - Landing-Desktop.dc.html` / `R1 - Landing-Phone.dc.html` | `/invite/[token]` in every state. |
| `R1 - Pods-Desktop.dc.html` / `R1 - Pods-Phone.dc.html` | Pods, from none to the hand-on. |
| `README.md` | Each decision with its reason; the gap list. |
| `STATES-social-r1.md` | The matrix. |
| `READINESS.md` | R1's verdict and what engineering needs. |
| `social-r1 · copy strings.ts` | Every new string, for `/copy-review`. |
| `brand/` | The locked brand sheet. |

The same canvas is live as a Design artifact in account 2. Open the `.dc.html` files with `support.js` beside them.

## The answer in one line

Friends live in the account menu, not the nav: `/friends` holds your name, your friends, your pods and your open links;
a friend is added only by a single-use link or its QR code; `/invite/[token]` answers every state in one card, and
names the inviter only when the invite is open.
