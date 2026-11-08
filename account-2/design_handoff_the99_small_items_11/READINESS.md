# Readiness: small items 11

**Verdict: Green.** Hugh approved R1 and its four open calls on 2026-11-08. No migration and no new switch: item 3 rides `ANNOUNCEMENTS_ENABLED`, items 1 and 2 ride no switch (logic and layout on shipped surfaces). Item 4 is Green **conditional on the dev-instance spike**: if either Clerk transfer fails, item 4 returns to Design (as the brief and README say). Every DRAFT string goes through `/copy-review` before its PR merges. About entries: Hugh's call at launch (brief).

## For engineering, by item

Sizes: S under 150 lines, M 150 to 500, L over 500, tests included.

1. **Role counts open their cards (M, one PR).** One tally behind the strip, What we counted and the list (today the strip reads `jobTally` and What we counted reads `profile.roles`, which can exclude commanders: `src/lib/tuning/cuts.ts:109`). The list reuses `SheetFrame` (`src/components/decks/pass-sheet.tsx:189`) and `DecklistRow` (`src/components/decks/decklist-row.tsx:203`) with its shipped undo (`undo.removed` + `undo.action`, `src/lib/copy/decks-builder.ts:367-368`). Role-overage rows are told apart by `CountRow.source === "role"` (`src/lib/tuning/cuts-count.ts:27-30`). Tests pin each list to the figure it opens.
2. **Consider with a role over (S to M, one PR, after item 1).** `buildShelves` order and folding through the shipped `use-folded-shelves` (`src/components/decks/use-folded-shelves.ts:19`); the over clause and *your N →* open item 1's sheet.
3. **Past announcements (M, one PR).** `/announcements` (no route exists today), a paged, kind-filtered read over `wizards_announcements` with per-month counts, and the foot entry in `src/components/home/whats-new.tsx` beside `ShowAllFooter`.
4. **Sign-in on Clerk (spike, then L, two PRs as Small items 7 READINESS already splits).** Spike first: `signIn.create({ signUpIfMissing: true })` then `signUp.create({ transfer: true })`, and the reverse. The invited check reuses the pattern in `src/lib/invites/clerk.ts:80` (`getInvitationList({ query, status: "pending" })`, re-filtered on the exact email). The ticket path needs the custom `/sign-up` to read Clerk's ticket; today `src/app/sign-up/page.tsx` handles none and the invitation link lands on Clerk's hosted page.

## Engineering audit (2026-11-08, against `origin/main` rebased under this PR)

**Verdict: Green.** No Orange item. Every code claim in the README and the gap notes below was read in the code. The differences are small and eng-resolvable; none changes a drawing.

| # | Claim | Finding | Resolution |
|---|---|---|---|
| 1 | `SheetFrame` sheet at 390, modal from `md` | True (`pass-sheet.tsx:189`, on `ModalChrome`) | None |
| 1 | Rows are `DecklistRow`: dot, name, mana, ✕, name opens card detail | True (`decklist-row.tsx:203`) | None |
| 1 | Undo row *{name} removed · Undo* | Ships as two strings, `undo.removed` and the *Undo* press; the "·" is the drawing's separator | Reuse as shipped |
| 1 | *By role* groups by single `card.role` | True (`src/lib/decks/grouping.ts:318`) | Unchanged, as drawn |
| 1 | A3: a role with zero cards draws static *—*, no press | The cell's figure reads **0** and its caption is the static *—* when it is not a control (`role-counter-cell.tsx:192-201`) | Read A3 as the caption; the figure stays 0 |
| 1 | Captions *consider →* / *suggest →*, land *balance →* | True at 390; desktop reads *suggest swaps →* and *balance mana →* (`decks-builder.ts:95-96`, `tuning-hub-shortcuts.ts:9-10`) | *cards →* gets a desktop form only if `/copy-review` wants one |
| 1 | What we counted rows unpressable; role rows separable | True (`cuts-free-count.tsx:195-210`; `source` on each row) | None |
| 2 | Shelf order: short, then *Synergy · {commander}*, then met, then over | The board does not place the targetless **Threats & synergy** shelf (`decks-builder.ts:132`) | Eng keeps it after synergy and before met (it has no target to meet); flag in the PR |
| 2 | At-target clause *you have 10 of 10* | True (`decks-builder.ts:129`) | None |
| 3 | `FeedItemRow` seen ink, post-glyph plate, decklists' two presses, Home's diamond and ✕ | True (`feed-item.tsx:367,131-142,83-110,377,421`) | None |
| 3 | What's new has a foot for the entry | True: `ShowAllFooter` (`whats-new.tsx:147`) | None |
| 3 | Sub (DRAFT) *608 posts from Wizards since Jan 2023* | **608 is right; the date is not.** Production (read-only, 2026-11-08): 608 posts, the oldest published 2015-09-28, 606 of them baseline, 6 with no hero | The line is computed (count and first year) and its wording goes to `/copy-review`; the jump sheet spans 2015 to now |
| 4 | H2 uses the shipped `inviteOnlyCopy` body *with the proven email* | The shipped body is static and takes no email (`src/lib/copy/join.ts:55`) | A new body variant with the email, through `/copy-review` |
| 4 | J1/J2 follow the shipped *Confirming…* | True (`joinCopy.confirming`, `join.ts:28`); `joinCopy.failed` `:47`, `codeExpired` `:33` | None |
| 4 | Invited check needs Clerk's invitations list | The pattern already ships (`src/lib/invites/clerk.ts:80`) | Reuse |
| E | Errata E1 to E4 | Applied in this PR: `tuning_hub/README.md:90` and `READINESS-audit.md:176`, `small_items_7` README, READINESS and Sign-In board, `add_panel/README.md:14`, `announcements/README.md` | None |

