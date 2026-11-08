# Small items 11 · READINESS gap notes (R1, 2026-11-08)

For engineering's READINESS audit. Each note names what the drawing assumes that the code does not yet do.

## 1 · Role counts open their cards
1. **One tally.** The strip (`jobTally` via `label-role-counts.ts`) and What we counted (`profile.roles`) must read the same tally, and the list must come from it (brief: tests pin the list to the count). Cards with no label fall back to `card.role` in both or neither.
2. **Two-role cards.** The list is the tally's membership, not `card.role`, so Cyclonic Rift sits in Removal and Wipes. *By role* in the deck list is unchanged.
3. **Sheet/modal.** Reuse the pass sheet's `SheetFrame`; rows are `DecklistRow` with its ✕ and card-detail press. The undo row sits at the list's head; the list and the strip recount after a remove or undo.
4. **Captions.** `role-counter-cell.tsx`: met or over with count > 0 gains `cards →`; met with 0 stays static; under and land unchanged.
5. **What we counted.** Role-overage rows only gain a press (›, 44px hit). Curve, bracket and EDHREC rows stay static.

## 2 · Consider with a role over
1. **Shelf order.** `buildShelves` keeps short shelves first, then synergy, then met, then over.
2. **Folded default.** Met and over shelves start folded; `use-folded-shelves` stores the reader's opens as it does today. A role that goes over during the session folds on next render only if the reader hasn't opened it.
3. **Clause.** New over clause (DRAFT) beside the shipped at-target clause.
4. **your N →** opens item 1's sheet for that role.

## 3 · Past announcements
1. **Read.** A paged, kind-filtered read over `wizards_announcements`, newest first, 30 a page, with per-month counts for the heads and the jump sheet (brief).
2. **Includes** baseline, dismissed and switched-off kinds. Seen state is not written by the archive.
3. **Route** `/announcements`, signed-in only; entry in What's new's foot. No Settings, no push.
4. **States** drawn: loading skeletons, failed page (Try again), empty kind in a month.

## 4 · Sign-in on Clerk
1. **Spike first** (brief): prove `signIn.create({ signUpIfMissing: true })` → `signUp.create({ transfer: true })` and the reverse on the dev instance; record the instance's sign-up mode. If either fails, back to Design.
2. **Invitation-only routing.** After a proven code with no user: invited → S4 (*Use this email*) → U3; not invited → H2. Needs a check for a pending invitation on that email (Clerk invitations list, server-side).
3. **Ticket** lands on U3 with no code step.
4. **Busy and failure** states sit on the press; no new route.
5. **Dashboard:** email code only; turn off other methods so the custom pages drop nothing.

## Copy (for /copy-review)
DRAFT strings: item 1 lead; item 2 over clause and *your N →*; item 3 sub line, *Past announcements ›*, *Show older*, empty-month line and link, failed line; item 4 *{email} has an invitation.*, *Signing in…*, *Making your account…*. No em dashes; US spelling.
