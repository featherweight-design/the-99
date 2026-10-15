# READINESS — Social R1 (friends and pods)

**🟡 R2, for Hugh's audit.** R2 answers Hugh's R1 audit (2026-10-15): friend-link wording, the name set in one place,
a signature commander as each player's face, the friend request as a card, and pods drawn two ways (A chips, B table)
for Hugh to choose. Hugh ruled G3 (invite-only stays) and G4 (an already-friends open spends the link). Not green until
Hugh approves R2 and picks A or B, and engineering confirms G1, G2 and G11 to G14 are in the plan.

## Locks held

| Lock | How R1 holds it |
|---|---|
| Q1 link or QR only, no search | No search field, lookup or suggestion anywhere; the empty state says nobody can find you by name. |
| Q2 single-use, 7 days | Every link shows `Works once · expires …`; a second press makes a second link. |
| Mutual friendship | One Accept writes both sides; no pending or one-way state is drawn. |
| Q3 spares per pod | One checkbox per pod card, unticked; no all-friends toggle. |
| Q4 pods friends-only | Add friends lists your friends only; no join code. |
| Q5 hand-on | Leave's confirm names the next owner; the last leave deletes, and says so. |
| Spares view-only | Only the grant is drawn this round; no borrow, ask or cart change. |
| Name and public id only | **Widened in R2, at Hugh's go-ahead:** a friend read also returns the friend's chosen commander (oracle id) for its art. No email, uploaded avatar or Clerk id; ended links name nobody. |
| Silent removal | Every remove, leave, delete and decline says nobody is told, and nothing notifies. |
| No model calls | Names are typed and drawn; nothing reaches a prompt. |
| Limits 30 / 40 / 10 / 7 | `maxLength` 30 and 40; the 11th link is held; expiry on every link. |
| Hit targets, keyboard, screen reader | 44px presses on phone; menu rows roving; held button `aria-disabled` + `aria-describedby`; receipts `role="status"`; refusals `role="alert"` toasts; QR `role="img"` with a name; the link is a read-only input. |

## Open questions, called

1 account menu, second row; pods a section of /friends · 2 one press one link, QR first, Share on phone, open links
listed with Show/Revoke, held at 10 · 3 one card per state; signed out reads nothing; ended links unnamed; not found =
used · 4 Clerk first name, changed inline where it is about to be seen · 5 delete pane in the `…` menu, silent · 6 pod
cards: create/rename inline, ✕ to remove, Add friends dialog/sheet, leave/delete confirms naming the hand-on; spares
checkbox on the card only.

## Engineering needs

- `listOpenInvites(viewer)` (G1) and a client QR encoder (G8).
- `/invite/[token]` public in `src/proxy.ts`, reading nothing without a session (G2); Clerk sign-in with the URL as its redirect.
- One account-menu row (`MenuItems` links array, after About; refs sized from the list as the comment there asks).
- Member order in `listPods` or on the client (G9).
- Server actions over the existing writes; `false` treated as done.

## For the audit

Decision 1 (placement), 7 and 8 (what the landing says, and to whom) and 11 (each confirm's second sentence) are the
calls most worth checking against the locks. Full gap list in README.