### Needs Hugh

1. **Clerk dashboard (item 4):** ~~set the instance to email code only~~ (withdrawn by addendum A1, 2026-11-08): keep Google, email and password, and the email code switched on, and confirm the sign-up mode stays invitation-only (both Clerk instances). Hugh changes dashboard settings himself.

### Needs Design

Nothing.

---

## Design gap notes (R1)

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
5. **Dashboard:** ~~email code only~~. Withdrawn by addendum A1: the pages carry every method the dashboard has on (Google, password, email code). See below.

## 4 · Addendum A1: sign-in methods (Design gap notes, 2026-11-08; awaiting Hugh's audit of these states)

Hugh's ruling: sign-in keeps Google, email and password, and the emailed code. Board `Sign-In-Methods` (K, L, M frames).

1. **Identify first.** K1's *Continue* runs `signIn.create({ identifier })` and reads `supportedFirstFactors`: `password` present → K2; otherwise `prepareFirstFactor({ strategy: "email_code" })` → S2, as today. An unknown email also goes to S2 (no enumeration on the code path). K2 itself shows the account has a password; Clerk's hosted page does the same today, so nothing new is revealed.
2. **Password:** `attemptFirstFactor({ strategy: "password" })`; a wrong one (`form_password_incorrect`) → K3. *Email me a code instead* → `prepareFirstFactor({ strategy: "email_code" })` → S2. Lockout after repeated tries is Clerk's: its message shows in the same `s7err` slot.
3. **Forgot password:** `reset_password_email_code` (K4), then `attemptFirstFactor` with the code and `password` (K5); a weak or breached password (`form_password_pwned`, length) shows Clerk's message in the `s7err` slot. Session set on success, landing as sign-in does.
4. **Google:** `authenticateWithRedirect({ strategy: "oauth_google", redirectUrl, redirectUrlComplete })` from K1 and L1, with an SSO callback route. M2 (email matches an existing account) is Clerk's account linking for verified emails; confirm it is on in the dashboard (the spike checks it). M1 is Clerk's `not_allowed_access` / restricted-mode refusal on the callback: route it to H2 with the Google email.
5. **Google with an invitation (L1):** sign-up by Google on an invited email is allowed in restricted mode when the Google email equals the invited one; the ticket must ride the OAuth sign-up (`ticket` / `__clerk_ticket` on the redirect). Add both to the item 4 spike: Google sign-up with a ticket, and a Google email that differs from the invited one (→ M1).
6. **Sign-up offers no password** (recommended; L2 not taken unless Hugh picks it). Setting a password later stays in Clerk's Manage account (`account-menu.tsx`).
7. **Spike additions:** the item 4 spike also proves Google sign-in, Google linking to an existing code/password account, and the password reset flow on the dev instance. If any fails, A1 returns to Design.

## Copy (for /copy-review)
DRAFT strings: item 1 lead; item 2 over clause and *your N →*; item 3 sub line, *Past announcements ›*, *Show older*, empty-month line and link, failed line; item 4 *{email} has an invitation.*, *Signing in…*, *Making your account…*; A1 *Use Google, or type your email.*, *Continue with Google*, *Continue*, *Enter your password*, *For {email}.*, *Forgot password?*, *Email me a code instead* (Hugh's words), *That password isn't right. Try again, or email yourself a code.*, *Reset your password* and its body, *Back to sign in*, *Choose a new password*, *At least 8 characters.*, *Save and sign in*, *Use the Google account for {email}.* No em dashes; US spelling.
