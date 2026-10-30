# The 99 — Social R1 (friends and pods) · R2 handoff package

Round 1 of 3 of the social line: where friends live, invites by link and QR, the invite landing, the display name,
removing a friend, pods and the per-pod spares grant. Phone and desktop. Behind `SOCIAL_FRIENDS_ENABLED`.

Source of truth: `docs/superpowers/design-briefs/2026-10-15-social-screens.md` (branch `brief/social-screens`).

## Start here

| Read | For |
|---|---|
| **`The 99 - Social R1 (R2).dc.html`** | **Start here: what R2 changed after Hugh's audit, the widened lock, the new gaps.** |
| `R2 - Friends-Desktop.dc.html` / `R2 - Friends-Phone.dc.html` | `/friends` with commander faces and the commander picker. |
| `R2 - Invite-Desktop.dc.html` / `R2 - Invite-Phone.dc.html` | Add a friend: the friend link dialog and sheet, no name line. |
| `R2 - Landing-Desktop.dc.html` / `R2 - Landing-Phone.dc.html` | `/friend/[token]`: the friend request drawn as a card, every state. |
| `R2 - Pods.dc.html` | Pods as a table of art seats (B, Hugh's pick), both widths; A for reference. |
| `The 99 - Social R1 (R1).dc.html` | R1: the ten calls, the locks and the gaps. R2 overrides where they differ. |
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

Friends live in the account menu, not the nav: `/friends` holds your name and commander (set there only), your friends,
your pods and your open friend links; a friend is added only by a single-use friend link or its QR code; `/friend/[token]`
draws the request as a card, face up only when it may name the sender. A chosen commander's art is each player's face.
